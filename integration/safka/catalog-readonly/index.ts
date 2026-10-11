// SELECT SHOP TEMPORARY STORE — Safqa GET-only catalog/price-list inspection.
// REVIEW DRAFT ONLY. Do not deploy until the owner has SAFKA_API_KEY in
// project 'select-shop-orders' secrets and approves read-only testing.
// NEVER use this against SELECT-SHOP-CLEAN or any other Supabase project.
import { createClient } from "npm:@supabase/supabase-js@2.79.0";
import { summarizeProviderResponse } from "./response-projection.mjs";

const HOST="https://api.safka-eg.com";
const BASE="/api/v1/public";
const ALLOWED_ORIGINS=new Set([
  "https://selectshopeg.com","https://www.selectshopeg.com"
]);
const MAX_BODY=2048,MAX_UPSTREAM=2_000_000;
const headersFor=origin=>({
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "x-content-type-options":"nosniff",
  "access-control-allow-origin":origin,
  "access-control-allow-methods":"POST,OPTIONS",
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "vary":"Origin"
});
const reply=(status,obj,origin)=>new Response(JSON.stringify(obj),{status,headers:headersFor(origin)});
function parseAction(input){
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  if(input.mode==="price-list")return {mode:"price-list",path:"/price-list"};
  if(input.mode!=="products")return null;
  const page=input.page??1,size=input.size??10,query=input.query??"";
  if(!Number.isInteger(page)||page<1||page>50||!Number.isInteger(size)||size<1||size>30||
     typeof query!=="string"||query.length>100||/[\u0000-\u001F]/.test(query))return null;
  const params=new URLSearchParams({page:String(page),size:String(size)});
  if(query.trim())params.set("query",query.trim());
  return {mode:"products",path:"/products?"+params.toString()};
}
async function readLimited(response){
  const declared=Number(response.headers.get("content-length")||0);
  if(declared>MAX_UPSTREAM)throw Error("provider_payload_too_large");
  const reader=response.body?.getReader();
  if(!reader)throw Error("provider_empty_body");
  const chunks=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_UPSTREAM) {await reader.cancel();throw Error("provider_payload_too_large")}
      chunks.push(value);
    }
  }finally{reader.releaseLock()}
  const buffer=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength}
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(buffer));
}
Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!ALLOWED_ORIGINS.has(origin))return new Response("Forbidden origin",{status:403});
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headersFor(origin)});
  if(request.method!=="POST")return reply(405,{error:"method_not_allowed"},origin);
  if(Number(request.headers.get("content-length")||0)>MAX_BODY)
    return reply(413,{error:"request_too_large"},origin);
  const auth=request.headers.get("authorization")||"";
  const match=auth.match(/^Bearer ([^\s]+)$/i);
  if(!match||match[1].length<30)return reply(401,{error:"not_authenticated"},origin);
  const dbUrl=Deno.env.get("SUPABASE_URL");
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
  if(!dbUrl||!anonKey)return reply(503,{error:"database_not_configured"},origin);
  const client=createClient(dbUrl,anonKey,{
    auth:{autoRefreshToken:false,persistSession:false},
    global:{headers:{Authorization:auth}}
  });
  const {data:{user},error:authError}=await client.auth.getUser(match[1]);
  if(authError||!user)return reply(401,{error:"invalid_session"},origin);
  const gate=await client.from("ss_order_admins")
    .select("user_id").eq("user_id",user.id).maybeSingle();
  if(gate.error||!gate.data)return reply(403,{error:"not_store_admin"},origin);

  let action;
  try{
    const body=await request.text();
    if(body.length>MAX_BODY)return reply(413,{error:"request_too_large"},origin);
    action=parseAction(JSON.parse(body));
  }catch{return reply(400,{error:"invalid_json"},origin)}
  if(!action)return reply(422,{error:"invalid_read_action"},origin);

  const key=Deno.env.get("SAFKA_API_KEY")||"";
  if(key.trim().length<10)return reply(503,{error:"safka_api_key_not_configured"},origin);
  // Safqa API key is sent in exactly one server-to-server GET. No browser storage,
  // redirects, logs, provider POSTs, order dispatch or DB writes.
  const target=new URL(BASE+action.path,HOST);
  let upstream;
  try{
    upstream=await fetch(target.href,{
      method:"GET",
      headers:{"accept":"application/json","api-safka-key":key.trim()},
      cache:"no-store",
      redirect:"error",
      signal:AbortSignal.timeout(15_000)
    });
  }catch{
    return reply(502,{error:"safka_connection_unavailable"},origin);
  }
  if(!upstream.ok){
    // Never return arbitrary Safqa error body; it may include sensitive details.
    return reply(502,{
      error:"safka_provider_error",
      providerStatus:upstream.status
    },origin);
  }
  const contentType=upstream.headers.get("content-type")||"";
  if(!contentType.toLowerCase().includes("json"))
    return reply(502,{error:"unexpected_provider_content_type"},origin);
  let raw;
  try{raw=await readLimited(upstream)}
  catch{return reply(502,{error:"invalid_or_oversized_provider_response"},origin)}
  const projection=summarizeProviderResponse(action.mode,raw,action.mode==="products"?30:60);
  return reply(200,{
    ok:true,mode:"read_only",source:"Safqa public GET",
    upstreamStatus:upstream.status,
    ...projection,
    cached:false,syncedToShop:false,createdOrders:false
  },origin);
});
