// SELECT SHOP TEMP ONLY / select-shop-orders Supabase project.
// Read-only Safqa preflight: no supplier POST, no database changes, no customer PII returned.
// Caller must have a valid Supabase auth JWT and membership in ss_order_admins.
// Deploy with verify_jwt=true.
import { createClient } from "npm:@supabase/supabase-js@2.79.0";

const allowed=new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(status,body,origin)=>new Response(JSON.stringify(body),{
  status,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "access-control-allow-origin":origin,"vary":"Origin",
    "access-control-allow-headers":"authorization,apikey,x-client-info,content-type",
    "access-control-allow-methods":"POST,OPTIONS"}
});
Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"";
  if(!allowed.has(origin))return new Response("Forbidden",{status:403});
  if(req.method==="OPTIONS")return json(200,{ok:true},origin);
  if(req.method!=="POST")return json(405,{error:"method_not_allowed"},origin);
  if(Number(req.headers.get("content-length")||0)>4096)return json(413,{error:"payload_too_large"},origin);
  const auth=req.headers.get("Authorization")||"";
  const match=auth.match(/^Bearer (.+)$/);
  if(!match||match[1].length<20)return json(401,{error:"not_authenticated"},origin);
  const url=Deno.env.get("SUPABASE_URL");
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY");
  if(!url||!publicKey)return json(503,{error:"not_configured"},origin);
  const db=createClient(url,publicKey,{global:{headers:{Authorization:auth}},
    auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await db.auth.getUser(match[1]);
  if(authError||!user)return json(401,{error:"invalid_session"},origin);
  const gate=await db.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(gate.error||!gate.data)return json(403,{error:"not_order_admin"},origin);
  let id;
  try{
    const request=await req.json();
    id=request.orderId;
  }catch{return json(400,{error:"invalid_json"},origin)}
  if(typeof id!=="string"||!uuid.test(id))return json(422,{error:"invalid_order_id"},origin);
  const found=await db.from("ss_orders")
    .select("id,order_code,status,shipping_review_required,items")
    .eq("id",id).maybeSingle();
  if(found.error)return json(503,{error:"storage_unavailable"},origin);
  if(!found.data)return json(404,{error:"order_not_found"},origin);
  const order=found.data;
  const items=Array.isArray(order.items)?order.items:[];
  const productIds=[...new Set(items.map(x=>x.productId).filter(x=>typeof x==="string"))];
  const maps=productIds.length?await db.from("ss_supplier_catalog_map")
    .select("product_id,variant_id,supplier_product_id,active")
    .eq("platform","safqa").eq("active",true).in("product_id",productIds)
    :{data:[],error:null};
  if(maps.error)return json(503,{error:"supplier_mapping_unavailable"},origin);
  const lookup=new Map((maps.data||[]).map(x=>[x.product_id+"|"+x.variant_id,x]));
  const missing=[],blocked=[];
  for(const item of items){
    if(item.role==="trial")blocked.push("trial_selection_requires_manual_resolution");
    if(!lookup.has(item.productId+"|"+item.variantId))
      missing.push({productId:item.productId,variantId:item.variantId});
  }
  if(order.status!=="confirmed")blocked.push("order_not_confirmed");
  if(order.shipping_review_required)blocked.push("shipping_quote_required");
  if(items.length===0)blocked.push("order_items_missing");
  const prev=await db.from("ss_affiliate_tracking")
    .select("handoff_status,supplier_order_ref")
    .eq("order_id",id).eq("platform","safqa").maybeSingle();
  if(prev.error)return json(503,{error:"tracking_unavailable"},origin);
  if(prev.data&&prev.data.handoff_status!=="pending")
    blocked.push("already_recorded_on_safqa");
  return json(200,{
    ok:true,mode:"read_only_preflight",realSendingEnabled:false,
    orderCode:order.order_code,ready:!missing.length&&!blocked.length,
    missingSupplierMappings:missing,blockedReasons:[...new Set(blocked)],
    existingHandoff:prev.data?.handoff_status||null,
    note:"This API never sends customer data or creates supplier orders."
  },origin);
});
