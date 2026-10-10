/* Private SELECT SHOP temporary-store admin: manual Prof/Safqa handoff tracker.
   Never calls supplier websites or stores any customer details in GitHub. */
(()=>{
"use strict";
const helper=window.SELECT_SHOP_AFFILIATE;
const allowed=new Set(["prof","safqa"]);
let client=null,catalogPromise=null,renderSerial=0;
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setClient(db){client=db;catalogPromise=null;renderSerial++;}
async function catalog(){
 if(!client)throw Error("المدير غير متصل");
 if(!catalogPromise)catalogPromise=(async()=>{
  const {data,error}=await client.from("ss_order_catalog").select("product_id,fulfillment_group,title");
  if(error)throw error;
  const output=Object.create(null);
  for(const p of data||[])output[p.product_id]={fulfillment_group:p.fulfillment_group,title:p.title};
  return output;
 })().catch(error=>{catalogPromise=null;throw error});
 return catalogPromise;
}
const statusOptions=selected=>Object.entries(helper.statuses)
  .map(([key,label])=>'<option value="'+e(key)+'"'+(key===selected?" selected":"")+'>'+e(label)+'</option>').join("");
function message(box,message,problem=false){
 const node=box.querySelector(".affiliate-message");
 if(!node)return;
 node.textContent=message;node.dataset.problem=String(problem);
}
async function render(order,container){
 const seq=++renderSerial;
 const panel=document.createElement("section");
 panel.className="order-section affiliate-panel";
 panel.id="ssAffiliatePanel";
 panel.innerHTML='<h3>نقل الأوردر إلى منصة الأفلييت</h3><p class="affiliate-muted">تحميل منصة المورد...</p>';
 container.append(panel);
 if(!client||!helper){panel.textContent="نظام المورد غير متاح. لا تنقل الطلب قبل المراجعة.";return}
 try{
  const routes=helper.group(order,await catalog());
  if(seq!==renderSerial||!panel.isConnected)return;
  if(routes.unknown.length){
   panel.innerHTML='<h3>توقف: منصة المورد غير معروفة</h3><p class="affiliate-error">منتجات الأوردر لا تطابق بيانات الموردين. لا تنسخ بيانات العميل قبل تصحيح الربط.</p>';
   return;
  }
  if(!routes.groups.length){panel.textContent="مفيش منتجات مؤهلة للتسجيل عند المورد.";return}
  const {data:records,error}=await client.from("ss_affiliate_tracking")
    .select("order_id,platform,supplier_order_ref,handoff_status,submitted_at")
    .eq("order_id",order.id);
  if(error)throw error;
  if(seq!==renderSerial||!panel.isConnected)return;
  const previous=new Map((records||[]).map(x=>[x.platform,x]));
  panel.innerHTML='<h3>تسجيل الأوردر في بروف / صفقة</h3>'
   +'<p class="affiliate-muted">انسخ بيانات كل منصة على حدة. التسجيل عند المورد يدوي، ومش بيحصل أي إرسال تلقائي.</p>'
   +'<div class="affiliate-cards">'+routes.groups.map(group=>{
    const record=previous.get(group.platform);
    const state=record?.handoff_status||"pending";
    return '<article class="affiliate-card" data-affiliate-platform="'+e(group.platform)+'">'
     +'<div class="affiliate-card-head"><strong>'+e(helper.names[group.platform])+'</strong>'
     +'<span>'+group.items.length+' منتج/اختيار</span></div>'
     +'<div class="affiliate-items">'+group.items.map(item=>'<p>'+e(item.productName||item.productId)+' · '+e(item.variantId)+' · '
       +e(item.sizes?.[0]===0?"بدون مقاس":(item.sizes||[]).join(" / "))
       +(item.role==="trial"?' · <b>للتجربة</b>':"")+'</p>').join("")+'</div>'
     +'<button class="ghost affiliate-copy" type="button">نسخ بيانات الطلب لهذه المنصة</button>'
     +'<label>رقم الأوردر على منصة المورد<input class="affiliate-reference" type="text" maxlength="160" autocomplete="off" placeholder="اكتبه بعد التسجيل عند المورد" value="'+e(record?.supplier_order_ref||"")+'"></label>'
     +'<label>حالة الأوردر عند المورد<select class="affiliate-status">'+statusOptions(state)+'</select></label>'
     +'<button class="primary affiliate-save" type="button">حفظ متابعة المورد</button>'
     +'<p class="affiliate-message" role="status"></p></article>';
   }).join("")+'</div>';
  for(const group of routes.groups){
   const box=Array.from(panel.querySelectorAll("[data-affiliate-platform]")).find(x=>x.dataset.affiliatePlatform===group.platform);
   if(!box)continue;
   box.querySelector(".affiliate-copy").addEventListener("click",async()=>{
    try{
     if(!navigator.clipboard?.writeText)throw Error("clipboard_unavailable");
     await navigator.clipboard.writeText(helper.copyText(order,group));
     message(box,"اتنسخت بيانات "+helper.names[group.platform]+" — سجّلها يدويًا في المنصة.");
    }catch{message(box,"المتصفح رفض النسخ. جرّب فتح اللوحة على HTTPS أو استخدم متصفح تاني.",true)}
   });
   box.querySelector(".affiliate-save").addEventListener("click",async()=>{
    const button=box.querySelector(".affiliate-save");
    if(button.disabled)return;
    const ref=box.querySelector(".affiliate-reference").value.trim();
    const status=box.querySelector(".affiliate-status").value;
    if(!allowed.has(group.platform)||!Object.hasOwn(helper.statuses,status)){
     message(box,"حالة المورد غير صحيحة.",true);return;
    }
    if(status!=="pending"&&!ref){
     message(box,"اكتب رقم طلب المورد الأول قبل تغيير الحالة.",true);return;
    }
    const previousRecord=previous.get(group.platform);
    const submittedAt=status==="pending"?null:(previousRecord?.submitted_at||new Date().toISOString());
    const changes={supplier_order_ref:ref,handoff_status:status,submitted_at:submittedAt};
    button.disabled=true;
    try{
     const query=previousRecord?
      client.from("ss_affiliate_tracking").update(changes)
       .eq("order_id",order.id).eq("platform",group.platform):
      client.from("ss_affiliate_tracking").insert({order_id:order.id,platform:group.platform,...changes});
     const {data,error}=await query.select("order_id,platform,supplier_order_ref,handoff_status,submitted_at").single();
     if(error)throw error;
     previous.set(group.platform,data);
     message(box,"اتحفظت متابعة "+helper.names[group.platform]+" بنجاح. لم يتم إرسال أي أوردر تلقائيًا.");
    }catch(error){
     console.error("Affiliate tracking save failed",error?.code||"unknown");
     message(box,"تعذر الحفظ. راجع الاتصال أو الصلاحيات وحاول مرة تانية.",true);
    }finally{button.disabled=false}
   });
  }
 }catch(error){
  if(seq!==renderSerial||!panel.isConnected)return;
  console.error("Affiliate catalog/tracking error",error?.code||"unknown");
  panel.innerHTML='<h3>متعذر تحميل متابعة المورد</h3><p class="affiliate-error">راجع الاتصال أو صلاحيات الإدارة. لا تنسخ بيانات العميل قبل تحديد المورد.</p>';
 }
}
window.SELECT_SHOP_AFFILIATE_ADMIN=Object.freeze({setClient,render});
})();