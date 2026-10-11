// SELECT SHOP TEMP ONLY: verifies Safka product categories via public, authenticated-by-key GET details.
// Never touches CLEAN, prices, catalog availability, checkout, orders, or customer data.
import { createClient } from "npm:@supabase/supabase-js@2.79.0";
const PROJECT="zznqdwrohrycsjfpvkhc";
const ORIGINS=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const SAMPLE="6886882c8d9f44a8a150de3d"; // verified by the supplier website under سيارات
const BATCH=12;
function res(status,body,origin){
  return new Response(JSON.stringify(body),{status,headers:{
    "content-type":"application/json;charset=utf-8","cache-control":"no-store",
    "access-control-allow-origin":origin,"access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods":"POST,OPTIONS","vary":"Origin"
  }});
}
function getProduct(body){
  for(let i=0;i<4;i++){
    if(body && typeof body==="object" && !Array.isArray(body)){
      if(body.product&&typeof body.product==="object")body=body.product;
      else if(body.data&&typeof body.data==="object")body=body.data;
      else if(body.result&&typeof body.result==="object")body=body.result;
      else break;
    }else break;
  }
  return body && typeof body==="object" && !Array.isArray(body)?body:null;
}
function findCategory(p,validCats){
  if(!p)return null;
  const entries=[p.category,p.category_id,p.categoryId,p.categoryName,p.category_name,
    Array.isArray(p.categories)?p.categories[0]:null];
  for(const e of entries){
    if(!e)continue;
    const v=typeof e==="object"&&!Array.isArray(e)?e:null;
    const keys=v?[v._id,v.id,v.slug,v.name,v.title,v.categoryName,v.nameAr]:[e];
    for(const raw of keys){
      if(typeof raw!=="string")continue;
      const needle=raw.trim().replace(/\s+/g," ").toLowerCase();
      const cat=validCats.find(c=>
        c.category_key.toLowerCase()===needle ||
        c.category_name.trim().replace(/\s+/g," ").toLowerCase()===needle);
      if(cat)return cat;
    }
  }
  return null;
}
async function detail(id,key){
  try{
    const reply=await fetch("https://api.safka-eg.com/api/v1/public/product/"+id,{
      method:"GET",redirect:"error",cache:"no-store",
      headers:{"accept":"application/json","api-safka-key":key},
      signal:AbortSignal.timeout(12000)
    });
    if(!reply.ok)return {error:"safka_http_"+reply.status};
    const length=Number(reply.headers.get("content-length")||0);
    if(length>800000||!(reply.headers.get("content-type")||"").includes("json"))
      return {error:"invalid_provider_response"};
    const body=await reply.text();
    if(body.length>800000)return {error:"oversized_provider_response"};
    const p=getProduct(JSON.parse(body));
    if(!p||String(p._id||p.id)!==id)return {error:"id_mismatch"};
    return {product:p};
  }catch{return {error:"provider_unreachable"}}
}
Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"";
  if(!ORIGINS.has(origin))return new Response("Forbidden",{status:403});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "access-control-allow-origin":origin,"access-control-allow-methods":"POST,OPTIONS",
    "access-control-allow-headers":"authorization,apikey,content-type,x-client-info"
  }});
  if(req.method!=="POST")return res(405,{error:"method_not_allowed"},origin);
  const match=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/);
  if(!match||match[1].length<30)return res(401,{error:"auth_required"},origin);
  const url=Deno.env.get("SUPABASE_URL");
  const anon=Deno.env.get("SUPABASE_ANON_KEY");
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const key=Deno.env.get("SAFKA_API_KEY");
  if(!url||!url.includes(PROJECT)||!anon||!secret||!key)return res(503,{error:"configuration_missing"},origin);
  const viewer=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+match[1]}},
    auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await viewer.auth.getUser(match[1]);
  if(error||!user)return res(401,{error:"invalid_session"},origin);
  const allowed=await viewer.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(allowed.error||!allowed.data)return res(403,{error:"owner_required"},origin);
  let input;
  try{
    const raw=await req.text();
    if(raw.length>200)return res(413,{error:"too_large"},origin);
    input=JSON.parse(raw);
  }catch{return res(400,{error:"invalid_json"},origin)}
  if(!input||!["probe","batch"].includes(input.mode))return res(422,{error:"invalid_mode"},origin);
  const page=input.mode==="batch"?input.page:1;
  if(!Number.isInteger(page)||page<1||page>100)return res(422,{error:"invalid_page"},origin);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const categories=await admin.from("ss_safka_import_categories").select("category_key,category_name").eq("verified_by_source",true).limit(30);
  if(categories.error||!categories.data?.length)return res(503,{error:"missing_verified_categories"},origin);
  if(input.mode==="probe"){
    const response=await detail(SAMPLE,key);
    if(response.error)return res(502,{ok:false,error:response.error},origin);
    const matched=findCategory(response.product,categories.data);
    return res(200,{ok:true,mode:"probe",supported:!!matched,
      category:matched?.category_name||null,productId:SAMPLE,
      note:matched?"Provider detail includes a verified category.":"No verified category field found in the public detail API; cannot safely bulk assign."},origin);
  }
  const offset=(page-1)*BATCH;
  const list=await admin.from("ss_safka_import_products")
    .select("supplier_product_id,source_category_confirmed",{count:"exact"})
    .order("supplier_product_id").range(offset,offset+BATCH-1);
  if(list.error)return res(503,{error:"product_lookup_failed"},origin);
  let checked=0,assigned=0,missing=0,failed=0;
  const remaining=(list.data||[]).filter(p=>!p.source_category_confirmed);
  for(let i=0;i<remaining.length;i+=3){
    const group=remaining.slice(i,i+3);
    const details=await Promise.all(group.map(p=>detail(p.supplier_product_id,key)));
    for(let j=0;j<group.length;j++){
      checked++;
      const got=details[j];
      if(got.error){failed++;continue}
      const category=findCategory(got.product,categories.data);
      if(!category){missing++;continue}
      const write=await admin.from("ss_safka_import_products")
        .update({category_key:category.category_key,category_name:category.category_name,
          category_parent_key:null,source_category_confirmed:true})
        .eq("supplier_product_id",group[j].supplier_product_id).eq("source_category_confirmed",false);
      if(write.error){failed++;continue}
      assigned++;
    }
  }
  return res(200,{ok:true,mode:"batch",page,total:list.count||0,
    batchSize:BATCH,checked,assigned,missing,failed,
    hasMore:page*BATCH<(list.count||0),
    note:"Only exact categories returned by public Safka product detail and found in verified supplier taxonomy are assigned."},origin);
});