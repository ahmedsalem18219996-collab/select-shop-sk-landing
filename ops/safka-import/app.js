/* SELECT SHOP temporary owner catalog importer.
   Browser sees only Supabase publishable key; Safqa and service keys stay server-side.
   No public product publishing or supplier-order creation.
*/
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.79.0";
const db=createClient("https://zznqdwrohrycsjfpvkhc.supabase.co",
  "sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa",
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=String(text??"");
  return n;
};
const money=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))?
  Number(v).toLocaleString("ar-EG")+" جنيه":"غير متوفر";
const text=v=>typeof v==="string"?v:"";
let user=null,busy=false,page=0,count=0;
function status(message,error=false,target="syncMessage"){
  const e=$(target);e.textContent=message;e.classList.toggle("error",error);
}
async function validateOwner(){
  const {data:{user:logged},error}=await db.auth.getUser();
  if(error||!logged)return false;
  const gate=await db.from("ss_order_admins").select("user_id").eq("user_id",logged.id).maybeSingle();
  if(gate.error||!gate.data)return false;
  user=logged;return true;
}
$("loginForm").addEventListener("submit",async event=>{
  event.preventDefault();const btn=event.currentTarget.querySelector("button");btn.disabled=true;
  status("جاري التحقق من صلاحية المدير…",false,"loginMessage");
  try{
    const form=new FormData(event.currentTarget);
    const {error}=await db.auth.signInWithPassword({
      email:String(form.get("email")||"").trim(),
      password:String(form.get("password")||"")
    });
    if(error||!(await validateOwner()))throw Error("الدخول غير صحيح أو الحساب مش مدير المتجر المؤقت.");
    $("signIn").hidden=true;$("ownerConsole").hidden=false;
    event.currentTarget.reset();await reload();
  }catch(err){status(err.message||"تعذر الدخول",true,"loginMessage")}
  finally{btn.disabled=false}
});
$("logout").addEventListener("click",async()=>{
  if(busy)return;
  await db.auth.signOut();
  user=null;$("ownerConsole").hidden=true;$("signIn").hidden=false;
  $("productGrid").replaceChildren();
});
function formatError(error){
  return error?.message?.slice(0,200)||"تعذر الوصول لصفقة أو حفظ البيانات.";
}
async function importCall(mode,number){
  const body=mode==="products"?{mode,page:number}:{mode};
  const {data,error}=await db.functions.invoke("safka-stage-import",{body});
  if(error||!data?.ok){
    let detail=data;
    if(error?.context?.json){try{detail=await error.context.json()}catch{}}
    const msg=detail?.error||error?.message||"unknown_error";
    throw Error("تعذر استيراد "+(mode==="products"?"صفحة "+number:"الشحن")+" ("+String(msg).slice(0,110)+")");
  }
  return data;
}
async function runAll(){
  if(!user||busy)return;
  busy=true;const button=$("importAll");button.disabled=true;$("reload").disabled=true;
  $("syncProgress").hidden=false;$("syncProgress").value=0;
  let rows=0,categories=0,pages=0;
  try{
    status("جاري جلب تكاليف شحن المحافظات من صفقة...");
    const ship=await importCall("shipping");
    status("تم حفظ "+ship.saved+" محافظة. جاري استيراد كل صفحات المنتجات...");
    let completed=false;
    for(let p=1;p<=500;p++){
      const response=await importCall("products",p);
      pages++;rows+=response.saved;categories+=response.categoriesWithSourceData;
      const total=response.sourceTotalPages||null;
      $("syncProgress").value=total?Math.min(99,Math.round(100*p/total)):
        Math.min(95,p);
      status("تمت قراءة "+p+" صفحة، وحفظ "+rows+" منتجًا (عمليات حفظ قابلة للتكرار)."+
        (total?" إجمالي الصفحات حسب صفقة: "+total:""));
      if(!response.hasMore){completed=true;break}
    }
    if(!completed)throw Error("توقف عند حد الأمان 500 صفحة. لم نؤكد اكتمال الكتالوج؛ راجع عدد الصفحات.");
    $("syncProgress").value=100;
    status("اكتمل استيراد "+rows+" بطاقة من "+pages+" صفحة. المنتجات مسودات خاصة، ومافيش أي منتج اتنشر للبيع أو أوردر اتبعت. أقسام المورد الواردة في الدفعات: "+categories+".");
    await reload();
  }catch(err){status(err.message||"الاستيراد اتوقف؛ يمكن إعادة المحاولة بأمان.",true);await reload()}
  finally{busy=false;button.disabled=false;$("reload").disabled=false}
}
$("importAll").addEventListener("click",runAll);
$("reload").addEventListener("click",async()=>{if(!busy)await reload()});
$("search").addEventListener("input",()=>{page=0;loadProducts()});
$("category").addEventListener("change",()=>{page=0;loadProducts()});
$("pageSize").addEventListener("change",()=>{page=0;loadProducts()});
$("prevPage").addEventListener("click",()=>{if(page>0){page--;loadProducts()}});
$("nextPage").addEventListener("click",()=>{if((page+1)*Number($("pageSize").value)<count){page++;loadProducts()}});
async function reload(){
  if(!user)return;
  try{
    const [
      products,categories,regions,approved,pending
    ]=await Promise.all([
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}),
      db.from("ss_safka_import_categories").select("category_key,category_name").order("category_name").limit(1000),
      db.from("ss_safka_import_shipping").select("governorate_id,name_ar,shipping_egp,is_active").order("name_ar").limit(100),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("review_state","approved").eq("owner_verified",true),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("category_key","uncategorized")
    ]);
    if(products.error||categories.error||regions.error||approved.error||pending.error)throw Error("تعذّر تحميل ملخص البيانات من Supabase.");
    $("allCount").textContent=(products.count??0).toLocaleString("ar-EG");
    $("categoryCount").textContent=(categories.data||[]).length.toLocaleString("ar-EG");
    $("regionCount").textContent=(regions.data||[]).length.toLocaleString("ar-EG");
    $("approvedCount").textContent=(approved.count??0).toLocaleString("ar-EG");
    const category=$("category"),prior=category.value;category.replaceChildren();
    const all=node("option","","كل الأقسام");all.value="";category.append(all);
    for(const c of categories.data||[]){
      const op=node("option","",c.category_name);op.value=c.category_key;category.append(op);
    }
    if((pending.count||0)>0){
      const option=node("option","","بانتظار مطابقة القسم ("+pending.count+")");
      option.value="uncategorized";category.append(option);
    }
    if([...category.options].some(x=>x.value===prior))category.value=prior;
    const regionRoot=$("regions");regionRoot.replaceChildren();
    for(const r of regions.data||[]){
      const cell=node("div","region");
      cell.append(node("b","",r.name_ar),node("span","",money(r.shipping_egp)));
      regionRoot.append(cell);
    }
    if(!regions.data?.length)regionRoot.append(node("p","","لسه أسعار شحن صفقة ما اتسحبتش."));
    await loadProducts();
  }catch(err){status(err.message,true,"catalogMessage")}
}
function safeImageUrl(value){
  if(typeof value!=="string")return null;
  try{
    const u=new URL(value);
    if(u.protocol!=="https:"||u.username||u.password)return null;
    return u.href;
  }catch{return null}
}
function showCard(p){
  const article=node("article","productCard");
  const cover=node("div","cardImage");
  const images=Array.isArray(p.images)?p.images:[];
  const src=images.map(safeImageUrl).find(Boolean);
  if(src){
    const image=node("img");image.src=src;image.loading="lazy";image.alt="صورة المورد: "+p.name;
    image.addEventListener("error",()=>{image.remove();cover.append(node("div","noImage","صورة المورد غير متاحة للعرض"))});
    cover.append(image);
  }else cover.append(node("div","noImage","المورد لم يرسل رابط صورة صالحًا في API"));
  const info=node("div","cardBody");
  info.append(node("small","",p.category_name||"غير مصنف"));
  info.append(node("h3","",p.name));
  info.append(node("div","cardCode","Product ID: "+p.supplier_product_id));
  if(p.barcode)info.append(node("div","cardCode","Barcode: "+p.barcode));
  const meta=node("div","cardMeta");
  meta.append(node("span","","خيارات: "+(Array.isArray(p.variants)?p.variants.length:0)));
  meta.append(node("span","","صور: "+images.length));
  if(Array.isArray(p.videos)&&p.videos.length)meta.append(node("span","","فيديوهات: "+p.videos.length));
  info.append(meta);
  info.append(node("div","cardPrice","سعر صفقة المقترح: "+money(p.suggested_sale_price_egp)));
  if(p.review_state==="approved"&&p.owner_verified)
    info.append(node("div","cardPrice","سعرنا المعتمد: "+money(p.final_price_egp)));
  else info.append(node("small","","سعر SELECT SHOP شامل الشحن: قيد المراجعة"));
  const open=node("button","","شوف الأكواد والميديا");
  open.type="button";open.addEventListener("click",()=>openDetail(p));
  info.append(open);article.append(cover,info);return article;
}
async function loadProducts(){
  if(!user)return;
  const limit=Number($("pageSize").value)||24;
  let q=db.from("ss_safka_import_products")
    .select("supplier_product_id,barcode,name,description,category_key,category_name,suggested_sale_price_egp,variants,images,videos,review_state,final_price_egp,owner_verified,source_category_confirmed",{count:"exact"})
    .order("name",{ascending:true}).range(page*limit,(page+1)*limit-1);
  const cat=$("category").value;if(cat)q=q.eq("category_key",cat);
  const search=$("search").value.trim().slice(0,80);
  if(search){
    if(/^[a-f0-9]{24}$/i.test(search))q=q.eq("supplier_product_id",search);
    else if(/^[a-z0-9_-]+$/i.test(search))q=q.or("barcode.ilike.%"+search+"%,name.ilike.%"+search+"%");
    else q=q.ilike("name","%"+search.replace(/[%_,]/g,"")+"%");
  }
  status("جاري تحميل المنتجات...",false,"catalogMessage");
  const {data,error,count:total}=await q;
  if(error){status("تعذر تحميل المنتجات. حاول تاني.",true,"catalogMessage");return}
  count=total??0;
  const grid=$("productGrid");grid.replaceChildren();
  (data||[]).forEach(p=>grid.append(showCard(p)));
  if(!data?.length)grid.append(node("p","","مفيش منتجات مطابقة لحد دلوقتي. جرّب الاستيراد أو تغيير الفلتر."));
  $("pageLabel").textContent="صفحة "+(page+1)+" من "+Math.max(1,Math.ceil(count/limit));
  $("prevPage").disabled=page===0;
  $("nextPage").disabled=(page+1)*limit>=count;
  status("عدد المنتجات المطابقة: "+count+" — كتالوج للمراجعة فقط، مش منشور للعملاء.",false,"catalogMessage");
}
function mediaElement(url,kind){
  const u=safeImageUrl(url);if(!u)return node("p","","رابط الميديا مش صالح.");
  if(kind==="image"){
    const img=node("img");img.src=u;img.alt="صورة المنتج من المورد";img.loading="lazy";return img;
  }
  const path=new URL(u).pathname;
  if(/\.(mp4|webm)$/i.test(path)){
    const video=node("video");video.controls=true;video.playsInline=true;video.preload="metadata";
    const source=node("source");source.src=u;source.type=/\.webm$/i.test(path)?"video/webm":"video/mp4";
    video.append(source);return video;
  }
  if(new URL(u).hostname==="drive.google.com"&&/^\/file\/d\/[A-Za-z0-9_-]+\/preview$/.test(path)){
    const frame=node("iframe");frame.src=u;frame.title="فيديو المنتج من Drive";frame.loading="lazy";return frame;
  }
  return node("p","","الفيديو ده مش ملف قابل للتشغيل المباشر؛ يحتاج مصدر معتمد.");
}
async function openDetail(p){
  const dialog=$("productDialog"),root=$("detailContent");
  root.replaceChildren();
  const layout=node("div","detailGrid"),left=node("div","detailMedia"),right=node("div");
  const stage=node("div","detailStage");
  const gallery=node("div","detailGallery");
  let media=[
    ...(Array.isArray(p.images)?p.images:[]).map(url=>({url,type:"image"})),
    ...(Array.isArray(p.videos)?p.videos:[]).map(url=>({url,type:"video"}))
  ];
  const manually=await db.from("ss_safka_media_assets")
    .select("media_url,source_type,asset_type")
    .eq("supplier_product_id",p.supplier_product_id).order("sort_order");
  if(!manually.error)media.push(...(manually.data||[]).filter(x=>x.asset_type==="video").map(x=>({url:x.media_url,type:"video"})));
  media=media.filter(x=>safeImageUrl(x.url));
  const show=i=>{
    const item=media[i];stage.replaceChildren();
    if(item)stage.append(mediaElement(item.url,item.type));
    gallery.querySelectorAll("button").forEach((b,index)=>b.classList.toggle("active",index===i));
  };
  media.slice(0,70).forEach((item,i)=>{
    const b=node("button","",item.type==="video"?"▶":"صورة "+(i+1));b.type="button";
    if(item.type==="image"){b.replaceChildren();const im=node("img");im.src=item.url;im.alt="";im.loading="lazy";b.append(im)}
    b.addEventListener("click",()=>show(i));gallery.append(b);
  });
  if(media.length)show(0);else stage.append(node("p","","صفقة لم ترجع ميديا قابلة للعرض لهذا المنتج."));
  left.append(stage,gallery);
  right.append(node("small","",p.category_name||"غير مصنف"),node("h2","",p.name));
  right.append(node("p","",p.description||"الوصف من المورد غير متاح؛ محتاج مراجعة قبل البيع."));
  right.append(node("div","detailCode","Product ID: "+p.supplier_product_id));
  if(p.barcode)right.append(node("div","detailCode","Barcode: "+p.barcode));
  const cat=node("p","detailNote",p.source_category_confirmed?
    "القسم وارد من بيانات صفقة.":"صفقة لم ترجع قسمًا معتمدًا للمنتج ده عبر API.");
  right.append(cat);
  const price=node("p","detailNote","سعر المورد المقترح: "+money(p.suggested_sale_price_egp)+
    " — ليس سعر بيعنا. يلزم حساب التكلفة + الشحن + الربح.");
  right.append(price);
  const variants=node("div","detailVariants");
  for(const v of (Array.isArray(p.variants)?p.variants:[])){
    const r=node("div","variant");
    const leftText=node("div");
    leftText.append(node("strong","",v.name||"اختيار"),node("div","detailCode","property: "+v.provider_id));
    const rightText=node("span","",v.is_available?"متاح عند المورد":"غير متاح/غير مؤكد");
    r.append(leftText,rightText);variants.append(r);
  }
  if(!variants.childElementCount)variants.append(node("p","","مفيش خيارات مفصلة في الاستجابة؛ راجع تفاصيل المنتج عند صفقة."));
  right.append(node("h3","","المقاسات / الاختيارات وأكوادها"),variants);
  const disabled=node("button","","الشراء غير مفعل قبل اعتماد السعر والربط");disabled.disabled=true;right.append(disabled);
  layout.append(left,right);root.append(layout);dialog.showModal();
}
$("closeProduct").addEventListener("click",()=>$("productDialog").close());
$("productDialog").addEventListener("click",e=>{if(e.target===$("productDialog"))e.target.close()});
window.addEventListener("pagehide",()=>{user=null});
