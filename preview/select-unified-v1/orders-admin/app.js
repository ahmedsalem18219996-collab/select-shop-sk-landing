/* SELECT SHOP Orders — isolated, authenticated admin dashboard.
   Only works with the NEW orders project. RLS protects all customer PII. */
(()=>{
"use strict";
const $=q=>document.querySelector(q);
const cfg=window.SELECT_SHOP_ORDERS_CONFIG||{};
const statuses={new:"جديد",shipping_quote:"مراجعة الشحن",review:"قيد المراجعة",confirmed:"تم التأكيد",
packing:"جاري التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
const nonFinal=new Set(["new","review","confirmed","packing","shipped","shipping_quote"]);
const money=n=>Number(n||0).toLocaleString("ar-EG")+" جنيه";
const dateText=iso=>new Date(iso).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"});
const escapeText=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const show=(sel,visible)=>{const el=$(sel);if(el)el.hidden=!visible};
const nodeText=(sel,content)=>{const el=$(sel);if(el)el.textContent=String(content)};
let db=null,orders=[],loaded=0,hasMore=false,selected=null,channel=null,refreshing=false,knownIds=null;
let refreshInterval=null,connected=false;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),3200)}
function setConnection(message,isLive=false){nodeText("#connectionState",message);nodeText("#liveState",message);
$("#dashboard .live")?.classList.toggle("online",isLive)}
function showLogin(message=""){show("#loginPanel",true);show("#dashboard",false);show("#unconfigured",false);
show("#refreshBtn",false);show("#notifyBtn",false);show("#signOutBtn",false);
nodeText("#loginMessage",message);setConnection("غير متصل")}
function showDashboard(){show("#loginPanel",false);show("#dashboard",true);show("#unconfigured",false);
show("#refreshBtn",true);show("#notifyBtn",true);show("#signOutBtn",true)}
async function disconnect(logOut){
 if(channel){try{await db.removeChannel(channel)}catch{}channel=null}
 if(refreshInterval){clearInterval(refreshInterval);refreshInterval=null}
 orders=[];knownIds=null;selected=null;
 window.SELECT_SHOP_AFFILIATE_ADMIN?.setClient(null);
 if(logOut && db)await db.auth.signOut();
 showLogin();
}
async function checkAdmin(){
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)return false;
 const check=await db.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(check.error)throw Error("تعذر التأكد من صلاحيات الإدارة. حاول لاحقًا.");
 return Boolean(check.data?.user_id===user.id);
}
async function afterLogin(){
 const isAdmin=await checkAdmin();
 if(!isAdmin){await disconnect(true);showLogin("الحساب ده مش مسجل ضمن مسؤولي طلبات SELECT SHOP.");return}
 showDashboard();setConnection("متصل");
 window.SELECT_SHOP_AFFILIATE_ADMIN?.setClient(db);
 await loadOrders(true);
 if(!refreshInterval)refreshInterval=setInterval(()=>loadOrders(true),45000);
 channel=db.channel("select-shop-admin-orders")
 .on("postgres_changes",{event:"*",schema:"public",table:"ss_orders"},event=>{
   if(event.eventType==="INSERT"){toast("وصل طلب جديد");
     if(document.visibilityState==="visible" && "Notification" in window &&
       Notification.permission==="granted")new Notification("SELECT SHOP — طلب جديد",
        {body:"افتح لوحة الإدارة لمراجعة الطلب",icon:"./icon.svg"});
   }
   loadOrders(true);
 }).subscribe(status=>{
    connected=status==="SUBSCRIBED";
    setConnection(connected?"تحديث مباشر":"متصل — تحديث دوري",connected);
 });
}
async function loadOrders(reset=false){
 if(refreshing||!db)return;
 refreshing=true;
 const pageSize=50,start=reset?0:loaded;
 try{
   const {data,error}=await db.from("ss_orders")
      .select("id,order_code,customer_name,phone,governorate,area,address,notes,inquiry,items,total_egp,subtotal_egp,discount_egp,shipping_review_required,status,created_at")
      .order("created_at",{ascending:false}).range(start,start+pageSize-1);
   if(error)throw error;
   if(reset){orders=data||[];loaded=orders.length}
   else{const existing=new Set(orders.map(o=>o.id));
     orders.push(...(data||[]).filter(o=>!existing.has(o.id)));loaded+=data?.length||0}
   hasMore=(data?.length||0)===pageSize;
   show("#moreBtn",hasMore);
   if(knownIds!==null && reset && (data||[]).some(o=>!knownIds.has(o.id)))toast("تم تسجيل طلب جديد");
   knownIds=new Set(orders.map(o=>o.id));
   renderList();
   nodeText("#lastSync","آخر تحديث: "+new Date().toLocaleTimeString("ar-EG"));
 }catch(error){
   console.error("Order list failed",error);
   toast("تعذر تحديث الطلبات؛ راجع الاتصال أو الصلاحيات");
   if(orders.length===0)$("#orderList").innerHTML='<div class="empty-state">تعذر تحميل الطلبات. استخدم زر التحديث للمحاولة مرة تانية.</div>';
 }finally{refreshing=false}
}
function displayOrders(){
 const query=$("#searchInput").value.trim().toLowerCase();
 const status=$("#statusFilter").value;
 return orders.filter(o=>(status==="all"||o.status===status) &&
   (!query||[o.customer_name,o.order_code,o.phone].some(v=>String(v||"").toLowerCase().includes(query))));
}
function renderList(){
 nodeText("#totalCount",orders.length);
 nodeText("#newCount",orders.filter(o=>o.status==="new"||o.status==="shipping_quote").length);
 nodeText("#activeCount",orders.filter(o=>nonFinal.has(o.status)&&o.status!=="new"&&o.status!=="shipping_quote").length);
 nodeText("#doneCount",orders.filter(o=>o.status==="delivered").length);
 const shown=displayOrders(),list=$("#orderList");
 list.innerHTML=shown.length?shown.map(o=>`<article class="order-card" data-order-id="${escapeText(o.id)}">
   <div><span class="status ${escapeText(o.status)}">${escapeText(statuses[o.status]||o.status)}</span>
    <h3>${escapeText(o.customer_name)}</h3><p>${escapeText(o.order_code)} · ${escapeText(o.governorate)} — ${escapeText(o.area)}</p>
    <small>${dateText(o.created_at)}</small></div>
   <div class="order-side"><strong>${money(o.total_egp)}</strong>
    <button type="button" data-show-order="${escapeText(o.id)}">تفاصيل الطلب</button></div>
 </article>`).join(""):'<div class="empty-state">مفيش طلبات مطابقة حاليًا.</div>';
 nodeText("#pageInfo",`عرض ${shown.length} طلب من أصل ${orders.length} تم تحميله`);
 list.querySelectorAll("[data-show-order]").forEach(button=>button.addEventListener("click",()=>openDetail(button.dataset.showOrder)));
}
function openDetail(id){
 const o=orders.find(x=>x.id===id);if(!o)return;
 selected=o;nodeText("#detailTitle",o.order_code);nodeText("#detailMessage","");
 const entries=Array.isArray(o.items)?o.items:[];
 $("#detailContent").innerHTML=`
 <section class="order-section"><h3>بيانات العميل</h3>
   <p>الاسم: <strong>${escapeText(o.customer_name)}</strong></p>
   <p>الموبايل: <a href="tel:${escapeText(String(o.phone||"").replace(/\D/g,""))}">${escapeText(o.phone)}</a></p>
   <p>العنوان: ${escapeText([o.governorate,o.area,o.address].filter(Boolean).join("، "))}</p>
   ${o.notes?`<p>ملاحظات التوصيل: ${escapeText(o.notes)}</p>`:""}
   ${o.inquiry?`<p>استفسار: ${escapeText(o.inquiry)}</p>`:""}</section>
 <section class="order-section"><h3>المنتجات (${entries.length})</h3>
   ${entries.map(item=>`<p><strong>${escapeText(item.productName||item.productId)}</strong>
   · ${escapeText(item.variantId)} · ${item.sizes?.[0]===0?"بدون مقاس":escapeText((item.sizes||[]).join(" / "))}
   ${item.role==="trial"?" — اختيار للتجربة":""}
   · ${money(item.payablePrice)}</p>`).join("")}</section>
 <section class="order-section"><h3>الحساب</h3><p>قبل الخصم: ${money(o.subtotal_egp)}</p>
   <p>الخصم: ${money(o.discount_egp)}</p>
   <p><strong>الإجمالي: ${money(o.total_egp)}</strong></p>
   ${o.shipping_review_required?'<p>مهم: شحن الطلب ده محتاج مراجعة قبل التأكيد.</p>':""}</section>`;
 const select=$("#detailStatus");
 select.innerHTML=Object.entries(statuses).map(([key,label])=>`<option value="${key}">${escapeText(label)}</option>`).join("");
 select.value=o.status;
 $("#detailDialog").showModal();
 // Manual supplier handoff stays inside authenticated admin, never the customer checkout.
 void window.SELECT_SHOP_AFFILIATE_ADMIN?.render(o,$("#detailContent"));
}
async function saveStatus(){
 if(!selected)return;
 const newStatus=$("#detailStatus").value;
 if(!statuses[newStatus])return;
 const button=$("#saveStatus");button.disabled=true;nodeText("#detailMessage","");
 try{
   const {data,error}=await db.from("ss_orders").update({status:newStatus})
    .eq("id",selected.id).select("id,status").single();
   if(error)throw error;
   selected.status=data.status;
   toast("تم تحديث حالة الطلب");
   $("#detailDialog").close();renderList();loadOrders(true);
 }catch(error){console.error(error);nodeText("#detailMessage","تعذر تحديث الطلب؛ تحقق من الصلاحيات والاتصال")}
 finally{button.disabled=false}
}
async function start(){
 if(!cfg.supabaseUrl||!cfg.publishableKey){
   show("#unconfigured",true);setConnection("في انتظار الربط");return;
 }
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl)){
   show("#unconfigured",true);setConnection("عنوان المشروع غير صحيح");return;
 }
 if(!window.supabase?.createClient){
   show("#unconfigured",true);setConnection("تعذر تحميل نظام تسجيل الدخول");return;
 }
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false},
 });
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session){showLogin();return}
 try{await afterLogin()}catch(e){console.error(e);await disconnect(false);showLogin("تعذر التأكد من صلاحيات الحساب.")}
}
$("#loginForm").addEventListener("submit",async event=>{
 event.preventDefault();if(!db)return;
 const form=new FormData(event.currentTarget),btn=$("#loginSubmit");
 btn.disabled=true;nodeText("#loginMessage","");
 try{
   const {error}=await db.auth.signInWithPassword({
     email:String(form.get("email")||"").trim(),
     password:String(form.get("password")||""),
   });
   if(error)throw error;
   await afterLogin();
 }catch(error){nodeText("#loginMessage","تعذر تسجيل الدخول. راجع البيانات أو صلاحيات الحساب.");console.error(error)}
 finally{btn.disabled=false}
});
$("#signOutBtn").addEventListener("click",()=>disconnect(true));
$("#refreshBtn").addEventListener("click",()=>loadOrders(true));
$("#statusFilter").addEventListener("change",renderList);
$("#searchInput").addEventListener("input",renderList);
$("#moreBtn").addEventListener("click",()=>loadOrders(false));
$("#closeDetail").addEventListener("click",()=>$("#detailDialog").close());
$("#saveStatus").addEventListener("click",saveStatus);
$("#notifyBtn").addEventListener("click",async()=>{
 if(!("Notification" in window)){toast("المتصفح ده مش بيدعم إشعارات الصفحة");return}
 const result=await Notification.requestPermission();
 toast(result==="granted"?"تنبيهات الطلبات مفعلة أثناء فتح التطبيق":"التنبيهات غير مفعلة");
});
if("serviceWorker" in navigator && location.protocol==="https:"){
 navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start().catch(error=>{console.error(error);show("#unconfigured",true);setConnection("تعذر التهيئة")});
})();