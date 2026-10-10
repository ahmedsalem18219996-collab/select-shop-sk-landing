// Temporary SELECT SHOP only. No real customer orders or supplier API calls.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const helperSrc=source('preview/select-unified-v1/orders-admin/affiliate.js');
const adminUiSrc=source('preview/select-unified-v1/orders-admin/affiliate-admin.js');
const adminAppSrc=source('preview/select-unified-v1/orders-admin/app.js');
const adminHtml=source('preview/select-unified-v1/orders-admin/index.html');
const migration=source('orders-system/migrations/20261011_affiliate_tracking.sql');
function helper(){
 const sandbox={window:{}};
 vm.runInNewContext(helperSrc,sandbox);
 return sandbox.window.SELECT_SHOP_AFFILIATE;
}
const sampleOrder=()=>({
 id:'fake-test-order',order_code:'DEMO-1001',customer_name:'عميل تجريبي',
 phone:'01000000000',governorate:'القاهرة',area:'مدينة نصر',
 address:'عنوان تجريبي',notes:'اتصل قبل الوصول',
 items:[
  {productId:'sk',productName:'SK Sneakers',variantId:'sk1',sizes:[40,41],role:'purchase',payablePrice:680},
  {productId:'wk',productName:'WK Retro',variantId:'wk1',sizes:[39],role:'trial',payablePrice:0},
  {productId:'carwash48',productName:'مسدس غسيل',variantId:'cw48',sizes:[0],role:'purchase',payablePrice:999},
 ]
});
const catalog={sk:{fulfillment_group:'prof'},wk:{fulfillment_group:'prof'},carwash48:{fulfillment_group:'safqa'}};
test('routes shoes to Prof and car care to Safqa without merging supplier groups',()=>{
 const routes=helper().group(sampleOrder(),catalog);
 assert.equal(routes.unknown.length,0);
 assert.equal(routes.groups.length,2);
 assert.deepEqual(Array.from(routes.groups.map(g=>g.platform)),['prof','safqa']);
 assert.equal(routes.groups[0].items.length,2);
 assert.equal(routes.groups[1].items.length,1);
});
test('mixed order copy contains ONLY the selected supplier products',()=>{
 const order=sampleOrder(),h=helper(),groups=h.group(order,catalog).groups;
 const prof=h.copyText(order,groups[0]),safqa=h.copyText(order,groups[1]);
 assert.match(prof,/SK Sneakers/);assert.match(prof,/WK Retro/);
 assert.doesNotMatch(prof,/مسدس غسيل/);
 assert.match(safqa,/مسدس غسيل/);
 assert.doesNotMatch(safqa,/SK Sneakers|WK Retro/);
 assert.match(prof,/الموبايل:/);assert.match(safqa,/العنوان:/);
 assert.match(prof,/تجربة/);assert.match(safqa,/بدون مقاس/);
});
test('unknown catalog product or unexpected platform fails closed',()=>{
 const order=sampleOrder();
 const h=helper();
 const missing=h.group(order,{sk:catalog.sk});
 assert.equal(missing.unknown.length,2);
 const unexpected=h.group(order,{...catalog,wk:{fulfillment_group:'unverified'}});
 assert.equal(unexpected.unknown.length,1);
 assert.equal(unexpected.unknown[0].productId,'wk');
});
test('copy never invents commission, automatic supplier submission, or price confirmation',()=>{
 const o=sampleOrder(),h=helper();
 const text=h.copyText(o,h.group(o,catalog).groups[0]);
 assert.doesNotMatch(text,/عمولة|تم إرسال|تم تسجيل عند المورد تلقائيًا/);
 assert.match(text,/نقل يدوي/);
});
test('invalid supplier group cannot produce a customer data export',()=>{
 assert.throws(()=>helper().copyText(sampleOrder(),{platform:'other',items:[]}),/invalid_supplier_group/);
});
test('supplier admin UI loads only after normal authorized admin login',()=>{
 assert.match(adminAppSrc,/if\(!isAdmin\)/);
 const authorized=adminAppSrc.indexOf('showDashboard();setConnection("متصل")');
 const attach=adminAppSrc.indexOf('SELECT_SHOP_AFFILIATE_ADMIN?.setClient(db)');
 assert.ok(authorized>=0 && attach>authorized);
 assert.match(adminAppSrc,/SELECT_SHOP_AFFILIATE_ADMIN\?\.render\(o,/);
 assert.match(adminAppSrc,/SELECT_SHOP_AFFILIATE_ADMIN\?\.setClient\(null\)/);
});
test('supplier admin never contacts supplier web services or submits their orders',()=>{
 assert.doesNotMatch(adminUiSrc,/fetch\s*\(|https:\/\/.*(prof|safqa)/i);
 assert.match(adminUiSrc,/\.from\("ss_affiliate_tracking"\)/);
 assert.match(adminUiSrc,/navigator\.clipboard\.writeText/);
 assert.match(adminUiSrc,/ref\)/);
});
test('supplier tracking is a private per-platform RLS-protected table',()=>{
 assert.match(migration,/ss_affiliate_tracking/);
 assert.match(migration,/primary key \(order_id, platform\)/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/private\.ss_is_order_admin\(\)/);
 assert.match(migration,/revoke all on public\.ss_affiliate_tracking from public, anon, authenticated/);
 assert.doesNotMatch(migration,/grant.*\bto anon\b/i);
});
test('admin includes routing module before authenticated admin UI and app',()=>{
 const a=adminHtml.indexOf('affiliate.js?v=');
 const b=adminHtml.indexOf('affiliate-admin.js?v=');
 const c=adminHtml.indexOf('app.js?v=');
 assert.ok(a>=0&&b>a&&c>b);
});
test('supplier codes are stable and customer data is never stored in JS source',()=>{
 assert.match(adminUiSrc,/platform/);
 assert.doesNotMatch(adminUiSrc,/201289437444|01000000000|عميل تجريبي/);
 assert.match(helperSrc,/new Set\(\["prof","safqa"\]\)/);
});
