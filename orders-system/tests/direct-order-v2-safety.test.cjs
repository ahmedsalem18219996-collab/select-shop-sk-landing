// SELECT SHOP temporary V2 — no-network, no-real-order safety tests.
// Run locally: node --test orders-system/tests/direct-order-v2-safety.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const cfgSrc=read('direct-order-v2-config.js');
const adapterSrc=read('direct-order-v2.js');
const main=read('index.html');
const commerce=read('storefront-v2-live.js');
const server=read('orders-system/supabase/functions/submit-order/index.ts');
const testElements=()=>{
 const nodes=new Map();
 const create=()=>({hidden:false,textContent:'',href:'',style:{},setAttribute(name,value){this[name]=value}});
 for(const selector of [
   '#formError','#checkoutForm','#selectShopV2Captcha','#checkoutHeading small',
   '#checkoutDialog .previewAlert','#checkoutForm .checkoutButton','#whatsappFallback'
 ])nodes.set(selector,create());
 nodes.get('#whatsappFallback').href='https://wa.me/201289437444?text=ORDER_CUSTOMER_DATA';
 return {nodes,document:{querySelector:s=>nodes.get(s)||null}};
};
function sandbox({enabled=false,captchaKey='',fetcher=()=>{throw Error('UNEXPECTED_NETWORK')},withDom=false}={}){
 const dom=withDom?testElements():{nodes:new Map(),document:{querySelector:()=>null}};
 const window={turnstile:null};
 const store=new Map();
 const sessionStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,val)=>store.set(key,val),
  removeItem:key=>store.delete(key)
 };
 const ctx={window,document:dom.document,sessionStorage,fetch:fetcher,crypto:webcrypto,
  TextEncoder,console,setTimeout,clearTimeout,AbortController,URLSearchParams};
 vm.runInNewContext(cfgSrc,ctx);
 if(enabled)window.SELECT_SHOP_DIRECT_ORDER_V2_CONFIG={
  ...window.SELECT_SHOP_DIRECT_ORDER_V2_CONFIG,enabled:true,turnstileSiteKey:captchaKey
 };
 let captchaCb=()=>{};
 if(withDom)window.turnstile={
  render:(host,opts)=>{captchaCb=opts.callback;return 12},
  reset:()=>{}
 };
 vm.runInNewContext(adapterSrc,ctx);
 return {...ctx,nodes:dom.nodes,callback:value=>captchaCb(value),api:window.SELECT_SHOP_DIRECT_ORDER_V2};
}
test('customer orders are OFF by default',()=>{
 const x=sandbox();
 assert.equal(x.api.isEnabled(),false);
 assert.equal(x.window.SELECT_SHOP_DIRECT_ORDER_V2_CONFIG.turnstileSiteKey,'');
});
test('OFF mode never submits an order',async()=>{
 let calls=0;const x=sandbox({fetcher:()=>{calls++;throw Error('NETWORK')}});
 await assert.rejects(()=>x.api.submit({name:'test'},[]),/مش متاح/);
 assert.equal(calls,0);
});
test('missing Turnstile key fails closed before contacting the server',async()=>{
 let calls=0;const x=sandbox({enabled:true,fetcher:()=>{calls++;throw Error('NETWORK')}});
 await assert.rejects(()=>x.api.submit({name:'test'},[]),/إعداد حماية/);
 assert.equal(calls,0);
});
test('reopened direct checkout keeps confirmation copy and inquiry-only WhatsApp',async()=>{
 const x=sandbox({enabled:true,captchaKey:'TEST_ONLY_KEY',withDom:true});
 await x.api.prepare();
 const link=x.nodes.get('#whatsappFallback');
 assert.equal(x.nodes.get('#checkoutForm .checkoutButton').textContent,'تأكيد الطلب وتسجيله');
 assert.ok(decodeURIComponent(link.href).includes('عندي استفسار'));
 assert.ok(!link.href.includes('ORDER_CUSTOMER_DATA'));
 link.href='https://wa.me/201289437444?text=DIFFERENT_ORDER';
 x.nodes.get('#checkoutForm .checkoutButton').textContent='إتمام الطلب على واتساب';
 await x.api.prepare();
 assert.equal(x.nodes.get('#checkoutForm .checkoutButton').textContent,'تأكيد الطلب وتسجيله');
 assert.ok(!link.href.includes('DIFFERENT_ORDER'));
});
test('valid CAPTCHA submits to isolated backend and converts car-care no-size to [0]',async()=>{
 const requests=[],x=sandbox({enabled:true,captchaKey:'TEST_ONLY_KEY',withDom:true,
  fetcher:async(url,options)=>{
   requests.push({url,options});
   return {ok:true,json:async()=>({ok:true,orderCode:'SYNTHETIC-TEST',total:999,shippingReviewRequired:false})};
  }});
 await x.api.prepare();x.callback('dummy-captcha-token');
 const result=await x.api.submit(
  {name:'Test Person',phone:'01011111111',governorate:'القاهرة',area:'Test',address:'Test street'},
  [{productId:'carwash48',variantId:'cw48',sizes:[],role:'purchase'}]
 );
 assert.equal(result.orderCode,'SYNTHETIC-TEST');
 assert.equal(requests.length,1);
 assert.ok(requests[0].url.includes('zznqdwrohrycsjfpvkhc.supabase.co'));
 const p=JSON.parse(requests[0].options.body);
 assert.deepEqual(Array.from(p.items[0].sizes),[0]);
 assert.equal(p.turnstileToken,'dummy-captcha-token');
 assert.match(p.idempotencyKey,/^[a-f0-9-]{36}$/);
 assert.ok(!('price' in p.items[0]));
});
test('failed network retry preserves the same idempotency key',async()=>{
 const ids=[];let fail=true;
 const x=sandbox({enabled:true,captchaKey:'TEST_ONLY_KEY',withDom:true,
  fetcher:async(_url,options)=>{
   ids.push(JSON.parse(options.body).idempotencyKey);
   if(fail){fail=false;throw Error('mock network interruption')}
   return {ok:true,json:async()=>({ok:true,orderCode:'SYNTHETIC-TEST',total:680,shippingReviewRequired:false})};
  }});
 const customer={name:'Test Person',phone:'01011111111',governorate:'القاهرة',area:'Test',address:'Test street'};
 const items=[{productId:'sk',variantId:'sk1',sizes:[40],role:'purchase'}];
 await x.api.prepare();x.callback('dummy-token-one');
 await assert.rejects(()=>x.api.submit(customer,items),/mock network interruption/);
 x.callback('dummy-token-two');
 const result=await x.api.submit(customer,items);
 assert.equal(result.orderCode,'SYNTHETIC-TEST');
 assert.equal(ids.length,2);
 assert.equal(ids[0],ids[1]);
});
test('current V2 only routes to direct orders when flag is enabled and not owner test mode',()=>{
 assert.match(commerce,/!testMode && window\.SELECT_SHOP_DIRECT_ORDER_V2\?\.isEnabled\?\.\(\)/);
 assert.match(commerce,/await window\.SELECT_SHOP_DIRECT_ORDER_V2\.submit\(/);
 assert.match(commerce,/cart=\[\];persist\(\);renderCart\(\);form\.reset\(\)/);
 assert.match(commerce,/closeDialog\("checkoutDialog"\)/);
});
test('direct orders are loaded in safe order and main must not be deployed before approval',()=>{
 const a=main.indexOf('direct-order-v2-config.js'),b=main.indexOf('direct-order-v2.js'),
  c=main.indexOf('storefront-v2-live.js');
 assert.ok(a>=0 && b>a && c>b);
 assert.match(cfgSrc,/enabled:false/);
});
test('server-side Turnstile, catalog, rate limit, origin and idempotency remain mandatory',()=>{
 for(const token of ['allowedOrigins.has(origin)','TURNSTILE_SECRET_KEY','ORDER_HASH_SECRET',
  'siteverify','ss_order_catalog','ss_order_rate_allowed','idempotency_key'])
  assert.ok(server.includes(token),'missing server-side guard: '+token);
});
test('client-side direct orders have no private Supabase secrets and use only temp project',()=>{
 assert.ok(cfgSrc.includes('zznqdwrohrycsjfpvkhc'));
 assert.ok(!cfgSrc.includes('vzhknoayzgzyqwzsnzmj'));
 assert.doesNotMatch(cfgSrc+adapterSrc,/sb_secret_[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]+/);
});
