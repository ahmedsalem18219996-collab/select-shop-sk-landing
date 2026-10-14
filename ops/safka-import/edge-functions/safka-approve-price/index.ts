// SELECT SHOP TEMP ONLY — owner reviewed PUBLIC PRICE approval; NEVER enables checkout or supplier order creation.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
const allowed=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const send=(status,x,origin)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":origin,"vary":"Origin","access-control-allow-headers":"authorization,apikey,content-type,x-client-info","access-control-allow-methods":"POST,OPTIONS"}});
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(!allowed.has(origin))return new Response("Forbidden",{status:403});
 if(req.method==="OPTIONS")return send(200,{ok:true},origin);
 if(req.method!=="POST")return send(405,{error:"method_not_allowed"},origin);
 if(Number(req.headers.get("content-length")||0)>1500)return send(413,{error:"too_large"},origin);
 const token=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token||token.length<30)return send(401,{error:"login_required"},origin);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return send(503,{error:"configuration_missing"},origin);
 const viewer=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await viewer.auth.getUser(token);
 if(error||!user)return send(401,{error:"invalid_session"},origin);
 const gate=await viewer.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(gate.error||!gate.data)return send(403,{error:"owner_required"},origin);
 let input;
 try{const body=await req.text();if(body.length>1500)throw Error();input=JSON.parse(body)}catch{return send(400,{error:"invalid_json"},origin)}
 if(typeof input?.productId!=="string"||!/^[a-f0-9]{24}$/i.test(input.productId)||
    !Number.isInteger(input?.expectedPrice)||input.expectedPrice<1||
    input.acknowledgeCostAndShipping!==true)return send(422,{error:"review_confirmation_required"},origin);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const product=await db.from("ss_safka_import_products")
    .select("supplier_product_id,is_available,source_category_confirmed,suggested_sale_price_egp,retail_note_suggested_egp,retail_price_verification,final_price_egp,variants,images,review_state,owner_verified")
    .eq("supplier_product_id",input.productId.toLowerCase()).maybeSingle();
 if(product.error)return send(503,{error:"catalog_unavailable"},origin);
 if(!product.data)return send(404,{error:"not_found"},origin);
 const p=product.data;
 if(!p.is_available||!p.source_category_confirmed||!Array.isArray(p.images)||!p.images.length)
    return send(409,{error:"supplier_category_or_media_not_ready"},origin);
 const variants=Array.isArray(p.variants)?p.variants:[];
 const current=variants.filter(v=>v.is_available===true);
 if(!current.length||current.some(v=>!v.provider_id))return send(409,{error:"supplier_variant_missing"},origin);
 const values=current.map(v=>Number(v.suggested_price)).filter(x=>x>0);
 const ref=Math.max(Number(p.suggested_sale_price_egp)||0,...values);
 if(p.retail_price_verification!=="verified_note"||!Number.isSafeInteger(Number(p.retail_note_suggested_egp))||p.final_price_egp!==Number(p.retail_note_suggested_egp)+85||!Number.isInteger(p.final_price_egp)||p.final_price_egp!==input.expectedPrice||p.final_price_egp<ref+110)
   return send(409,{error:"price_changed_or_below_shipping_floor"},origin);
 // One product-level price cannot represent different supplier variant prices safely.
 if(values.some(x=>x!==Number(p.suggested_sale_price_egp)))
   return send(409,{error:"variant_prices_require_separate_review"},origin);
 if(p.owner_verified&&p.review_state==="approved")return send(200,{ok:true,alreadyApproved:true,price:p.final_price_egp,checkoutEnabled:false},origin);
 const updated=await db.from("ss_safka_import_products").update({review_state:"approved",owner_verified:true})
   .eq("supplier_product_id",p.supplier_product_id).eq("final_price_egp",input.expectedPrice)
   .eq("review_state","imported").eq("owner_verified",false)
   .select("supplier_product_id,final_price_egp,owner_verified,review_state").maybeSingle();
 if(updated.error||!updated.data)return send(409,{error:"record_changed_retry"},origin);
 return send(200,{ok:true,productId:updated.data.supplier_product_id,price:updated.data.final_price_egp,
   publicPriceVisible:true,checkoutEnabled:false,ordersSent:0},origin);
});