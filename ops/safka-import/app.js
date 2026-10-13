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
  user=null;inboxMonitorBooted=false;lastInboxIds=new Set();document.title=ownerTitle;
  $("ownerConsole").hidden=true;$("signIn").hidden=false;
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
async function refreshSafkaCitiesOnly(){
  if(!user||busy)return;
  busy=true;
  const button=$("refreshSafkaCities");button.disabled=true;
  status("جاري جلب المحافظات والمدن بأسمائها وأكوادها الأصلية من API صفقة...");
  try{
    const result=await importCall("shipping");
    if(!result?.ok||result.saved<1)throw Error("لم يرجع المورد محافظات قابلة للحفظ.");
    await reload();
    status("تم تحديث بيانات الشحن من صفقة لعدد "+result.saved+" محافظة. تمت المحافظة على أكواد المدن الأصلية.");
  }catch(err){status("تعذر تحديث المدن: "+String(err?.message||err).slice(0,150),true)}
  finally{busy=false;button.disabled=false}
}
$("refreshSafkaCities").addEventListener("click",refreshSafkaCitiesOnly);
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

async function runSourceCategoryMatch(){
  if(!user||busy)return;
  busy=true;
  const action=$("syncCategories");
  action.disabled=true;$("importAll").disabled=true;$("reload").disabled=true;
  const progress=$("categoryProgress");progress.hidden=false;progress.value=0;
  const message=(text,isError=false)=>status(text,isError,"categoryMessage");
  let assigned=0,missing=0,failed=0;
  try{
    message("بنتحقق الأول هل API تفاصيل منتج صفقة بيرجع القسم الأصلي...");
    const probe=await db.functions.invoke("safka-category-backfill",{body:{mode:"probe"}});
    if(probe.error||!probe.data?.ok){
      let details=probe.data;
      if(probe.error?.context?.json)try{details=await probe.error.context.json()}catch{}
      throw Error("تعذر اختبار أقسام صفقة ("+(details?.error||probe.error?.message||"unknown")+")");
    }
    if(!probe.data.supported){
      message("API تفاصيل صفقة لا يعرض قسمًا قابلًا للتحقق. لم نغيّر أي تصنيف؛ لازم استخراج الأقسام من لوحة صفقة نفسها.",true);
      return;
    }
    message("تأكد قسم منتج الاختبار: "+probe.data.category+". جاري مطابقة المنتجات على دفعات...");
    for(let p=1;p<=100;p++){
      const reply=await db.functions.invoke("safka-category-backfill",{body:{mode:"batch",page:p}});
      if(reply.error||!reply.data?.ok){
        let details=reply.data;
        if(reply.error?.context?.json)try{details=await reply.error.context.json()}catch{}
        throw Error("توقفت عند دفعة "+p+": "+(details?.error||reply.error?.message||"unknown"));
      }
      const v=reply.data;
      assigned+=v.assigned||0;missing+=v.missing||0;failed+=v.failed||0;
      progress.value=Math.min(100,Math.round(p*100/Math.ceil((v.total||Number((($('allCount')?.textContent)||'464').replace(/[^0-9]/g,''))||464)/12)));
      message("تمت مطابقة "+assigned+" منتج. بانتظار تصنيف: "+missing+"، تعذر التحقق: "+failed+". الدفعة "+p+".");
      if(!v.hasMore)break;
      if(failed>=12)throw Error("أخطاء اتصال متكررة؛ وقفنا لحماية API صفقة. إعادة المحاولة آمنة.");
    }
    progress.value=100;
    message("انتهى الفحص. منتجات بتصنيف أصلي جديد: "+assigned+
      " — منتجات تحتاج مراجعة إضافية: "+missing+
      " — أخطاء: "+failed+". تصنيفات موجودة مسبقًا محفوظة كما هي.");
    await reload();
  }catch(err){
    message(err.message||"تعذر مزامنة الأقسام. لم تتغير الطلبات أو الأسعار.",true);
    await reload();
  }finally{
    busy=false;action.disabled=false;$("importAll").disabled=false;$("reload").disabled=false;
  }
}
$("syncCategories").addEventListener("click",runSourceCategoryMatch);

$("importAll").addEventListener("click",runAll);
$("reload").addEventListener("click",async()=>{if(!busy)await reload()});
$("search").addEventListener("input",()=>{page=0;loadProducts()});
$("category").addEventListener("change",()=>{page=0;loadProducts()});
$("pageSize").addEventListener("change",()=>{page=0;loadProducts()});
$("prevPage").addEventListener("click",()=>{if(page>0){page--;loadProducts()}});
$("nextPage").addEventListener("click",()=>{if((page+1)*Number($("pageSize").value)<count){page++;loadProducts()}});
async function ingestVerifiedMediaManifest(){
  if(!user||busy)return;
  const input=$("mediaManifestFile"),file=input?.files?.[0];
  if(!file){status("اختار ملف JSON للمطابقات المؤكدة.",true,"mediaIngestMessage");return}
  if(file.size>900000){status("حجم الملف كبير؛ قسمه على دفعات أقل من 900KB.",true,"mediaIngestMessage");return}
  busy=true;
  const button=$("ingestMediaManifest"),progress=$("mediaIngestProgress");
  button.disabled=true;$("reload").disabled=true;$("importAll").disabled=true;$("syncCategories").disabled=true;
  progress.hidden=false;progress.value=0;
  try{
    const raw=JSON.parse(await file.text());
    const rows=Array.isArray(raw)?raw:raw?.entries;
    if(!Array.isArray(rows)||rows.length===0||rows.length>1000)throw Error("صيغة الملف غير صحيحة؛ مطلوب entries بين 1 و1000.");
    const known=new Set();
    for(const entry of rows){
      if(typeof entry?.id!=="string"||!/^[a-f0-9]{24}$/.test(entry.id)||
         known.has(entry.id)||typeof entry.folder!=="string"||
         !Array.isArray(entry.videos)||!["video_found","no_video"].includes(entry.status))
        throw Error("تأكد من Product ID ورابط المجلد وقائمة الفيديوهات، ومنع تكرار الأكواد.");
      known.add(entry.id);
    }
    let saved=0,clips=0;
    for(let i=0;i<rows.length;i+=25){
      const {data,error}=await db.rpc("ss_safka_media_ingest_batch",{
        p_entries:rows.slice(i,i+25)
      });
      if(error||!data)throw Error("دفعة "+(Math.floor(i/25)+1)+": "+(error?.message||"server_rejected").slice(0,150));
      saved+=Number(data.saved)||0;clips+=Number(data.clips)||0;
      progress.value=Math.round(100*Math.min(rows.length,i+25)/rows.length);
      status("تم حفظ "+saved+" من "+rows.length+" منتجًا؛ عدد الفيديوهات الموثقة: "+clips+".",
        false,"mediaIngestMessage");
    }
    input.value="";
    status("نجح استيراد "+saved+" منتجًا مع "+clips+
      " فيديوًا. الميديا محفوظة بمعرف المنتج ولا تضيع عند إعادة استيراد الكتالوج.",
      false,"mediaIngestMessage");
    await loadMediaCoverage();
    await loadPricingAudit();
    await loadSafqaOrderInbox();
    await loadCheckoutReadiness();
  }catch(err){
    status("تعذر الحفظ: "+(err?.message||"تحقق من ملف الوسائط").slice(0,170)+
      " — يمكنك إعادة الاستيراد بأمان؛ الدفعات السابقة تحفظ بمعرف المنتج.",true,"mediaIngestMessage");
  }finally{
    busy=false;button.disabled=false;$("reload").disabled=false;
    $("importAll").disabled=false;$("syncCategories").disabled=false;
  }
}
$("ingestMediaManifest").addEventListener("click",ingestVerifiedMediaManifest);

async function discoverSupplierMedia(){
  if(!user||busy)return;
  const button=$("discoverSupplierMedia");
  busy=true;button.disabled=true;
  $("reload").disabled=true;$("importAll").disabled=true;$("syncCategories").disabled=true;
  const msg=(message,isError=false)=>status(message,isError,"mediaDiscoveryMessage");
  let folders=0,review=0,processed=0,errors=0;
  try{
    msg("بنفحص هل API صفقة فيه روابط وسائط للمنتجات أصلًا...");
    const test=await db.functions.invoke("safka-media-discover",{body:{mode:"probe"}});
    if(test.error||!test.data?.ok)throw Error(test.data?.error||test.error?.message||"API probe failed");
    if(!test.data.supported){
      msg("API صفقة مش بيعرض روابط الميديا المؤكدة في تفاصيل المنتجات. مفيش بيانات اتغيّرت. هنحتاج استخراجها من صفحات صفقة الأصلية.",true);
      return;
    }
    msg("API صفقة بيوفر روابط الميديا. بنجمع المجلدات في دفعات صغيرة...");
    for(let batch=1;batch<=90;batch++){
      const response=await db.functions.invoke("safka-media-discover",{body:{mode:"batch"}});
      if(response.error||!response.data?.ok){
        throw Error(response.data?.error||response.error?.message||"stopped_at_batch_"+batch);
      }
      const v=response.data;
      processed+=Number(v.processed)||0;folders+=Number(v.discovered)||0;
      review+=Number(v.review)||0;errors+=Number(v.failed)||0;
      msg("فحصنا "+processed+" منتج. لاقينا "+folders+" مجلدًا أصليًا، "+
        review+" محتاج مراجعة من لوحة صفقة. دفعة "+batch+".");
      if(!v.processed||processed>=500||errors>=6)break;
      await new Promise(resolve=>setTimeout(resolve,1100));
    }
    msg("انتهى فحص API لهذه الجلسة: "+processed+" منتج؛ مجلدات مؤكدة "+folders+
      "؛ للمراجعة "+review+". لازم بعد كده نقرأ ملفات الفيديو من Drive لكل مجلد مؤكد.");
    await loadMediaCoverage();
  }catch(error){
    msg("توقف اكتشاف الميديا: "+String(error?.message||"error").slice(0,160)+
      " — التقدم محفوظ ويمكن إعادة المحاولة.",true);
    await loadMediaCoverage();
  }finally{
    busy=false;button.disabled=false;$("reload").disabled=false;
    $("importAll").disabled=false;$("syncCategories").disabled=false;
  }
}
$("discoverSupplierMedia").addEventListener("click",discoverSupplierMedia);

