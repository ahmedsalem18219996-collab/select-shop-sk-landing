/* SELECT SHOP — current TEMP storefront V2 optional direct checkout.
   Disabled by default. Never imports credentials or changes SELECT-SHOP-CLEAN.
   All prices, discounts and availability are verified by the Supabase Edge Function. */
(()=>{
"use strict";
const cfg=window.SELECT_SHOP_DIRECT_ORDER_V2_CONFIG||{};
const enabled=()=>cfg.enabled===true;
const $=selector=>document.querySelector(selector);
let turnstileWidget=null,token="",loadingScript=null;
const error=message=>{
 const node=$("#formError");
 if(node){node.textContent=message;node.hidden=false}
};
const ready=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl||"") &&
  !!cfg.publishableKey && !!cfg.turnstileSiteKey;
function updateCopy(){
 const heading=$("#checkoutHeading small");
 if(heading)heading.textContent="تأكيد الطلب مباشرة";
 const alert=$("#checkoutDialog .previewAlert");
 if(alert)alert.textContent="بعد الضغط على تأكيد الطلب، الأوردر بيتسجل في SELECT SHOP وهيظهر رقم تأكيده. واتساب للاستفسارات فقط.";
 const button=$("#checkoutForm .checkoutButton");
 if(button)button.textContent="تأكيد الطلب وتسجيله";
 // This link must NOT contain a prefilled customer order in direct checkout mode.
 const fallback=$("#whatsappFallback");
 if(fallback){
  const match=/^https:\/\/wa\.me\/([0-9]{8,16})(?:[/?#]|$)/.exec(fallback.href||"");
  fallback.hidden=!match;
  if(match){
   fallback.href="https://wa.me/"+match[1]+"?text="+encodeURIComponent("مرحبًا SELECT SHOP، عندي استفسار عن المنتجات.");
   fallback.textContent="واتساب للاستفسارات فقط";
   fallback.setAttribute("aria-label","واتساب للاستفسارات فقط");
  }
 }
}
async function loadTurnstile(){
 if(window.turnstile)return;
 if(loadingScript)return loadingScript;
 loadingScript=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async=true;script.defer=true;
  script.onload=()=>window.turnstile?resolve():reject(Error("captcha_load_failed"));
  script.onerror=()=>reject(Error("captcha_load_failed"));
  document.head.appendChild(script);
 });
 return loadingScript;
}
async function prepare(){
 if(!enabled())return;
 if(!ready()){error("تسجيل الطلبات المباشر مش متاح دلوقتي. اتواصل مع المتجر على واتساب للاستفسار.");return}
 const form=$("#checkoutForm");if(!form)return;
 updateCopy(); // core may regenerate labels on each dialog opening
 let host=$("#selectShopV2Captcha");
 if(!host){
  host=document.createElement("div");
  host.id="selectShopV2Captcha";
  host.style.cssText="margin:12px 0;min-height:65px;display:flex;align-items:center;justify-content:center";
  form.insertBefore(host,$("#formError"));
 }
 if(turnstileWidget!==null)return;
 try{
  await loadTurnstile();
  turnstileWidget=window.turnstile.render(host,{
   sitekey:cfg.turnstileSiteKey,
   callback:value=>{token=value},
   "expired-callback":()=>{token=""},
   "error-callback":()=>{token="";error("التحقق الأمني فشل. جرّب مرة تانية.")},
  });
 }catch{error("تعذر تحميل التحقق الأمني. جرب تحديث الصفحة.")}
}
const serverErrors={
  captcha_required:"كمّل التحقق الأمني.",
  captcha_failed:"التحقق الأمني انتهى أو فشل. جرّب مرة تانية.",
  captcha_unavailable:"التحقق الأمني غير متاح مؤقتًا.",
  too_many_orders:"فيه محاولات كتيرة، حاول بعد شوية.",
  invalid_customer_or_items:"راجع بيانات التوصيل والمنتجات.",
  invalid_variant_or_sizes:"فيه مقاس أو لون محتاج يتراجع.",
  product_unavailable:"فيه منتج مبقاش متاح. راجع السلة.",
  invalid_item_role:"فيه اختيار محتاج مراجعة.",
  invalid_trial_selection:"راجع اختيارات التجربة.",
  shipping_review_required:"مراجعة تكلفة الشحن مطلوبة.",
  order_save_failed:"تعذر حفظ الأوردر. جرّب مرة تانية بنفس البيانات.",
  orders_not_configured:"استقبال الطلبات لسه مش جاهز.",
  storage_unavailable:"خدمة تسجيل الطلبات مش متاحة دلوقتي.",
  request_id_conflict:"تعذر تأكيد نفس الأوردر. راجع البيانات قبل المحاولة."
};
async function fingerprint(data){
 const bytes=new TextEncoder().encode(JSON.stringify(data));
 const hash=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,"0")).join("");
}
async function getRequestId(body){
 const hash=await fingerprint(body),storageKey="selectShopTempV2PendingOrder";
 try{
  const old=JSON.parse(sessionStorage.getItem(storageKey)||"null");
  if(old?.hash===hash && typeof old.id==="string")return old.id;
 }catch{}
 const id=crypto.randomUUID();
 try{sessionStorage.setItem(storageKey,JSON.stringify({hash,id}))}catch{}
 return id;
}
async function submit(customer,cartItems){
 if(!enabled())throw Error("تسجيل الطلبات المباشر لسه مش متاح.");
 if(!ready())throw Error("تسجيل الطلبات المباشر محتاج إعداد حماية المتجر أولًا.");
 await prepare();
 if(!token)throw Error("كمّل التحقق الأمني عشان نسجل الأوردر.");
 if(!Array.isArray(cartItems)||!cartItems.length)throw Error("السلة فاضية.");
 const body={customer:{
   name:String(customer.name||""),
   phone:String(customer.phone||""),
   governorate:String(customer.governorate||""),
   area:String(customer.area||""),
   address:String(customer.address||""),
   notes:String(customer.notes||""),
   inquiry:""
 },items:cartItems.map(x=>({
   productId:x.productId,variantId:x.variantId,
   sizes:x.productId==="carwash48"?[0]:x.sizes.map(Number),
   role:x.role==="trial"?"trial":"purchase"
 }))};
 const requestId=await getRequestId(body);
 const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(cfg.supabaseUrl.replace(/\/$/,"")+"/functions/v1/submit-order",{
   method:"POST",mode:"cors",signal:controller.signal,
   headers:{"content-type":"application/json","apikey":cfg.publishableKey},
   body:JSON.stringify({...body,idempotencyKey:requestId,turnstileToken:token})
  });
  const result=await response.json().catch(()=>({error:"invalid_response"}));
  if(!response.ok||result.ok!==true)throw Error(serverErrors[result.error]||"تعذر تسجيل الطلب. حاول مرة تانية.");
  if(typeof result.orderCode!=="string"||!Number.isFinite(Number(result.total)))
   throw Error("لم يتم تأكيد حفظ الطلب. حاول مرة تانية.");
  try{sessionStorage.removeItem("selectShopTempV2PendingOrder")}catch{}
  return result;
 }catch(e){
  if(e.name==="AbortError")throw Error("الاتصال اتأخر؛ مش قادرين نتأكد من حفظ الطلب. حاول بنفس البيانات.");
  throw e;
 }finally{
  clearTimeout(timeout);
  token="";
  if(turnstileWidget!==null&&window.turnstile)window.turnstile.reset(turnstileWidget);
 }
}
function receipt(result){
 const old=$("#selectShopV2Receipt");if(old)old.remove();
 const overlay=document.createElement("div");
 overlay.id="selectShopV2Receipt";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(13,16,15,.86);display:grid;place-items:center;padding:20px;direction:rtl";
 const panel=document.createElement("section");
 panel.style.cssText="width:min(100%,440px);background:#fff;color:#17241a;border-radius:18px;text-align:center;padding:25px;box-shadow:0 20px 60px #0005";
 const h=document.createElement("h2");h.textContent="تم تسجيل طلبك بنجاح";
 const p=document.createElement("p");p.textContent="رقم الطلب: "+result.orderCode;
 const total=document.createElement("p");total.textContent="الإجمالي: "+Number(result.total).toLocaleString("ar-EG")+" جنيه";
 const note=document.createElement("p");
 note.textContent=result.shippingReviewRequired?
 "تكلفة شحن بعض المنتجات محتاجة تأكيد قبل اعتماد الإجمالي النهائي.":
 "هنتواصل معاك لتأكيد الطلب والتوصيل. الدفع عند الاستلام.";
 const close=document.createElement("button");close.type="button";close.textContent="تمام";
 close.style.cssText="padding:12px 36px;border:0;border-radius:10px;background:#18392b;color:white;cursor:pointer;font-weight:700";
 close.addEventListener("click",()=>overlay.remove());
 panel.append(h,p,total,note,close);overlay.append(panel);
 document.body.appendChild(overlay);close.focus();
}
window.SELECT_SHOP_DIRECT_ORDER_V2=Object.freeze({isEnabled:enabled,prepare,submit,receipt});
})();
