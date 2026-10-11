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
      progress.value=Math.min(100,Math.round(p*100/Math.ceil((v.total||462)/12)));
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

async function reload(){
  if(!user)return;
  try{
    const [
      products,categories,regions,approved,pending,priced
    ]=await Promise.all([
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}),
      db.from("ss_safka_import_categories").select("category_key,category_name").order("category_name").limit(1000),
      db.from("ss_safka_import_shipping").select("governorate_id,name_ar,shipping_egp,is_active").order("name_ar").limit(100),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("review_state","approved").eq("owner_verified",true),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).eq("category_key","uncategorized"),
      db.from("ss_safka_import_products").select("supplier_product_id",{count:"exact",head:true}).not("final_price_egp","is",null)
    ]);
    if(products.error||categories.error||regions.error||approved.error||pending.error||priced.error)throw Error("تعذّر تحميل ملخص البيانات من Supabase.");
    $("allCount").textContent=(products.count??0).toLocaleString("ar-EG");
    $("categoryCount").textContent=(categories.data||[]).length.toLocaleString("ar-EG");
    $("regionCount").textContent=(regions.data||[]).length.toLocaleString("ar-EG");
    $("approvedCount").textContent=(approved.count??0).toLocaleString("ar-EG");
    $("pricedCount").textContent=(priced.count??0).toLocaleString("ar-EG");
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
    await loadMediaCoverage();
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
        "supplier_product_id,barcode,name,category_name,source_category_confirmed,suggested_sale_price_egp,final_price_egp,variants,review_state,owner_verified"
      ).order("supplier_product_id",{ascending:true}).range(offset,offset+99);
      if(error)throw Error("تعذر قراءة الأسعار من قاعدة البيانات");
      all.push(...(data||[]));
      if((data||[]).length<100)break;
    }
    if(!all.length)throw Error("قائمة الأسعار فارغة");
    const headers=["كود صفقة","باركود","اسم المنتج","القسم","القسم مؤكد من المورد","سعر صفقة المرجعي","أعلى سعر اختيار متاح","سعر بيع SELECT SHOP المقترح شامل الشحن","فرق السعر عن المرجع","احتياطي الشحن الأقصى","حالة النشر","ملاحظات"];
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
      const price=Number(p.final_price_egp)||0;
      const notes=[];
      if(!p.source_category_confirmed)notes.push("القسم يحتاج مراجعة");
      if(variants.some(v=>Number(v.suggested_price)>0&&Number(v.suggested_price)!==original))notes.push("اختيارات بأسعار مختلفة");
      if(original>0&&price>original*3)notes.push("مناسب لعرض متعدد أكثر من إعلان قطعة");
      if(!price)notes.push("لم يُسعَّر");
      return [p.supplier_product_id,p.barcode,p.name,p.category_name,p.source_category_confirmed?"نعم":"لا",
        original,reference,price,price-original,110,p.review_state==="approved"&&p.owner_verified?"معتمد":"مسودة غير منشورة",notes.join("؛ ")].map(csvValue).join(",");
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
  else if(p.final_price_egp)info.append(node("div","cardPrice","سعر مسودة غير منشور: "+money(p.final_price_egp)));
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
  right.append(node("div","detailCode","Product ID: "+p.supplier_product_id));
  if(p.barcode)right.append(node("div","detailCode","Barcode: "+p.barcode));
  const cat=node("p","detailNote",p.source_category_confirmed?
    "القسم وارد من بيانات صفقة.":"صفقة لم ترجع قسمًا معتمدًا للمنتج ده عبر API.");
  right.append(cat);
  const price=node("p","detailNote","سعر المورد المقترح: "+money(p.suggested_sale_price_egp)+
    " — ليس سعر بيعنا. يلزم حساب التكلفة + الشحن + الربح.");
  right.append(price);
  const pricing=node("section","priceDraftBox");
  pricing.append(node("h3","","تسعير SELECT SHOP — مسودة خاصة"));
  pricing.append(node("p","detailNote","أدخل سعر البيع النهائي شامل التوصيل بعد حساب تكلفة المورد والشحن والإعلانات والمرتجعات. الحفظ لا ينشر المنتج ولا يفتح الطلبات."));
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
  form.append(label,saveButton,feedback);pricing.append(form);right.append(pricing);
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
      feedback.textContent="تم حفظ "+money(value)+" كمسودة خاصة. المنتج لا يزال غير متاح للشراء.";
      await loadProducts();
    }catch(err){
      feedback.textContent="فشل الحفظ: "+String(err?.message||"تعذر الوصول للخادم").slice(0,120);
    }finally{saveButton.disabled=false}
  });
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
