// SELECT SHOP TEMP ONLY: one-shot server-to-server Safka Create Order.
// Secret Auth: this endpoint only accepts the Supabase service-role key.
// Upstream write occurs at most once. Timeout/ambiguous responses NEVER retry.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
const orderCodeRx=/^SK-[0-9]{8}-[A-F0-9]{8}$/;
const objectIdRx=/^[a-f0-9]{24}$/i;
const receiptRx=/^[a-zA-Z0-9-]{5,60}$/;
function reply(status:number,data:Record<string,unknown>){
 return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
}
function safeEq(x:string,y:string){
 const a=new TextEncoder().encode(x),b=new TextEncoder().encode(y);
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
Deno.serve(async req=>{
 if(req.method!=="POST")return reply(405,{ok:false,error:"method_not_allowed"});
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const url=Deno.env.get("SUPABASE_URL")||"";
 const supplier=Deno.env.get("SAFKA_API_KEY")||"";
 if(!service||!url)return reply(503,{ok:false,error:"server_not_configured"});
 const auth=req.headers.get("authorization")||"";
 if(!safeEq(auth,"Bearer "+service))return reply(403,{ok:false,error:"internal_service_only"});
 if(Number(req.headers.get("content-length")||0)>600)return reply(413,{ok:false,error:"too_large"});
 let body;
 try{const raw=await req.text();if(raw.length>600)throw Error();
   body=JSON.parse(raw);
 }catch{return reply(400,{ok:false,error:"invalid_json"})}
 const code=body?.orderCode;
 if(typeof code!=="string"||!orderCodeRx.test(code))
  return reply(422,{ok:false,error:"invalid_order_code"});
 if(!supplier)return reply(503,{ok:false,error:"supplier_key_missing"});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const source=await db.from("ss_safka_checkout_requests")
   .select("id,order_code,status,supplier_status,is_cart_order,customer_name,phone,governorate_id,city_id,area,address,notes,total_egp,supplier_product_id,supplier_variant_id,quantity,unit_price_egp,supplier_order_ref,supplier_serial")
   .eq("order_code",code).maybeSingle();
 if(source.error)return reply(503,{ok:false,error:"order_read_unavailable"});
 const order=source.data;
 if(!order)return reply(404,{ok:false,error:"order_not_found"});
 if(order.supplier_status==="sent")
  return reply(200,{ok:true,sentToSupplier:true,supplierStatus:"sent",alreadyProcessed:true,
   supplierSerial:order.supplier_serial||null});
 if(order.supplier_status!=="not_sent")
  return reply(409,{ok:false,sentToSupplier:false,supplierStatus:order.supplier_status,error:"previous_send_or_review_required"});
 if(order.status!=="review")
  return reply(409,{ok:false,sentToSupplier:false,error:"local_order_not_eligible"});
 if(!order.city_id||!/^\d{1,8}$/.test(order.city_id))
  return reply(409,{ok:false,sentToSupplier:false,error:"supplier_city_required"});
 let lines;
 if(order.is_cart_order){
  const r=await db.from("ss_safka_checkout_cart_items")
   .select("supplier_product_id,supplier_variant_id,quantity,unit_price_egp")
   .eq("order_id",order.id).order("id",{ascending:true});
  if(r.error)return reply(503,{ok:false,error:"order_items_unavailable"});
  lines=r.data||[];
 }else{
  lines=[{supplier_product_id:order.supplier_product_id,
    supplier_variant_id:order.supplier_variant_id,quantity:order.quantity,
    unit_price_egp:order.unit_price_egp}];
 }
 if(!lines.length||lines.length>8||lines.reduce((s,i)=>s+i.quantity,0)>12||
    lines.some(i=>!objectIdRx.test(i.supplier_product_id)||!objectIdRx.test(i.supplier_variant_id)||
       !Number.isInteger(i.quantity)||i.quantity<1||i.quantity>3||
       !Number.isInteger(i.unit_price_egp)||i.unit_price_egp<=110))
  return reply(409,{ok:false,error:"invalid_saved_order_lines"});
 const total=lines.reduce((s,i)=>s+i.unit_price_egp*i.quantity,0);
 if(total!==Number(order.total_egp)||total>1000000)
  return reply(409,{ok:false,error:"stored_order_total_mismatch"});
 const productIds=[...new Set(lines.map(x=>x.supplier_product_id))];
 const [pr,options,region]=await Promise.all([
  db.from("ss_safka_import_products")
    .select("supplier_product_id,is_available,retail_price_verification,final_price_egp,review_state")
    .in("supplier_product_id",productIds),
  db.from("ss_safka_variant_price_drafts")
    .select("supplier_product_id,supplier_variant_id,reference_price_egp,draft_price_egp,supplier_available")
    .in("supplier_product_id",productIds),
  db.from("ss_safka_import_shipping")
    .select("governorate_id,is_active,shipping_egp,cities").eq("governorate_id",order.governorate_id).maybeSingle()
 ]);
 if(pr.error||options.error||region.error)return reply(503,{ok:false,error:"pricing_snapshot_unavailable"});
 if(!region.data?.is_active||!Number.isSafeInteger(Number(region.data.shipping_egp))||
   Number(region.data.shipping_egp)<0||Number(region.data.shipping_egp)>110||
   !(Array.isArray(region.data.cities)?region.data.cities:[]).some(c=>String(c.id)===String(order.city_id)))
   return reply(409,{ok:false,error:"shipping_recheck_failed"});
 const pmap=new Map((pr.data||[]).map(p=>[p.supplier_product_id,p]));
 const vmap=new Map((options.data||[]).map(v=>[v.supplier_product_id+":"+v.supplier_variant_id,v]));
 let base=0;
 for(const line of lines){
   const p=pmap.get(line.supplier_product_id);
   const v=vmap.get(line.supplier_product_id+":"+line.supplier_variant_id);
   if(!p||!p.is_available||p.review_state==="rejected"||
      p.retail_price_verification!=="verified_note"||
      p.final_price_egp!==line.unit_price_egp||
      !v?.supplier_available||Number(v.draft_price_egp)!==line.unit_price_egp||
      !Number.isSafeInteger(Number(v.reference_price_egp))||
      Number(v.reference_price_egp)<=0)
      return reply(409,{ok:false,error:"supplier_pricing_or_stock_changed"});
   base+=Number(v.reference_price_egp)*line.quantity;
 }
 // Actual supplier price-list freight is charged per order, not per item.
 // The marketer commission is conservative: customer COD - reference supplier prices - freight.
 const commission=total-base-Number(region.data.shipping_egp);
 if(!Number.isSafeInteger(commission)||commission<100||commission>30000)
   return reply(409,{ok:false,error:"commercial_margin_unverified"});
 const claim=await db.rpc("ss_safka_claim_supplier_dispatch_v1",{p_order_code:code});
 if(claim.error)return reply(503,{ok:false,error:"dispatch_claim_unavailable"});
 if(claim.data?.claimed!==true)
   return reply(409,{ok:false,error:claim.data?.reason||"dispatch_not_claimed",
     sentToSupplier:false,supplierStatus:claim.data?.supplierStatus||"not_sent"});
 const finish=async(state:"sent"|"blocked"|"needs_reconciliation",reference:string|null=null,serial:string|null=null,error:string|null=null)=>{
  const saved=await db.rpc("ss_safka_finalize_supplier_dispatch_v1",{
    p_order_code:code,p_state:state,p_reference:reference,p_serial:serial,p_error:error
  });
  return !saved.error&&saved.data?.updated===true;
 };
 const payload={
   client_name:order.customer_name,client_phone1:order.phone,
   client_phone2:"",client_address:(order.area+"، "+order.address).slice(0,400),
   shipping_governorate:order.governorate_id,city:String(order.city_id),
   commission,total,
   items:lines.map(l=>({product:l.supplier_product_id,property:l.supplier_variant_id,qty:String(l.quantity)})),
   page_name:"SELECT SHOP",page_id:null,
   note:("SELECT SHOP "+code+(order.notes?" — "+order.notes:"")).slice(0,300)
 };
 // Single outbound POST. Never retry on timeout, connection error or unexpected response.
 let response:Response;
 try{
   response=await fetch("https://api.safka-eg.com/api/v1/public/orders",{
     method:"POST",redirect:"error",cache:"no-store",
     headers:{"accept":"application/json","content-type":"application/json","api-safka-key":supplier},
     body:JSON.stringify(payload),signal:AbortSignal.timeout(18000)
   });
 }catch{
   await finish("needs_reconciliation",null,null,"network_or_timeout_unknown");
   return reply(202,{ok:false,sentToSupplier:false,supplierStatus:"needs_reconciliation",
      error:"supplier_response_unknown_no_auto_retry"});
 }
 let result:Record<string,unknown>|null=null;
 try{
   const raw=await response.text();
   if(raw.length<=25000&&(response.headers.get("content-type")||"").includes("json"))
    result=JSON.parse(raw);
 }catch{}
 const obj=result?.data&&typeof result.data==="object"?result.data as Record<string,unknown>:null;
 const id=String(obj?._id||"").toLowerCase();
 const serial=String(obj?.serial_number||"");
 if((response.status===200||response.status===201)&&result?.success===true&&
    objectIdRx.test(id)&&receiptRx.test(serial)){
   const persisted=await finish("sent",id,serial,null);
   if(!persisted)return reply(202,{ok:false,supplierStatus:"needs_reconciliation",
       error:"provider_accepted_local_receipt_not_saved"});
   return reply(201,{ok:true,sentToSupplier:true,supplierStatus:"sent",
     supplierSerial:serial});
 }
 // A definite client request rejection means no order; 409 and 429 are uncertain.
 if([400,401,403,404,422].includes(response.status)){
   await finish("blocked",null,null,"provider_http_"+response.status);
   return reply(409,{ok:false,sentToSupplier:false,supplierStatus:"blocked",
     error:"supplier_rejected_order"});
 }
 await finish("needs_reconciliation",null,null,"provider_ambiguous_http_"+response.status);
 return reply(202,{ok:false,sentToSupplier:false,supplierStatus:"needs_reconciliation",
   error:"supplier_response_unknown_no_auto_retry"});
});
