// SELECT SHOP temporary store Safqa importer.
// Imports Safqa catalog/shipping into PRIVATE STAGING only; never publishes,
// updates existing shoe prices, or places supplier orders.
// Deploy only to select-shop-orders project zznqdwrohrycsjfpvkhc, verify_jwt=true.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
import {findRecords,totalPages,normalizeProduct,normalizeRegion} from "./normalize.mjs";

const ORIGINS=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const HOST="https://api.safka-eg.com";
const BASE="/api/v1/public";
const MAX_RESPONSE=3000000;
function response(status,body,origin){
  return new Response(JSON.stringify(body),{status,headers:{
    "content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "access-control-allow-origin":origin,"vary":"Origin",
    "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods":"POST,OPTIONS"
  }});
}
async function safeJson(req){
  if(Number(req.headers.get("content-length")||0)>2048)throw Error("too_large");
  const body=await req.text();
  if(body.length>2048)throw Error("too_large");
  return JSON.parse(body);
}
async function readProvider(res){
  const length=Number(res.headers.get("content-length")||0);
  if(length>MAX_RESPONSE)throw Error("upstream_too_large");
  if(!(res.headers.get("content-type")||"").toLowerCase().includes("json"))
    throw Error("upstream_not_json");
  const reader=res.body?.getReader();
  if(!reader)throw Error("upstream_empty");
  const parts=[];let size=0;
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>MAX_RESPONSE){await reader.cancel();throw Error("upstream_too_large")}
      parts.push(value);
    }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let at=0;
  for(const p of parts){bytes.set(p,at);at+=p.byteLength}
  const parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!parsed||typeof parsed!=="object"||parsed.success===false)throw Error("provider_denied");
  return parsed;
}
async function safkaGet(path,key){
  const res=await fetch(new URL(BASE+path,HOST),{
    method:"GET",redirect:"error",cache:"no-store",
    headers:{"accept":"application/json","api-safka-key":key},
    signal:AbortSignal.timeout(18000)
  });
  if(!res.ok)throw Error("safka_http_"+res.status);
  return readProvider(res);
}
Deno.serve(async(req)=>{
  const origin=req.headers.get("origin")||"";
  if(!ORIGINS.has(origin))return new Response("Forbidden",{status:403});
  if(req.method==="OPTIONS")return response(204,{ok:true},origin);
  if(req.method!=="POST")return response(405,{error:"method_not_allowed"},origin);
  const token=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if(!token||token.length<30)return response(401,{error:"not_authenticated"},origin);
  const url=Deno.env.get("SUPABASE_URL");
  const anon=Deno.env.get("SUPABASE_ANON_KEY");
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const key=Deno.env.get("SAFKA_API_KEY");
  if(!url||!anon||!service||!key)return response(503,{error:"secrets_not_configured"},origin);
  // Identify real user and enforce RLS-backed admin before using service role.
  const viewer=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},
    auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await viewer.auth.getUser(token);
  if(authError||!user)return response(401,{error:"session_invalid"},origin);
  const gate=await viewer.from("ss_order_admins").select("user_id")
    .eq("user_id",user.id).maybeSingle();
  if(gate.error||!gate.data)return response(403,{error:"owner_required"},origin);
  let input;
  try{input=await safeJson(req)}catch{return response(400,{error:"invalid_json"},origin)}
  const type=input?.mode;
  if(type!=="products"&&type!=="shipping")return response(422,{error:"invalid_mode"},origin);
  const page=type==="products"?(input.page??1):null;
  if(type==="products"&&(!Number.isInteger(page)||page<1||page>10000))
    return response(422,{error:"invalid_page"},origin);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let root;
  try{
    root=await safkaGet(type==="products"?
      "/products?"+new URLSearchParams({page:String(page),size:"30"}):"/price-list",key);
  }catch(error){
    const message=String(error instanceof Error?error.message:error);
    const status=message.match(/^safka_http_(\d{3})$/)?.[1]||null;
    return response(502,{error:"safka_read_failed",providerStatus:status?Number(status):null},origin);
  }
  const records=findRecords(root,type);
  if(!records)return response(502,{error:"unrecognized_safka_response",rootKeys:Object.keys(root||{}).slice(0,15)},origin);
  const normal=(type==="products"?records.map(normalizeProduct):records.map(normalizeRegion)).filter(Boolean);
  // Fail closed when provider replies with entries but none are mappable.
  if(records.length&&!normal.length)return response(502,{error:"no_mappable_records",received:records.length},origin);
  const unique=[...new Map(normal.map(x=>[type==="products"?x.supplier_product_id:x.governorate_id,x])).values()];
  let saved=0,categoryCount=0;
  try{
    if(type==="products"&&unique.length){
      const ids=unique.map(x=>x.supplier_product_id);
      const existing=await admin.from("ss_safka_import_products")
        .select("supplier_product_id,review_state,final_price_egp,owner_verified,category_key,category_name,category_parent_key,source_category_confirmed")
        .in("supplier_product_id",ids);
      if(existing.error)throw Error("existing_lookup_failed");
      const known=new Map((existing.data||[]).map(x=>[x.supplier_product_id,x]));
      const next=unique.map(product=>{
        const prior=known.get(product.supplier_product_id);
        return {
          ...product,
          review_state:prior?.review_state||"imported",
          final_price_egp:prior?.final_price_egp??null,
          owner_verified:prior?.owner_verified||false,
          category_key:(!product.source_category_confirmed&&prior?.source_category_confirmed)?
            prior.category_key:product.category_key,
          category_name:(!product.source_category_confirmed&&prior?.source_category_confirmed)?
            prior.category_name:product.category_name,
          category_parent_key:(!product.source_category_confirmed&&prior?.source_category_confirmed)?
            prior.category_parent_key:product.category_parent_key,
          source_category_confirmed:product.source_category_confirmed||prior?.source_category_confirmed||false,
          synced_at:new Date().toISOString()
        };
      });
      const inserted=await admin.from("ss_safka_import_products").upsert(next,{onConflict:"supplier_product_id"});
      if(inserted.error)throw Error("products_upsert_failed");
      saved=next.length;
      const categories=[...new Map(next.filter(x=>x.source_category_confirmed)
        .map(x=>[x.category_key,{category_key:x.category_key,
          category_name:x.category_name,parent_category_key:x.category_parent_key,
          verified_by_source:true,synced_at:new Date().toISOString()}])).values()];
      if(categories.length){
        const up=await admin.from("ss_safka_import_categories").upsert(categories,{onConflict:"category_key"});
        if(up.error)throw Error("categories_upsert_failed");
        categoryCount=categories.length;
      }
    }
    if(type==="shipping"&&unique.length){
      const up=await admin.from("ss_safka_import_shipping").upsert(
        unique.map(x=>({...x,synced_at:new Date().toISOString()})),{onConflict:"governorate_id"});
      if(up.error)throw Error("shipping_upsert_failed");
      saved=unique.length;
    }
    const log=await admin.from("ss_safka_sync_log").insert({
      run_type:type,page_num:page,received_count:records.length,
      saved_count:saved,status:records.length?"ok":"empty"
    });
    if(log.error)throw Error("sync_log_failed");
  }catch(e){
    return response(503,{error:e instanceof Error?e.message:"storage_error",note:"Retry is safe; upsert uses supplier product ID."},origin);
  }
  const pages=type==="products"?totalPages(root):null;
  return response(200,{
    ok:true,mode:type,source:"safka_api",
    page,requestedPageSize:type==="products"?30:null,
    received:records.length,saved,skipped:records.length-normal.length,
    categoriesWithSourceData:categoryCount,
    sourceTotalPages:pages,
    hasMore:type==="products"?(pages!==null?page<pages:records.length>=30):false,
    published:0,ordersSent:0,
    note:"Stored in private temporary-store staging only. Original provider identifiers preserved."
  },origin);
});