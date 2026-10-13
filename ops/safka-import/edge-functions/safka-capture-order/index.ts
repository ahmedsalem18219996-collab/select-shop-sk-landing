// SELECT SHOP TEMP ONLY: verified guest Safqa order capture. NEVER sends orders to Safqa.
// Service role and CAPTCHA secret remain on server. No order unless owner-approved price.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
const ORIGINS=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const json=(status,body,origin)=>new Response(JSON.stringify(body),{status,headers:{
"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin",
"access-control-allow-origin":origin,"access-control-allow-methods":"POST,OPTIONS",
"access-control-allow-headers":"content-type,authorization,apikey,x-client-info"
}});
const trimmed=(x,n)=>typeof x==="string"?x.trim().slice(0,n):"";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const objectId=/^[a-f0-9]{24}$/i;
const encoder=new TextEncoder();
async function hexSha(text){const b=await crypto.subtle.digest("SHA-256",encoder.encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hashedIp(ip,secret){
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signed=await crypto.subtle.sign("HMAC",key,encoder.encode(ip));
 return [...new Uint8Array(signed)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function suggestedRetailNote(p){
 const text=String(p?.note||p?.notes||"").slice(0,2500)
  .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
 const matches=[...text.matchAll(/سعر\s*(?:البيع\s*)?المقترح\s*(?:هو\s*)?[:：–=\-]?\s*([0-9][0-9,]*)/gi)];
 if(matches.length!==1)return null;
 const price=Number(matches[0][1].replace(/,/g,""));
 return Number.isSafeInteger(price)&&price>0&&price<=1000000&&
  price>=Number(p?.sale_price)?price:null;
}

// Server-to-server, one-shot Safka transfer. Do not retry ambiguous results.
async function forwardSavedToSafka(url,service,orderCode){
 try{
  const response=await fetch(url+"/functions/v1/safka-dispatch-order",{
    method:"POST",headers:{"authorization":"Bearer "+service,
      "apikey":service,"content-type":"application/json"},
    body:JSON.stringify({orderCode}),signal:AbortSignal.timeout(26500)
  });
  const result=await response.json();
  return {supplierStatus:String(result.supplierStatus||"not_sent"),
    sentToSupplier:result.sentToSupplier===true,
    supplierSerial:result.sentToSupplier===true?String(result.supplierSerial||""):null,
    supplierFollowUpRequired:result.sentToSupplier!==true};
 }catch{
  return {supplierStatus:"needs_reconciliation",sentToSupplier:false,
   supplierSerial:null,supplierFollowUpRequired:true};
 }
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(!ORIGINS.has(origin))return new Response("Forbidden",{status:403});
 if(req.method==="OPTIONS")return json(200,{ok:true},origin);
 if(req.method!=="POST")return json(405,{error:"method_not_allowed"},origin);
 if(Number(req.headers.get("content-length")||0)>16000)return json(413,{error:"request_too_large"},origin);
 const url=Deno.env.get("SUPABASE_URL");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 // Orders are saved to a private owner-review inbox ONLY, never dispatched to supplier.
 // A valid owner-approved commercial fulfillment is still a separate operation.
 const hashKey=Deno.env.get("ORDER_HASH_SECRET")||service;
 if(!url||!service)return json(503,{error:"checkout_not_configured"},origin);
 let input;
 try{const raw=await req.text();if(raw.length>16000)throw Error("oversize");
    input=JSON.parse(raw);if(!input||typeof input!=="object"||Array.isArray(input))throw Error("invalid");
 }catch{return json(400,{error:"invalid_json"},origin)}
 const requestId=trimmed(input.requestId,80);
 const productId=trimmed(input.productId,80).toLowerCase(),variantId=trimmed(input.variantId,80).toLowerCase();
 const quantity=input.quantity;
 const governorateId=trimmed(input.governorateId,80);
 const cityId=trimmed(input.cityId,40);
 const customer=input.customer&&typeof input.customer==="object"&&!Array.isArray(input.customer)?input.customer:{};
 const name=trimmed(customer.name,120),area=trimmed(customer.area,120),address=trimmed(customer.address,280);
 const notes=trimmed(customer.notes,300),phone=trimmed(customer.phone,24).replace(/[^0-9]/g,"").replace(/^20(?=1[0125]\d{8}$)/,"0");
 if(!uuid.test(requestId)||!objectId.test(productId)||!objectId.test(variantId)||
    !Number.isInteger(quantity)||quantity<1||quantity>3||!objectId.test(governorateId)||
    (cityId&&!/^\d{1,8}$/.test(cityId))||
    name.length<2||area.length<2||address.length<5||!/^01[0125][0-9]{8}$/.test(phone))
   return json(422,{error:"invalid_order_details"},origin);
 const itemIdentity={requestId,productId,variantId,quantity,governorateId,cityId,customer:{name,phone,area,address,notes}};
 const digest=await hexSha(JSON.stringify(itemIdentity));
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const prior=await db.from("ss_safka_checkout_requests")
   .select("order_code,request_hash,total_egp,status,supplier_status")
   .eq("request_id",requestId).maybeSingle();
 if(prior.error)return json(503,{error:"orders_storage_unavailable"},origin);
 if(prior.data){
   if(prior.data.request_hash!==digest)return json(409,{error:"request_id_conflict"},origin);
   return json(200,{ok:true,orderCode:prior.data.order_code,totalEgp:prior.data.total_egp,
      status:prior.data.status,supplierStatus:prior.data.supplier_status,sentToSupplier:prior.data.supplier_status==="sent"},origin);
 }
 // A short, inexpensive hashcash challenge deters casual form spam when no CAPTCHA
 // integration is configured. The private inbox is rate-limited and never sends to Safqa.
 if(trimmed(input.website,100))return json(422,{error:"invalid_order_details"},origin);
 const nonce=trimmed(input.workNonce,24);
 if(!/^[0-9a-f]{1,24}$/i.test(nonce))
   return json(422,{error:"validation_required"},origin);
 const digestWork=await hexSha("SELECT-SHOP-ORDER:"+requestId+":"+nonce);
 if(!digestWork.startsWith("0000"))
   return json(422,{error:"validation_required"},origin);
 const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
   req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 const rate=await db.rpc("ss_order_rate_allowed",{p_fingerprint:await hashedIp(ip,hashKey),p_limit:8});
 if(rate.error)return json(503,{error:"rate_limit_unavailable"},origin);
 if(rate.data!==true)return json(429,{error:"rate_limit_exceeded"},origin);
 // Never accept user-supplied prices, variants, or shipping charges.
 const product=await db.from("ss_safka_import_products")
   .select("supplier_product_id,barcode,name,variants,final_price_egp,suggested_sale_price_egp,retail_note_suggested_egp,retail_price_verification,is_available,owner_verified,review_state,source_category_confirmed")
   .eq("supplier_product_id",productId).maybeSingle();
 if(product.error)return json(503,{error:"catalog_unavailable"},origin);
 const p=product.data;
 if(!p||!p.is_available||p.review_state==="rejected"||
    p.retail_price_verification!=="verified_note"||
    !Number.isSafeInteger(Number(p.retail_note_suggested_egp))||
    Number(p.final_price_egp)!==Number(p.retail_note_suggested_egp)+110)
   return json(409,{error:"product_not_ready"},origin);
 const variant=(Array.isArray(p.variants)?p.variants:[]).find(v=>v.provider_id===variantId&&v.is_available===true);
 if(!variant)return json(409,{error:"variant_not_available"},origin);
 const reference=Number(variant.suggested_price)>0?
   Number(variant.suggested_price):Number(p.suggested_sale_price_egp);
 const unitPrice=Number(p.final_price_egp);
 if(!Number.isSafeInteger(unitPrice)||unitPrice<=110)
   return json(409,{error:"price_not_ready"},origin);
 const quote=await db.from("ss_safka_variant_price_drafts")
   .select("draft_price_egp,supplier_available,reference_price_egp")
   .eq("supplier_product_id",productId).eq("supplier_variant_id",variantId).maybeSingle();
 if(quote.error||!quote.data?.supplier_available||quote.data.draft_price_egp!==unitPrice||
    Number(quote.data.reference_price_egp)!==reference)
   return json(409,{error:"price_not_ready"},origin);
 // Source-of-truth read immediately before accepting the customer's order.
 // Safqa does not disclose a trustworthy physical-stock quantity in this endpoint.
 const supplierKey=Deno.env.get("SAFKA_API_KEY");
 if(!supplierKey)return json(503,{error:"supplier_verification_unavailable"},origin);
 let live;
 try{
  const response=await fetch("https://api.safka-eg.com/api/v1/public/product/"+productId,{
   method:"GET",cache:"no-store",redirect:"error",headers:{"accept":"application/json","api-safka-key":supplierKey},
   signal:AbortSignal.timeout(13000)
  });
  if(response.status===404||response.status===403)return json(409,{error:"source_product_unavailable"},origin);
  if(!response.ok||(response.headers.get("content-type")||"").indexOf("json")<0)
    return json(503,{error:"source_verification_unavailable"},origin);
  const data=await response.json();live=data.product||data.data?.product||data.data;
  if(!live||String(live._id||live.id)!==productId||live.is_active===false||live.is_available===false)
    return json(409,{error:"source_product_unavailable"},origin);
  const sourceVariant=(Array.isArray(live.properties)?live.properties:
    Array.isArray(live.variants)?live.variants:[]).find(v=>String(v._id||v.id)===variantId);
  if(!sourceVariant||sourceVariant.is_available!==true)
    return json(409,{error:"source_variant_unavailable"},origin);
  const liveReference=Number(sourceVariant.sale_price)>0?Number(sourceVariant.sale_price):Number(live.sale_price);
  if(Number(live.sale_price)!==Number(p.suggested_sale_price_egp)||
     liveReference!==reference||
     suggestedRetailNote(live)!==Number(p.retail_note_suggested_egp)||
     Number(p.retail_note_suggested_egp)+110!==unitPrice)
    return json(409,{error:"source_price_changed"},origin);
 }catch{return json(503,{error:"source_verification_unavailable"},origin)}
 const region=await db.from("ss_safka_import_shipping")
   .select("governorate_id,name_ar,cities,is_active,shipping_egp")
   .eq("governorate_id",governorateId).maybeSingle();
 if(region.error)return json(503,{error:"shipping_unavailable"},origin);
 if(!region.data?.is_active)return json(422,{error:"unknown_governorate"},origin);
  if(!Number.isFinite(Number(region.data.shipping_egp))||Number(region.data.shipping_egp)>110||Number(region.data.shipping_egp)<0)return json(409,{error:"shipping_rate_exceeds_included_allowance"},origin);
 const cities=Array.isArray(region.data.cities)?region.data.cities:[];
 if(cityId&&!cities.some(c=>String(c.id)===cityId))return json(422,{error:"city_not_in_governorate"},origin);
 // A no-write backend QA check exercises ALL validation and price logic.
 // It never stores customer details and never contacts the supplier.
 if(input.validateOnly===true){
   return json(200,{ok:true,validated:true,priceEgp:unitPrice,
     totalEgp:unitPrice*quantity,orderSaved:false,sentToSupplier:false},origin);
 }
 const today=new Date().toISOString().slice(0,10).replace(/-/g,"");
 const code="SK-"+today+"-"+requestId.replace(/-/g,"").slice(0,8).toUpperCase();
 const order={
   request_id:requestId,request_hash:digest,order_code:code,
   supplier_product_id:productId,supplier_variant_id:variantId,
   barcode:String(p.barcode||""),product_title:String(p.name||""),
   variant_title:String(variant.name||""),quantity,unit_price_egp:unitPrice,
   total_egp:unitPrice*quantity,
   customer_name:name,phone,governorate_id:governorateId,
   governorate_name:String(region.data.name_ar||""),city_id:cityId||null,
   area,address,notes,status:"review",supplier_status:"not_sent"
 };
 const saved=await db.from("ss_safka_checkout_requests").insert(order).select("order_code,total_egp,status").single();
 if(saved.error){
   // Race on repeated request id: return only the existing result for identical payload.
   if(saved.error.code==="23505"){
      const existing=await db.from("ss_safka_checkout_requests").select("request_hash,order_code,total_egp,status,supplier_status")
          .eq("request_id",requestId).maybeSingle();
      if(existing.data?.request_hash===digest)return json(200,{ok:true,orderCode:existing.data.order_code,
        totalEgp:existing.data.total_egp,status:existing.data.status,supplierStatus:existing.data.supplier_status,sentToSupplier:existing.data.supplier_status==="sent"},origin);
   }
   return json(503,{error:"order_save_failed"},origin);
 }
 const sent=await forwardSavedToSafka(url,service,saved.data.order_code);
 return json(201,{ok:true,orderCode:saved.data.order_code,totalEgp:saved.data.total_egp,
   status:"review",orderSaved:true,...sent},origin);
});