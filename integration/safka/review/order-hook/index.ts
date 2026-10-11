// REVIEW DRAFT — NOT DEPLOYED. Safqa order-hook / select-shop-orders ONLY.
// Safqa has no documented webhook signature. This uses a high-entropy
// capability secret in the URL query string, NOT a cryptographic signature.
// Exact Safqa webhook JSON schema is not verified; writes default DISABLED.
// Never log URL, secret, request body or customer data.
import { createClient } from "npm:@supabase/supabase-js@2.79.0";
import { parseOrderHook,canonicalReplayMaterial } from "../order-hook-contract.mjs";

const MAX_BYTES=16384;
const encoder=new TextEncoder();
const result=(status,body)=>new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
async function digestHex(v){
  const d=await crypto.subtle.digest("SHA-256",encoder.encode(v));
  return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,"0")).join("");
}
function constantTimeHex(a,b){
  if(!/^[0-9a-f]{64}$/.test(a)||!/^[0-9a-f]{64}$/.test(b))return false;
  let diff=0;for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function isAuthorized(request){
  const expected=(Deno.env.get("SAFKA_HOOK_TOKEN_SHA256")||"").toLowerCase().trim();
  // A query secret is used ONLY because custom provider headers were not verified.
  // Never include this query in logging, tracing, analytics or redirects.
  const value=new URL(request.url).searchParams.get("hook_secret")||"";
  if(value.length<43||value.length>128||!/^[A-Za-z0-9_-]+$/.test(value))return false;
  return constantTimeHex(await digestHex(value),expected);
}
async function readBoundedBody(request){
  if(Number(request.headers.get("content-length")||0)>MAX_BYTES)throw Error("size");
  const reader=request.body?.getReader();if(!reader)return "";
  let total=0;const chunks=[];
  try{
    while(true){
      const chunk=await reader.read();
      if(chunk.done)break;
      total+=chunk.value.byteLength;
      if(total>MAX_BYTES){await reader.cancel();throw Error("size")}
      chunks.push(chunk.value);
    }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let offset=0;
  for(const part of chunks){bytes.set(part,offset);offset+=part.length}
  return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
}
Deno.serve(async request=>{
  if(request.method!=="POST")return result(405,{error:"method_not_allowed"});
  if(!(await isAuthorized(request)))return result(401,{error:"unauthorized"});
  let parsed;
  try{
    const raw=await readBoundedBody(request);
    parsed=parseOrderHook(JSON.parse(raw));
  }catch(err){
    return result(err instanceof Error&&err.message==="size"?413:400,{error:"invalid_request"});
  }
  if(parsed.kind==="ignored")return result(202,{ok:true,mode:"ignored"});
  if(parsed.kind!=="status")return result(422,{error:"unsupported_payload_contract"});
  // Do not enable until the owner provides a redacted actual event and
  // the field paths in order-hook-contract.mjs have been verified.
  if(Deno.env.get("SAFKA_WEBHOOK_SCHEMA_VERIFIED")!=="true")
    return result(202,{ok:true,mode:"contract_pending",persisted:false});
  if(Deno.env.get("SAFKA_WEBHOOK_WRITE_ENABLED")!=="true")
    return result(202,{ok:true,mode:"dry_run",persisted:false});
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey)return result(503,{error:"storage_unavailable"});
  const db=createClient(url,serviceKey,{
    auth:{autoRefreshToken:false,persistSession:false}
  });
  const match=await db.from("ss_affiliate_tracking")
    .select("order_id")
    .eq("platform","safqa")
    .eq("supplier_order_ref",parsed.orderRef)
    .limit(2);
  if(match.error)return result(503,{error:"lookup_unavailable"});
  const related=match.data||[];
  // In ambiguous cases never assign an event to a specific customer order.
  const linked=related.length===1?related[0].order_id:null;
  const fingerprint=await digestHex(canonicalReplayMaterial(parsed));
  const row={
    event_hash:fingerprint,
    supplier_order_ref:parsed.orderRef,
    supplier_status:parsed.status,
    occurred_at:parsed.occurredAt,
    linked_order_id:linked,
    resolution:linked?"linked":"unmatched"
  };
  const insert=await db.from("ss_safka_webhook_events").insert(row);
  if(insert.error?.code==="23505")return result(200,{ok:true,mode:"duplicate"});
  if(insert.error)return result(503,{error:"storage_unavailable"});
  // Deliberately no ss_orders.status update and no external API calls.
  // Owner will first review status mapping and reconciliation rules.
  return result(202,{ok:true,mode:linked?"linked_for_review":"unmatched_for_review"});
});
