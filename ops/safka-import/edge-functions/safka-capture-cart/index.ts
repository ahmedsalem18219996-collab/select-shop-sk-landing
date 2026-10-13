// SELECT SHOP temporary multi-product Safqa cart — protected one-shot supplier dispatch after private owner-order storage.
// Supplier delivery is attempted at most once after complete input and source verification.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
const ORIGINS=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const encoder=new TextEncoder(),idRx=/^[a-f0-9]{24}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safe=(x,n)=>typeof x==="string"?x.trim().slice(0,n):"";
const reply=(status,body,origin)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
 "access-control-allow-origin":origin,"access-control-allow-methods":"POST,OPTIONS",
 "access-control-allow-headers":"authorization,apikey,content-type,x-client-info","vary":"Origin"}});
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(s)))]
 .map(v=>v.toString(16).padStart(2,"0")).join("");
const hmac=async (key,txt)=>{
 const k=await crypto.subtle.importKey("raw",encoder.encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return [...new Uint8Array(await crypto.subtle.sign("HMAC",k,encoder.encode(txt)))]
 .map(v=>v.toString(16).padStart(2,"0")).join("");
};
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
 if(req.method==="OPTIONS")return reply(200,{ok:true},origin);
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"},origin);
 if(Number(req.headers.get("content-length")||0)>14000)return reply(413,{error:"request_too_large"},origin);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return reply(503,{error:"checkout_unavailable"},origin);
 let data;
 try{
  const raw=await req.text();if(raw.length>14000)throw Error("large");
  data=JSON.parse(raw);if(!data||typeof data!=="object"||Array.isArray(data))throw Error("invalid");
 }catch{return reply(400,{error:"invalid_json"},origin)}
 const requestId=safe(data.requestId,80);
 const gov=safe(data.governorateId,80);
 const customer=data.customer&&typeof data.customer==="object"&&!Array.isArray(data.customer)?data.customer:{};
 const name=safe(customer.name,120),area=safe(customer.area,120),address=safe(customer.address,280),
  notes=safe(customer.notes,300),phone=safe(customer.phone,24).replace(/[^\d]/g,"").replace(/^20(?=1[0125]\d{8}$)/,"0");
 const city=safe(data.cityId,40);
 const inputItems=Array.isArray(data.items)?data.items:[];
 if(!uuid.test(requestId)||!idRx.test(gov)||inputItems.length<1||inputItems.length>8||
   name.length<2||area.length<2||address.length<5||!/^01[0125]\d{8}$/.test(phone)||
   city&&!/^[a-f0-9]{24}$|^\d{1,8}$/i.test(city))
   return reply(422,{error:"invalid_order_details"},origin);
 const lines=[],keys=new Set();
 for(const row of inputItems){
  if(!row||typeof row!=="object"||Array.isArray(row))return reply(422,{error:"invalid_cart"},origin);
  const productId=safe(row.productId,80).toLowerCase(),variantId=safe(row.variantId,80).toLowerCase();
  const quantity=row.quantity;
  if(!idRx.test(productId)||!idRx.test(variantId)||!Number.isInteger(quantity)||quantity<1||quantity>3)
    return reply(422,{error:"invalid_cart"},origin);
  const key=productId+":"+variantId;
  if(keys.has(key))return reply(422,{error:"duplicate_variant"},origin);
  keys.add(key);lines.push({productId,variantId,quantity});
 }
 if(lines.reduce((sum,i)=>sum+i.quantity,0)>12)return reply(422,{error:"cart_quantity_limit"},origin);
 const identity={requestId,items:lines,governorateId:gov,cityId:city,
   customer:{name,phone,area,address,notes}};
 const digest=await sha(JSON.stringify(identity));
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const prior=await db.from("ss_safka_checkout_requests")
   .select("request_hash,order_code,total_egp,status,supplier_status").eq("request_id",requestId).maybeSingle();
 if(prior.error)return reply(503,{error:"cart_storage_unavailable"},origin);
 if(prior.data){
  if(prior.data.request_hash!==digest)return reply(409,{error:"request_id_conflict"},origin);
  return reply(200,{ok:true,orderCode:prior.data.order_code,totalEgp:prior.data.total_egp,
   status:prior.data.status,supplierStatus:prior.data.supplier_status,sentToSupplier:prior.data.supplier_status==="sent"},origin);
 }
 if(safe(data.website,100))return reply(422,{error:"invalid_order_details"},origin);
 const nonce=safe(data.workNonce,24);
 if(!/^[0-9a-f]{1,24}$/i.test(nonce)||!(await sha("SELECT-SHOP-ORDER:"+requestId+":"+nonce)).startsWith("0000"))
  return reply(422,{error:"validation_required"},origin);
 const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
   req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 const limit=await db.rpc("ss_order_rate_allowed",{p_fingerprint:await hmac(Deno.env.get("ORDER_HASH_SECRET")||service,ip),p_limit:8});
 if(limit.error)return reply(503,{error:"rate_limit_unavailable"},origin);
 if(limit.data!==true)return reply(429,{error:"rate_limit_exceeded"},origin);
 const productIds=[...new Set(lines.map(l=>l.productId))];
 const [productsResult,optionsResult,regionResult]=await Promise.all([
  db.from("ss_safka_import_products").select("supplier_product_id,barcode,name,variants,is_available,review_state,suggested_sale_price_egp,retail_note_suggested_egp,retail_price_verification,final_price_egp").in("supplier_product_id",productIds),
  db.from("ss_safka_variant_price_drafts").select("supplier_product_id,supplier_variant_id,draft_price_egp,reference_price_egp,supplier_available").in("supplier_product_id",productIds),
  db.from("ss_safka_import_shipping").select("governorate_id,name_ar,cities,is_active,shipping_egp").eq("governorate_id",gov).maybeSingle()
 ]);
 if(productsResult.error||optionsResult.error||regionResult.error)
  return reply(503,{error:"supplier_snapshot_unavailable"},origin);
 if(!regionResult.data?.is_active)return reply(422,{error:"governorate_unavailable"},origin);
 if(!Number.isFinite(Number(regionResult.data.shipping_egp))||Number(regionResult.data.shipping_egp)>110||Number(regionResult.data.shipping_egp)<0)return reply(409,{error:"shipping_rate_exceeds_included_allowance"},origin);
 const cities=Array.isArray(regionResult.data.cities)?regionResult.data.cities:[];
 if(city&&!cities.some(c=>String(c.id)===city))return reply(422,{error:"city_not_in_governorate"},origin);
 const byId=new Map((productsResult.data||[]).map(p=>[p.supplier_product_id,p]));
 const byOption=new Map((optionsResult.data||[]).map(p=>[p.supplier_product_id+":"+p.supplier_variant_id,p]));
 const priced=[];
 for(const line of lines){
  const p=byId.get(line.productId);
  if(!p||!p.is_available||p.review_state==="rejected"||
      p.retail_price_verification!=="verified_note"||
      !Number.isSafeInteger(Number(p.retail_note_suggested_egp))||
      Number(p.final_price_egp)!==Number(p.retail_note_suggested_egp)+110)
   return reply(409,{error:"product_unavailable",productId:line.productId},origin);
  const v=(Array.isArray(p.variants)?p.variants:[]).find(v=>v.provider_id===line.variantId&&v.is_available===true);
  if(!v)return reply(409,{error:"variant_unavailable",productId:line.productId},origin);
  const ref=Number(v.suggested_price)>0?Number(v.suggested_price):Number(p.suggested_sale_price_egp);
  const unit=Number(p.final_price_egp);
  const option=byOption.get(line.productId+":"+line.variantId);
  if(!Number.isSafeInteger(unit)||unit<=110||!option?.supplier_available||
     Number(option.reference_price_egp)!==ref||Number(option.draft_price_egp)!==unit)
    return reply(409,{error:"price_changed",productId:line.productId},origin);
  priced.push({supplier_product_id:line.productId,supplier_variant_id:line.variantId,
    product_title:String(p.name||"").slice(0,350),variant_title:String(v.name||"").slice(0,240),
    quantity:line.quantity,unit_price_egp:unit,barcode:String(p.barcode||"").slice(0,150)});
 }
 // Verify current product+variant availability DIRECTLY with the upstream provider.
 // Availability flags are not quantitative stock; never claim an inventory count.
 const sourceKey=Deno.env.get("SAFKA_API_KEY");
 if(!sourceKey)return reply(503,{error:"supplier_verification_unavailable"},origin);
 const providerChecks=await Promise.all(productIds.map(async id=>{
  try{
   const r=await fetch("https://api.safka-eg.com/api/v1/public/product/"+encodeURIComponent(id),{
     method:"GET",redirect:"error",cache:"no-store",
     headers:{"accept":"application/json","api-safka-key":sourceKey},signal:AbortSignal.timeout(13000)
   });
   if(r.status===404||r.status===403)return {id,error:"source_product_unavailable"};
   if(!r.ok)return {id,error:"source_verification_unavailable"};
   if(!(r.headers.get("content-type")||"").includes("json"))return {id,error:"source_verification_unavailable"};
   const parsed=await r.json();
   const product=parsed.product||parsed.data?.product||parsed.data;
   if(!product||String(product._id||product.id)!==id||product.is_active===false||product.is_available===false)
     return {id,error:"source_product_unavailable"};
   return {id,product};
  }catch{return {id,error:"source_verification_unavailable"}}
 }));
 const remoteById=new Map(providerChecks.map(x=>[x.id,x]));
 for(const line of priced){
  const result=remoteById.get(line.supplier_product_id);
  if(result?.error)return reply(result.error==="source_product_unavailable"?409:503,{error:result.error,productId:line.supplier_product_id},origin);
  const upstream=result?.product;
  const property=(Array.isArray(upstream?.properties)?upstream.properties:
     Array.isArray(upstream?.variants)?upstream.variants:[])
    .find(p=>String(p?._id||p?.id)===line.supplier_variant_id);
  if(!property||property.is_available!==true)
    return reply(409,{error:"source_variant_unavailable",productId:line.supplier_product_id},origin);
  const livePrice=Number(property.sale_price)>0?Number(property.sale_price):Number(upstream.sale_price);
  const snapshot=byId.get(line.supplier_product_id);
  if(!Number.isFinite(livePrice)||
     Number(upstream.sale_price)!==Number(snapshot?.suggested_sale_price_egp)||
     livePrice!==Number(byOption.get(line.supplier_product_id+":"+line.supplier_variant_id)?.reference_price_egp)||
     suggestedRetailNote(upstream)!==Number(snapshot?.retail_note_suggested_egp)||
     Number(snapshot.retail_note_suggested_egp)+110!==line.unit_price_egp)
    return reply(409,{error:"source_price_changed",productId:line.supplier_product_id},origin);
 }
 const total=priced.reduce((sum,i)=>sum+i.unit_price_egp*i.quantity,0);
 if(total>1000000)return reply(422,{error:"cart_total_limit"},origin);
 if(data.validateOnly===true)
  return reply(200,{ok:true,validated:true,totalEgp:total,lineCount:priced.length,
   orderSaved:false,sentToSupplier:false},origin);
 const date=new Date().toISOString().slice(0,10).replace(/-/g,"");
 const first=priced[0];
 const order={
  request_id:requestId,request_hash:digest,order_code:"SK-"+date+"-"+requestId.replace(/-/g,"").slice(0,8).toUpperCase(),
  supplier_product_id:first.supplier_product_id,supplier_variant_id:first.supplier_variant_id,
  product_title:first.product_title,variant_title:first.variant_title,barcode:first.barcode,
  quantity:first.quantity,unit_price_egp:first.unit_price_egp,total_egp:total,
  customer_name:name,phone,governorate_id:gov,governorate_name:String(regionResult.data.name_ar||""),
  city_id:city||null,area,address,notes
 };
 const result=await db.rpc("ss_safka_save_cart_order_atomic",{p_order:order,
   p_items:priced.map(({barcode,...item})=>item)});
 if(result.error){
  if(result.error.code==="23505"){
   const again=await db.from("ss_safka_checkout_requests").select("request_hash,order_code,total_egp,status,supplier_status")
     .eq("request_id",requestId).maybeSingle();
   if(again.data?.request_hash===digest)
    return reply(200,{ok:true,orderCode:again.data.order_code,totalEgp:again.data.total_egp,
      status:again.data.status,supplierStatus:again.data.supplier_status,sentToSupplier:again.data.supplier_status==="sent"},origin);
  }
  return reply(503,{error:"cart_save_unavailable"},origin);
 }
 const sent=await forwardSavedToSafka(url,service,order.order_code);
 return reply(201,{...result.data,ok:true,orderSaved:true,...sent},origin);
});