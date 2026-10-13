// Safqa product details read-only Edge Function (DRAFT; not deployed).
// Supabase target: select-shop-orders (zznqdwrohrycsjfpvkhc) ONLY.
// Product details are viewed by an authenticated order admin; never published.
import { createClient } from "npm:@supabase/supabase-js@2.79.0";
import { summarizeSafqaProductDetail } from "./pricing-preview.mjs";
const ORIGIN=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const BASE="https://api.safka-eg.com";
const PRODUCT_ID=/^[a-f0-9]{24}$/i;
const reply=(status,data,origin)=>new Response(JSON.stringify(data),{status,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "vary":"Origin","access-control-allow-origin":origin,
    "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods":"POST,OPTIONS"}
});
Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"";
  if(!ORIGIN.has(origin))return new Response("Forbidden",{status:403});
  if(req.method==="OPTIONS")return reply(200,{ok:true},origin);
  if(req.method!=="POST")return reply(405,{error:"method_not_allowed"},origin);
  const jwt=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if(!jwt||jwt.length<30)return reply(401,{error:"not_authenticated"},origin);
  const project=Deno.env.get("SUPABASE_URL");
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY");
  if(!project||!publicKey)return reply(503,{error:"missing_db_config"},origin);
  const db=createClient(project,publicKey,{global:{headers:{Authorization:"Bearer "+jwt}},
    auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(jwt);
  if(error||!user)return reply(401,{error:"invalid_login"},origin);
  const gate=await db.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(gate.error||!gate.data)return reply(403,{error:"not_admin"},origin);
  if(Number(req.headers.get("content-length")||0)>2048)return reply(413,{error:"too_large"},origin);
  let id;
  try{
    const text=await req.text();
    if(text.length>2048)throw Error();
    const body=JSON.parse(text);
    id=body.productId;
  }catch{return reply(400,{error:"invalid_body"},origin)}
  if(typeof id!=="string"||!PRODUCT_ID.test(id))return reply(422,{error:"invalid_product_id"},origin);
  const token=Deno.env.get("SAFKA_API_KEY");
  if(!token||token.trim().length<10)return reply(503,{error:"missing_safka_key"},origin);
  // One fixed provider GET path; IDs cannot escape the provider product route.
  let upstream;
  try{
    upstream=await fetch(new URL("/api/v1/public/product/"+id,BASE),{
      method:"GET",
      headers:{"accept":"application/json","api-safka-key":token.trim()},
      redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)
    });
  }catch{return reply(502,{error:"provider_not_reachable"},origin)}
  if(!upstream.ok)return reply(502,{error:"provider_error",providerStatus:upstream.status},origin);
  const length=Number(upstream.headers.get("content-length")||0);
  if(length>750000)return reply(502,{error:"provider_response_too_large"},origin);
  if(!(upstream.headers.get("content-type")||"").includes("json"))
    return reply(502,{error:"provider_not_json"},origin);
  let raw;
  try{
    const reader=upstream.body?.getReader();
    if(!reader)throw Error();
    const parts=[];let total=0;
    try{
      while(true){
        const x=await reader.read();if(x.done)break;
        total+=x.value.byteLength;
        if(total>750000){await reader.cancel();throw Error()}
        parts.push(x.value);
      }
    }finally{reader.releaseLock()}
    const joined=new Uint8Array(total);let offset=0;
    for(const part of parts){joined.set(part,offset);offset+=part.byteLength}
    raw=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(joined));
  }catch{return reply(502,{error:"provider_payload_invalid"},origin)}
  try{
    const detail=summarizeSafqaProductDetail(raw);
    if(detail._id!==id)return reply(502,{error:"product_id_mismatch"},origin);
    return reply(200,{ok:true,mode:"read_only",synced:false,ordersCreated:false,detail},origin);
  }catch{return reply(502,{error:"unrecognized_product_detail_format"},origin)}
});
