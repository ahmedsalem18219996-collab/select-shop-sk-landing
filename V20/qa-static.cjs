#!/usr/bin/env node
/* SELECT SHOP V20 QA — zero dependencies; read-only and safe to run locally.
 * Run: node V20/qa-static.cjs
 * This validates static contracts, not visual browser behavior or actual sales.
 */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = p => fs.readFileSync(path.join(root,p), 'utf8');
const exists = p => fs.existsSync(path.join(root,p));
let fails=0, warnings=0;
function check(condition,msg){console.log((condition?'PASS':'FAIL')+' '+msg);if(!condition)fails++}
function warn(condition,msg){if(!condition){console.warn('WARN '+msg);warnings++}}
const home=file('index.html');
const p=file('preview/v20/index.html');
const s=file('preview/v20/skin.css');
const js=file('preview/v20/core-preview.js');
const live=file('script-v17-safe.js');
const meta=file('meta-pixel.js');
check(p.includes('content="noindex,nofollow"'),'preview noindex');
check(p.includes('window.SELECT_SHOP_TEST_MODE=true'),'preview analytics test mode enabled');
check(p.indexOf('window.SELECT_SHOP_TEST_MODE=true')<p.indexOf('src="meta-pixel.js'),'test mode before Meta initializer');
check(p.includes('src="preview/v20/core-preview.js'),'preview script is branch-owned');
check(p.includes('href="/preview/v20/skin.css'),'preview stylesheet is branch-owned');
check(p.includes('<base href="../../">'),'preview base resolves shared assets');
check(js.includes('selectShopCartV20Preview'),'preview cart storage isolated');
check(js.includes('selectShopV20PreviewViewedModels'),'preview product-view storage isolated');
check(js.includes('selectShopV20PreviewViewedVariants'),'preview variant-view storage isolated');
check(js.includes('new URL(\`/preview/v20/?product='),'preview product route remains in preview');
check(!js.includes('new URL(\`/preview/offcanon-lime-v1/?product='),'previous preview route is not inherited');
check(p.includes('ev.stopImmediatePropagation();tellPreview();'),'preview checkout submission blocked');
check(p.includes('src="assets/alex01.jpg"'),'hero uses original catalog image');
check(s.includes('mask-image:none!important'),'hero does not feather away authentic shoe details');
check(s.includes('object-fit:contain!important'),'crop-safe stage styling defined');
check((s.match(/\{/g)||[]).length===(s.match(/\}/g)||[]).length,'preview CSS braces balanced');
check(home.includes('script-v17-safe.js'),'live homepage still points to production engine');
check(meta.includes('PIXEL_ID') && meta.includes('ViewContent'),'production Pixel module still present');
check(live.includes('function renderCart()') && live.includes('function checkoutMessage('),'production commerce code exists');
check(live.includes('function renderCampaignProductLanding('),'canonical direct product page renderer intact');
check(p.includes('id="cartCount"')&&p.includes('id="checkoutForm"'),'cart and checkout DOM contracts preserved');
const m=js.indexOf('window.SELECT_SHOP_PRODUCTS');
check(m>0,'preview product catalog declaration exists');
const catalog=vm.runInNewContext(js.slice(0,m)+'\nPRODUCTS;',{});
const families=Object.values(catalog);
const variants=families.flatMap(prod=>prod.variants);
check(families.length===4,'four canonical sneaker families');
check(variants.length===19,'nineteen canonical sneaker variants');
check(new Set(variants.map(v=>v.id)).size===variants.length,'unique variant slugs');
check(new Set(families.map(p=>p.id)).size===families.length,'unique family IDs');
let routes=0, images=0;
for(const product of families){
  check(product.variants.length>0 && Number.isFinite(product.price) && product.price>0,'valid family pricing and variants: '+product.id);
  for(const v of product.variants){
    check(Array.isArray(v.sizes)&&v.sizes.length>0,'valid size list for '+v.id);
    check(exists(v.image),'real catalog image exists: '+v.image);
    if(exists(v.image)) images++;
  }
  for(const slug of [product.id,...product.variants.map(v=>v.id)]){
    check(exists('product/'+slug+'/index.html'),'direct product alias exists: '+slug);
    routes++;
  }
}
check(routes===23,'twenty-three stable direct product routes');
check(images===19,'nineteen catalog image assignments');
check(exists('product/carwash48/index.html'),'car-care direct landing exists');
warn(!/object-fit:cover!important/.test(s.match(/\/\* V20 crop-safe matte prototype[\s\S]*/)?.[0]||''),'V20 crop-safe additions still include a cover crop');
console.log('\nV20 static preflight: '+(fails?'FAIL':'PASS')+' ('+fails+' fails; '+warnings+' warnings)');
if(fails) process.exitCode=1;
