/* SELECT SHOP TEMP: Multi-product supplier basket is separate from original shoe cart.
 * One private review order for up to eight supplier options. Never contacts a supplier.
 */
(()=>{"use strict";
const DB="https://zznqdwrohrycsjfpvkhc.supabase.co";
const KEY="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const STORAGE="selectShopSafqaCart:v1";
const mongo=x=>typeof x==="string"&&/^[a-f0-9]{24}$/i.test(x);
const e=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
const money=n=>Number(n).toLocaleString("ar-EG")+" ج.م";
const clean=(v,n)=>typeof v==="string"?v.slice(0,n):"";
const encoder=new TextEncoder();
let items=[],selector=null,cartDialog=null,regionsCache=null;
try{
 const saved=JSON.parse(localStorage.getItem(STORAGE)||"[]");
 if(Array.isArray(saved))items=saved.filter(x=>mongo(x?.productId)&&mongo(x?.variantId)&&
  Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=3&&
  Number.isInteger(x.unitPrice)&&x.unitPrice>90)
  .slice(0,8).map(x=>({productId:x.productId,variantId:x.variantId,quantity:x.quantity,
    unitPrice:x.unitPrice,name:clean(x.name,350),variant:clean(x.variant,220),photo:clean(x.photo,1400)}));
}catch{}
const quantity=()=>items.reduce((a,x)=>a+x.quantity,0);
const subtotal=()=>items.reduce((a,x)=>a+x.quantity*x.unitPrice,0);
const notify=t=>{const node=e("p","ssBagNotice",t);document.body.append(node);setTimeout(()=>node.remove(),3500)};
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify(items))}catch{}
 document.querySelectorAll("[data-safka-bag-count]").forEach(el=>el.textContent=String(quantity()));
 document.querySelectorAll("[data-safka-bag-open]").forEach(el=>el.setAttribute("aria-label","سلة المنتجات، "+quantity()+" قطع"));
}
function choices(product){
 return (Array.isArray(product?.variants)?product.variants:[])
  .filter(v=>mongo(v.id)&&v.available===true&&Number.isInteger(Number(v.display_price_egp))&&Number(v.display_price_egp)>90);
}
const photo=p=>(Array.isArray(p?.images)?p.images:[]).find(x=>typeof x==="string"&&/^https:\/\//.test(x))||"";
function addItem(product,variantId,amount=1){
 const option=choices(product).find(v=>v.id===variantId);
 if(!mongo(product?.id)||!option)return notify("الاختيار ده مش متاح دلوقتي.");
 const key=product.id+":"+variantId;
 const current=items.find(x=>x.productId+":"+x.variantId===key);
 if((current?.quantity||0)+amount>3||quantity()+amount>12)return notify("الحد الأقصى ٣ من كل اختيار و١٢ قطعة للسلة.");
 if(!current&&items.length>=8)return notify("الحد الأقصى ٨ اختيارات مختلفة في الطلب الواحد.");
 if(current){current.quantity+=amount;current.unitPrice=Number(option.display_price_egp)}
 else items.push({productId:product.id,variantId,quantity:amount,
   unitPrice:Number(option.display_price_egp),name:clean(product.name,350),
   variant:clean(option.name||"اختيار",220),photo:photo(product)});
 save();openCart();
}
function choose(product){
 const variants=choices(product);
 if(!variants.length)return notify("المنتج مش متاح للإضافة للسلة.");
 if(variants.length===1){addItem(product,variants[0].id);return}
 const dialog=e("dialog","ssBagDialog ssBagChoice");
 const shell=e("div","ssBagContent");
 const close=e("button","ssBagClose","×");close.type="button";close.setAttribute("aria-label","إغلاق");close.onclick=()=>dialog.close();
 const title=e("h2","","اختار اللون أو المقاس");
 const info=e("p","ssBagMuted",product.name);
 const label=e("label","ssBagLabel","الاختيار");
 const select=e("select","ssBagInput");
 for(const v of variants){const op=e("option","",(v.name||"اختيار")+" — "+money(v.display_price_egp));op.value=v.id;select.append(op)}
 label.append(select);
 const add=e("button","ssBagPrimary","أضف إلى السلة");add.type="button";add.onclick=()=>{dialog.close();addItem(product,select.value)};
 shell.append(close,title,info,label,add);dialog.append(shell);
 dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}
function newField(label,name,type="text",max=130){
 const root=e("label","ssBagLabel",label),input=e(type==="notes"?"textarea":"input","ssBagInput");
 input.name=name;input.maxLength=max;input.required=type!=="notes";
 if(type==="tel"){input.type="tel";input.inputMode="tel";input.placeholder="01xxxxxxxxx";input.autocomplete="tel";}
 else if(type==="notes"){input.rows=2;input.required=false}
 else input.type="text";
 if(name==="name")input.autocomplete="name";
 if(name==="address")input.autocomplete="street-address";
 root.append(input);return {root,input};
}
async function regions(){
 if(!regionsCache)regionsCache=fetch(DB+"/rest/v1/rpc/ss_safka_checkout_regions",{
  method:"POST",headers:{"apikey":KEY,"content-type":"application/json"},body:"{}",
  signal:AbortSignal.timeout(14000)}).then(async r=>{
  if(!r.ok)throw Error("regions_unavailable");
  const data=await r.json();if(!Array.isArray(data)||!data.length)throw Error("regions_unavailable");
  return data;
 }).catch(err=>{regionsCache=null;throw err});
 return regionsCache;
}
async function proofOfWork(id){
 for(let n=0;n<1600000;n++){
  const nonce=n.toString(16),data=encoder.encode("SELECT-SHOP-ORDER:"+id+":"+nonce);
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));
  if(bytes[0]===0&&bytes[1]===0)return nonce;
  if(n%2048===0)await new Promise(r=>setTimeout(r,0));
 }
 throw Error("proof_unavailable");
}
async function refreshCart(){
 const snapshot=items.slice(),updated=[],warnings=[];
 await Promise.all(snapshot.map(async item=>{
  try{
   const result=await fetch(DB+"/rest/v1/rpc/ss_safka_public_catalog_v2",{
    method:"POST",headers:{"apikey":KEY,"content-type":"application/json"},
    body:JSON.stringify({p_page:1,p_limit:1,p_search:item.productId,p_category:null}),
    signal:AbortSignal.timeout(13000)});
   if(!result.ok)throw Error("refresh_failed");
   const found=(await result.json()).items?.find(x=>x.id===item.productId);
   const v=choices(found).find(x=>x.id===item.variantId);
   if(!found||!v){warnings.push(item.name+" غير متوفر حاليًا");return}
   if(item.unitPrice!==Number(v.display_price_egp))warnings.push("سعر "+item.name+" اتحدث.");
   updated.push({...item,unitPrice:Number(v.display_price_egp),name:clean(found.name,350),
     variant:clean(v.name,220),photo:photo(found)});
  }catch{updated.push(item);warnings.push("راجع التوفر عند تأكيد الطلب: "+item.name)}
 }));
 items=updated;save();
 return warnings;
}
function lineRow(item){
 const row=e("article","ssBagItem");
 if(item.photo){const im=e("img","ssBagImg");im.src=item.photo;im.alt=item.name;im.loading="lazy";row.append(im)}
 const body=e("div","ssBagItemBody");body.append(e("strong","",item.name),e("small","",item.variant));
 body.append(e("span","ssBagLinePrice",money(item.unitPrice*item.quantity)));
 const controls=e("div","ssBagQty");
 for(const [text,action] of [["−",-1],["+",1]]){
  const b=e("button","",text);b.type="button";b.onclick=()=>{
   if(action===-1&&item.quantity===1)items=items.filter(i=>i!==item);
   else if(action===1&&(item.quantity>=3||quantity()>=12)){notify("الحد الأقصى للقطع اتوصل");return}
   else item.quantity+=action;
   save();renderBag();
  };controls.append(b);
  if(action===-1)controls.append(e("span","",String(item.quantity)));
 }
 const remove=e("button","ssBagRemove","حذف");remove.type="button";remove.onclick=()=>{
  items=items.filter(i=>i!==item);save();renderBag();
 };
 controls.append(remove);body.append(controls);row.append(body);return row;
}
function renderBag(){
 if(!cartDialog?.open)return;
 const list=cartDialog.querySelector("[data-bag-items]");if(!list)return;
 list.replaceChildren();
 if(!items.length)list.append(e("p","ssBagMuted","السلة فاضية. اختار أي منتج واضغط أضف إلى السلة."));
 else items.forEach(item=>list.append(lineRow(item)));
 cartDialog.querySelector("[data-bag-total]").textContent=money(subtotal());
 const btn=cartDialog.querySelector("[data-bag-checkout]");btn.disabled=!items.length;
}
async function openCheckout(){
 if(!cartDialog?.open||!items.length)return;
 const c=cartDialog.querySelector("[data-bag-form]"),list=cartDialog.querySelector("[data-bag-list]");
 list.hidden=true;c.hidden=false;c.replaceChildren();
 const back=e("button","ssBagLink","← العودة للسلة");back.type="button";
 back.onclick=()=>{c.hidden=true;list.hidden=false};
 const intro=e("p","ssBagMuted","الأوردر كله هيتسجل برقم طلب واحد. هنراجع التوفر ونكلمك للتأكيد قبل التجهيز.");
 const orderForm=e("form","ssBagForm");
 const name=newField("الاسم بالكامل","name","text",120);
 const phone=newField("رقم الموبايل","phone","tel",24);
 const city=newField("المدينة / المنطقة","area","text",120);
 const address=newField("العنوان بالتفصيل","address","text",280);
 const notes=newField("ملاحظات (اختياري)","notes","notes",300);
 const governor=e("label","ssBagLabel","المحافظة");
 const gov=e("select","ssBagInput");gov.required=true;gov.name="governorate";
 const initial=e("option","","تحميل المحافظات...");initial.value="";gov.append(initial);governor.append(gov);
 const total=e("p","ssBagTotal","الإجمالي شامل التوصيل: "+money(subtotal()));
 const website=e("input","ssCoHoney");website.name="website";website.tabIndex=-1;website.setAttribute("aria-hidden","true");
 const submit=e("button","ssBagPrimary","تأكيد الطلب");submit.type="submit";submit.disabled=true;
 const status=e("p","ssBagStatus","بنجهز الطلب...");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 orderForm.append(name.root,phone.root,governor,city.root,address.root,notes.root,total,
   e("small","ssBagMuted","الدفع عند الاستلام بعد التأكيد. السعر المعروض شامل التوصيل."),
   website,submit,status);
 c.append(back,intro,orderForm);
 const requestId=crypto.randomUUID();let nonce="",busy=false;
 try{
  const [areas,proof]=await Promise.all([regions(),proofOfWork(requestId)]);
  if(!cartDialog?.open)return;
  gov.replaceChildren();const first=e("option","","اختار المحافظة");first.value="";gov.append(first);
  areas.filter(x=>mongo(x.id)&&x.name).forEach(x=>{
   const op=e("option","",x.name);op.value=x.id;gov.append(op);
  });nonce=proof;submit.disabled=false;status.textContent="جاهز لتسجيل الطلب.";
 }catch{status.textContent="تعذر تجهيز الطلب، حاول مرة تانية."}
 orderForm.addEventListener("submit",async event=>{
  event.preventDefault();if(!nonce||busy||!orderForm.reportValidity())return;
  const msisdn=phone.input.value.trim().replace(/[\s-]/g,"");
  if(!/^01[0125][0-9]{8}$/.test(msisdn)){status.textContent="رقم الموبايل لازم 11 رقم مصري.";return}
  busy=true;submit.disabled=true;status.textContent="جاري مراجعة الأسعار وحفظ الطلب...";
  const order={
   requestId,items:items.map(i=>({productId:i.productId,variantId:i.variantId,quantity:i.quantity})),
   governorateId:gov.value,cityId:"",
   customer:{name:name.input.value.trim(),phone:msisdn,area:city.input.value.trim(),
     address:address.input.value.trim(),notes:notes.input.value.trim()},
   workNonce:nonce,website:website.value
  };
  try{
   const response=await fetch(DB+"/functions/v1/safka-capture-cart",{
    method:"POST",headers:{"apikey":KEY,"content-type":"application/json"},
    body:JSON.stringify(order),signal:AbortSignal.timeout(25000)});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||"order_failed");
   items=[];save();c.replaceChildren();
   c.append(e("h3","ssBagSuccess","تم تسجيل طلبك بنجاح"),
     e("p","", "رقم الطلب: "+result.orderCode),
     e("p","ssBagTotal","الإجمالي شامل التوصيل: "+money(result.totalEgp)),
     e("p","ssBagMuted","هنكلمك لتأكيد الأوردر. احتفظ برقم الطلب للمتابعة."));
  }catch(err){
   const labels={product_unavailable:"في منتج بقى غير متوفر. راجع السلة.",
    variant_unavailable:"في اختيار اتغير توفره. راجع السلة.",
    price_changed:"سعر منتج اتغير. ارجع للسلة وحدّث الأسعار.",
    validation_required:"تعذر التحقق الأمني. اقفل النموذج وابدأ تاني.",
    rate_limit_exceeded:"تم تجاوز عدد الطلبات. تواصل مع خدمة العملاء.",
    cart_save_unavailable:"تعذر حفظ الطلب حاليًا. ما تعيدش الإرسال قبل التأكد من رقم الطلب."};
   status.textContent=labels[err.message]||"حصلت مشكلة في تسجيل الطلب. تواصل مع خدمة العملاء.";
   submit.disabled=false;
  }finally{busy=false}
 });
}
async function openCart(){
 if(cartDialog?.open){renderBag();return}
 cartDialog=e("dialog","ssBagDialog");
 const shell=e("div","ssBagContent");
 const head=e("div","ssBagHead");head.append(e("h2","","سلة المنتجات"));
 const close=e("button","ssBagClose","×");close.type="button";close.setAttribute("aria-label","إغلاق السلة");close.onclick=()=>cartDialog.close();head.append(close);
 const notice=e("p","ssBagMuted","تقدر تضيف أكتر من منتج وتطلبهم كلهم برقم أوردر واحد.");
 const status=e("p","ssBagStatus","");status.setAttribute("role","status");
 const list=e("section","ssBagItems");list.dataset.bagItems="";
 const total=e("strong","ssBagTotal","");total.dataset.bagTotal="";
 const btn=e("button","ssBagPrimary","إتمام الطلب");btn.type="button";btn.dataset.bagCheckout="";
 btn.onclick=openCheckout;
 const shoeNote=e("p","ssBagMuted","ملحوظة: الأحذية الأصلية لها سلة وطلب منفصلين حاليًا، علشان الطلبات متتخلطش.");
 const normal=e("section","ssBagList");normal.dataset.bagList="";
 const form=e("section","ssBagCheckout");form.dataset.bagForm="";form.hidden=true;
 normal.append(notice,list,total,btn,shoeNote);
 shell.append(head,status,normal,form);cartDialog.append(shell);
 cartDialog.onclose=()=>{cartDialog.remove();cartDialog=null};
 document.body.append(cartDialog);cartDialog.showModal();renderBag();
 const warnings=await refreshCart();
 if(cartDialog?.open){renderBag();status.textContent=warnings.join(" ")||"الأسعار اتراجعت حسب آخر بيانات المتجر."}
}
function init(){
 const original=document.querySelector("[data-open-cart]");
 if(original){
  const launcher=e("button","cartAction ssBagHeader","سلة المنتجات ");
  launcher.type="button";launcher.dataset.safkaBagOpen="";
  launcher.append(e("strong","ssBagCount",String(quantity()))).lastChild.dataset.safkaBagCount="";
  launcher.addEventListener("click",()=>openCart());
  original.before(launcher);
 }
 save();
}
window.SS_SAFKA_CART=Object.freeze({choose,open:openCart,addItem,
 get count(){return quantity()},get items(){return items.map(i=>({...i}))}});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();