// Export is owner-only; backend RPC enforces owner role and strips pricing/PII.
// JSON contract is versioned so future SELECT-SHOP-CLEAN can consume it
// via an importer with idempotency on (supplier,external_product_id).
async function exportPortableCatalog(){
  if(!user||busy)return;
  const button=$("exportPortableCatalog"),progress=$("portableExportProgress");
  busy=true;button.disabled=true;progress.hidden=false;progress.value=0;
  try{
    const seen=new Set(),items=[];
    let expected=null,categories=null;
    const chunk=40;
    for(let offset=0;expected===null||offset<expected;offset+=chunk){
      const {data,error}=await db.rpc("ss_safka_portable_export_v1",{
        p_offset:offset,p_limit:chunk
      });
      if(error||!data||data.schema_version!==1||
         data.format!=="select-shop.supplier-catalog"||!Array.isArray(data.items))
        throw Error("رفض السيرفر صفحة التصدير "+(Math.floor(offset/chunk)+1)+": "+
          String(error?.message||"صيغة غير متوقعة").slice(0,120));
      if(expected===null){
        expected=Number(data.total);
        categories=data.categories;
        if(!Number.isInteger(expected)||expected<0||expected>50000||!Array.isArray(categories))
          throw Error("عدد المنتجات أو الأقسام غير صحيح");
      }else if(expected!==Number(data.total))
        throw Error("عدد المنتجات اتغير أثناء التصدير. جرّب مرة تانية للحصول على نسخة متسقة.");
      for(const product of data.items){
        if(product?.supplier!=="safka"||
           !/^[a-f0-9]{24}$/.test(product.external_product_id||"")||
           seen.has(product.external_product_id)||
           !Array.isArray(product.images)||!Array.isArray(product.source_videos)||
           !Array.isArray(product.variants))
          throw Error("تكرار أو نقص في كود المنتج أو الميديا؛ أوقفنا التصدير لحماية النسخة.");
        seen.add(product.external_product_id);
        items.push(product);
      }
      if(!data.items.length&&items.length<expected)throw Error("دفعة المنتجات ناقصة");
      progress.value=expected?Math.round(100*items.length/expected):100;
      status("جاري تجهيز نسخة النقل: "+items.length+" من "+expected+" منتج…",
        false,"portableExportMessage");
    }
    if(items.length!==expected)throw Error("عدد المنتجات النهائية لا يطابق قاعدة البيانات");
    const payload={
      format:"select-shop.supplier-catalog",
      schema_version:1,
      exported_at:new Date().toISOString(),
      origin:{source:"safka",environment:"select-shop-temporary",
        website:"https://selectshopeg.com"},
      requires_import_review:true,
      excludes:["prices","supplier_costs","orders","customers","credentials","checkout"],
      categories,products:items,
      summary:{
        product_count:items.length,
        verified_category_products:items.filter(p=>p.category_verified).length,
        supplier_video_products:items.filter(p=>p.source_videos.length>0).length,
        supplier_video_urls:items.reduce((n,p)=>n+p.source_videos.length,0),
        products_requiring_category_review:items.filter(p=>!p.category_verified).length
      }
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
    const link=document.createElement("a"),url=URL.createObjectURL(blob);
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    link.href=url;link.download="select-shop-safka-portable-v1-"+stamp+".json";
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    status("نسخة التصدير جاهزة: "+items.length+" منتج، "+
      payload.summary.supplier_video_urls+" رابط فيديو، "+
      payload.summary.verified_category_products+" منتج بقسم مؤكد. حمّلها واحفظها؛ مش هتغيّر أي طلب أو سعر.",
      false,"portableExportMessage");
  }catch(error){
    status("تعذر تصدير نسخة آمنة: "+String(error?.message||"export_failed").slice(0,190),
      true,"portableExportMessage");
  }finally{busy=false;button.disabled=false}
}
$("exportPortableCatalog").addEventListener("click",exportPortableCatalog);

async function loadMediaCoverage(){
  if(!user)return;
  try{
    const [summary,queue]=await Promise.all([
      db.rpc("ss_safka_media_coverage_summary"),
      db.rpc("ss_safka_media_work_queue",{p_limit:12,p_offset:0})
    ]);
    if(summary.error||queue.error||!summary.data||!Array.isArray(queue.data))
      throw Error("لا يمكن جلب تغطية فيديوهات صفقة الآن");
    const metrics=summary.data;
    const fmt=v=>Number(v||0).toLocaleString("ar-EG");
    $("mediaProductsCount").textContent=fmt(metrics.video_products);
    $("mediaClipsCount").textContent=fmt(metrics.video_clips);
    $("mediaPendingCount").textContent=fmt(metrics.pending);
    $("mediaNoVideoCount").textContent=fmt(metrics.no_video);
    $("mediaFoldersCount").textContent=fmt(metrics.folder_verified);
    $("mediaReviewCount").textContent=fmt(Number(metrics.needs_review||0)+Number(metrics.access_denied||0));
    const total=Number(metrics.total)||0,verified=Number(metrics.video_products)||0;
    const pct=total?100*verified/total:0;
    $("mediaCoverageProgress").value=pct;
    status("متوفر فيديو أصلي لـ "+fmt(verified)+" من "+fmt(total)+" منتج ("+
      pct.toFixed(1)+"%). باقي المنتجات تحت الفحص، ولا يتم إنشاء فيديو تلقائي من الصور.",
      false,"mediaCoverageMessage");
    const root=$("mediaWorkQueue");root.replaceChildren();
    for(const p of queue.data){
      const item=node("div","mediaQueueItem");
      const code=text(p.id);
      const a=node("a","",text(p.name)||"منتج صفقة");
      a.href="https://aff.safka-eg.com/products/available_products/"+encodeURIComponent(code);
      a.target="_blank";a.rel="noopener noreferrer";
      const meta=node("small","",code+" • "+text(p.category)+" • "+text(p.status));
      item.append(a,meta);root.append(item);
    }
    if(!queue.data.length)root.append(node("p","","مفيش منتجات متبقية في قائمة الفحص."));
  }catch(e){status(e.message||"تعذر قراءة بيانات الوسائط",true,"mediaCoverageMessage")}
}

// Owner's reversible storefront merchandising list: supplier inventory and
// prices are never changed. The RPC atomically replaces only the ordered IDs.
let pendingCuratedIds=[],curatedKnown=new Map(),curatedDirty=false,curatedBusy=false;
const curatedIdPattern=/^[a-f0-9]{24}$/i;
function curatedSetDirty(){
 curatedDirty=true;
 $("curatedSave").disabled=curatedBusy||pendingCuratedIds.length<1||pendingCuratedIds.length>20;
 $("curatedOwnerCount").textContent=pendingCuratedIds.length+" / 20";
 status("التغييرات دي مسودة عندك؛ اضغط «حفظ ونشر اختياراتي» لتظهر على الموقع.",false,"curatedManagerStatus");
}
function curatedDraw(){
 const list=$("curatedOwnerList");list.replaceChildren();
 pendingCuratedIds.forEach((id,i)=>{
  const p=curatedKnown.get(id)||{};
  const row=node("div","ssCuratedManageItem");
  const name=node("div","ssCuratedProductText");
  name.append(node("strong","",(i+1)+". "+(p.name||id)),
    node("small","","السعر شامل التوصيل: "+money(p.final_price_egp)+
      " | "+(p.is_available&&p.retail_price_verification==="verified_note"?
       "حسب المورد متاح للتجربة":"يحتاج مراجعة توفر/سعر")));
  const tools=node("div","ssCuratedActions");
  for(const [label,shift] of [["↑",-1],["↓",1]]){
   const btn=node("button","",label);btn.type="button";
   btn.disabled=i+shift<0||i+shift>=pendingCuratedIds.length;
   btn.setAttribute("aria-label",label==="↑"?"تقديم المنتج":"تأخير المنتج");
   btn.onclick=()=>{
    const next=i+shift;[pendingCuratedIds[i],pendingCuratedIds[next]]=
      [pendingCuratedIds[next],pendingCuratedIds[i]];
    curatedSetDirty();curatedDraw();
   };tools.append(btn);
  }
  const remove=node("button","ssCuratedRemove","إخفاء");remove.type="button";
  remove.onclick=()=>{
    pendingCuratedIds.splice(i,1);curatedSetDirty();curatedDraw();
  };tools.append(remove);
  row.append(name,tools);list.append(row);
 });
 $("curatedOwnerCount").textContent=pendingCuratedIds.length+" / 20";
 if(!pendingCuratedIds.length)list.append(node("p","","ما ينفعش تحفظ معرض فاضي. اختار منتجًا واحدًا على الأقل."));
}
async function loadCuratedOwner(){
 if(!user)return;
 try{
  const {data:ids,error}=await db.from("ss_safka_curated_selection")
    .select("supplier_product_id,sort_order").order("sort_order").limit(20);
  if(error)throw Error("تعذر قراءة مختارات المتجر؛ راجع صلاحيات المالك.");
  const selected=(ids||[]).map(v=>v.supplier_product_id);
  const {data:detail,error:detailError}=selected.length?
    await db.from("ss_safka_import_products")
     .select("supplier_product_id,name,is_available,final_price_egp,retail_price_verification")
     .in("supplier_product_id",selected):{data:[],error:null};
  if(detailError)throw Error("تعذر قراءة أسماء منتجات المختارات.");
  curatedKnown=new Map((detail||[]).map(p=>[p.supplier_product_id,p]));
  pendingCuratedIds=selected;curatedDirty=false;
  $("curatedSave").disabled=true;
  const {count}=await db.from("ss_safka_import_products")
    .select("supplier_product_id",{count:"exact",head:true});
  $("curatedOwnerArchived").textContent=(Math.max(0,Number(count||0)-selected.length))+
    " منتج صفقة + 4 مجموعات أحذية";
  curatedDraw();
  status("القائمة الحالية محفوظة. تقدر تغيّر ترتيبها أو تخفي وتضيف من كتالوج صفقة الكامل.",false,"curatedManagerStatus");
 }catch(e){status(String(e?.message||e),true,"curatedManagerStatus")}
}
async function curatedFind(){
 if(!user||curatedBusy)return;
 const q=$("curatedFindProduct").value.trim().slice(0,80).replace(/[%(),]/g,"");
 const list=$("curatedFindResults");list.replaceChildren();
 if(q.length<2){status("اكتب حرفين على الأقل من اسم المنتج أو كوده.",true,"curatedManagerStatus");return}
 const query=db.from("ss_safka_import_products")
   .select("supplier_product_id,name,final_price_egp,retail_price_verification,is_available,variants")
   .order("name").limit(12);
 const {data,error}=curatedIdPattern.test(q)?
   await query.eq("supplier_product_id",q):await query.ilike("name","%"+q+"%");
 if(error){status("البحث في الكتالوج المحفوظ فشل.",true,"curatedManagerStatus");return}
 for(const p of data||[]){
  curatedKnown.set(p.supplier_product_id,p);
  const row=node("div","ssCuratedManageItem");
  const safe=p.is_available===true&&p.retail_price_verification==="verified_note"&&
    Number(p.final_price_egp)>110&&
    Array.isArray(p.variants)&&p.variants.some(v=>v.is_available===true);
  row.append(node("div","ssCuratedProductText",p.name+" — "+
    money(p.final_price_egp)+(safe?"":" | موقوف مؤقتًا")));
  const add=node("button","","أضف للمختارات");add.type="button";
  add.disabled=!safe||pendingCuratedIds.includes(p.supplier_product_id)||pendingCuratedIds.length>=20;
  add.onclick=()=>{
   if(pendingCuratedIds.length>=20||pendingCuratedIds.includes(p.supplier_product_id))return;
   pendingCuratedIds.push(p.supplier_product_id);curatedSetDirty();curatedDraw();add.disabled=true;
  };
  row.append(add);list.append(row);
 }
 if(!data?.length)list.append(node("p","","مافيش منتج بالبحث ده. جرّب اسم تاني."));
}
$("curatedFindButton").addEventListener("click",()=>void curatedFind());
$("curatedFindProduct").addEventListener("keydown",e=>{
 if(e.key==="Enter"){e.preventDefault();void curatedFind();}
});
$("curatedRefresh").addEventListener("click",()=>{
 if(curatedDirty&&!window.confirm("هتلغي التعديلات اللي لسه ما حفظتهاش. موافق؟"))return;
 void loadCuratedOwner();
});
$("curatedSave").addEventListener("click",async()=>{
 if(!user||!curatedDirty||curatedBusy||pendingCuratedIds.length<1||pendingCuratedIds.length>20)return;
 if(!window.confirm("حفظ "+pendingCuratedIds.length+" منتج مختار للظهور في المتجر؟ باقي المنتجات هتفضل محفوظة ومخفية."))return;
 curatedBusy=true;$("curatedSave").disabled=true;
 status("بنحفظ ونراجع شرط التوفر والأسعار...",false,"curatedManagerStatus");
 try{
  const {data,error}=await db.rpc("ss_safka_owner_set_curated_v1",{p_ids:[...pendingCuratedIds]});
  if(error||!data?.ok)throw Error(error?.message||"تعذر حفظ القائمة");
  curatedDirty=false;await loadCuratedOwner();
  status("تم نشر "+data.saved+" منتج على المتجر. باقي المنتجات محفوظة، وهيظهر الاختيار الجديد عند تحديث صفحة العميل.",false,"curatedManagerStatus");
 }catch(e){status("تعذر النشر: "+String(e?.message||e).slice(0,160),true,"curatedManagerStatus");}
 finally{curatedBusy=false;$("curatedSave").disabled=!curatedDirty;}
});

async function reload(){
  if(!user)return;
  try{
    const [
      products,categories,regions,approved,pending,priced,available
    ]=await Promise.all([
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}),
      db.from("ss_safka_import_categories").select("category_key,category_name").order("category_name").limit(1000),
      db.from("ss_safka_import_shipping").select("governorate_id,name_ar,shipping_egp,is_active").order("name_ar").limit(100),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("review_state","approved").eq("owner_verified",true),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("category_key","uncategorized"),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("retail_price_verification","verified_note").eq("is_available",true),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("is_available",true)
    ]);
    if(products.error||categories.error||regions.error||approved.error||pending.error||priced.error||available.error)throw Error("تعذّر تحميل ملخص البيانات من Supabase.");
    $("allCount").textContent=(products.count??0).toLocaleString("ar-EG");
    $("currentAvailableCount").textContent=(available.count??0).toLocaleString("ar-EG");
    $("categoryCount").textContent=(categories.data||[]).length.toLocaleString("ar-EG");
    $("regionCount").textContent=(regions.data||[]).length.toLocaleString("ar-EG");
    $("approvedCount").textContent=(approved.count??0).toLocaleString("ar-EG");
    $("pricedCount").textContent=(priced.count??0).toLocaleString("ar-EG");
    const [reviewPrices,currentCat]=await Promise.all([
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true})
        .neq("retail_price_verification","verified_note").eq("is_available",true),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true})
        .eq("source_category_latest_present",true)
    ]);
    if(reviewPrices.error||currentCat.error)throw Error("تعذر فحص حالات التسعير والأقسام الحالية");
    $("needsPriceReviewCount").textContent=(reviewPrices.count??0).toLocaleString("ar-EG");
    $("latestSourceCategoriesCount").textContent=(currentCat.count??0).toLocaleString("ar-EG");
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
    const {data:fresh,error:freshError}=await db.from("ss_safka_import_products")
      .select("synced_at").order("synced_at",{ascending:false}).limit(1).maybeSingle();
    if(!freshError&&fresh?.synced_at)
      $("safkaLastSync").textContent="آخر مزامنة فعلية من صفقة: "+
        new Date(fresh.synced_at).toLocaleString("ar-EG",{timeZone:"Africa/Cairo"})+
        " — التحديث الآلي يوميًا، والتوفر بيتراجع وقت تسجيل الأوردر.";
    else $("safkaLastSync").textContent="وقت آخر مزامنة غير متاح؛ استخدم زر استيراد كل المنتجات عند الحاجة.";
    await loadProducts();
    await loadMediaCoverage();
    await Promise.all([loadSafqaOrderInbox(),loadCheckoutReadiness(),loadOperatorPicks(),loadCuratedOwner(),loadSafkaDispatchControl()]);
  }catch(err){status(err.message,true,"catalogMessage")}
}
// Export only after owner auth. Contains supplier prices and private pricing drafts.
async function exportPriceReviewCsv(){
  const button=$("exportPriceCsv");
  if(!user||button.disabled)return;
  button.disabled=true;
  status("جاري تجهيز قائمة الأسعار الكاملة...",false,"priceExportMessage");
  try{
    const all=[];
    for(let offset=0;offset<5000;offset+=100){
      const {data,error}=await db.from("ss_safka_import_products").select(
        "supplier_product_id,barcode,name,category_name,source_category_confirmed,source_category_latest_present,suggested_sale_price_egp,retail_note_suggested_egp,retail_price_verification,final_price_egp,variants,review_state,owner_verified"
      ).order("supplier_product_id",{ascending:true}).range(offset,offset+99);
      if(error)throw Error("تعذر قراءة الأسعار من قاعدة البيانات");
      all.push(...(data||[]));
      if((data||[]).length<100)break;
    }
    if(!all.length)throw Error("قائمة الأسعار فارغة");
    const headers=["كود صفقة","باركود","اسم المنتج","القسم المحفوظ","القسم ظاهر في API الحالي",
  "sale_price للمورد (ليس المقترح)","سعر البيع المقترح من ملاحظات صفقة",
  "أعلى سعر مورد للاختيار","سعر البيع النهائي للعميل شامل التوصيل","حالة التحقق من السعر",
  "فرق السعر المرجعي قبل الشحن","رصيد نظري عند شحن 85 ج قبل المصاريف","رصيد نظري عند شحن 110 ج قبل المصاريف",
  "مخاطرة إعلانية تقديرية","احتياطي الشحن المضمن في السعر (أعلى محافظة حاليًا)","حالة النشر","ملاحظات"];
    const csvValue=x=>{
      let val=String(x??"");
      // Defuse spreadsheet formula injection when exporting supplier-provided strings.
      if(/^[=+@\-\t\r]/.test(val))val="'"+val;
      return '"'+val.replace(/"/g,'""')+'"';
    };
    const records=all.map(p=>{
      const original=Number(p.suggested_sale_price_egp)||0;
      const variants=Array.isArray(p.variants)?p.variants:[];
      const valid=variants.filter(v=>v.is_available&&Number(v.suggested_price)>0);
      const expensive=valid.length?Math.max(...valid.map(v=>Number(v.suggested_price))):0;
      const reference=Math.max(original,expensive);
      const verified=p.retail_price_verification==="verified_note";
      const price=verified?Number(p.final_price_egp)||0:0;
      // "sale_price" is an upstream reference, not a verified all-in purchase cost.
      const referenceGap=verified&&reference>0?Number(p.retail_note_suggested_egp)-reference:null;
      const after85=verified&&price&&reference>0?price-reference-85:null;
      const after110=verified&&price&&reference>0?price-reference-110:null;
      const risk=!verified?"موقوف: السعر غير مؤكد":referenceGap===null?
        "موقوف: مرجع المورد مفقود":referenceGap<90?
        "مرتفع: فرق السعر أقل من 90 قبل الإعلان":referenceGap<150?
        "مراجعة: فرق السعر أقل من 150 قبل الإعلان":"يلزم اعتماد تكاليف الإعلان والمورد";
      const notes=[];
      if(!p.source_category_latest_present)notes.push("القسم غير وارد في API الحالي؛ لا تعتبره مطابقًا لصفقة");
      if(!verified)notes.push("السعر غير مؤكد — لا تعرضه ولا تقبل أوردر");
      if(p.retail_price_verification==="variant_review")notes.push("اختيارات المورد أسعارها مختلفة — مراجعة يدوية");
      if(variants.some(v=>Number(v.suggested_price)>0&&Number(v.suggested_price)!==original))notes.push("اختيارات بأسعار مختلفة");
      if(after110!==null&&after110<=0)notes.push("عرضة لخسارة أو تعادل نظري عند الشحن الأعلى قبل مصاريف التسويق");
      if(referenceGap!==null&&referenceGap<90)notes.push("مراجعة تسويق عاجلة: فرق السعر المرجعي محدود");
      if(!price)notes.push("لم يُسعَّر");
      return [p.supplier_product_id,p.barcode,p.name,p.category_name,
        p.source_category_latest_present?"نعم":"لا",original,p.retail_note_suggested_egp??"",
        reference,price||"",p.retail_price_verification||"unverified",
        referenceGap??"",after85??"",after110??"",risk,110,
        p.review_state==="approved"&&p.owner_verified?"معتمد":"مسودة لمراجعة المورد",
        notes.join("؛ ")].map(csvValue).join(",");
    });
    const content="\uFEFF"+[headers.map(csvValue).join(","),...records].join("\r\n");
    const file=new Blob([content],{type:"text/csv;charset=utf-8"});
    const href=URL.createObjectURL(file);
    const anchor=document.createElement("a");anchor.href=href;
    anchor.download="SELECT-SHOP-SAFKA-PRICES-"+new Date().toISOString().slice(0,10)+".csv";
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(href),5000);
    status("تم تجهيز "+all.length+" صف سعر، شاملة الأكواد والاختيارات والفروق. ملف خاص بالمراجعة.",false,"priceExportMessage");
  }catch(err){status(String(err?.message||err).slice(0,190),true,"priceExportMessage")}
  finally{button.disabled=false}
}
$("exportPriceCsv").addEventListener("click",exportPriceReviewCsv);

