/* Dependency-free static entry generation for GitHub Pages. Run: node build.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = __dirname;
const PUBLIC_BASE = (process.env.PUBLIC_BASE || 'https://selectshopeg.com/').replace(/\/?$/, '/');
const script = fs.readFileSync(path.join(root, 'script-v17-safe.js'), 'utf8');
let template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// Root and every product alias must load the same release of the active engine.
for (const asset of ['script-v17-safe.js', 'styles-v17-safe.css', 'meta-pixel.js']) {
  const version = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12);
  template = template.replace(new RegExp(asset.replace(/\./g, '\\.') + '(?:\\?v=[^"\\s]+)?', 'g'), `${asset}?v=${version}`);
}
template = template.replace(/https:\/\/ahmedsalem18219996-collab\.github\.io\/select-shop-sk-landing\//g, PUBLIC_BASE);
fs.writeFileSync(path.join(root, 'index.html'), template);
const boundary = script.indexOf('window.SELECT_SHOP_PRODUCTS');
if (boundary < 0) throw new Error('Canonical catalog boundary missing');
const catalog = vm.runInNewContext(script.slice(0, boundary) + '\nPRODUCTS;', {});
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slugs = new Set();
let count = 0;
for (const product of Object.values(catalog)) {
  const entries = [{slug:product.id, variant:product.variants[0]}, ...product.variants.map(variant => ({slug:variant.id,variant}))];
  for (const {slug,variant} of entries) {
    if (!/^[a-z0-9-]+$/.test(slug) || slugs.has(slug)) throw new Error(`Invalid or duplicate route: ${slug}`);
    slugs.add(slug);
    if (!fs.existsSync(path.join(root, variant.image))) throw new Error(`Missing asset: ${variant.image}`);
    const title = escape(`${variant.code} — ${product.name} | SELECT SHOP`);
    const description = escape(`${product.name} — ${variant.name}. ${product.price} جنيه شامل الشحن، مع المعاينة عند الاستلام وإمكانية تجربة موديل إضافي بدون شحن إضافي.`);
    const canonicalUrl = new URL(`product/${slug}/`, PUBLIC_BASE).href;
    const imageUrl = new URL(variant.image, PUBLIC_BASE).href;
    const html = template
      .replace('<base href="./">', '<base href="../../">')
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonicalUrl}">`)
      .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}">`)
      .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escape(`${variant.code} — ${product.name}`)}">`)
      .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${imageUrl}">`)
      .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonicalUrl}">`);
    const folder = path.join(root, 'product', slug);
    fs.mkdirSync(folder, {recursive:true});
    fs.writeFileSync(path.join(folder, 'index.html'), html);
    count++;
  }
}
fs.writeFileSync(path.join(root, '.nojekyll'), '');
console.log(`BUILD PASS: ${count} static product entries; one shared catalog, stylesheet and asset directory.`);
