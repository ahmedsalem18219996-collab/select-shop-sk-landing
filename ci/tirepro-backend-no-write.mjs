// TirePro production validation-only check.
// No order INSERT, no supplier dispatch, and no real customer details.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomUUID,createHash} from "node:crypto";

const checkout=await readFile("v2-live/safka-checkout.js","utf8");
const key=checkout.match(/const KEY="(sb_publishable_[^"]+)"/)?.[1];
assert(key,"Public checkout key not configured");
const requestId=randomUUID();
let nonce="";
for(let i=0;i<1500000;i++){
  const candidate=i.toString(16);
  const hash=createHash("sha256").update("SELECT-SHOP-ORDER:"+requestId+":"+candidate).digest("hex");
  if(hash.startsWith("0000")){nonce=candidate;break;}
}
assert(nonce,"Antispam nonce not found");
const payload={
  requestId,
  productId:"6a71f70b4d956cf608604baa",
  variantId:"6a71f70b4d956cf608604bab",
  quantity:1,
  governorateId:"64879004dc16090c1858e69e",
  cityId:"383",
  customer:{
    name:"اختبار تقني فقط",
    phone:"01000000000",
    area:"منطقة اختبار تقني",
    address:"عنوان اختبار غير حقيقي وغير قابل للتوصيل",
    notes:"NO_WRITE_TEST"
  },
  website:"",
  workNonce:nonce,
  validateOnly:true
};
assert.equal(payload.validateOnly,true,"Never submit a write-mode order");
const response=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/safka-capture-order",{
  method:"POST",
  headers:{"origin":"https://selectshopeg.com",apikey:key,"content-type":"application/json"},
  body:JSON.stringify(payload),
  signal:AbortSignal.timeout(35000)
});
const result=await response.json().catch(()=>({error:"invalid_server_response"}));
console.log("TIREPRO_VALIDATE_ONLY_RESULT",JSON.stringify({
  httpStatus:response.status,ok:result.ok,validated:result.validated,
  quote:result.totalEgp,errorCode:result.error||null,
  orderSaved:result.orderSaved,sentToSupplier:result.sentToSupplier
}));
assert(response.ok&&result.ok===true&&result.validated===true,
  "TirePro real-source quote validation failed: "+String(result.error||response.status));
assert.equal(Number(result.totalEgp),699,"Wrong final advertised charge");
assert.equal(result.orderSaved,false,"Test unexpectedly persisted an order");
assert.equal(result.sentToSupplier,false,"Test unexpectedly forwarded to supplier");
console.log("TIREPRO_BACKEND_NO_WRITE_PASS");
