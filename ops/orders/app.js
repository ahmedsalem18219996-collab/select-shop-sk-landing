/* SELECT SHOP temporary orders administration
   Scope strictly select-shop-orders project. RLS admin gate, zero supplier API writes.
   This page does not inject into the storefront or read SELECT-SHOP-CLEAN.
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
const SUPABASE_URL="https://zznqdwrohrycsjfpvkhc.supabase.co";
const SUPABASE_PUBLIC_KEY="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const db=createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{
  auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}
});
const $=(id)=>document.getElementById(id);
const el=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text??"");
  return node;
};
const fmt=n=>(Number(n)||0).toLocaleString("ar-EG")+" ج.م";
const statusLabel={new:"جديد",review:"مراجعة",shipping_quote:"تسعير شحن",confirmed:"مؤكد",packing:"تجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
const platformLabel={safqa:"صفقة",prof:"بروف"};
let orders=[],affiliate=[],current=null,adminUser=null,busy=false;
const message=(text,warning=false,target="orderMessage")=>{
  const node=$(target);node.textContent=text;node.classList.toggle("inlineError",warning);
};
const safe=val=>String(val??"").trim();
const field=(title,value)=>{
  const div=el("div","field"),s=el("small","",title),strong=el("strong","",value||"—");
  div.append(s,strong);return div;
};
function showLogin(){
  adminUser=null;current=null;orders=[];affiliate=[];
  $("loginPanel").hidden=false;$("adminPanel").hidden=true;
  $("ordersList").replaceChildren();$("orderDetails").replaceChildren();
}
async function verifyAdmin(){
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)return false;
  const result=await db.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(result.error||!result.data)return false;
  adminUser=user;$("loginPanel").hidden=true;$("adminPanel").hidden=false;
  return true;
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();if(busy)return;busy=true;
  const button=e.currentTarget.querySelector("button");button.disabled=true;
  message("جاري التحقق من الصلاحيات…",false,"loginMessage");
  const fd=new FormData(e.currentTarget);
  const email=safe(fd.get("email")),password=String(fd.get("password")||"");
  try{
    const {error}=await db.auth.signInWithPassword({email,password});
    if(error)throw Error("بيانات الدخول غير صحيحة أو تسجيل الدخول غير متاح.");
    const allowed=await verifyAdmin();
    if(!allowed){await db.auth.signOut();throw Error("الحساب ده مش مضاف لمديري طلبات المتجر المؤقت.");}
    e.currentTarget.reset();message("",false,"loginMessage");await refresh();
  }catch(error){
    message(error.message||"تعذّر تسجيل الدخول.",true,"loginMessage");
  }finally{busy=false;button.disabled=false;}
});
$("logout").addEventListener("click",async()=>{await db.auth.signOut();showLogin()});
$("refresh").addEventListener("click",refresh);
$("statusFilter").addEventListener("change",renderList);
function filtered(){
  const value=$("statusFilter").value;
  return value?orders.filter(x=>x.status===value):orders;
}
function renderList(){
  const target=$("ordersList");target.replaceChildren();
  const shown=filtered();
  $("orderCount").textContent="("+shown.length+")";
  if(!shown.length){target.append(el("p","empty",orders.length?"مفيش طلبات بالحالة دي.":"مفيش أوردرات محفوظة لحد دلوقتي. الطلبات اللي بتوصل واتساب فقط مش بتظهر هنا إلا بعد ربط المتجر."));return;}
  for(const item of shown){
    const button=el("button","order"+(current?.id===item.id?" selected":""));
    button.type="button";
    const head=el("div","orderhead");
    head.append(el("b","",item.order_code),el("span","pill",statusLabel[item.status]||item.status));
    button.append(head,el("small","",safe(item.customer_name)+" • "+fmt(item.total_egp)));
    button.append(el("small","",new Date(item.created_at).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"})));
    button.addEventListener("click",()=>{current=item;renderList();renderDetail()});
    target.append(button);
  }
}
async function refresh(){
  if(!adminUser)return;
  const button=$("refresh");button.disabled=true;message("جاري تحميل الأوردرات…");
  try{
    const {data,error,count}=await db.from("ss_orders").select(
      "id,order_code,customer_name,phone,governorate,area,address,notes,inquiry,items,subtotal_egp,discount_egp,total_egp,shipping_review_required,status,created_at",
      {count:"exact"}
    ).order("created_at",{ascending:false}).limit(100);
    if(error)throw Error("تعذّر تحميل الطلبات. راجع صلاحية المدير واتصال الإنترنت.");
    orders=data||[];
    const ids=orders.map(x=>x.id);
    if(ids.length){
      const tracked=await db.from("ss_affiliate_tracking")
        .select("order_id,platform,supplier_order_ref,handoff_status,updated_at")
        .in("order_id",ids).limit(200);
      if(tracked.error)throw Error("تعذّر تحميل متابعة الطلبات.");
      affiliate=tracked.data||[];
    }else affiliate=[];
    $("totalOrders").textContent=(count??orders.length).toLocaleString("ar-EG");
    $("newOrders").textContent=orders.filter(x=>["new","review"].includes(x.status)).length.toLocaleString("ar-EG");
    $("shippingOrders").textContent=orders.filter(x=>x.shipping_review_required).length.toLocaleString("ar-EG");
    message(orders.length?("تم تحميل "+orders.length+" أوردر (آخر 100 بحد أقصى)."):"لسه مفيش طلبات محفوظة.");
    if(current)current=orders.find(x=>x.id===current.id)||null;
    renderList();renderDetail();
  }catch(error){message(error.message||"خطأ في التحميل",true)}
  finally{button.disabled=false;}
}
function trackedFor(orderId,platform){return affiliate.find(x=>x.order_id===orderId&&x.platform===platform)}
function buildCopyText(order){
  const lines=[
    "SELECT SHOP | طلب "+order.order_code,
    "اسم العميل: "+order.customer_name,
    "الهاتف: "+order.phone,
    "المحافظة: "+order.governorate,
    "المنطقة: "+order.area,
    "العنوان: "+order.address,
    "ملاحظات: "+(safe(order.notes)||"لا يوجد"),
    "المنتجات:",
    ...((Array.isArray(order.items)?order.items:[]).map((item,i)=>{
      return (i+1)+". "+safe(item.productName||item.productId)+
        " | موديل "+safe(item.variantId)+
        " | مقاس "+(Array.isArray(item.sizes)?item.sizes.join(" / "):"—")+
        " | "+(item.role==="trial"?"للتجربة فقط":"للشراء");
    })),
    "إجمالي الموقع: "+fmt(order.total_egp),
    order.shipping_review_required?"تنبيه: يلزم تأكيد تكلفة الشحن.":"",
    "راجع توفر المنتج وسعر المورد والشحن في المنصة قبل إرسال الطلب."
  ];
  return lines.filter(Boolean).join("\n");
}
function renderDetail(){
  const target=$("orderDetails");target.replaceChildren();
  const order=current;
  if(!order){target.append(el("p","empty","اختار أوردر علشان تراجعه."));return;}
  const fields=el("div","fields");
  for(const [k,v] of [["رقم الطلب",order.order_code],["الاسم",order.customer_name],["الموبايل",order.phone],["المحافظة",order.governorate],["المنطقة",order.area],["العنوان",order.address],["الإجمالي",fmt(order.total_egp)],["الخصم",fmt(order.discount_egp)],["الحالة",statusLabel[order.status]||order.status],["ملاحظات",order.notes||"—"]])fields.append(field(k,v));
  target.append(fields);
  if(order.shipping_review_required)target.append(el("p","danger","تنبيه: سعر الشحن لسه محتاج تأكيد. ما تحولش الأوردر قبل المراجعة."));
  const h=el("h3","","المنتجات المطلوبة");target.append(h);
  for(const item of (Array.isArray(order.items)?order.items:[])){
    const block=el("div","item");
    block.append(el("b","",safe(item.productName||item.productId)));
    block.append(el("span","",[
      "اللون/الموديل: "+safe(item.variantId),
      "المقاسات: "+(Array.isArray(item.sizes)?item.sizes.join(" / "):"—"),
      item.role==="trial"?"تجربة فقط":"شراء"
    ].join(" • ")));
    target.append(block);
  }
  const actions=el("div","detailActions");
  const copy=el("button","primary","نسخ بيانات الطلب للمورد");copy.type="button";
  copy.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(buildCopyText(order));message("اتنسخت بيانات الطلب للمراجعة اليدوية.")}catch{message("تعذر النسخ؛ راجع صلاحيات الحافظة.",true)}
  });
  actions.append(copy);target.append(actions);
  const tr=el("div","trackingForm");
  tr.append(el("h3","","متابعة المورد — تسجيل يدوي فقط"));
  const caption=el("p","empty","اختار المورد، وبعد ما تسجل الأوردر بنفسك في صفقة أو بروف، دوّن رقم الطلب اللي اتصدر هناك.");
  tr.append(caption);
  const form=el("form");
  form.autocomplete="off";
  const platformLabelNode=el("label","","المنصة");
  const platform=el("select");platform.name="platform";
  for(const [value,title] of [["safqa","صفقة"],["prof","بروف"]]){
    const op=el("option","",title);op.value=value;platform.append(op);
  }platformLabelNode.append(platform);
  const refLabel=el("label","","رقم الطلب عند المورد");
  const ref=el("input");ref.name="supplier_ref";ref.maxLength=160;ref.placeholder="رقم الطلب بعد إنشائه على المنصة";ref.required=true;
  refLabel.append(ref);
  const statusLine=el("label","","حالة التسليم للمورد");
  const status=el("select");status.name="handoff_status";
  for(const [value,title] of [["submitted","تم تسجيله على المورد"],["accepted","المورد قبله"],["shipped","اتشحن"],["delivered","اتسلم"],["returned","مرتجع"],["cancelled","ملغي"]]){
    const op=el("option","",title);op.value=value;status.append(op);
  }statusLine.append(status);
  const last=el("p","empty");
  function applyExisting(){
    const old=trackedFor(order.id,platform.value);
    ref.value=safe(old?.supplier_order_ref);
    status.value=old?.handoff_status==="pending"?"submitted":old?.handoff_status||"submitted";
    last.textContent=old?"الحالة المسجلة: "+old.handoff_status+" | مرجع المورد: "+(old.supplier_order_ref||"—"):"لم يتم تسجيل تحويل لهذه المنصة.";
  }
  platform.addEventListener("change",applyExisting);applyExisting();
  const save=el("button","primary","حفظ متابعة المورد");save.type="submit";
  form.append(platformLabelNode,refLabel,statusLine,last,save);
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!adminUser||!current||current.id!==order.id)return;
    const reference=ref.value.trim();
    if(!reference){message("اكتب رقم الطلب الحقيقي الصادر من المورد.",true);return;}
    if(!window.confirm("هل سجلت الطلب فعلًا على "+platformLabel[platform.value]+" وراجعت تفاصيل العميل والمنتجات؟"))return;
    save.disabled=true;
    try{
      const payload={order_id:order.id,platform:platform.value,supplier_order_ref:reference,handoff_status:status.value};
      const {error}=await db.from("ss_affiliate_tracking").upsert(payload,{onConflict:"order_id,platform"});
      if(error)throw Error("تعذّر حفظ متابعة المورد. راجع الصلاحيات.");
      message("اتحفظ مرجع "+platformLabel[platform.value]+" بنجاح.");
      await refresh();
    }catch(err){message(err.message,true)}finally{save.disabled=false;}
  });
  tr.append(form);target.append(tr);
}
window.addEventListener("pagehide",()=>{orders=[];affiliate=[];current=null;});
showLogin();
