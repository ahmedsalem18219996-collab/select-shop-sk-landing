/* Owner preview ONLY, no Safqa key client-side, no order writes or checkout. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
const db=createClient("https://zznqdwrohrycsjfpvkhc.supabase.co",
  "sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa",
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
const node=(tag,cls,content)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined)e.textContent=String(content??"");
  return e;
};
const id=new URLSearchParams(location.search).get("productId");
const validId=typeof id==="string"&&/^[0-9a-f]{24}$/i.test(id);
const fmt=v=>(typeof v==="number"&&Number.isFinite(v)&&v>=0)?
  v.toLocaleString("ar-EG")+" جنيه":"غير متاح";
const asText=v=>typeof v==="string"?v.slice(0,2500):"";

const MEDIA_BUCKET="select-shop-safka-media";
const MEDIA_TABLE="ss_safka_media_assets";
const MAX_VIDEO_SIZE=25*1024*1024;
let currentDetail=null,ownerAssets=[],uploadBusy=false;
function validatedMediaLink(raw){
  if(typeof raw!=="string"||raw.length>2000)throw Error("الرابط طويل أو غير صالح.");
  let u;
  try{u=new URL(raw.trim())}catch{throw Error("حط رابط HTTPS صحيح للفيديو.")}
  if(u.protocol!=="https:"||u.username||u.password||(u.port&&u.port!=="443")||
     /(?:token|signature|secret|apikey|api_key|x-amz-|x-goog-|access_token|credential)/i.test(u.search))
    throw Error("الرابط لازم يكون HTTPS عام، ومن غير مفاتيح أو توقيع مؤقت.");
  const host=u.hostname.toLowerCase();
  if(host==="drive.google.com"){
    const driveId=u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})\/?(?:view|preview)?\/?$/)?.[1]
      ||((u.pathname==="/open")?u.searchParams.get("id"):null);
    if(!driveId||!/^[A-Za-z0-9_-]{10,}$/.test(driveId))throw Error("هات رابط ملف فيديو Google Drive نفسه، مش رابط فولدر.");
    return {type:"drive",source:"drive",url:"https://drive.google.com/file/d/"+driveId+"/preview"};
  }
  if(/^(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host)){
    const videoId=host.endsWith("youtu.be")?u.pathname.slice(1):
      u.pathname==="/watch"?u.searchParams.get("v"):
      (u.pathname.startsWith("/embed/")||u.pathname.startsWith("/shorts/"))?u.pathname.split("/")[2]:null;
    if(!/^[A-Za-z0-9_-]{11}$/.test(videoId||""))throw Error("رابط يوتيوب لازم يشير لفيديو صحيح.");
    return {type:"youtube",source:"youtube",url:"https://www.youtube.com/watch?v="+videoId};
  }
  if(host==="localhost"||host.endsWith(".local")||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host))
    throw Error("الرابط لازم يكون لفيديو عام، مش شبكة خاصة.");
  if(!/\.(?:mp4|webm)$/i.test(u.pathname))throw Error("الرابط ده مش ملف فيديو مباشر MP4/WebM. استخدم يوتيوب أو رابط Google Drive للملف.");
  return {type:"video",source:"direct",url:u.href};
}
async function loadOwnerAssets(){
  const {data,error}=await db.from(MEDIA_TABLE)
    .select("id,asset_type,source_type,media_url,label,storage_path,approved_public,sort_order,created_at")
    .eq("supplier_product_id",id).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  if(error)throw Error("تعذّر قراءة فيديوهات المنتج المحفوظة.");
  ownerAssets=data||[];
  return ownerAssets;
}
function renderOwnerMedia(){
  const list=$("ownerMediaList");list.replaceChildren();
  if(!ownerAssets.length){
    list.append(node("p","ownerNote","لسه مفيش فيديوهات مضافة يدويًا للمنتج ده."));
    return;
  }
  for(const asset of ownerAssets){
    const entry=node("div","ownerMediaEntry");
    const meta=node("div");
    meta.append(node("span","",asset.source_type==="upload"?"فيديو مرفوع على SELECT SHOP":
      asset.source_type==="drive"?"فيديو Google Drive":
      asset.source_type==="youtube"?"فيديو YouTube":"فيديو مباشر"));
    meta.append(node("small","",asset.approved_public?"تمت الموافقة للنشر لاحقًا":"معاينة الإدارة فقط — غير منشور"));
    const remove=node("button","","حذف الفيديو");remove.type="button";
    remove.addEventListener("click",()=>removeOwnerAsset(asset,remove));
    entry.append(meta,remove);list.append(entry);
  }
}
async function recordOwnerAsset({url,source,storagePath=null}){
  const {error}=await db.from(MEDIA_TABLE).insert({
    supplier_product_id:id,asset_type:"video",
    source_type:source,media_url:url,storage_path:storagePath,
    label:"فيديو المنتج",sort_order:10,approved_public:false
  });
  if(error){
    if(error.code==="23505")throw Error("الفيديو ده متضاف بالفعل للمنتج.");
    throw Error("تعذّر حفظ الفيديو للمنتج. راجع صلاحية المدير أو جرب تاني.");
  }
  await loadOwnerAssets();
  if(currentDetail)renderLanding(currentDetail);
  renderOwnerMedia();
}
async function removeOwnerAsset(asset,button){
  if(uploadBusy||!window.confirm("تحذف الفيديو ده من معاينة المنتج؟"))return;
  button.disabled=true;
  const result=await db.from(MEDIA_TABLE).delete().eq("id",asset.id).eq("supplier_product_id",id);
  if(result.error){$("mediaAdminStatus").textContent="تعذّر حذف الفيديو.";button.disabled=false;return}
  if(asset.storage_path){
    const remote=await db.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);
    if(remote.error)$("mediaAdminStatus").textContent="اتشال الفيديو من المعرض لكن حذف الملف من التخزين محتاج متابعة.";
  }
  try{await loadOwnerAssets();if(currentDetail)renderLanding(currentDetail);renderOwnerMedia()}
  catch{$("mediaAdminStatus").textContent="اتحذف الفيديو، لكن تحديث المعرض محتاج إعادة فتح الصفحة."}
}
$("mediaUrlForm").addEventListener("submit",async event=>{
  event.preventDefault();if(uploadBusy)return;
  const button=event.currentTarget.querySelector("button");
  button.disabled=true;uploadBusy=true;
  try{
    const raw=String(new FormData(event.currentTarget).get("media_url")||"");
    const m=validatedMediaLink(raw);
    await recordOwnerAsset({url:m.url,source:m.source});
    event.currentTarget.reset();
    $("mediaAdminStatus").textContent="الفيديو اتحفظ واتضاف للمعرض. لسه مش منشور للعملاء.";
  }catch(error){$("mediaAdminStatus").textContent=error.message||"حصل خطأ أثناء إضافة الفيديو."}
  finally{uploadBusy=false;button.disabled=false}
});
$("mediaFileForm").addEventListener("submit",async event=>{
  event.preventDefault();if(uploadBusy)return;
  const file=event.currentTarget.querySelector('input[type="file"]').files?.[0];
  if(!file){$("mediaAdminStatus").textContent="اختار ملف الفيديو الأول.";return}
  const type=file.type;
  if(!["video/mp4","video/webm"].includes(type)||file.size>MAX_VIDEO_SIZE||file.size<=0){
    $("mediaAdminStatus").textContent="اختار فيديو MP4 أو WebM حجمه لحد 25 ميجابايت.";return;
  }
  const button=event.currentTarget.querySelector("button");
  button.disabled=true;uploadBusy=true;
  $("mediaAdminStatus").textContent="جارٍ رفع الفيديو... ماتقفلش الصفحة أثناء الرفع.";
  const extension=type==="video/mp4"?"mp4":"webm";
  const objectPath=id+"/"+crypto.randomUUID()+"."+extension;
  try{
    const uploaded=await db.storage.from(MEDIA_BUCKET).upload(objectPath,file,{
      upsert:false,cacheControl:"3600",contentType:type
    });
    if(uploaded.error)throw Error("رفع الملف فشل. راجع حجم الفيديو أو جرّب ضغطه لـ 25 ميجابايت.");
    const url=db.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath).data?.publicUrl;
    if(!url)throw Error("تم الرفع لكن مفيش رابط لعرض الفيديو.");
    try{await recordOwnerAsset({url,source:"upload",storagePath:objectPath})}
    catch(e){await db.storage.from(MEDIA_BUCKET).remove([objectPath]);throw e}
    event.currentTarget.reset();
    $("mediaAdminStatus").textContent="الفيديو اترفع واتضاف للمعرض بنجاح، ولسه مش منشور للعملاء.";
  }catch(err){$("mediaAdminStatus").textContent=err.message||"حصل خطأ في الرفع."}
  finally{uploadBusy=false;button.disabled=false}
});

const allowMedia=v=>{
  if(typeof v!=="string"||v.length>2000)return null;
  try{
    const url=new URL(v);
    const h=url.hostname.toLowerCase();
    if(url.protocol!=="https:"||!h||h==="localhost"||
      url.username||url.password||(url.port&&url.port!=="443")||
      /(?:token|signature|secret|api_key|apikey|x-amz-|x-goog-)/i.test(url.search))
      return null;
    return url.href;
  }catch{return null}
};
function youtubeEmbed(url){
  const u=new URL(url);
  const h=u.hostname;
  if(!/^(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(h))return null;
  const videoId=h.endsWith("youtu.be")?u.pathname.slice(1):
    u.pathname==="/watch"?u.searchParams.get("v"):
    (u.pathname.startsWith("/embed/")||u.pathname.startsWith("/shorts/"))?u.pathname.split("/")[2]:null;
  return /^[A-Za-z0-9_-]{11}$/.test(videoId||"")?
    "https://www.youtube-nocookie.com/embed/"+videoId:null;
}
const addStat=(heading,figure)=>{
  const box=node("div","mediaStat");
  box.append(node("strong","",figure),node("span","",heading));
  $("mediaInventory").append(box);
};
function renderLanding(detail){
  $("landing").hidden=false;$("loginSection").hidden=true;
  const name=asText(detail.name||detail.title)||"منتج صفقة";
  document.title=name+" | SELECT SHOP — معاينة";
  $("productName").textContent=name;
  $("productDescription").textContent=asText(detail.description)||"وصف المنتج مش متوفر من API صفقة حاليًا.";
  $("providerPrice").textContent=fmt(detail.sale_price);
  const opts=$("variants");opts.replaceChildren();
  const variants=Array.isArray(detail.variants)?detail.variants:[];
  for(const v of variants){
    const c=node("div","variant"+(v.is_available===false?" unavailable":""));
    c.append(node("strong","",asText(v.key||v.name)||"اختيار"));
    c.append(node("small","",v.is_available===false?"غير متاح":
      "متاح حسب المورد"));
    // v.value may be supplier cost, but must be verified before being used.
    if(typeof v.value==="number")c.append(node("small","","قيمة صفقة: "+fmt(v.value)));
    opts.append(c);
  }
  if(!variants.length)opts.append(node("p","smallprint","لا توجد اختيارات ضمن رد API الحالي."));
  const media=detail.media&&typeof detail.media==="object"?detail.media:{};
  const photos=Array.isArray(media.photos)?media.photos.filter(m=>allowMedia(m?.url)).slice(0,24):[];
  const clips=Array.isArray(media.clips)?media.clips.filter(m=>allowMedia(m?.url)).slice(0,12):[];
  const own=ownerAssets.filter(v=>v.asset_type==="video").map(v=>{
    try{
      const parsed=validatedMediaLink(v.media_url);
      return {type:parsed.type,url:parsed.url};
    }catch{return null}
  }).filter(Boolean);
  const combined=[...own,...clips.map(m=>({type:m.type,url:allowMedia(m.url)}))];
  const uniqueVideos=combined.filter((v,i,arr)=>arr.findIndex(x=>x.url===v.url)===i);
  const entries=[...photos.slice(0,1).map(m=>({type:"image",url:allowMedia(m.url)})),
    ...uniqueVideos,...photos.slice(1).map(m=>({type:"image",url:allowMedia(m.url)}))];
  const viewer=$("mediaViewer"),rail=$("galleryRail");
  rail.replaceChildren();
  function show(entry,selected){
    viewer.replaceChildren();
    rail.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b===selected));
    if(entry.type==="image"){
      const img=node("img");img.src=entry.url;img.alt="صورة من المورد: "+name;
      img.decoding="async";img.loading="eager";viewer.append(img);
    }else if(entry.type==="video"&&/\.(?:mp4|webm)$/i.test(new URL(entry.url).pathname)){
      const video=node("video");video.controls=true;video.playsInline=true;video.preload="metadata";
      if(photos[0])video.poster=photos[0].url;
      const source=node("source");source.src=entry.url;
      source.type=/\.webm$/i.test(new URL(entry.url).pathname)?"video/webm":"video/mp4";
      video.append(source);viewer.append(video);
    }else if(entry.type==="drive"){
      const u=new URL(entry.url);
      const match=u.hostname==="drive.google.com"?u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})\/preview$/):null;
      if(!match){viewer.append(node("p","placeholder","رابط Google Drive غير صالح."));return}
      const frame=node("iframe");frame.src="https://drive.google.com/file/d/"+match[1]+"/preview";
      frame.title="فيديو المنتج من Google Drive";frame.loading="lazy";
      frame.allow="fullscreen; autoplay";frame.allowFullscreen=true;
      frame.referrerPolicy="strict-origin-when-cross-origin";viewer.append(frame);
    }else if(entry.type==="youtube"){
      const embed=youtubeEmbed(entry.url);
      if(!embed){viewer.append(node("p","placeholder","رابط الفيديو غير صالح."));return}
      const iframe=node("iframe");iframe.src=embed;iframe.title="فيديو المنتج من المورد";
      iframe.loading="lazy";iframe.allow="encrypted-media; picture-in-picture";
      iframe.referrerPolicy="strict-origin-when-cross-origin";iframe.allowFullscreen=true;
      viewer.append(iframe);
    }else viewer.append(node("p","placeholder","صيغة الفيديو غير مدعومة للعرض."));
  }
  entries.forEach((item,index)=>{
    const b=node("button","thumb"+(item.type==="image"?"":" videoThumb"));
    b.type="button";b.setAttribute("aria-label",item.type==="image"?
      "اعرض الصورة رقم "+(index+1):"اعرض الفيديو رقم "+(index+1));
    if(item.type==="image"){
      const im=node("img");im.src=item.url;im.loading="lazy";im.alt="";
      b.append(im);
    }else b.append(node("span","","▶"),node("small","",item.type==="youtube"?"YouTube":item.type==="drive"?"Drive":"فيديو"));
    b.addEventListener("click",()=>show(item,b));
    rail.append(b);
  });
  if(entries.length)show(entries[0],rail.firstElementChild);
  else viewer.append(node("p","placeholder","صفقة مرجّعتش روابط صور أو فيديوهات عامة قابلة للعرض لهذا المنتج في الحقول اللي فحصناها."));
  $("mediaNote").textContent=uniqueVideos.length
    ?"اضغط على الصورة المصغّرة ▶ لعرض الفيديو. فيديوهات Drive تحتاج مشاركة الملف بالرابط."
    :"لسه مفيش فيديو مربوط بالمنتج ده. المدير يقدر يضيف فيديو صحيح من جهازه أو رابط.";
  $("mediaManager").hidden=false;
  addStat("صور حقيقية من رابط المورد",photos.length);
  addStat("فيديوهات مرتبطة بالمنتج",uniqueVideos.length);
  addStat("اختيارات ومقاسات",variants.length);
  addStat("حالة النشر","معاينة فقط");
}
$("loginForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const btn=event.currentTarget.querySelector("button");btn.disabled=true;
  $("loginError").textContent="بنراجع صلاحيات الإدارة ونحمّل تفاصيل المنتج…";
  try{
    if(!validId)throw Error("رابط المنتج ناقص أو معرّفه غير صحيح. افتح المعاينة من جدول المنتجات في لوحة الإدارة.");
    const form=new FormData(event.currentTarget);
    const {error}=await db.auth.signInWithPassword({
      email:String(form.get("email")||"").trim(),
      password:String(form.get("password")||"")
    });
    if(error)throw Error("تعذّر تسجيل الدخول. راجع بريد المدير وكلمة المرور.");
    const {data:{user},error:userError}=await db.auth.getUser();
    if(userError||!user)throw Error("جلسة الدخول غير صالحة.");
    const gate=await db.from("ss_order_admins").select("user_id").eq("user_id",user.id).maybeSingle();
    if(gate.error||!gate.data)throw Error("هذا الحساب ليس مدير طلبات المتجر المؤقت.");
    const result=await db.functions.invoke("safka-product-detail-readonly",{body:{productId:id}});
    if(result.error||!result.data?.ok||result.data.mode!=="read_only"||
      result.data.ordersCreated!==false||result.data.synced!==false){
      const status=result.data?.providerStatus;
      throw Error("تعذّر قراءة تفاصيل المنتج من صفقة"+(status?" (رمز "+status+")":"")+
        ". افتح لوحة الإدارة وجرب منتجًا آخر أو راجع API.");
    }
    currentDetail=result.data.detail;
    await loadOwnerAssets();
    renderLanding(currentDetail);renderOwnerMedia();
    event.currentTarget.reset();
    $("loginError").textContent="";
  }catch(err){$("loginError").textContent=err.message||"حصل خطأ في تحميل المعاينة."}
  finally{btn.disabled=false}
});
if(!validId)$("loginError").textContent="اختار «معاينة لاندنج» من جدول منتجات صفقة في لوحة الإدارة علشان يفتح المنتج الصح.";
