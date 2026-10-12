// SELECT SHOP temporary store Safqa importer.
// Imports Safqa catalog/shipping into PRIVATE STAGING only; never publishes,
// updates existing shoe prices, or places supplier orders.
// Automated sync authenticated by GitHub Actions OIDC; temp project only.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
import {jwtVerify,createRemoteJWKSet} from "npm:jose@5.10.0";
import {findRecords,totalPages,normalizeProduct,normalizeRegion} from "./normalize.mjs";

const ORIGINS=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const TRUSTED_REPO="ahmedsalem18219996-collab/select-shop-sk-landing";
const TRUSTED_WORKFLOW=TRUSTED_REPO+"/.github/workflows/safka-daily-sync.yml@refs/heads/main";
const JWKS=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const HOST="https://api.safka-eg.com";
const BASE="/api/v1/public";
const MAX_RESPONSE=3000000;
function response(status,body,origin){
  return new Response(JSON.stringify(body),{status,headers:{
    "content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "access-control-allow-origin":origin,"vary":"Origin",
    "access-control-allow-headers":"authorization,apikey,content-type,x-client-info,x-select-shop-oidc",
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
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type,x-client-info","access-control-max-age":"600","vary":"Origin"}});
  if(req.method!=="POST")return response(405,{error:"method_not_allowed"},origin);
  const token=req.headers.get("x-select-shop-oidc")||"";
  if(token.length<100||token.length>6000)return response(401,{error:"missing_ci_identity"},origin);
  let claims;
  try{
    const verified=await jwtVerify(token,JWKS,{
      issuer:"https://token.actions.githubusercontent.com",
      audience:"select-shop-safka-sync",algorithms:["RS256"]
    });
    claims=verified.payload;
  }catch{return response(403,{error:"invalid_ci_identity"},origin)}
  if(claims.repository!==TRUSTED_REPO||claims.ref!=="refs/heads/main"||
     claims.workflow_ref!==TRUSTED_WORKFLOW||
     !["push","schedule","workflow_dispatch"].includes(String(claims.event_name||"")))
    return response(403,{error:"unauthorized_ci_workflow"},origin);
  const url=Deno.env.get("SUPABASE_URL");
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const key=Deno.env.get("SAFKA_API_KEY");
  if(!url||!service||!key)return response(503,{error:"secrets_not_configured"},origin);
  let input;
  try{input=await safeJson(req)}catch{return response(400,{error:"invalid_json"},origin)}
  const type=input?.mode;
  if(type!=="products"&&type!=="shipping"&&type!=="audit")return response(422,{error:"invalid_mode"},origin);
  const page=type==="products"||type==="audit"?(input.page??1):null;
  if((type==="products"||type==="audit")&&(!Number.isInteger(page)||page<1||page>10000))
    return response(422,{error:"invalid_page"},origin);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let root;
  try{
    root=await safkaGet(type==="products"||type==="audit"?
      "/products?"+new URLSearchParams({page:String(page),size:"30"}):"/price-list",key);
  }catch(error){
    const message=String(error instanceof Error?error.message:error);
    const status=message.match(/^safka_http_(\d{3})$/)?.[1]||null;
    return response(502,{error:"safka_read_failed",providerStatus:status?Number(status):null},origin);
  }
  const records=findRecords(root,type==="audit"?"products":type);
  if(type==="audit"&&records){
    // Audits never touch the database or place supplier orders.
    // The supplier's free-text note may contain "سعر البيع المقترح"
    // distinct from the JSON sale_price used by our import.
    const arabicNumerals=x=>String(x).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
      .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
    const raw=records.map(p=>{
      const note=arabicNumerals(String(p?.note||p?.notes||"").slice(0,1600));
      const m=note.match(/سعر\s*(?:البيع\s*)?المقترح\s*(?:هو\s*)?[:：–=\-]?\s*([0-9][0-9,]*)/i);
      const suggested=m?Number(m[1].replace(/,/g,"")):null;
      const sale=Number(p?.sale_price);
      const category=p?.category??p?.categories?.[0]??p?.categoryName??p?.category_name;
      return {id:String(p?._id||p?.id||""),name:String(p?.name||"").slice(0,90),
        sale:Number.isFinite(sale)?sale:null,noteSuggested:Number.isFinite(suggested)&&suggested>0?suggested:null,
        hasNote:note.length>0,hasCategory:!!category};
    }).filter(p=>/^[a-f0-9]{24}$/i.test(p.id));
    const withSuggested=raw.filter(p=>p.noteSuggested!==null&&p.sale!==null);
    const differences=withSuggested.filter(p=>p.noteSuggested!==p.sale);
    return response(200,{ok:true,mode:"audit",page,received:records.length,
      count:raw.length,sourceTotalPages:totalPages(root),
      categoryPresent:raw.filter(p=>p.hasCategory).length,
      missingCategory:raw.filter(p=>!p.hasCategory).length,
      withNote:raw.filter(p=>p.hasNote).length,
      noteSuggestedParsed:withSuggested.length,
      suggestedAboveSale:withSuggested.filter(p=>p.noteSuggested>p.sale).length,
      suggestedEqualsSale:withSuggested.filter(p=>p.noteSuggested===p.sale).length,
      suggestedBelowSale:withSuggested.filter(p=>p.noteSuggested<p.sale).length,
      sampleDifferences:differences.slice(0,5).map(p=>({
        id:p.id,name:p.name,salePrice:p.sale,noteSuggestedRetail:p.noteSuggested,
        listedSitePrice:p.sale+90,noteSuggestedPlus90:p.noteSuggested+90
      })),
      noDatabaseWrites:true,noSupplierOrders:true},origin);
  }
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
          final_price_egp:prior?.owner_verified&&prior?.review_state==="approved"?
            prior.final_price_egp:
            product.retail_price_verification==="verified_note"&&
              Number(product.retail_note_suggested_egp)>0?
              Math.round(Number(product.retail_note_suggested_egp)+90):null,
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
      const propertyPrices=next.filter(p=>!p.owner_verified&&p.final_price_egp)
        .flatMap(p=>(p.variants||[]).map(v=>{
          const suggested=Number(v.suggested_price)>0?Number(v.suggested_price):Number(p.suggested_sale_price_egp);
          if(!/^[a-f0-9]{24}$/i.test(v.provider_id||"")||!Number.isFinite(suggested)||suggested<=0)return null;
          return {supplier_product_id:p.supplier_product_id,supplier_variant_id:v.provider_id,
            variant_name:v.name||"اختيار",reference_price_egp:suggested,draft_price_egp:p.final_price_egp,
            supplier_available:v.is_available===true,pricing_source:"safka_note_retail_plus_90_verified",
            updated_at:new Date().toISOString()};
        }).filter(Boolean));
      for(let at=0;at<propertyPrices.length;at+=150){
        const savedOptions=await admin.from("ss_safka_variant_price_drafts")
          .upsert(propertyPrices.slice(at,at+150),{onConflict:"supplier_product_id,supplier_variant_id"});
        if(savedOptions.error)throw Error("supplier_option_prices_save_failed");
      }
      const priceReviews=next.filter(p=>!p.owner_verified&&p.final_price_egp)
        .map(p=>{
          const previous=known.get(p.supplier_product_id);
          const differs=(p.variants||[]).some(v=>Number(v.suggested_price)>0&&
            Number(v.suggested_price)!==Number(p.suggested_sale_price_egp));
          return {supplier_product_id:p.supplier_product_id,
            prior_price_egp:Number(previous?.final_price_egp)||p.final_price_egp,
            proposed_price_egp:p.final_price_egp,supplier_reference_egp:Number(p.retail_note_suggested_egp),
            estimated_shipping_egp:90,estimated_ad_egp:0,estimated_returns_egp:0,
            projected_contribution_egp:0,pricing_segment:differs?"manual_price_check":"organic_or_bundle",
            source:"safka_note_suggested_retail_plus_90_verified",
            notes:"Validated unique suggested retail amount in Safka note + 90 EGP. Base sale_price is NOT suggested retail. Profit/shipping per governorate unverified.",
            reviewed_at:new Date().toISOString()};
        });
      for(let at=0;at<priceReviews.length;at+=150){
        const savedPrices=await admin.from("ss_safka_price_review_v2")
          .upsert(priceReviews.slice(at,at+150),{onConflict:"supplier_product_id"});
        if(savedPrices.error)throw Error("supplier_price_reviews_save_failed");
      }
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
    verifiedSuggestedRetailCount:type==="products"?unique.filter(x=>x.retail_price_verification==="verified_note").length:null,
    manualPriceReviewCount:type==="products"?unique.filter(x=>x.retail_price_verification==="manual_review").length:null,
    variantPriceReviewCount:type==="products"?unique.filter(x=>x.retail_price_verification==="variant_review").length:null,
    page,requestedPageSize:type==="products"?30:null,
    received:records.length,saved,skipped:records.length-normal.length,
    categoriesWithSourceData:categoryCount,
    sourceTotalPages:pages,
    hasMore:type==="products"?(pages!==null?page<pages:records.length>=30):false,
    published:0,ordersSent:0,
    note:"Stored in private temporary-store staging only. Original provider identifiers preserved."
  },origin);
});