// SELECT SHOP Orders - standalone guest checkout (Supabase Edge Function).
// Deployment requires a DIFFERENT Supabase project from SELECT-SHOP-CLEAN.
// Mandatory secrets: TURNSTILE_SECRET_KEY, ORDER_HASH_SECRET.
// Built-in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must remain server-side.
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://selectshopeg.com","https://www.selectshopeg.com"]);
const encoder = new TextEncoder();
const text = (value: unknown, limit = 240) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const reply = (payload: object, status: number, origin: string) =>
  new Response(JSON.stringify(payload), {
    status, headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type, apikey, authorization, x-client-info",
      "access-control-allow-methods": "POST,OPTIONS",
      "vary": "Origin",
    },
  });
function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw",encoder.encode(secret),
    { name:"HMAC", hash:"SHA-256" },false,["sign"]);
  const output = await crypto.subtle.sign("HMAC",key,encoder.encode(value));
  return Array.from(new Uint8Array(output), byte=>byte.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async request => {
  const origin = request.headers.get("origin") || "";
  // Reject both cross-origin browsers and non-browser invocations by default.
  if (!allowedOrigins.has(origin)) return new Response("Forbidden origin",{status:403});
  if (request.method === "OPTIONS") return new Response(null,{
    status:204,
    headers:{
      "access-control-allow-origin":origin,
      "access-control-allow-headers":"content-type, apikey, authorization, x-client-info",
      "access-control-allow-methods":"POST,OPTIONS",
      "vary":"Origin",
    },
  });
  if (request.method !== "POST") return reply({error:"method_not_allowed"},405,origin);
  if (Number(request.headers.get("content-length") || 0) > 30000)
    return reply({error:"payload_too_large"},413,origin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const captchaSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const hashSecret = Deno.env.get("ORDER_HASH_SECRET");
  if (!url || !serviceKey || !captchaSecret || !hashSecret)
    return reply({error:"orders_not_configured"},503,origin);

  let incoming: Record<string,unknown>;
  try {
    const raw=await request.text();
    if (raw.length>30000) return reply({error:"payload_too_large"},413,origin);
    incoming=JSON.parse(raw);
    if(!incoming || typeof incoming!=="object" || Array.isArray(incoming)) throw Error("Invalid");
  } catch { return reply({error:"invalid_json"},400,origin); }

  const idempotencyKey=incoming.idempotencyKey;
  if(!validUuid(idempotencyKey)) return reply({error:"invalid_request_id"},400,origin);

  const db = createClient(url,serviceKey,{
    auth:{autoRefreshToken:false,persistSession:false},
  });

  // Retry-safe submission: no duplicate order if response is lost over mobile networks.
  const prior=await db.from("ss_orders").select("order_code,total_egp,shipping_review_required")
    .eq("idempotency_key",idempotencyKey).maybeSingle();
  if(prior.error)return reply({error:"storage_unavailable"},503,origin);
  if(prior.data)return reply({
    ok:true,orderCode:prior.data.order_code,total:prior.data.total_egp,
    shippingReviewRequired:prior.data.shipping_review_required,
  },200,origin);

  const customer = incoming.customer as Record<string,unknown>|null;
  const items = incoming.items;
  const fullName = text(customer?.name,120);
  let phone = text(customer?.phone,20).replace(/[^0-9]/g,"");
  if(/^201[0125][0-9]{8}$/.test(phone))phone=phone.slice(2);
  const governorate = text(customer?.governorate,60);
  const area = text(customer?.area,120);
  const address = text(customer?.address,280);
  const notes = text(customer?.notes,300);
  const inquiry = text(customer?.inquiry,300);
  if(fullName.length<2 || !/^01[0125][0-9]{8}$/.test(phone) ||
    governorate.length<2 || area.length<2 || address.length<5 ||
    !Array.isArray(items) || items.length<1 || items.length>12)
    return reply({error:"invalid_customer_or_items"},422,origin);

  // Turnstile CAPTCHA must be configured and passed before any new order is accepted.
  const token = text(incoming.turnstileToken,3000);
  if(token.length<5)return reply({error:"captcha_required"},422,origin);
  const ip=request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  let passedCaptcha=false;
  try {
    const check=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({secret:captchaSecret,response:token,remoteip:ip}),
    });
    const data=await check.json();
    passedCaptcha=data.success===true &&
      allowedOrigins.has("https://"+String(data.hostname||""));
  }catch {return reply({error:"captcha_unavailable"},503,origin)}
  if(!passedCaptcha)return reply({error:"captcha_failed"},403,origin);

  // HMAC fingerprints avoid storing customer IPs. Limit to five attempts/hour.
  const fingerprint=await hmac(ip,hashSecret);
  const limit=await db.rpc("ss_order_rate_allowed",{
    p_fingerprint:fingerprint,p_hour:new Date().toISOString(),
  });
  if(limit.error)return reply({error:"rate_limit_unavailable"},503,origin);
  if(limit.data!==true)return reply({error:"too_many_orders"},429,origin);

  const productIds=[...new Set(items.map(item => String(item?.productId||"")))];
  const catalogResult=await db.from("ss_order_catalog").select(
    "product_id,title,category,price_egp,fulfillment_group,additional_item_shipping_saving,available_variants,allows_size_try_on,active"
  ).in("product_id",productIds);
  if(catalogResult.error)return reply({error:"catalog_unavailable"},503,origin);
  const catalog=new Map((catalogResult.data||[]).map(p=>[p.product_id,p]));
  if(productIds.some(id=>!catalog.get(id)?.active))
    return reply({error:"product_unavailable"},422,origin);

  let shoes=0,trials=0,subtotal=0,discount=0;
  const groupCounts=new Map<string,number>();
  const validated=[];
  for(const input of items){
    if(!input || typeof input!=="object" || Array.isArray(input))
      return reply({error:"invalid_item"},422,origin);
    const product=catalog.get(input.productId);
    if(!product)return reply({error:"invalid_product"},422,origin);
    const variant=String(input.variantId||"");
    const available=(product.available_variants||{})[variant];
    const sizes=input.sizes;
    if(!Array.isArray(available)||!Array.isArray(sizes)||sizes.length<1||sizes.length>2||
      new Set(sizes).size!==sizes.length||
      sizes.some(s=>!Number.isInteger(s)||!available.includes(s)))
      return reply({error:"invalid_variant_or_sizes"},422,origin);
    const trial=input.role==="trial";
    if(!["trial","primary","purchase"].includes(input.role))
      return reply({error:"invalid_item_role"},422,origin);
    if(product.category==="car-care" && (trial||sizes.length!==1||sizes[0]!==0))
      return reply({error:"invalid_car_care_item"},422,origin);
    if(sizes.length===2 && (!product.allows_size_try_on||product.category!=="shoes"))
      return reply({error:"try_on_not_available"},422,origin);
    if(trial && product.category!=="shoes")
      return reply({error:"trial_not_available"},422,origin);
    if(trial) trials++;
    if(!trial && product.category==="shoes") shoes++;
    let payable=0;
    if(!trial){
      const previous=groupCounts.get(product.fulfillment_group)||0;
      const saving=previous>0?product.additional_item_shipping_saving:0;
      subtotal+=product.price_egp;
      discount+=saving;
      payable=product.price_egp-saving;
      groupCounts.set(product.fulfillment_group,previous+1);
    }
    validated.push({
      productId:product.product_id,productName:product.title,variantId:variant,
      sizes,role:trial?"trial":product.category==="shoes"?(input.role==="primary"?"primary":"purchase"):"purchase",
      price:product.price_egp,payablePrice:payable
    });
  }
  if(trials>1 || (trials>0&&shoes<1))
    return reply({error:"invalid_trial_selection"},422,origin);
  const total=subtotal-discount;
  const shippingReviewRequired=validated.some(item=>item.productId==="carwash48") &&
    !["القاهرة","الجيزة"].includes(governorate);
  const status=shippingReviewRequired?"shipping_quote":"new";
  const day=new Date().toISOString().slice(0,10).replaceAll("-","");
  const orderCode="SS-"+day+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
  const insert=await db.from("ss_orders").insert({
    order_code:orderCode,idempotency_key:idempotencyKey,
    customer_name:fullName,phone,governorate,area,address,notes,inquiry,
    items:validated,subtotal_egp:subtotal,discount_egp:discount,
    total_egp:total,shipping_review_required:shippingReviewRequired,status,
  }).select("order_code,total_egp,shipping_review_required").single();
  if(insert.error){
    // Lost-response retry or concurrent duplicate: return same persisted result.
    if(insert.error.code==="23505"){
      const existing=await db.from("ss_orders")
        .select("order_code,total_egp,shipping_review_required")
        .eq("idempotency_key",idempotencyKey).maybeSingle();
      if(existing.data)return reply({
        ok:true,orderCode:existing.data.order_code,total:existing.data.total_egp,
        shippingReviewRequired:existing.data.shipping_review_required,
      },200,origin);
    }
    console.error("Order insert failure",insert.error.code);
    return reply({error:"order_save_failed"},503,origin);
  }
  return reply({ok:true,orderCode:insert.data.order_code,total:insert.data.total_egp,
    shippingReviewRequired:insert.data.shipping_review_required},201,origin);
});
