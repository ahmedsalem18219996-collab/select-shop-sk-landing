/* SELECT SHOP temporary customer checkout: public prices, private review-only orders. */
(()=>{"use strict";
const BASE="https://zznqdwrohrycsjfpvkhc.supabase.co";
const KEY="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const make=(tag,cls,label)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(label!==undefined)el.textContent=String(label);
  return el;
};
const money=v=>Number(v).toLocaleString("ar-EG")+" ج.م";
const idOk=v=>typeof v==="string"&&/^[a-f0-9]{24}$/i.test(v);
const int=v=>Number.isSafeInteger(Number(v))?Number(v):0;
const encode=new TextEncoder();
let regionsCache=null;
async function regions(){
  if(!regionsCache)regionsCache=fetch(BASE+"/rest/v1/rpc/ss_safka_checkout_regions",{
    method:"POST",headers:{apikey:KEY,"content-type":"application/json"},body:"{}",cache:"no-store",
    signal:AbortSignal.timeout(12000)
  }).then(async res=>{
    if(!res.ok)throw Error("shipping_unavailable");
    const rows=await res.json();
    if(!Array.isArray(rows)||!rows.length)throw Error("shipping_unavailable");
    return rows;
  }).catch(e=>{regionsCache=null;throw e});
  return regionsCache;
}
function labeled(text,name,type="text",maxlength=120){
  const wrapper=make("label","ssCoLabel",text);
  const el=make(type==="notes"?"textarea":"input","ssCoInput");
  el.name=name;el.maxLength=maxlength;el.required=type!=="notes";
  if(type==="tel"){el.type="tel";el.inputMode="tel";el.autocomplete="tel";el.placeholder="01xxxxxxxxx";}
  else if(type==="notes"){el.rows=2;el.required=false;}
  else {el.type="text";}
  if(name==="name")el.autocomplete="name";
  if(name==="address")el.autocomplete="street-address";
  wrapper.append(el);return {wrapper,el};
}
async function antiSpamProof(requestId){
  // Mild device proof + server hourly rate limit. No third-party tracking or CAPTCHA widget.
  for(let i=0;i<1500000;i++){
    const nonce=i.toString(16);
    const buffer=await crypto.subtle.digest("SHA-256",encode.encode("SELECT-SHOP-ORDER:"+requestId+":"+nonce));
    const bytes=new Uint8Array(buffer);
    if(bytes[0]===0&&bytes[1]===0)return nonce;
    if(i%2048===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw Error("security_validation_unavailable");
}
async function open(product){
  if(!idOk(product?.id))return;
  const choices=(Array.isArray(product.variants)?product.variants:[])
    .filter(v=>v.available===true&&idOk(v.id)&&int(v.display_price_egp)>0);
  if(!choices.length)return;
  const dialog=make("dialog","ssCoDialog");
  dialog.setAttribute("aria-label","إتمام طلب SELECT SHOP");
  const outer=make("div","ssCoContent");
  const close=make("button","ssCoClose","×");close.type="button";
  close.setAttribute("aria-label","إغلاق");close.addEventListener("click",()=>dialog.close());
  const h=make("h2","","إتمام الطلب");
  const summary=make("p","ssCoProduct",product.name);
  const note=make("p","ssCoInfo","اختار المقاس أو اللون وكمّل بيانات التوصيل. هنتواصل معاك لتأكيد الأوردر.");
  const form=make("form","ssCoForm");
  const choiceRow=make("label","ssCoLabel","اللون / المقاس / الاختيار");
  const variant=make("select","ssCoInput");variant.name="variant";variant.required=true;
  for(const v of choices){const option=make("option","",(v.name||"اختيار")+" — "+money(v.display_price_egp));option.value=v.id;variant.append(option);}
  choiceRow.append(variant);
  const quantityRow=make("label","ssCoLabel","الكمية");
  const quantity=make("select","ssCoInput");quantity.name="quantity";
  for(let i=1;i<=3;i++){const option=make("option","",String(i));option.value=String(i);quantity.append(option);}
  quantityRow.append(quantity);
  const name=labeled("الاسم بالكامل","name","text",120);
  const phone=labeled("رقم الموبايل","phone","tel",24);
  const city=labeled("المدينة / المنطقة","area","text",120);
  const address=labeled("العنوان بالتفصيل","address","text",280);
  const notes=labeled("ملاحظات إضافية (اختياري)","notes","notes",300);
  const govRow=make("label","ssCoLabel","المحافظة");
  const gov=make("select","ssCoInput");gov.required=true;gov.name="governorate";
  const placeholder=make("option","","جاري تحميل المحافظات");placeholder.value="";gov.append(placeholder);govRow.append(gov);
  const total=make("p","ssCoTotal");
  const calc=()=>{
    const v=choices.find(x=>x.id===variant.value)||choices[0];
    total.textContent="الإجمالي شامل التوصيل: "+money(int(v.display_price_egp)*Number(quantity.value||1));
  };
  variant.addEventListener("change",calc);quantity.addEventListener("change",calc);calc();
  const status=make("p","ssCoStatus","جاري تجهيز نموذج الطلب");
  status.setAttribute("role","status");status.setAttribute("aria-live","polite");
  const submit=make("button","ssCoSubmit","تأكيد الطلب");
  submit.type="submit";submit.disabled=true;
  const terms=make("small","ssCoDisclaimer","الدفع عند الاستلام بعد تأكيد الطلب. لن نطلب بيانات بطاقة بنكية.");
  // A decoy field helps avoid automated bot submissions; it is never shown to customers.
  const website=make("input","ssCoHoney");
  website.name="website";website.autocomplete="off";website.tabIndex=-1;
  website.setAttribute("aria-hidden","true");website.type="text";
  form.append(choiceRow,quantityRow,name.wrapper,phone.wrapper,govRow,city.wrapper,address.wrapper,
    notes.wrapper,total,terms,website,submit,status);
  outer.append(close,h,summary,note,form);dialog.append(outer);
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{
    dialog.remove();document.body.classList.remove("hasDialog");
  });
  document.querySelectorAll("dialog.ssCoDialog[open]").forEach(d=>d.close());
  document.body.append(dialog);dialog.showModal();document.body.classList.add("hasDialog");
  const requestId=crypto.randomUUID();
  let proof=null,processing=false,ready=false;
  try{
    const [regionsList,nonce]=await Promise.all([regions(),antiSpamProof(requestId)]);
    if(!dialog.isConnected)return;
    gov.replaceChildren();
    const first=make("option","","اختار المحافظة");first.value="";gov.append(first);
    for(const place of regionsList){
      if(!idOk(place.id)||!place.name)continue;
      const option=make("option","",place.name);option.value=place.id;gov.append(option);
    }
    proof=nonce;ready=true;submit.disabled=false;
    status.textContent="جاهز لتسجيل طلبك.";
  }catch{
    status.textContent="تعذر تجهيز الطلب حاليًا. تواصل مع خدمة العملاء.";
  }
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!ready||processing||!proof)return;
    if(!form.reportValidity())return;
    const number=phone.el.value.trim().replace(/[\s-]/g,"");
    if(!/^01[0125][0-9]{8}$/.test(number)){
      status.textContent="راجع رقم الموبايل المصري (11 رقم).";phone.el.focus();return;
    }
    if(!gov.value){status.textContent="اختار المحافظة.";return;}
    processing=true;submit.disabled=true;status.textContent="جاري تسجيل الطلب...";
    const payload={
      requestId,productId:product.id,variantId:variant.value,quantity:Number(quantity.value),
      governorateId:gov.value,cityId:"",
      customer:{name:name.el.value.trim(),phone:number,area:city.el.value.trim(),
        address:address.el.value.trim(),notes:notes.el.value.trim()},
      workNonce:proof,website:website.value
    };
    try{
      const res=await fetch(BASE+"/functions/v1/safka-capture-order",{
        method:"POST",headers:{apikey:KEY,"content-type":"application/json"},
        body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(24000)
      });
      const data=await res.json();
      if(!res.ok||!data.ok)throw Error(data.error||"order_save_failed");
      form.replaceChildren();
      form.append(make("h3","","اتسجّل طلبك بنجاح"),
        make("p","ssCoSuccess","رقم الطلب: "+data.orderCode),
        make("p","ssCoTotal","الإجمالي شامل التوصيل: "+money(data.totalEgp)),
        make("p","ssCoInfo","هنراجع الأوردر ونتواصل معاك لتأكيده قبل التجهيز."),
        make("p","ssCoDisclaimer","احتفظ برقم الطلب للمتابعة."));
    }catch(err){
      const errors={
        invalid_order_details:"راجع الاسم ورقم الموبايل والعنوان.",
        unknown_governorate:"المحافظة مش متاحة حاليًا.",
        rate_limit_exceeded:"في طلبات كثيرة، تواصل مع خدمة العملاء.",
        variant_not_available:"الاختيار المطلوب مش متوفر حاليًا.",
        product_not_ready:"المنتج مش متاح للطلب حاليًا.",
        price_not_ready:"السعر اتغير. اقفل الطلب وافتح المنتج من جديد.",
        validation_required:"فشل التحقق الأمني. اقفل الطلب وجرّب مرة تانية.",
        request_id_conflict:"بيانات الطلب اتغيرت؛ اقفل الطلب وابدأ من جديد."
      };
      status.textContent=errors[err.message]||"تعذر تأكيد الحفظ. لو كنت حاولت قبل كده، تواصل معانا قبل إعادة الطلب.";
      submit.disabled=false;
    }finally{processing=false;}
  });
}
window.SS_SAFKA_CHECKOUT=Object.freeze({open});
})();