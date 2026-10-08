/* SELECT SHOP: regression for selecting any color on direct product links.
   Run with node test-variant-selection.cjs. No browser/dependencies needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('script-v17-safe.js', 'utf8');
const catalogStart = source.indexOf('const PRODUCTS =');
const catalogEnd = source.indexOf('window.SELECT_SHOP_PRODUCTS');
const products = vm.runInNewContext(source.slice(catalogStart, catalogEnd) + '\nPRODUCTS;', {});
const changeVariantSource = source.slice(source.indexOf('function setHeroVariant('), source.indexOf('function selectProduct('));
const landingSource = source.slice(source.indexOf('function renderCampaignProductLanding('));
assert.ok(changeVariantSource.includes('function setHeroVariant('));
assert.ok(landingSource.includes('function renderCampaignProductLanding('));

let tested = 0;
for (const product of Object.values(products)) {
  const chosen = product.variants[0];
  let section = null;
  let mediaViews = [];
  let checkoutSelection = null;
  let route = new URL('https://selectshopeg.com/product/' + chosen.id + '/');
  const hero = {hidden: false, before(node) { section = node; }};
  const doc = {
    body: {dataset: {}},
    head: {appendChild() {}},
    getElementById() { return true; }, // Inline stylesheet already inserted
    querySelector(selector) {
      if (selector === '.storefront-hero') return hero;
      if (selector === '.campaign-product-first') return section;
      if (selector.startsWith('.campaign-variant-option[')) return {focus() {}};
      // Intentionally do NOT implement #heroVariants or #heroProductImage.
      return null;
    },
    querySelectorAll() { return []; },
    createElement() {
      const node = {
        innerHTML: '',
        handlers: {},
        setAttribute() {},
        replaceWith(replacement) { section = replacement; },
        remove() { section = null; },
        querySelector(selector) {
          return selector === '.campaign-product-buy'
            ? {addEventListener(event, fn) { node.buy = fn; }} : null;
        },
        querySelectorAll(selector) {
          if (selector !== '[data-campaign-variant]') return [];
          return product.variants.map(variant => ({
            dataset: {campaignVariant: variant.id},
            addEventListener(event, fn) { node.handlers[variant.id] = fn; }
          }));
        }
      };
      return node;
    }
  };
  let context;
  context = vm.createContext({
    URL, document: doc, window: {SELECT_SHOP_META: {view(_prod, v) { mediaViews.push(v.id); }}},
    location: route, APP_BASE: new URL('https://selectshopeg.com/'),
    currentProductId: product.id, currentVariantByProduct: {[product.id]: chosen.id},
    PRODUCTS: products, reduceMotion: true,
    getProduct(id) { return products[id]; },
    getVariant(id, variantId) {
      return products[id].variants.find(v => v.id === variantId) || products[id].variants[0];
    },
    productUrl(id, variantId) { return new URL('product/' + variantId + '/', 'https://selectshopeg.com/'); },
    safeUpdateUrl(url) { context.location = new URL(url); },
    $$: (selector, root = doc) => [...root.querySelectorAll(selector)],
    $: selector => doc.querySelector(selector),
    updateHeroImage() {}, track() {},
    money: price => price + ' جنيه',
    discountPercentForPrice: () => 15,
    openProductSheet(id, args) { checkoutSelection = {id, ...args}; }
  });
  vm.runInContext(changeVariantSource + '\n' + landingSource, context);
  vm.runInContext('renderCampaignProductLanding(PRODUCTS[currentProductId],PRODUCTS[currentProductId].variants[0]);', context);
  assert.equal(hero.hidden, true);
  for (const variant of product.variants) {
    // Click every option, not a stubbed handler: runs the production
    // setHeroVariant(), including the nonexistent legacy-hero guard.
    assert.equal(typeof section.handlers[variant.id], 'function', variant.id + ' click listener');
    section.handlers[variant.id]();
    const html = section.innerHTML;
    assert.ok(html.includes('src="' + variant.image + '" alt="' + variant.code + ' ' + variant.name + '"'), variant.id + ' main image');
    assert.ok(html.includes('<h1>' + product.name + ' — ' + variant.name + '</h1>'), variant.id + ' title');
    assert.ok(new RegExp('class="campaign-variant-option is-active"\\s+type="button" data-campaign-variant="' + variant.id + '"\\s+aria-pressed="true"').test(html), variant.id + ' selected style');
    assert.equal(context.currentVariantByProduct[product.id], variant.id, variant.id + ' canonical state');
    assert.equal(context.location.pathname, '/product/' + variant.id + '/', variant.id + ' direct link');
    assert.equal(typeof section.buy, 'function');
    section.buy();
    assert.equal(checkoutSelection.variantId, variant.id, variant.id + ' order variant');
    assert.equal(checkoutSelection.id, product.id);
    assert.ok(html.includes(product.price + ' جنيه'), variant.id + ' product price');
    tested++;
  }
  assert.ok(mediaViews.length >= product.variants.length - 1, product.id + ' tracked color views');
}
console.log('PASS: ' + tested + ' variants in 4 families; active thumbnail, main image, variant URL, checkout selection, price and Pixel continuity.');
