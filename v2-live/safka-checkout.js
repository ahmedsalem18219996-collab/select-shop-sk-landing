/* SELECT SHOP TEMP ONLY — Safqa product checkout is gated by owner-reviewed price and Turnstile.
   Public app has no Safqa credentials. Order capture is ONLY to private SELECT SHOP inbox,
   never an automatic supplier order. Existing shoe checkout remains unchanged. */
(()=>{"use strict";
const BASE="https://zznqdwrohrycsjfpvkhc.supabase.co";
const KEY="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const $=(s,p=document)=>p.querySelector(s);
const n=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
const valid=code=>typeof code==="string"&&/^[a-f0-9]{24}$/i.test(code);
const money=number=>Number(number).toLocaleString("ar-EG")+" ج.م";
let configPromise=null;
async function config(){
  if(!configPromise)configPromise=fetch(BASE+"/functions/v1/safka-checkout-config",{
    method:"GET",headers:{apikey:KEY},cache:"no-store",signal:AbortSignal.timeout(12000)
  }).then(r=>{if(!r.ok)throw Error("config_failed");return r.json()});
  return configPromise;
}
async function regions(){
  const res=await fetch(BASE+"/rest/v1/rpc/ss_safka_checkout_regions",{
    method:"POST",headers:{apikey:KEY,"content-type":"application/json"},body:"{}",signal:AbortSignal.timeout(12000)
  });
  if(!res.ok)throw Error("shipping_regions_unavailable");
  const data=await res.json();
  return Array.isArray(data)?data:[];
}
function makeField(labelText,key,type="text",max=140){
  const label=n("label","ssCoLabel",labelText);
  const field=n(type==="notes"?"textarea":"input","ssCoInput");
  field.name=key;field.required=key!=="notes";
  field.maxLength=max;
  if(type==="tel"){field.type="tel";field.inputMode="tel";field.pattern="0[1][0125][0-9]{8}";field.placeholder="01xxxxxxxxx";}
  else if(type==="notes"){field.rows=2;field.required=false;}
  else{field.type="text";}
  label.append(field);return {label,field};
}
function loadTurnstile(){
  if(window.turnstile?.render)return Promise.resolve();
  if(window.SS_SAFKA_TURNSTILE_LOADING)return window.SS_SAFKA_TURNSTILE_LOADING;
  window.SS_SAFKA_TURNSTILE_LOADING=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async=true;script.defer=true;
    const timer=setTimeout(()=>reject(Error("captcha_timeout")),15000);
    script.onload=()=>{
      const wait=()=>{
        if(window.turnstile?.render){clearTimeout(timer);resolve();}
        else setTimeout(wait,100);
      };wait();
    };
    script.onerror=()=>{clearTimeout(timer);reject(Error("captcha_script_failed"));};
    document.head.append(script);
  });
  return window.SS_SAFKA_TURNSTILE_LOADING;
}
async function open(product){
  if(!valid(product?.id)||!Number.isSafeInteger(Number(product.final_price_egp))||
     Number(product.final_price_egp)<=0||product.can_purchase!==false)return;
  const options=(Array.isArray(product.variants)?product.variants:[]).filter(v=>v.available===true&&valid(v.id));
  if(!options.length)return;
  const dialog=n("dialog","ssCoDialog");
  dialog.setAttribute("aria-label","طلب منتج SELECT SHOP");
  const close=n("button","ssCoClose","×");close.type="button";close.setAttribute("aria-label","إغلاق");
  close.onclick=()=>dialog.close();
  const title=n("h2","","اطلب من SELECT SHOP");
  const summary=n("p","ssCoProduct",product.name+" — "+money(product.final_price_egp));
  const info=n("p","ssCoInfo","بيانات الطلب تتحفظ في SELECT SHOP للمراجعة والتأكيد، ومش بتتبعت للمورد تلقائيًا.");
  const form=n("form","ssCoForm");form.noValidate=false;
  const choose=n("label","ssCoLabel","اللون / المقاس / الاختيار");
  const variant=n("select","ssCoInput");variant.name="variant";variant.required=true;
  for(const v of options){
    const opt=n("option","",String(v.name||"الاختيار")+" — "+v.id.slice(-5));
    opt.value=v.id;variant.append(opt);
  }
  choose.append(variant);
  const qtyLabel=n("label","ssCoLabel","الكمية");
  const qty=n("select","ssCoInput");qty.name="quantity";
  for(let i=1;i<=3;i++){const opt=n("option","",String(i));opt.value=String(i);qty.append(opt)}
  qtyLabel.append(qty);
  const name=makeField("الاسم بالكامل","name","text",120);
  const phone=makeField("رقم الموبايل","phone","tel",24);
  const regionLabel=n("label","ssCoLabel","المحافظة");
  const governorate=n("select","ssCoInput");governorate.name="governorate";governorate.required=true;
  governorate.append(n("option","","جاري تحميل المحافظات..."));
  regionLabel.append(governorate);
  const area=makeField("المدينة / المنطقة","area","text",120);
  const address=makeField("العنوان بالتفصيل","address","text",280);
  const notes=makeField("ملاحظات (اختياري)","notes","notes",300);
  const line=n("p","ssCoTotal","الإجمالي شامل التوصيل: "+money(product.final_price_egp));
  qty.addEventListener("change",()=>line.textContent="الإجمالي شامل التوصيل: "+money(Number(qty.value)*Number(product.final_price_egp)));
  const captcha=n("div","ssCoCaptcha");
  const status=n("p","ssCoStatus","جاري التحقق من جاهزية الطلب");
  status.setAttribute("role","status");
  const submit=n("button","ssCoSubmit","تأكيد إرسال طلب للمراجعة");
  submit.type="submit";submit.disabled=true;
  const explain=n("small","ssCoDisclaimer","مش هنخصم فلوس أونلاين. سعر المنتج شامل التوصيل، والدفع عند الاستلام بعد التأكيد.");
  form.append(choose,qtyLabel,name.label,phone.label,regionLabel,area.label,address.label,notes.label,line,captcha,submit,explain,status);
  const wrapper=n("div","ssCoContent");wrapper.append(close,title,summary,info,form);dialog.append(wrapper);
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{
    try{const id=dialog.dataset.widgetId;if(id&&window.turnstile)window.turnstile.remove(id)}catch{}
    dialog.remove();document.body.classList.remove("hasDialog");
  });
  for(const d of document.querySelectorAll("dialog[open]"))d.close();
  document.body.append(dialog);dialog.showModal();document.body.classList.add("hasDialog");
  let ready=false,token="",requestId=crypto.randomUUID();
  try{
    const [gate,shipping]=await Promise.all([config(),regions()]);
    governorate.replaceChildren();
    const initial=n("option","","اختار المحافظة");initial.value="";governorate.append(initial);
    for(const g of shipping){
      if(!valid(g?.id)||!g.name)continue;
      const opt=n("option","",g.name);opt.value=g.id;governorate.append(opt);
    }
    if(!gate.checkoutConfigured||!gate.siteKey){
      status.textContent="الطلب المباشر تحت التجهيز حاليًا؛ لسه مش متاح تأكيد أوردر من الموقع.";
      return;
    }
    if(!shipping.length){status.textContent="المحافظات غير متاحة حاليًا؛ جرب لاحقًا.";return;}
    await loadTurnstile();
    if(!dialog.isConnected)return;
    const widget=window.turnstile.render(captcha,{
      sitekey:gate.siteKey,theme:"auto",
      callback:value=>{token=value;submit.disabled=!ready||!token;},
      "expired-callback":()=>{token="";submit.disabled=true;},
      "error-callback":()=>{token="";submit.disabled=true;status.textContent="تعذر التحقق الأمني. جرّب إعادة فتح الطلب.";}
    });
    dialog.dataset.widgetId=String(widget);
    ready=true;submit.disabled=!token;
    status.textContent="راجع بياناتك واختياراتك ثم أكّد الطلب.";
  }catch{
    status.textContent="تعذر تحميل نظام الطلبات الآن، تقدر تستفسر على واتساب.";
    return;
  }
  form.addEventListener("input",()=>{requestId=crypto.randomUUID()});
  form.addEventListener("submit",async e=>{
    e.preventDefault();if(!ready||!token||submit.disabled)return;
    if(!form.reportValidity())return;
    const check=phone.field.value.replace(/\s|-/g,"");
    if(!/^01[0125][0-9]{8}$/.test(check)){
      status.textContent="راجع رقم الموبايل المصري المكون من 11 رقم.";return;
    }
    submit.disabled=true;
    status.textContent="جاري تسجيل الطلب في SELECT SHOP...";
    const payload={requestId,productId:product.id,variantId:variant.value,
      quantity:Number(qty.value),governorateId:governorate.value,
      customer:{name:name.field.value.trim(),phone:check,area:area.field.value.trim(),
        address:address.field.value.trim(),notes:notes.field.value.trim()},turnstileToken:token};
    try{
      const response=await fetch(BASE+"/functions/v1/safka-capture-order",{
        method:"POST",cache:"no-store",headers:{"apikey":KEY,"content-type":"application/json"},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)
      });
      const body=await response.json();
      if(!response.ok||!body.ok)throw Error(body.error||"request_failed");
      form.replaceChildren();
      form.append(n("h3","","تم تسجيل طلبك للمراجعة"),
        n("p","ssCoSuccess","رقم الطلب: "+body.orderCode),
        n("p","","الإجمالي: "+money(body.totalEgp)),
        n("p","","هنراجع الطلب ونأكد معاك. لم يُرسل للمورد بعد."));
    }catch(err){
      const errors={captcha_failed:"التحقق الأمني غير صحيح.",captcha_required:"أعد التحقق الأمني.",
        product_not_ready:"المنتج لم يعد متاحًا للطلب.",variant_not_available:"الاختيار مش متوفر حاليًا.",
        checkout_not_configured:"نظام الطلبات غير مفعّل حاليًا.",order_save_failed:"تعذر تسجيل الطلب؛ تواصل مع خدمة العملاء.",
        captcha_unavailable:"التحقق الأمني متعطل حاليًا.",rate_limit_exceeded:"في طلبات كتير؛ جرّب لاحقًا."};
      status.textContent=errors[err.message]||"تعذر تأكيد التسجيل. تحقق من رقم الطلب قبل إعادة المحاولة.";
      token="";
      try{window.turnstile?.reset(dialog.dataset.widgetId)}catch{}
      submit.disabled=true;
    }
  });
}
window.SS_SAFKA_CHECKOUT=Object.freeze({open});
})();