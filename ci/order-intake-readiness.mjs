// Temporary SELECT SHOP, no customer orders created; no credentials needed.
// Verify order-intake wiring and publicly safe endpoints from GitHub Actions.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const frontend=await readFile("ops/safka-import/index.html","utf8");
const admin=await readFile("ops/safka-import/app.js","utf8");
const single=await readFile("v2-live/safka-checkout.js","utf8");
const cart=await readFile("v2-live/safka-cart.js","utf8");
const base="https://zznqdwrohrycsjfpvkhc.supabase.co";
const apikey="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";

for(const id of ["safkaInboxFilter","safkaInboxMessage","safkaPendingOrders",
  "safkaConfirmedOrders","shoePendingOrders","allOrderSourcesTotal",
  "ownerNewOrdersAlert","ownerOrdersPollNote","safkaInboxList"])
  assert(frontend.includes('id="'+id+'"'),"Missing private order operations field: "+id);

for(const marker of ["loadSafqaOrderInbox()","setInterval(","visibilitychange",
  '"ss_safka_checkout_requests"','"ss_orders"','record_sent',
  '"safka-review-order"','supplierOrderRef:','"https://wa.me/20"',
  'fulfillmentCopyText','navigator.clipboard.writeText'])
  assert(admin.includes(marker),"Owner order workflow missing: "+marker);

for(const [name,source] of [["single checkout",single],["smart cart",cart]]){
  assert(source.includes('cityId:'),"Supplier numeric city ID not captured by "+name);
  assert(source.includes('cityId')&&source.includes('governorate'),
    "Dependent region/city UI missing from "+name);
  assert(!source.includes("api.safka-eg.com"),"Public frontend must never call private supplier API");
}

const regions=await fetch(base+"/rest/v1/rpc/ss_safka_checkout_regions",{
 method:"POST",headers:{apikey,"content-type":"application/json"},body:"{}",
 signal:AbortSignal.timeout(20000)
});
assert(regions.ok,"Region lookup not available from public checkout");
const list=await regions.json();
assert(Array.isArray(list)&&list.length>=20,"Shipping regions unexpectedly missing");
const sohag=list.find(x=>x.id==="64879004dc16090c1858e69e");
assert(sohag&&Array.isArray(sohag.cities)&&sohag.cities.some(c=>c.id==="383"),
  "Full provider city names and codes not safely available");
assert(!list.some(x=>Object.hasOwn(x,"shipping_egp")||Object.hasOwn(x,"cost")),
  "Supplier freight leaked into customer dropdown");

const anonymousReview=await fetch(base+"/functions/v1/safka-review-order",{
 method:"POST",headers:{origin:"https://selectshopeg.com",apikey,"content-type":"application/json"},
 body:JSON.stringify({orderId:"00000000-0000-4000-8000-000000000001",
   action:"record_sent",supplierOrderRef:"DUMMY-TEST-ONLY"}),
 signal:AbortSignal.timeout(20000)
});
assert.equal(anonymousReview.status,401,
  "Owner-only supplier handoff action must reject anonymous requests");

const anonymousOrders=await fetch(base+"/rest/v1/ss_safka_checkout_requests?select=id,phone&limit=1",{
 headers:{apikey},signal:AbortSignal.timeout(20000)
});
if(anonymousOrders.ok){
 const data=await anonymousOrders.json();
 assert(Array.isArray(data)&&data.length===0,"CRITICAL: anonymous customer order data exposed");
}else assert([401,403,404].includes(anonymousOrders.status),
 "Unexpected unauthenticated order endpoint response "+anonymousOrders.status);

console.log("SELECT_SHOP_TEMP_ORDER_INTAKE_NO_WRITE_OK",JSON.stringify({
  sourceRegions:list.length,
  supplierCities:list.reduce((n,x)=>n+(Array.isArray(x.cities)?x.cities.length:0),0),
  anonymousOwnerAction:"rejected",
  customerDataAnonymous:"blocked",
  customerOrdersWritten:0,
  supplierOrdersCreated:0
}));
