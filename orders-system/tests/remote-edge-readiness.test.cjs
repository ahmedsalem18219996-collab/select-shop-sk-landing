// Read-only readiness check against the isolated TEMP orders Edge Function.
// Safe: OPTIONS, wrong origin, and deliberately invalid JSON only.
// No customer information, no captcha token, no valid order, and no DB insertion.
const test=require('node:test');
const assert=require('node:assert/strict');

const endpoint='https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/submit-order';
const origin='https://selectshopeg.com';
const timeout=10000;
const request=(options)=>fetch(endpoint,{...options,signal:AbortSignal.timeout(timeout)});
test('isolated orders endpoint rejects unknown origin',async()=>{
 const response=await request({method:'POST',headers:{Origin:'https://not-selectshopeg.invalid','content-type':'application/json'},body:'{}'});
 assert.equal(response.status,403);
});
test('known origin has a narrow CORS preflight',async()=>{
 const response=await request({method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
 assert.equal(response.status,204);
 assert.equal(response.headers.get('access-control-allow-origin'),origin);
 assert.match(response.headers.get('access-control-allow-methods')||'',/POST/);
});
test('no-secret, malformed body must NEVER be accepted as an order',async()=>{
 const response=await request({method:'POST',headers:{Origin:origin,'content-type':'application/json'},body:'not-json'});
 assert.ok([400,503].includes(response.status),'unexpected status: '+response.status);
 const body=await response.json();
 assert.ok(['orders_not_configured','invalid_json'].includes(body.error),'unexpected response: '+String(body.error));
 assert.notEqual(body.ok,true);
 if(body.error==='orders_not_configured'){
   console.log('BLOCKER: server-only Turnstile and/or hash-secret configuration is incomplete');
 }
});