// Owner-only pricing review. This is an audit, never a publishing action.
async function loadPricingAudit(){
 if(!user)return;
 const button=$("runPriceAudit");button.disabled=true;
 status("جاري تدقيق السعر المقترح من ملاحظات صفقة...",false,"priceAuditMessage");
 try{
  const all=[];
  for(let offset=0;offset<5000;offset+=500){
   const {data,error}=await db.from("ss_safka_import_products")
    .select("supplier_product_id,name,category_name,is_available,source_category_latest_present,suggested_sale_price_egp,retail_note_suggested_egp,retail_price_verification,final_price_egp")
    .order("supplier_product_id").range(offset,offset+499);
   if(error)throw Error("فشل قراءة الأسعار من قاعدة البيانات");
   all.push(...(data||[]));if((data||[]).length<500)break;
  }
  const current=all.filter(p=>p.is_available===true);
  const valid=current.filter(p=>p.retail_price_verification==="verified_note"&&
    Number(p.final_price_egp)>0&&Number(p.final_price_egp)===Number(p.retail_note_suggested_egp)+110);
  const manual=current.filter(p=>p.retail_price_verification==="manual_review"||
     p.retail_price_verification==="unverified");
  const variants=current.filter(p=>p.retail_price_verification==="variant_review");
  const unresolved=current.filter(p=>p.retail_price_verification!=="verified_note");
  const missingCat=current.filter(p=>!p.source_category_latest_present);
  const lowGap=valid.filter(p=>Number(p.suggested_sale_price_egp)>0&&
    Number(p.retail_note_suggested_egp)-Number(p.suggested_sale_price_egp)<90)
    .sort((a,b)=>(Number(a.retail_note_suggested_egp)-Number(a.suggested_sale_price_egp))-
      (Number(b.retail_note_suggested_egp)-Number(b.suggested_sale_price_egp)));
  $("auditLowMargin").textContent=String(lowGap.length);
  $("auditVariants").textContent=String(variants.length);
  $("auditCategory").textContent=String(missingCat.length);
  $("auditBundle").textContent=String(manual.length);
  $("auditAdsEligible").textContent=String(valid.length);
  $("auditPremium").textContent=String(valid.filter(p=>Number(p.final_price_egp)>=900).length);
  const queue=$("priorityReviews");queue.replaceChildren();
  for(const p of [...variants,...manual].slice(0,12)){
    const item=node("div","mediaQueueItem");
    item.append(node("strong","",p.name));
    item.append(node("small","",
      p.retail_price_verification==="variant_review"?
      "الاختيارات مختلفة السعر: لا تقبل أوردر قبل تأكيد كل اختيار":
      "سعر البيع المقترح غير ثابت في ملاحظات المورد؛ الطلب موقوف"));
    item.append(node("small","","سعر المورد sale_price: "+money(p.suggested_sale_price_egp)+
      " | البيع المقترح من الملاحظة: "+(p.retail_note_suggested_egp?money(p.retail_note_suggested_egp):"غير متاح")));
    const btn=node("button","","افتح المنتج وراجع");
    btn.type="button";btn.onclick=async()=>{
       $("search").value=p.supplier_product_id;$("category").value="";
       page=0;await loadProducts();$(".catalog")?.scrollIntoView({block:"start",behavior:"smooth"});
    };
    item.append(btn);queue.append(item);
  }
  for(const p of lowGap.slice(0,12)){
    const difference=Number(p.retail_note_suggested_egp)-Number(p.suggested_sale_price_egp);
    const item=node("div","mediaQueueItem");
    item.append(node("strong","",p.name));
    item.append(node("small","","فرق السعر المرجعي قبل الإعلان: "+money(difference)+
      ". ليس ربحًا صافيًا؛ تكلفة المورد والعمولات تحتاج اعتماد."));
    item.append(node("small","","سعر العميل "+money(p.final_price_egp)+
      " | مرجع المورد "+money(p.suggested_sale_price_egp)+
      " | رصيد افتراضي عند شحن 110 جنيه "+money(Number(p.final_price_egp)-Number(p.suggested_sale_price_egp)-110)));
    const btn=node("button","","راجع تسعير المنتج");
    btn.type="button";btn.onclick=async()=>{
      $("search").value=p.supplier_product_id;$("category").value="";
      page=0;await loadProducts();$(".catalog")?.scrollIntoView({block:"start",behavior:"smooth"});
    };
    item.append(btn);queue.append(item);
  }
  status("محفوظ "+all.length+"، ظاهر "+current.length+" — أسعار متحققة بالمعادلة المطلوبة: "+valid.length+
   "؛ أسعار موقوفة: "+unresolved.length+
   " (ملاحظات غير واضحة "+manual.length+"، واختلاف اختيارات "+variants.length+")"+
   "؛ الأقسام غير مثبتة في آخر API: "+missingCat.length+
   "؛ فروق سعر مرجعي أقل من 90 قبل الإعلانات: "+lowGap.length+
   ". لا يوجد اعتماد ربحية أو موافقة إطلاق إعلانات.",
   unresolved.length>0,"priceAuditMessage");
 }catch(err){
  status("تعذر فحص الأسعار: "+String(err?.message||err).slice(0,140),true,"priceAuditMessage");
 }finally{button.disabled=false}
}
// Operator-signed market pilot, visible to authenticated admins only.
// Competitor observations dated 13 October 2026; never assert profits from
// generic Safqa source quotes or advertise before cost/pixel validation.
const operatorPicks=[
 {id:"6a71f70b4d956cf608604baa",name:"منفاخ TirePro 12V",
  marketPrice:880,marketUrl:"https://opendar.com/p/tirepro-mnfakh-alitarat-almhmwl",
  campaign:"ss_tirepro_oct2026_test",message:"ضغط الكاوتش قل في مشوار؟ 🚗\\nمنفاخ TirePro يشتغل من ولاعة العربية مباشرة، ومعاه عداد ضغط يساعدك تتابع النفخ. حل عملي تخليه في شنطة العربية.\\nسعره شامل التوصيل — اطلب للمراجعة والتأكيد قبل التجهيز."},
 {id:"6abac80af2dfbd30480af5ee",name:"كشاف الطوارئ وراديو 5×1",
  marketPrice:1072,marketUrl:"https://opendar.com/p/kshaf-indhar-wradyw-mtadd-alwzayf-5-fy-1",
  campaign:"ss_emergency_radio_oct2026_test",message:"كشاف وراديو وإنذار في جهاز واحد 🔦📻\\nجهاز الطوارئ 5×1 فيه كشاف LED وراديو FM وذراع للشحن اليدوي، ومناسب للبيت والعربية والرحلات.\\nاعرف التفاصيل والسعر شامل التوصيل، وسيب بياناتك للتأكيد."}
];
let operatorCatalog=[];
const optionalMoney=n=>Number.isFinite(Number(n))?money(n):"غير مؤكد";
function pilotValues(){
 const values=["pilotReturnReserve","pilotExtraReserve","pilotProfitGoal"].map(id=>Number($(id).value));
 if(values.some(v=>!Number.isSafeInteger(v)||v<0||v>10000))
  throw Error("أدخل افتراضات صحيحة غير سالبة للمرتجعات والرسوم والهدف.");
 return values;
}
function operatorLandingLink(p){
 const url=new URL("https://selectshopeg.com/");
 url.searchParams.set("product",p.id);
 url.searchParams.set("utm_source","facebook");
 url.searchParams.set("utm_medium","paid_social");
 url.searchParams.set("utm_campaign",p.campaign);
 url.searchParams.set("utm_content","supplier_verified_static_v1");
 return url.href;
}
function renderOperatorPicks(){
 if(!user)return;
 const target=$("pilotProducts");target.replaceChildren();
 let reserve;
 try{reserve=pilotValues()}catch(e){
   status(String(e?.message||e),true,"pilotReviewStatus");return;
 }
 let validated=0;
 for(const def of operatorPicks){
  const p=operatorCatalog.find(x=>x.supplier_product_id===def.id);
  const safe=Boolean(p?.is_available&&p.retail_price_verification==="verified_note"&&
    Number(p.final_price_egp)===Number(p.retail_note_suggested_egp)+110&&
    Number(p.final_price_egp)>110&&p.review_state!=="rejected"&&
    Array.isArray(p.variants)&&p.variants.some(x=>x.is_available===true));
  const card=node("article","mediaQueueItem ssOperatorPick");
  card.append(node("strong","",def.name+(safe?" · السعر المبدئي متحقق":" · موقوف عن التجربة")));
  if(!safe){
    card.append(node("p","detailNote","المورد أو السعر غير متاح الآن. لا تنشر إعلانًا أو تعرض سعرًا قديمًا لهذا المنتج."));
    target.append(card);continue;
  }
  validated++;
  const buffer=Number(p.retail_note_suggested_egp)-Number(p.suggested_sale_price_egp);
  const maxCpa=buffer-reserve.reduce((sum,n)=>sum+n,0);
  card.append(node("small","","سعر العميل شامل الشحن: "+money(p.final_price_egp)+
    " | عرض مشابه رُصد بتاريخ 13 أكتوبر: "+money(def.marketPrice)));
  card.append(node("small","","فرق مرجعي بعد احتياطي شحن 110: "+money(buffer)+
    " (ليس ربحًا معتمدًا)"));
  card.append(node("small","","أقصى تكلفة اكتساب نظرية للطلب المُسلَّم مع الافتراضات دي: "+
    money(maxCpa)+" — قبل إثبات تكلفة المورد ومعدل رفض الأوردرات"));
  card.append(node("p","detailNote","السعر المنافس قد يتغير، وقد تختلف المواصفات والشحن والضمان. لا توجد موافقة على تفعيل الإعلانات."));
  const controls=node("div","ssSafqaOrderActions");
  const landing=node("a","ssOrdersJump","صفحة المنتج");
  landing.href=operatorLandingLink(def);landing.target="_blank";landing.rel="noopener noreferrer";
  const competitor=node("a","ssOrdersJump","افحص سعر المنافس");
  competitor.href=def.marketUrl;competitor.target="_blank";competitor.rel="noopener noreferrer";
  const copy=node("button","","نسخ نص الإعلان التجريبي");copy.type="button";
  copy.addEventListener("click",async()=>{
    const brief=def.message+"\\nالسعر الحالي شامل الشحن: "+
      Number(p.final_price_egp).toLocaleString("ar-EG")+" جنيه."+
      "\\n"+operatorLandingLink(def);
    try{await navigator.clipboard.writeText(brief);copy.textContent="النص اتنسخ";}
    catch{copy.textContent="النسخ غير متاح؛ افتح صفحة المنتج"; }
  });
  controls.append(landing,competitor,copy);card.append(controls);
  target.append(card);
 }
 if(!validated)target.append(node("p","detailNote","المرشحون الاتنين مش جاهزين حاليًا. لا تنشر إعلانات."));
 status("تمت مراجعة "+validated+" من 2 منتج في كتالوج صفقة؛ الحساب سيناريو افتراضي، ولا يثبت ربحًا. الإعلانات متوقفة حتى تحقق التكاليف والـPixel.",validated<2,"pilotReviewStatus");
}
async function loadOperatorPicks(){
 if(!user)return;
 const {data,error}=await db.from("ss_safka_import_products")
  .select("supplier_product_id,name,is_available,review_state,owner_verified,variants,retail_price_verification,retail_note_suggested_egp,suggested_sale_price_egp,final_price_egp")
  .in("supplier_product_id",operatorPicks.map(p=>p.id));
 if(error){
  status("تعذر فحص المرشحين: "+String(error.message).slice(0,120),true,"pilotReviewStatus");
  return;
 }
 operatorCatalog=data||[];
 renderOperatorPicks();
}
for(const id of ["pilotReturnReserve","pilotExtraReserve","pilotProfitGoal"])
 $(id).addEventListener("input",renderOperatorPicks);

