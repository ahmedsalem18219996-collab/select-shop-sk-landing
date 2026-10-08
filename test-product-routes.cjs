const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync('script-v17-safe.js','utf8');
const prefix = source.slice(0, source.indexOf('const initialRoute ='));
function context(url, base) {
  const location = new URL(url);
  const ctx = vm.createContext({ URL, URLSearchParams, location,
    window: {location}, document: {baseURI:base, querySelector:()=>null},
    history: {pushState(){},replaceState(){}} });
  vm.runInContext(prefix, ctx);
  vm.runInContext(source.slice(source.indexOf('function productUrl('),source.indexOf('function normalizeCart(')),ctx);
  return ctx;
}
const catalog = vm.runInContext('PRODUCTS',context('https://selectshopeg.com/','https://selectshopeg.com/'));
let routes = 0;
for (const product of Object.values(catalog)) {
  for (const slug of [product.id, ...product.variants.map(v=>v.id)]) {
    const variant = product.variants.find(v=>v.id===slug)||product.variants[0];
    const html = fs.readFileSync(`product/${slug}/index.html`,'utf8');
    for (const asset of ['script-v17-safe.js','styles-v17-safe.css']) {
      const hash=crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0,12);
      assert.ok(html.includes(`${asset}?v=${hash}`),slug+' loads current release');
    }
    assert.ok(html.includes(`rel="canonical" href="https://selectshopeg.com/product/${slug}/"`));
    for (const base of ['https://selectshopeg.com/','https://example.github.io/select-shop-sk-landing/']) {
      for (const suffix of ['/', '/index.html']) {
        const ctx=context(`${base}product/${slug}${suffix}?utm_source=facebook`,base);
        assert.equal(vm.runInContext('readRoute().productId',ctx), product.id);
        assert.equal(vm.runInContext('readRoute().variantId',ctx), variant.id);
        assert.equal(vm.runInContext(`productUrl('${product.id}','${variant.id}').href`,ctx),`${base}product/${variant.id}/?utm_source=facebook`);
      }
    }
    routes++;
  }
}
const ctx=context('https://selectshopeg.com/','https://selectshopeg.com/');
vm.runInContext(source.slice(source.indexOf('function calcTotals('),source.indexOf('const roleLabel')),ctx);
assert.equal(vm.runInContext("calcTotals([{productId:'sk',role:'primary',sizes:[38,39],tryTwo:true}]).total",ctx),680);
assert.equal(vm.runInContext("calcTotals([{productId:'sk',role:'primary'},{productId:'alex',role:'trial'}]).total",ctx),680);
assert.equal(vm.runInContext("calcTotals([{productId:'sk',role:'primary'},{productId:'alex',role:'purchase'}]).total",ctx),1140);
assert.equal(vm.runInContext("calcTotals([{productId:'sk',role:'primary'},{productId:'alex',role:'purchase'}]).discount",ctx),80);
// Product hero must refresh on SPA navigation and restore the store on Back.
let currentSection;
const hero={hidden:false,before(section){currentSection=section;}};
const button={addEventListener(){}};
const doc={body:{dataset:{}},head:{appendChild(){}},getElementById(){return true},
  querySelector(selector){return selector==='.storefront-hero'?hero:selector==='.campaign-product-first'?currentSection:null},
  createElement(){return {setAttribute(){},querySelector(){return button},replaceWith(section){currentSection=section},remove(){currentSection=null}}}};
ctx.document=doc;
vm.runInContext(source.slice(source.indexOf('function renderCampaignProductLanding(')),ctx);
ctx.location=new URL('https://selectshopeg.com/product/sk1/');
vm.runInContext('renderCampaignProductLanding(PRODUCTS.sk,PRODUCTS.sk.variants[0])',ctx);
assert.ok(currentSection.innerHTML.includes('SK-1'));
assert.equal(hero.hidden,true);
ctx.location=new URL('https://selectshopeg.com/product/alex04/');
vm.runInContext('renderCampaignProductLanding(PRODUCTS.alex,PRODUCTS.alex.variants[3])',ctx);
assert.ok(currentSection.innerHTML.includes('ALEX04'));
assert.ok(!currentSection.innerHTML.includes('SK-1'));
ctx.location=new URL('https://selectshopeg.com/');
vm.runInContext('renderCampaignProductLanding(PRODUCTS.sk,PRODUCTS.sk.variants[0])',ctx);
assert.equal(hero.hidden,false);
assert.equal(currentSection,null);
console.log(`PASS: ${routes} routes, root/subpath/index.html routing, shared release, SPA hero switching, two-size trial and additional-pair totals.`);
