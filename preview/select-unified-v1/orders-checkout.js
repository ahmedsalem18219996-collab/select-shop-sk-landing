/* SELECT SHOP guest checkout adapter. Disabled until stand-alone backend is verified.
   Supabase service-role credentials and order pricing are NEVER present in this file. */
(()=>{
"use strict";
const cfg=window.SELECT_SHOP_GUEST_ORDERS||{};
const isEnabled=()=>cfg.enabled===true;
let turnstileId=null,captchaToken="",scriptPromise=null;
const $=q=>document.querySelector(q);
function setError(message){
 const err=$("#formError");
 if(err){err.textContent=message;err.hidden=false}
}
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   script.async=true;script.defer=true;
   script.onload=()=>window.turnstile?resolve():reject(Error("captcha_load"));
   script.onerror=()=>reject(Error("captcha_load"));
   document.head.append(script);
 });
 return scriptPromise;
}
async function prepare(){
 if(!isEnabled())return;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl||"") ||
    !cfg.publishableKey||!cfg.turnstileSiteKey){
   setError("استقبال الطلبات لسه مش متاح. الرجاء التواصل مع المتجر للاستفسار.");
   return;
 }
 const form=$("#checkoutForm");if(!form)return;
 let host=$("#ssfOrderCaptcha");
 if(!host){
   host=document.createElement("div");host.id="ssfOrderCaptcha";
   host.style.cssText="margin:12px 0;min-height:66px;display:flex;align-items:center;justify-content:center";
   form.insertBefore(host,$("#whatsappFallback")||null);
 }
 if(turnstileId!==null)return;
 try{
   await loadTurnstile();
   turnstileId=window.turnstile.render(host,{
     sitekey:cfg.turnstileSiteKey,
     callback:token=>{captchaToken=token},
     "expired-callback":()=>{captchaToken=""},
     "error-callback":()=>{captchaToken="";setError("تعذر التحقق الأمني. يرجى تحديث الصفحة والمحاولة.")},
   });
 }catch{
   setError("التحقق الأمني غير متاح مؤقتًا. حاول تاني بعد شوية.");
 }
 const cue=$(".checkout-trust-notice p");
 if(cue)cue.textContent="الطلب بيتسجل مباشرة بعد التأكيد، وهيظهر رقم الطلب فورًا. الدفع عند الاستلام حسب شروط المعاينة.";
 const helper=$(".checkout-cta-wrap .whatsapp small");
 if(helper)helper.textContent="هيظهر رقم الطلب بعد الحفظ";
 const fallback=$("#whatsappFallback");
 if(fallback){fallback.hidden=false;fallback.textContent="واتساب للاستفسارات فقط"}
}
async function digest(value){
 const bytes=new TextEncoder().encode(value);
 const buf=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(buf),x=>x.toString(16).padStart(2,"0")).join("");
}
async function idempotencyKey(payload){
 const fingerprint=await digest(JSON.stringify(payload));
 const key="ssfPendingOrderRequest";
 try{
   const saved=JSON.parse(sessionStorage.getItem(key)||"null");
   if(saved?.fingerprint===fingerprint && typeof saved?.id==="string")return saved.id;
 }catch{}
 const id=crypto.randomUUID();
 try{sessionStorage.setItem(key,JSON.stringify({fingerprint,id}))}catch{}
 return id;
}
function clearIdempotency(){try{sessionStorage.removeItem("ssfPendingOrderRequest")}catch{}}
function serverError(code){
 const messages={
   invalid_customer_or_items:"راجع الاسم والموبايل والعنوان والمنتجات المطلوبة.",
   invalid_variant_or_sizes:"فيه مقاس أو لون اتغير توفره. راجع اختيار المنتجات.",
   product_unavailable:"فيه منتج لم يعد متاحًا. راجع المنتجات المختارة.",
   invalid_item_role:"فيه اختيار محتاج مراجعة قبل تأكيد الطلب.",
   captcha_required:"كمّل التحقق الأمني قبل تأكيد الطلب.",
   captcha_failed:"التحقق الأمني انتهى أو غير صحيح. حاول تاني.",
   too_many_orders:"تم تجاوز عدد المحاولات المسموح مؤقتًا. حاول بعد شوية.",
   order_save_failed:"تعذر تسجيل الطلب. حاول تاني من غير تغيير بيانات الطلب.",
   orders_not_configured:"استقبال الطلبات غير متاح حاليًا.",
 };
 return messages[code]||"تعذر تسجيل الطلب حاليًا. لم يتم تأكيده، ويُرجى إعادة المحاولة.";
}
async function submit(data,items){
 if(!isEnabled())throw Error("orders_disabled");
 await prepare();
 if(!cfg.supabaseUrl||!cfg.publishableKey||!cfg.turnstileSiteKey)throw Error("orders_not_configured");
 if(!captchaToken)throw Error("captcha_required");
 const customer={
   name:String(data.name||""),phone:String(data.phone||""),
   governorate:String(data.governorate||""),area:String(data.area||""),
   address:String(data.address||""),notes:String(data.notes||""),
   inquiry:String(data.inquiry||""),
 };
 const normalizedItems=items.map(x=>({
   productId:x.productId,variantId:x.variantId,sizes:x.sizes.map(Number),role:x.role,
 }));
 const payload={customer,items:normalizedItems};
 const key=await idempotencyKey(payload);
 const token=captchaToken;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),25000);
 try{
   const response=await fetch(cfg.supabaseUrl.replace(/\/$/,"")+"/functions/v1/submit-order",{
     method:"POST",mode:"cors",
     headers:{"content-type":"application/json","apikey":cfg.publishableKey},
     body:JSON.stringify({...payload,idempotencyKey:key,turnstileToken:token}),
     signal:controller.signal,
   });
   const result=await response.json().catch(()=>({error:"unknown_error"}));
   if(!response.ok||result.ok!==true)throw Error(serverError(result.error));
   clearIdempotency();
   return result;
 }catch(error){
   throw Error(error.name==="AbortError"?"انتهى وقت الاتصال. لم نقدر نتأكد من تسجيل الطلب؛ حاول مرة تانية.":error.message);
 }finally{
   clearTimeout(timer);captchaToken="";
   if(turnstileId!==null&&window.turnstile)window.turnstile.reset(turnstileId);
 }
}
function receipt(result){
 const existing=$("#ssfOrderReceipt");existing?.remove();
 const overlay=document.createElement("div");overlay.id="ssfOrderReceipt";
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.style.cssText="position:fixed;inset:0;z-index:99999;background:#061820e8;display:grid;place-items:center;padding:20px;direction:rtl";
 const panel=document.createElement("section");
 panel.style.cssText="width:min(100%,450px);border:1px solid #b5d7c7;border-radius:18px;background:#fff;color:#1c3836;box-shadow:0 15px 60px #06182066;text-align:center;padding:30px";
 const icon=document.createElement("div");icon.textContent="✓";
 icon.style.cssText="margin:0 auto 14px;border-radius:50%;background:#e0f4e9;color:#176f50;font-size:36px;font-weight:900;width:68px;height:68px;display:grid;place-items:center";
 const title=document.createElement("h2");title.textContent="تم تسجيل طلبك بنجاح";
 const code=document.createElement("strong");code.textContent=result.orderCode;
 code.style.cssText="display:block;font-size:22px;margin:12px 0;direction:ltr;letter-spacing:2px";
 const total=document.createElement("p");total.textContent="إجمالي الطلب: "+Number(result.total).toLocaleString("ar-EG")+" جنيه";
 const note=document.createElement("p");note.textContent=result.shippingReviewRequired?
  "هنراجع تفاصيل شحن المحافظة ونتواصل لتأكيد الإجمالي قبل تجهيز الطلب.":
  "هنراجع الأوردر ونتواصل لتأكيده. الدفع عند الاستلام.";
 const button=document.createElement("button");button.type="button";button.textContent="العودة للمتجر";
 button.style.cssText="background:#168465;color:white;border:0;border-radius:11px;padding:12px 28px;margin-top:9px;font-weight:bold;cursor:pointer";
 button.addEventListener("click",()=>overlay.remove());
 panel.append(icon,title,code,total,note,button);overlay.append(panel);document.body.append(overlay);button.focus();
}
window.SELECT_SHOP_GUEST_CHECKOUT={isEnabled,prepare,submit,receipt,setError};
})();