// Owner-only commercial shortlisting. No supplier orders, no ads, no claims
// of confirmed real margins, stock units or live video playback.
let commercialRows=[];
function commercialCost(id){
 const el=$(id),value=Number(el?.value);
 if(!el||!el.value.trim()||!Number.isSafeInteger(value)||value<0||value>10000)
   throw Error("راجع قيم تكلفة الإعلان والمرتجعات والعمولات؛ لازم أرقام صحيحة من 0 إلى 10000.");
 return value;
}
async function supplierMediaCoverageIds(){
 const covered=new Set();
 for(let page=1;page<=20;page++){
  const {data,error}=await db.rpc("ss_safka_public_catalog_v2",{
    p_page:page,p_limit:48,p_category:null,p_search:""
  });
  if(error||!data||!Array.isArray(data.items))
   throw Error("تعذر التأكد من ربط الفيديوهات بمنتجات المورد.");
  for(const p of data.items){
    if(Array.isArray(p.videos)&&p.videos.length>0)covered.add(p.id);
  }
  if(page*48>=Number(data.total)||data.items.length===0)break;
 }
 return covered;
}
function openCommercialProduct(p){
 $("search").value=p.id;
 $("category").value="";
 page=0;
 void loadProducts().then(()=>{
   $(".catalog")?.scrollIntoView({block:"start",behavior:"smooth"});
 });
}
async function runCommercialReview(){
 if(!user)return;
 const btn=$("runCommercialReview"),exportBtn=$("downloadCommercialCsv");
 btn.disabled=true;exportBtn.disabled=true;commercialRows=[];
 status("بنراجع أسعار المورد وحالة التوفر وربط الفيديوهات…",false,"commercialReviewMessage");
 try{
   const cpa=commercialCost("commercialCpa"),returns=commercialCost("commercialReturns"),fees=commercialCost("commercialFees");
   const all=[];
   for(let offset=0;offset<5000;offset+=500){
     const {data,error}=await db.from("ss_safka_import_products")
       .select("supplier_product_id,name,category_name,source_category_confirmed,is_available,retail_price_verification,retail_note_suggested_egp,suggested_sale_price_egp,final_price_egp,owner_verified,review_state,variants")
       .order("supplier_product_id").range(offset,offset+499);
     if(error)throw Error("تعذرت قراءة الأسعار الخاصة من لوحة الإدارة.");
     all.push(...(data||[]));
     if((data||[]).length<500)break;
   }
   const videoIds=await supplierMediaCoverageIds();
   const candidates=all.filter(p=>p.is_available===true&&
     p.retail_price_verification==="verified_note"&&
     Number(p.final_price_egp)===Number(p.retail_note_suggested_egp)+110&&
     Number(p.suggested_sale_price_egp)>0&&
     Array.isArray(p.variants)&&p.variants.some(v=>v.is_available===true))
     .map(p=>{
       const quote=Number(p.final_price_egp),reference=Number(p.suggested_sale_price_egp);
       const provisional=quote-reference-110-cpa-returns-fees;
       return {id:p.supplier_product_id,name:p.name,category:p.category_name,
         categoryConfirmed:p.source_category_confirmed===true,hasVideo:videoIds.has(p.supplier_product_id),
         reference,quote,originalNote:Number(p.retail_note_suggested_egp),
         spread:quote-reference-110,provisional,ownerApproved:p.owner_verified===true&&p.review_state==="approved"};
     })
     .filter(p=>p.provisional>0)
     .sort((a,b)=>Number(b.hasVideo&&b.categoryConfirmed)-Number(a.hasVideo&&a.categoryConfirmed)||
       b.provisional-a.provisional||a.quote-b.quote);
   const selected=candidates.filter(p=>p.hasVideo&&p.categoryConfirmed).slice(0,20);
   commercialRows=selected;
   const queue=$("commercialShortlist");queue.replaceChildren();
   for(const [i,p] of selected.entries()){
     const card=node("div","mediaQueueItem");
     card.append(node("strong","",(i+1)+". "+p.name));
     card.append(node("small","","سعر الموقع شامل الشحن: "+money(p.quote)+
       " | مرجع سعر المورد: "+money(p.reference)+
       " | فرق مرجعي بعد 110 شحن: "+money(p.spread)));
     card.append(node("small","","متبقٍ في النموذج بعد الأرقام المدخلة: "+money(p.provisional)+
       " — تقدير وليس ربحًا مثبتًا."));
     card.append(node("small","","فيديو مرتبط: نعم (صلاحية التشغيل غير مضمونة)"+
       " | القسم محفوظ من مصدر سابق"+
       " | المخزون الفعلي والعمولات يحتاجان تأكيدًا"));
     const preview=node("a","","عرض صفحة المنتج");
     preview.href="https://selectshopeg.com/?product="+encodeURIComponent(p.id)+"#products";
     preview.target="_blank";preview.rel="noopener noreferrer";
     const check=node("button","","افتحه للمراجعة");
     check.type="button";check.onclick=()=>openCommercialProduct(p);
     card.append(preview,check);queue.append(card);
   }
   if(!selected.length)queue.append(node("p","","مفيش منتجات اجتمعت فيها الشروط المطلوبة مع تقديرات التكاليف الحالية."));
   exportBtn.disabled=selected.length===0;
   const unmodeled=cpa===0&&returns===0&&fees===0?
     " تنبيه: التكاليف كلها صفر — ده مش إثبات عدم وجود مصاريف.":"";
   status("فحصنا "+all.length+" منتجًا؛ "+candidates.length+
     " عندها فرق مرجعي إيجابي بعد التكاليف المُدخلة؛ "+selected.length+
     " في قائمة المراجعة (سعر موثّق، متاح حسب API، فيديو مرتبط، قسم محفوظ). "+
     "ولا منتج اتوافق عليه لإعلان أو اتبعت له طلب."+unmodeled,
     false,"commercialReviewMessage");
 }catch(err){
   $("commercialShortlist").replaceChildren();
   status(String(err?.message||"تعذر إعداد القائمة").slice(0,300),true,"commercialReviewMessage");
 }finally{btn.disabled=false;}
}
$("runCommercialReview").addEventListener("click",()=>void runCommercialReview());
for(const id of ["commercialCpa","commercialReturns","commercialFees"]){
  $(id).addEventListener("input",()=>{
    commercialRows=[];
    $("downloadCommercialCsv").disabled=true;
    status("التكاليف اتغيرت؛ اضغط «حلل المنتجات» لإعادة الحساب على الأرقام الجديدة.",false,"commercialReviewMessage");
  });
}
$("downloadCommercialCsv").addEventListener("click",()=>{
 if(!user||!commercialRows.length)return;
 const cost=[commercialCost("commercialCpa"),commercialCost("commercialReturns"),commercialCost("commercialFees")];
 const escapeCsv=x=>{
   let s=String(x??"");
   if(/^[=+@-]/.test(s)||s.startsWith("\t")||s.startsWith("\r"))s="'"+s;
   return '"'+s.replace(/"/g,'""')+'"';
 };
 const headers=["الترتيب","كود المنتج","المنتج","السعر شامل الشحن","مرجع المورد (ليس تكلفة مؤكدة)",
   "فرق مرجعي بعد شحن 110","تكلفة الإعلان لكل طلب مُدخل","تكلفة إلغاء/مرتجع مُدخل",
   "رسوم إضافية مُدخلة","المتبقي في النموذج وليس ربحًا معتمدًا","رابط صفحة المنتج",
   "حالة التقييم"];
 const body=commercialRows.map((p,i)=>[
   i+1,p.id,p.name,p.quote,p.reference,p.spread,...cost,p.spread-cost.reduce((a,b)=>a+b,0),
   "https://selectshopeg.com/?product="+p.id+"#products",
   "للمراجعة فقط — يلزم إثبات تكلفة الشراء والعمولات والمخزون والفيديو"
 ].map(escapeCsv).join(","));
 const blob=new Blob(["\uFEFF"+[headers.map(escapeCsv).join(","),...body].join("\r\n")],
   {type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="SELECT-SHOP-SAFKA-AD-REVIEW-"+new Date().toISOString().slice(0,10)+".csv";
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
});

// Owner-only CSV of product/option price provenance and pending reviews.
async function exportVariantPricingCsv(){
  if(!user)return;
  const button=$("exportVariantPricingCsv");button.disabled=true;
  status("جاري تجهيز أسعار الاختيارات...",false,"priceExportMessage");
  try{
    const [{data:options,error:optionError},{data:products,error:productError}]=await Promise.all([
      db.from("ss_safka_variant_price_drafts").select(
        "supplier_product_id,supplier_variant_id,variant_name,reference_price_egp,draft_price_egp,supplier_available"
      ).order("supplier_product_id").range(0,999),
      db.from("ss_safka_import_products").select("supplier_product_id,name,final_price_egp,retail_price_verification,retail_note_suggested_egp")
        .order("supplier_product_id").range(0,999)
    ]);
    if(optionError||productError||!options?.length)throw Error("تعذر تحميل أسعار الاختيارات");
    const map=new Map((products||[]).map(p=>[p.supplier_product_id,p]));
    const columns=["كود منتج صفقة","اسم المنتج","كود الاختيار عند صفقة","اسم اللون/المقاس/الاختيار",
       "الاختيار متاح","مرجع سعر صفقة للاختيار","سعر اختيار SELECT SHOP المبدئي","سعر المنتج المعروض",
       "تنبيه"];
    const cell=v=>{
      let value=String(v??"");
      if(/^[=+@\-\t\r]/.test(value))value="'"+value;
      return '"'+value.replace(/"/g,'""')+'"';
    };
    const rows=options.map(v=>{
      const product=map.get(v.supplier_product_id);
      const ready=product?.retail_price_verification==="verified_note";
      const note=!ready?"موقوف — سعر البيع المقترح غير مؤكد أو اختلاف أسعار الاختيارات":
        Number(product?.final_price_egp)!==Number(v.draft_price_egp)?
        "اختلاف سعر الاختيار؛ أوقف الطلب وراجع":"مسودة متحققة من ملاحظة المورد";
      return [v.supplier_product_id,product?.name||"",v.supplier_variant_id,v.variant_name,
        v.supplier_available?"نعم":"لا",v.reference_price_egp,ready?v.draft_price_egp:"",
        ready?product?.final_price_egp??"":"",note].map(cell).join(",");
    });
    const csv="\uFEFF"+[columns.map(cell).join(","),...rows].join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;link.download="SELECT-SHOP-SAFKA-VARIANT-PRICES-"+new Date().toISOString().slice(0,10)+".csv";
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    status("تم تجهيز "+rows.length+" سعر اختيار بالاسم والكود، خاص بإدارة المتجر.",false,"priceExportMessage");
  }catch(err){status(String(err?.message||err).slice(0,180),true,"priceExportMessage")}
  finally{button.disabled=false}
}
$("exportVariantPricingCsv").addEventListener("click",exportVariantPricingCsv);

$("runPriceAudit").addEventListener("click",loadPricingAudit);
$("checkSafkaConnection").addEventListener("click",async()=>{
  if(!user)return;
  const button=$("checkSafkaConnection");button.disabled=true;
  status("جاري التأكد من صلاحية API على حساب صفقة... قراءة فقط.",false,"safkaConnectionMessage");
  try{
    const {data,error}=await db.functions.invoke("safka-connection-check",{body:{}});
    if(error||!data?.ok)throw Error(error?.message||data?.error||"connection_check_failed");
    if(data.connected)
      status("الاتصال المباشر بحساب صفقة يعمل للقراءة. استيراد الأسعار والشحن متاح. إرسال الطلبات الحقيقية لسه غير مفعّل.",
        false,"safkaConnectionMessage");
    else status("اتصال صفقة غير جاهز: "+String(data.reason||"غير معروف")+
      ". لم يتم إرسال أي طلب.",true,"safkaConnectionMessage");
  }catch(e){status("فشل فحص الاتصال: "+String(e?.message||"خطأ").slice(0,140),true,"safkaConnectionMessage")}
  finally{button.disabled=false}
});

async function loadCheckoutReadiness(){
  if(!user)return;
  const id="safkaCheckoutMessage";
  status("جاري فحص جاهزية استقبال طلبات صفقة...",false,id);
  try{
    const res=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/safka-checkout-config",{
      method:"GET",cache:"no-store",
      headers:{"apikey":"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa"},
      signal:AbortSignal.timeout(12000)
    });
    if(!res.ok)throw Error("التحقق غير متاح");
    const data=await res.json();
    if(data.checkoutConfigured){
      status("استقبال طلبات العملاء مفعّل: الطلب يتسجّل في صندوق الإدارة للمراجعة، بدون إرسال تلقائي للمورد. السعر يتحقق على الخادم قبل الحفظ.",false,id);
    }else{
      status("خادم استقبال الطلبات غير متاح حاليًا، راجع تهيئته. لا يتم إرسال أي طلب للمورد تلقائيًا.",false,id);
    }
  }catch(e){
    status("تعذر فحص بوابة الطلبات؛ لم يتم تفعيل الطلبات تلقائيًا.",true,id);
  }
}

// Owner-only Safqa guest-order inbox. NEVER calls Safqa supplier order API.
function fulfillmentCopyText(item,lines){
  const goods=lines.length?lines.map((l,i)=>
    (i+1)+") "+l.product_title+" / "+l.variant_title+" × "+l.quantity+
    " — كود المنتج: "+l.supplier_product_id+" — كود الاختيار: "+l.supplier_variant_id):
    [item.product_title+" / "+item.variant_title+" × "+item.quantity+
      " — كود المنتج: "+item.supplier_product_id+" — كود الاختيار: "+item.supplier_variant_id];
  return [
    "SELECT SHOP — تجهيز يدوي عند المورد (ليس إرسالًا آليًا)",
    "رقم أوردر الموقع: "+item.order_code,
    ...goods,
    "اسم العميل: "+item.customer_name,
    "الهاتف: "+item.phone,
    "المحافظة: "+item.governorate_name,
    "كود مدينة صفقة: "+(item.city_id||"غير محدد — مطلوب تدقيق"),
    "المنطقة: "+item.area,
    "العنوان: "+item.address,
    "الإجمالي المعروض للعميل شامل التوصيل: "+money(item.total_egp),
    "ملاحظات: "+(item.notes||"لا يوجد"),
    "حالة تحويل المورد: "+(item.supplier_status||"غير معروفة")
  ].join("\n");
}
let safkaDispatchState=null,safkaDispatchBusy=false;
async function loadSafkaDispatchControl(){
 if(!user)return;
 const {data,error}=await db.from("ss_safka_dispatch_control")
   .select("enabled,daily_limit").eq("id",true).maybeSingle();
 if(error||!data){
   safkaDispatchState=null;$("safkaAutoTransferToggle").disabled=true;
   $("safkaAutoTransferState").textContent="حالة غير معروفة";
   status("تعذر التحقق من زر الإرسال؛ راجع قاعدة البيانات. لا تفترض أنه متوقف.",true,"safkaAutoTransferMessage");
   return;
 }
 safkaDispatchState=data;
 $("safkaAutoTransferState").textContent=data.enabled?"مفعّل":"موقوف";
 $("safkaAutoTransferToggle").textContent=data.enabled?"إيقاف الإرسال التلقائي":"تشغيل الإرسال التلقائي";
 $("safkaAutoTransferToggle").disabled=safkaDispatchBusy;
 status("الحد الأقصى "+data.daily_limit+" محاولة إرسال خلال 24 ساعة. المراقبة لا تعيد إرسال الطلبات غير المؤكدة.",false,"safkaAutoTransferMessage");
}
$("safkaAutoTransferToggle").addEventListener("click",async()=>{
 if(!user||!safkaDispatchState||safkaDispatchBusy)return;
 const next=!safkaDispatchState.enabled;
 const approval=next?
   "تشغيل إرسال طلبات المنتجات المختارة إلى صفقة فور حفظها؟ الطلبات الجديدة قد تبدأ متابعة وشحنًا حقيقيًا.":
   "إيقاف أي إرسال تلقائي جديد إلى صفقة؟ لا يمكن سحب أوردر سبق قبوله عند المورد.";
 if(!window.confirm(approval))return;
 safkaDispatchBusy=true;$("safkaAutoTransferToggle").disabled=true;
 const prior=safkaDispatchState.enabled;
 try{
   const {data,error}=await db.from("ss_safka_dispatch_control")
     .update({enabled:next,updated_at:new Date().toISOString()})
     .eq("id",true).eq("enabled",prior).select("enabled,daily_limit").maybeSingle();
   if(error||!data)throw Error("toggle_failed_or_modified");
   safkaDispatchState=data;
   await loadSafkaDispatchControl();
 }catch{
   status("تعذر تغيير إعداد الإرسال؛ الحالة لم تتأكد. جدّد بيانات اللوحة قبل أي إجراء.",true,"safkaAutoTransferMessage");
 }finally{safkaDispatchBusy=false;void loadSafkaDispatchControl();}
});
let inboxLoading=false,inboxMonitorBooted=false,lastInboxIds=new Set(),ownerTitle=document.title;
async function loadSafqaOrderInbox(options={}){
  if(!user||inboxLoading)return;
  inboxLoading=true;
  const button=$("reloadSafkaInbox");
  if(button)button.disabled=true;
  if(!options.silent)status("جاري تحميل طلبات الموقع...",false,"safkaInboxMessage");
  try{
    const [safkaResult,shoeResult]=await Promise.all([
      db.from("ss_safka_checkout_requests")
        .select("id,order_code,supplier_product_id,supplier_variant_id,product_title,variant_title,quantity,unit_price_egp,total_egp,customer_name,phone,governorate_id,governorate_name,city_id,area,address,notes,status,supplier_status,supplier_order_ref,supplier_serial,supplier_dispatch_error_code,created_at",{count:"exact"})
        .order("created_at",{ascending:false}).limit(100),
      db.from("ss_orders")
        .select("id,order_code,status,created_at",{count:"exact"})
        .order("created_at",{ascending:false}).limit(100)
    ]);
    const {data,error,count:totalSafka}=safkaResult;
    const {data:shoeOrders,error:shoeError,count:totalShoes}=shoeResult;
    if(error||shoeError)throw Error("تعذر قراءة أحد صندوقَي طلبات المتجر؛ راجع صلاحية مدير المتجر أو الاتصال بقاعدة البيانات.");
    const cartLines=new Map();
    if(data?.length){
      const {data:lines,error:lineError}=await db.from("ss_safka_checkout_cart_items")
        .select("order_id,supplier_product_id,supplier_variant_id,product_title,variant_title,quantity,unit_price_egp,line_total_egp")
        .in("order_id",data.map(x=>x.id)).limit(800);
      if(lineError)throw Error("تعذر تحميل تفاصيل سلال المنتجات. لم يتم إظهار أوردر ناقص.");
      for(const line of lines||[]){
        const group=cartLines.get(line.order_id)||[];group.push(line);cartLines.set(line.order_id,group);
      }
    }
    // IDs and counts only in the tab alert; no customer PII enters browser notifications.
    const ids=new Set([...(data||[]).map(x=>"safka:"+x.id),
      ...(shoeOrders||[]).map(x=>"shoe:"+x.id)]);
    const newlyArrived=inboxMonitorBooted?[...ids].filter(id=>!lastInboxIds.has(id)):[];
    lastInboxIds=ids;inboxMonitorBooted=true;
    const pendingSafka=(data||[]).filter(x=>x.status==="review"&&x.supplier_status!=="sent").length;
    const transferredSafka=(data||[]).filter(x=>x.supplier_status==="sent").length;
    $("safkaTransferredCount").textContent=String(transferredSafka);
    const confirmedAwaitingSupplier=(data||[]).filter(x=>x.status==="confirmed"&&x.supplier_status==="not_sent").length;
    const pendingShoes=(shoeOrders||[]).filter(x=>["new","review","shipping_quote"].includes(x.status)).length;
    const pendingTotal=pendingSafka+confirmedAwaitingSupplier+pendingShoes;
    $("safkaPendingOrders").textContent=String(pendingSafka);
    $("safkaConfirmedOrders").textContent=String(confirmedAwaitingSupplier);
    $("shoePendingOrders").textContent=String(pendingShoes);
    $("allOrderSourcesTotal").textContent=String((totalSafka||0)+(totalShoes||0));
    document.title=pendingTotal?"("+pendingTotal+" بحاجة لإجراء) "+ownerTitle:ownerTitle;
    const liveAlert=$("ownerNewOrdersAlert");
    if(newlyArrived.length){
      liveAlert.hidden=false;
      liveAlert.textContent="وصل "+newlyArrived.length+
        " طلب جديد في أحد صناديق المتجر. راجع الطلبات هنا أو في لوحة الأحذية الأصلية.";
    }else if(pendingTotal===0){
      liveAlert.hidden=true;liveAlert.textContent="";
    }
    const filter=$("safkaInboxFilter").value;
    const visible=(data||[]).filter(item=>
      filter==="all"||
      filter==="review"&&item.status==="review"&&item.supplier_status!=="sent"||
      filter==="confirmed"&&item.status==="confirmed"&&item.supplier_status==="not_sent"||
      filter==="sent"&&item.supplier_status==="sent"||
      filter==="active"&&(item.status==="review"&&item.supplier_status!=="sent"||
        item.status==="confirmed"&&item.supplier_status==="not_sent"));
    const root=$("safkaInboxList");root.replaceChildren();
    if(!visible.length){
      root.append(node("p","detailNote",
        (totalSafka||0)===0?"لسه مفيش طلبات منتجات صفقة مسجلة على الموقع.":
          "مفيش طلبات مطابقة للفلتر الحالي؛ جرّب «كل الحالات»."));
    }
    for(const item of visible){
      const article=node("article","mediaQueueItem ssSafqaOrderCard");
      const label=item.status==="review"?"بانتظار المراجعة":item.status==="confirmed"?"تم التأكيد داخل الموقع":"ملغي";
      article.append(node("strong","",item.order_code+" · "+label));
      const lines=cartLines.get(item.id)||[];
      if(lines.length){
        article.append(node("strong","ssSafqaBundleHeading","محتويات السلة · "+lines.length+" اختيار"));
        const group=node("div","ssSafqaBundleLines");
        for(const line of lines){
          group.append(node("p","",line.product_title+" — "+line.variant_title+
            " × "+line.quantity+" = "+money(line.line_total_egp)));
          group.append(node("small","","كود المنتج: "+line.supplier_product_id+
            " | كود الاختيار: "+line.supplier_variant_id));
        }
        article.append(group);
      }else article.append(node("p","",item.product_title+" · "+item.variant_title+" × "+item.quantity));
      article.append(node("small","","الإجمالي: "+money(item.total_egp)+" | حالة تحويل المورد: "+(item.supplier_status==="not_sent"?"لم يُرسل":item.supplier_status==="sent"?"اتسجل عند صفقة":item.supplier_status==="dispatching"?"جاري الإرسال":item.supplier_status==="needs_reconciliation"?"رد غير مؤكد — لا تعيد الإرسال":item.supplier_status==="blocked"?"إرسال مرفوض ويحتاج متابعة":"تحتاج مطابقة")));
      article.append(node("p","",item.customer_name+" — "+item.phone));
      article.append(node("small","",item.governorate_name+" — "+item.area+" — "+item.address));
      if(item.notes)article.append(node("small","","ملاحظات: "+item.notes));
      // Private owner actions: only open customer WhatsApp or copy a manual
      // supplier checklist. Neither operation sends an order to Safqa.
      const manualTools=node("div","ssSafqaOrderActions");
      if(/^01[0125][0-9]{8}$/.test(item.phone)){
        const whatsapp=node("a","ssSafqaContactLink","راسل العميل لتأكيد الطلب ↗");
        whatsapp.href="https://wa.me/20"+item.phone.slice(1)+"?text="+encodeURIComponent(
          "أهلاً بحضرتك، بنتواصل من SELECT SHOP بخصوص طلبك رقم "+item.order_code+
          " علشان نأكد التفاصيل قبل تجهيز الشحنة.");
        whatsapp.target="_blank";whatsapp.rel="noopener noreferrer";
        manualTools.append(whatsapp);
      }
      const copy=node("button","","انسخ بيانات الأوردر للمورد");copy.type="button";
      copy.addEventListener("click",async()=>{
        try{
          if(!navigator.clipboard?.writeText)throw Error("clipboard_unavailable");
          await navigator.clipboard.writeText(fulfillmentCopyText(item,lines));
          copy.textContent="اتنسخت بيانات الأوردر";
        }catch{
          copy.textContent="النسخ غير متاح؛ راجع التفاصيل الظاهرة هنا";
        }
      });
      manualTools.append(copy);article.append(manualTools);
      if(item.supplier_status==="sent"){
        article.append(node("p","ssHandoffConfirmed","الأوردر وصل للمورد — رقم صفقة: "+
          (item.supplier_serial||item.supplier_order_ref||"مسجل يدويًا بدون رقم آلي")));
      }
      if(["blocked","needs_reconciliation","dispatching"].includes(item.supplier_status)){
        article.append(node("p","ssOwnerOrderAlert",
          "متابعة إلزامية: لا تعيد إرسال الطلب لصفقة قبل التحقق من لوحة المورد بنفس رقم أوردر SELECT SHOP. "+
          (item.supplier_dispatch_error_code?"رمز المشكلة: "+item.supplier_dispatch_error_code:"")));
      }
      if(item.status==="confirmed"&&item.supplier_status==="not_sent"){
        const block=node("div","ssManualSupplierHandoff");
        block.append(node("strong","","مرحلة المورد — تسجيل تحويل يدوي فقط"));
        block.append(node("p","detailNote",
          "اتأكد الأول من تسجيل كل منتجات الأوردر على منصة المورد بنفسك. الموقع لن يرسل أي بيانات للمورد آليًا."));
        const refLabel=node("label","","رقم الطلب / أرقام الطلبات عند صفقة");
        const ref=node("input");ref.type="text";ref.maxLength=160;
        ref.placeholder="مرجع صفقة بعد تسجيل الطلب يدويًا";ref.autocomplete="off";
        refLabel.append(ref);
        const checkLabel=node("label","","أؤكد أني دخلت كل المنتجات على صفقة بالفعل وتحققت من أرقام التحويل.");
        const check=node("input");check.type="checkbox";checkLabel.prepend(check);
        const mark=node("button","","سجّل أن الطلب اتحوّل للمورد يدويًا");
        mark.type="button";mark.disabled=true;
        const sync=()=>{mark.disabled=!check.checked||ref.value.trim().length<3||ref.value.trim().length>160;};
        check.addEventListener("change",sync);ref.addEventListener("input",sync);
        mark.addEventListener("click",async()=>{
          if(!user||mark.disabled)return;
          if(!window.confirm("هل كل عناصر الطلب اتسجلت عند صفقة يدويًا، والمرجع المدخل صحيح؟ الضغط هنا تسجيل فقط، مش إرسال للمورد."))return;
          mark.disabled=true;
          try{
            const {data:out,error:err}=await db.functions.invoke("safka-review-order",{
              body:{orderId:item.id,action:"record_sent",supplierOrderRef:ref.value.trim()}
            });
            if(err||!out?.ok)throw Error(out?.error||err?.message||"supplier_handoff_failed");
            await loadSafqaOrderInbox();
          }catch(error){
            status("تعذر تسجيل مرجع المورد: "+String(error?.message||error).slice(0,150),true,"safkaInboxMessage");
            sync();
          }
        });
        block.append(refLabel,checkLabel,mark);article.append(block);
      }

      article.append(node("small","","تاريخ الطلب: "+new Date(item.created_at).toLocaleString("ar-EG")));
      if(item.status==="review"&&item.supplier_status==="not_sent"){
        const controls=node("div","ssSafqaOrderActions");
        for(const action of ["confirm","cancel"]){
          const label=action==="confirm"?"العميل أكّد الطلب — خزّن التأكيد":"إلغاء الطلب";
          const btn=node("button","",label);btn.type="button";
          btn.addEventListener("click",async()=>{
            if(!user)return;
            if(!window.confirm(action==="confirm"?"هل تواصلت مع العميل وأكّد الطلب والعنوان والتوفر؟ سيتم حفظ التأكيد فقط، ولن يُرسل أي شيء إلى صفقة.":"هل أكدت مع العميل إلغاء الطلب؟"))return;
            btn.disabled=true;
            try{
              const {data:out,error:callError}=await db.functions.invoke("safka-review-order",{body:{orderId:item.id,action}});
              if(callError||!out?.ok)throw Error(out?.error||callError?.message||"review_failed");
              await loadSafqaOrderInbox();
            }catch(e){
              status("تعذر تحديث الطلب: "+String(e?.message||e).slice(0,150),true,"safkaInboxMessage");
              btn.disabled=false;
            }
          });
          controls.append(btn);
        }
        article.append(controls);
      }
      root.append(article);
    }
    status("طلبات صفقة: "+(totalSafka||0)+" (المعروض "+visible.length+" من أحدث 100). "+
      "طلبات الأحذية: "+(totalShoes||0)+". مراجعة الطلب لا ترسله للمورد. "+
      "آخر تحديث "+new Date().toLocaleTimeString("ar-EG",{timeZone:"Africa/Cairo"})+".",
      false,"safkaInboxMessage");
  }catch(e){status(String(e?.message||e).slice(0,170),true,"safkaInboxMessage")}
  finally{inboxLoading=false;if(button)button.disabled=false}
}
$("reloadSafkaInbox").addEventListener("click",()=>void loadSafqaOrderInbox());
$("safkaInboxFilter").addEventListener("change",()=>void loadSafqaOrderInbox());
setInterval(()=>{
  if(user&&!document.hidden&&!$("ownerConsole").hidden&&!busy)
    void loadSafqaOrderInbox({silent:true});
},60000);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&user&&!$("ownerConsole").hidden&&!busy)
    void loadSafqaOrderInbox({silent:true});
});

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
  info.append(node("div","cardPrice","sale_price للمورد: "+money(p.suggested_sale_price_egp)));
  info.append(node("div","cardPrice","سعر البيع المقترح من الملاحظة: "+
    (p.retail_note_suggested_egp?money(p.retail_note_suggested_egp):"غير مؤكد")));
  if(p.retail_price_verification!=="verified_note")
    info.append(node("div","cardPrice","غير متاح للطلب — السعر يحتاج مراجعة"));
  else if(p.review_state==="approved"&&p.owner_verified)
    info.append(node("div","cardPrice","سعر معتمد شامل التوصيل: "+money(p.final_price_egp)));
  else if(p.final_price_egp)info.append(node("div","cardPrice","سعر متحقق شامل التوصيل: "+money(p.final_price_egp)));
  else info.append(node("small","","سعر SELECT SHOP شامل الشحن: قيد المراجعة"));
  const open=node("button","","شوف الأكواد والميديا");
  open.type="button";open.addEventListener("click",()=>openDetail(p));
  info.append(open);article.append(cover,info);return article;
}
async function loadProducts(){
  if(!user)return;
  const limit=Number($("pageSize").value)||24;
  let q=db.from("ss_safka_import_products")
    .select("supplier_product_id,barcode,name,description,category_key,category_name,source_category_latest_present,suggested_sale_price_egp,retail_note_suggested_egp,retail_price_verification,variants,images,videos,is_available,review_state,final_price_egp,owner_verified,source_category_confirmed",{count:"exact"})
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
  let supplierVideos=Array.isArray(p.videos)?p.videos:[];
  // Owner catalog's original video field is empty for many rows.
  // Read the SAME vetted public catalog that powers the customer-facing product gallery.
  try{
    const {data:publicResult,error:mediaError}=await db.rpc("ss_safka_public_catalog_v2",{
      p_page:1,p_limit:1,p_category:null,p_search:p.supplier_product_id
    });
    if(!mediaError && Array.isArray(publicResult?.items)){
      const match=publicResult.items.find(x=>x.id===p.supplier_product_id);
      if(match && Array.isArray(match.videos))supplierVideos=match.videos;
    }
  }catch{}
  let media=[
    ...(Array.isArray(p.images)?p.images:[]).map(url=>({url,type:"image"})),
    ...supplierVideos.map(url=>({url,type:"video"}))
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
  // Campaign landing links belong only in authenticated owner dashboard, never in public cards.
  const campaign=node("div","ssCampaignOwnerLink");
  campaign.append(node("strong","","رابط المنتج للإعلانات — للإدارة فقط"));
  const campaignUrl="https://selectshopeg.com/?product="+encodeURIComponent(p.supplier_product_id)+"#products";
  const campaignInput=node("input");campaignInput.type="text";campaignInput.readOnly=true;
  campaignInput.value=campaignUrl;campaignInput.dir="ltr";
  campaignInput.setAttribute("aria-label","رابط هبوط المنتج للحملات");
  const copyLink=node("button","","نسخ رابط الإعلان");
  copyLink.type="button";
  copyLink.addEventListener("click",async()=>{
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(campaignUrl);
      else{campaignInput.select();document.execCommand("copy");}
      copyLink.textContent="تم نسخ الرابط";
    }catch{campaignInput.select();copyLink.textContent="انسخ الرابط من الحقل";}
  });
  campaign.append(campaignInput,copyLink);right.append(campaign);
  right.append(node("div","detailCode","Product ID: "+p.supplier_product_id));
  if(p.barcode)right.append(node("div","detailCode","Barcode: "+p.barcode));
  const cat=node("p","detailNote",p.source_category_latest_present?
    "القسم ورد في أحدث بيانات صفقة.":
    "تنبيه: واجهة API الحالية لا تؤكد القسم؛ التصنيف المحفوظ قديم أو غير معروف.");
  right.append(cat);
  const supplierChoices=Array.isArray(p.variants)?p.variants:[];
  const currentlyOffered=supplierChoices.filter(v=>v.is_available===true).length;
  right.append(node("p","detailNote","حالة المورد في آخر مزامنة: "+
    (p.is_available===true?"المنتج متاح حسب API":"المنتج غير متاح حسب API")+
    "؛ اختيارات معلّمة متاحة "+currentlyOffered+" من "+supplierChoices.length+
    ". أعداد القطع الفعلية غير مؤكدة؛ يجري فحص مباشر قبل استقبال طلب العميل."));
  const price=node("p","detailNote","sale_price للمورد: "+money(p.suggested_sale_price_egp)+
    " — سعر البيع المقترح في الملاحظات: "+
    (p.retail_note_suggested_egp?money(p.retail_note_suggested_egp):"غير مؤكد")+
    " — سعر SELECT SHOP: "+(p.retail_price_verification==="verified_note"?money(p.final_price_egp):"موقوف مؤقتًا"));
  right.append(price);
  if(p.retail_price_verification==="verified_note"&&Number(p.suggested_sale_price_egp)>0){
    const supplierReference=Number(p.suggested_sale_price_egp);
    const referenceSpread=Number(p.final_price_egp)-supplierReference-110;
    right.append(node("p","detailNote",
      "فرق مرجعي بعد أعلى شحن حالي: "+money(referenceSpread)+
      " (ليس ربحًا صافيًا؛ مرجع المورد غير معتمد كتكلفة فعلية، والإعلانات والعمولات والمرتجعات خارج الحساب)."+
      (referenceSpread<150?" لا تبدأ إعلانًا ممولًا قبل مراجعة تفصيلية.":"")));
  }
  const pricing=node("section","priceDraftBox");
  pricing.append(node("h3","","تسعير SELECT SHOP — مسودة خاصة"));
  try{
    const {data:audit,error:auditError}=await db.from("ss_safka_price_review_v2")
      .select("prior_price_egp,proposed_price_egp,projected_contribution_egp,pricing_segment,notes")
      .eq("supplier_product_id",p.supplier_product_id).maybeSingle();
    if(!auditError&&audit){
      pricing.append(node("p","ssPriceHistory","السعر السابق: "+money(audit.prior_price_egp)+
        " ← الجديد: "+money(audit.proposed_price_egp)));
      const label=audit.pricing_segment==="paid_ad_candidate"?"مرشح لاختبار إعلان بميزانية محدودة":
        audit.pricing_segment==="manual_price_check"?"اختيارات تحتاج مراجعة يدوية":
        "تحتاج اختبار سوق ومراجعة هامش ربح قبل أي إعلان";
      pricing.append(node("p","detailNote","قاعدة التسعير الحالية: سعر صفقة المقترح + 110 جنيه شحن. "+label+
        "؛ هامش الربح الحقيقي غير معروف من البيانات دي."));
    }
  }catch{}
  pricing.append(node("p","detailNote","قاعدة أسعار المنتجات المؤكدة: سعر البيع المقترح من ملاحظة صفقة +110 جنيه كاحتياطي يغطي أعلى شحن حالي؛ الطلبات تُراجع يدويًا ولا تُرسل للمورد تلقائيًا."));
  const form=node("form","ssDraftPriceForm");
  const label=node("label","","سعر البيع النهائي (جنيه)");
  const priceInput=node("input");
  priceInput.type="number";priceInput.min="1";priceInput.max="1000000";priceInput.step="1";
  priceInput.required=true;priceInput.inputMode="numeric";
  priceInput.value=p.final_price_egp?String(p.final_price_egp):"";
  label.append(priceInput);
  const saveButton=node("button","primary","حفظ السعر كمسودة");
  saveButton.type="submit";
  const feedback=node("p","feedback");
  feedback.setAttribute("role","status");
  // Safqa suggested SALE price is not supplier cost. Avoid displaying invented net profit.
  const priceExplainer=node("p","ssPriceHistory");
  const supplierQuote=Number(p.retail_note_suggested_egp)||0;
  const expectedPrice=supplierQuote+110;
  const updateExplainer=()=>{
    const candidate=Number(priceInput.value)||0;
    priceExplainer.textContent="سعر البيع المقترح من صفقة: "+money(supplierQuote)+
      " + احتياطي شحن 110 جنيه (أعلى تكلفة محافظة حاليًا) = "+money(expectedPrice)+
      ". السعر الحالي: "+money(candidate)+". الفرق عن القاعدة: "+money(candidate-expectedPrice)+
      ". أسعار الاختيارات المختلفة موجودة تحت؛ لا نفترض تكلفة شراء أو صافي ربح.";
  };
  if(p.retail_price_verification!=="verified_note"){
    priceInput.disabled=true;saveButton.disabled=true;
    feedback.textContent="المنتج موقوف حتى يتوفر سعر مقترح موثوق من المصدر، وتُراجع فروق الاختيارات.";
  }
  priceInput.addEventListener("input",updateExplainer);
  form.append(label,saveButton,feedback);
  pricing.append(priceExplainer,form);right.append(pricing);
  updateExplainer();
  // Public price publication requires an explicit separate owner acknowledgement.
  // Customer checkout and Safqa supplier POST remain disabled even after publication.
  const approval=node("div","ssPriceApproval");
  if(p.owner_verified&&p.review_state==="approved"){
    approval.append(node("p","detailNote","السعر معتمد. طلب العميل من الموقع يُحفظ في صندوق الإدارة للمراجعة؛ إرسال الطلب للمورد يدوي حاليًا."));
  }else{
    approval.append(node("h3","","الاعتماد النهائي — خطوة منفصلة"));
    const approveCheck=node("input");approveCheck.type="checkbox";approveCheck.id="approve-"+p.supplier_product_id;
    const approveLabel=node("label","","راجعت تكلفة المورد الحقيقية، والعمولة، والشحن، والاختيارات؛ وأوافق على نشر السعر فقط.");
    approveLabel.prepend(approveCheck);
    const approveButton=node("button","","اعتماد سعر المنتج للإدارة (لا يرسل الطلب للمورد)");
    approveButton.type="button";approveButton.disabled=true;
    const approveStatus=node("p","feedback");approveStatus.setAttribute("role","status");
    const syncApproval=()=>{
      approveButton.disabled=!approveCheck.checked||
        p.retail_price_verification!=="verified_note"||
        !p.source_category_confirmed||
        Number(priceInput.value)!==Number(p.final_price_egp)||
        !p.final_price_egp;
    };
    approveCheck.addEventListener("change",syncApproval);
    priceInput.addEventListener("input",syncApproval);
    approveButton.addEventListener("click",async()=>{
      if(!user||approveButton.disabled)return;
      if(Number(priceInput.value)!==Number(p.final_price_egp)){
        approveStatus.textContent="احفظ المسودة أولًا ثم أعد مراجعتها.";return
      }
      approveButton.disabled=true;approveStatus.textContent="جاري اعتماد السعر المعروض فقط...";
      try{
        const {data,error}=await db.functions.invoke("safka-approve-price",{
          body:{productId:p.supplier_product_id,expectedPrice:Number(p.final_price_egp),acknowledgeCostAndShipping:true}
        });
        if(error||!data?.ok)throw Error(data?.error||error?.message||"approval_failed");
        p.owner_verified=true;p.review_state="approved";
        approveStatus.textContent="تم اعتماد السعر. يمكن استقبال طلبات العملاء للمراجعة في لوحة الإدارة.";
        approveCheck.checked=false;approveButton.disabled=true;
        await reload();
      }catch(e){
        approveStatus.textContent="تعذر الاعتماد: "+String(e?.message||e).slice(0,130);
        syncApproval();
      }
    });
    if(!p.source_category_confirmed)
      approveStatus.textContent="اعتماد السعر موقوف: لا يوجد تصنيف موثق لهذا المنتج في أي استيراد مؤكد.";
    else if(!p.source_category_latest_present)
      approveStatus.textContent="تنبيه: تصنيف المنتج محفوظ من بيانات صفقة سابقة ولم يظهر في API الأحدث. راجع القسم الحالي بنفسك، وتأكد من تكاليف التوريد والمرتجعات قبل اعتماد السعر؛ الخادم يسمح بالاعتماد بعد موافقتك.";
    else
      approveStatus.textContent="الاعتماد يدوي فقط بعد إثبات تكلفة التوريد والعمولة والتوفر؛ لا يرسل الطلب للمورد.";
    approval.append(approveLabel,approveButton,approveStatus);
  }
  pricing.append(approval);
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!user){feedback.textContent="جلسة المدير انتهت؛ سجل دخول مرة أخرى.";return}
    const value=Number(priceInput.value);
    if(!Number.isSafeInteger(value)||value<1||value>1000000){
      feedback.textContent="اكتب سعرًا صحيحًا بالجنيه من 1 إلى 1,000,000.";return;
    }
    saveButton.disabled=true;feedback.textContent="جاري حفظ المسودة...";
    try{
      const {data,error}=await db.functions.invoke("safka-price-draft",{
        body:{productId:p.supplier_product_id,priceEgp:value}
      });
      if(error||!data?.ok)throw Error(data?.error||"draft_save_failed");
      p.final_price_egp=value;p.owner_verified=false;p.review_state="imported";
      const approveCheck=approval.querySelector("input[type=checkbox]");if(approveCheck)approveCheck.checked=false;
      const approveButton=approval.querySelector("button");if(approveButton)approveButton.disabled=true;
      feedback.textContent="تم حفظ "+money(value)+" كمسودة خاصة. المنتج لا يزال غير متاح للشراء.";
      await loadProducts();
    }catch(err){
      feedback.textContent="فشل الحفظ: "+String(err?.message||"تعذر الوصول للخادم").slice(0,120);
    }finally{saveButton.disabled=false}
  });
  const variants=node("div","detailVariants");
  let pricesByVariant=new Map();
  try{
    const {data:pricedOptions,error:pricedError}=await db.from("ss_safka_variant_price_drafts")
      .select("supplier_variant_id,reference_price_egp,draft_price_egp")
      .eq("supplier_product_id",p.supplier_product_id).limit(100);
    if(!pricedError)pricesByVariant=new Map((pricedOptions||[]).map(v=>[v.supplier_variant_id,v]));
  }catch{}
  for(const v of (Array.isArray(p.variants)?p.variants:[])){
    const r=node("div","variant");
    const leftText=node("div");
    leftText.append(node("strong","",v.name||"اختيار"),node("div","detailCode","property: "+v.provider_id));
    const variantDraft=pricesByVariant.get(v.provider_id);
    const rightText=node("span","",v.is_available?"متاح عند المورد":"غير متاح/غير مؤكد");
    if(variantDraft){
      rightText.append(node("small","ssVariantEstimate","سعرنا: "+money(variantDraft.draft_price_egp)));
      rightText.append(node("small","ssVariantReference","مرجع صفقة: "+money(variantDraft.reference_price_egp)));
    }
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
