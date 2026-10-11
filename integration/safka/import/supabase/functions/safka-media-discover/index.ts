// SELECT SHOP TEMP ONLY — attempt to discover verified Safka media-folder
// references in the supplier's PUBLIC product-detail API, if they exist.
// NO site login cookies, NO scraping or arbitrary URLs, NO supplier writes.
// If Safka public detail omits media folders, stop; browser workflow is required.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
const ORIGINS=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const PROJECT="zznqdwrohrycsjfpvkhc",BASE="https://api.safka-eg.com/api/v1/public/product/";
const IDS=["6661c38f6bb2679227b82a14","6a71f70b4d956cf608604baa"];
const ID=/^[a-f0-9]{24}$/i, FOLDER=/^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{15,})(?:[?#].*)?$/;
const reply=(code,obj,origin)=>new Response(JSON.stringify(obj),{status:code,headers:{
  "content-type":"application/json;charset=utf-8","cache-control":"no-store",
  "access-control-allow-origin":origin,"access-control-allow-headers":"apikey,authorization,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS","vary":"Origin"
}});
function foldersFrom(raw){
 const matches=new Set(),seen=new Set(),todo=[{v:raw,d:0}];let nodes=0;
 while(todo.length&&nodes++<450){
   const {v,d}=todo.shift();
   if(typeof v==="string"){
     if(FOLDER.test(v)&&v.length<300)matches.add("https://drive.google.com/drive/folders/"+v.match(FOLDER)[1]);
   }else if(d<6&&v&&typeof v==="object"&&!seen.has(v)){
     seen.add(v);
     const values=Array.isArray(v)?v:Object.values(v).slice(0,70);
     for(const child of values)todo.push({v:child,d:d+1});
   }
 }
 return [...matches].slice(0,10);
}
async function sourceDetail(id,key){
 if(!ID.test(id))throw Error("bad_id");
 const res=await fetch(BASE+id,{
  method:"GET",redirect:"error",cache:"no-store",
  headers:{"accept":"application/json","api-safka-key":key},
  signal:AbortSignal.timeout(13000)
 });
 if(res.status===429)throw Error("provider_rate_limited");
 if(!res.ok)throw Error("provider_http_"+res.status);
 if(!(res.headers.get("content-type")||"").includes("json"))throw Error("bad_content_type");
 const size=Number(res.headers.get("content-length")||0);
 if(size>800000)throw Error("oversized_json");
 const data=await res.text();
 if(data.length>800000)throw Error("oversized_json");
 const raw=JSON.parse(data);
 let product=raw;
 for(let i=0;i<3;i++){
   if(product&&typeof product==="object"&&!Array.isArray(product)){
     product=product.product||product.data||product.result||product;
   }else break;
 }
 if(typeof product?._id==="string"&&product._id!==id)throw Error("product_id_mismatch");
 return foldersFrom(product);
}
Deno.serve(async request=>{
 const origin=request.headers.get("origin")||"";
 if(!ORIGINS.has(origin))return new Response("Forbidden",{status:403});
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "access-control-allow-origin":origin,
  "access-control-allow-headers":"apikey,authorization,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS"
 }});
 if(request.method!=="POST")return reply(405,{error:"method_not_allowed"},origin);
 const jwt=request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!jwt||jwt.length<30)return reply(401,{error:"unauthorized"},origin);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),
   service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),key=Deno.env.get("SAFKA_API_KEY");
 if(!url||!url.includes(PROJECT)||!anon||!service||!key)return reply(503,{error:"config_missing"},origin);
 const viewer=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+jwt}},
  auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:authErr}=await viewer.auth.getUser(jwt);
 if(authErr||!user)return reply(401,{error:"invalid_session"},origin);
 const gate=await viewer.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(gate.error||!gate.data)return reply(403,{error:"owner_only"},origin);
 let body={};
 try{
   const s=await request.text();
   if(s.length>160)throw Error("oversized");
   body=JSON.parse(s);
 }catch{return reply(400,{error:"invalid_json"},origin)}
 if(!body||!["probe","batch"].includes(body.mode))return reply(422,{error:"invalid_mode"},origin);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 if(body.mode==="probe"){
   const samples=[];
   for(const id of IDS){
     try{const folders=await sourceDetail(id,key);samples.push({id,folderCount:folders.length,
       matchesKnownFolder:folders.some(f=>
         f===("https://drive.google.com/drive/folders/"+(id===IDS[0]?
         "15Aq-BPK-NlG5UEv7-RkOb6u3YZr4Yve6":"1-E-5apFcORvcFWIrb3A24-YcQD4_8Jxv")))})}
     catch(e){samples.push({id,error:String(e?.message||e).slice(0,45)})}
   }
   const supported=samples.some(x=>x.matchesKnownFolder===true);
   return reply(200,{ok:true,supported,samples,
     message:supported?"Supplier API exposes a verifiable media folder.":
       "Public product-detail API did not expose known source media folders; use authenticated affiliate pages."},origin);
 }
 const probe=await sourceDetail(IDS[0],key).catch(()=>[]);
 if(!probe.includes("https://drive.google.com/drive/folders/15Aq-BPK-NlG5UEv7-RkOb6u3YZr4Yve6"))
   return reply(409,{error:"unsupported_supplier_api",note:"No trusted media folder in public details; no inventory changed."},origin);
 const {data:queue,error:qerr}=await admin.from("ss_safka_media_inventory")
   .select("supplier_product_id").eq("status","pending").order("supplier_product_id").limit(6);
 if(qerr)return reply(503,{error:"media_queue_unavailable"},origin);
 let discovered=0,review=0,failed=0;
 for(const record of queue||[]){
   let status="needs_review",folder=null,notes="No folder field in public supplier detail";
   try{
     const folders=await sourceDetail(record.supplier_product_id,key);
     if(folders.length===1){folder=folders[0];status="folder_verified";notes="Unique supplier API media folder"}
     else if(folders.length>1){status="needs_review";notes="Ambiguous supplier API folders"}
   }catch(e){
     if(String(e?.message||e)==="provider_rate_limited")
       return reply(429,{error:"supplier_rate_limited",discovered,review,failed},origin);
     notes="Supplier public detail unavailable";failed++;
   }
   const {error:werr}=await admin.from("ss_safka_media_inventory")
     .update({source_folder_url:folder,status,checked_at:new Date().toISOString(),notes})
     .eq("supplier_product_id",record.supplier_product_id).eq("status","pending");
   if(werr)return reply(503,{error:"inventory_write_failed",discovered,review,failed},origin);
   if(folder)discovered++;else review++;
 }
 return reply(200,{ok:true,processed:(queue||[]).length,discovered,review,failed,
   note:"Only confirmed unique folders recorded. Videos must still be extracted from Drive; no orders/prices changed."},origin);
});