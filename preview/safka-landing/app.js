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
  const entries=[...photos.map(m=>({type:"image",url:allowMedia(m.url)})),
    ...clips.map(m=>({type:m.type,url:allowMedia(m.url)}))];
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
    }else b.append(node("span","","▶"),node("small","",item.type==="youtube"?"YouTube":"فيديو"));
    b.addEventListener("click",()=>show(item,b));
    rail.append(b);
  });
  if(entries.length)show(entries[0],rail.firstElementChild);
  else viewer.append(node("p","placeholder","صفقة مرجّعتش روابط صور أو فيديوهات عامة قابلة للعرض لهذا المنتج في الحقول اللي فحصناها."));
  $("mediaNote").textContent=clips.length
    ?"اختار أي صورة أو فيديو من الصور المصغّرة. لو الفيديو ما اشتغلش، ممكن المورد يحتاج يوفّر ملف MP4 مباشر."
    :"ما ظهرش فيديو مباشر من API صفقة للمنتج ده. هنضيف الفيديو الأصلي بعد ما نستلمه من المورد بصيغة قابلة للتشغيل.";
  addStat("صور حقيقية من رابط المورد",photos.length);
  addStat("فيديوهات قابلة للعرض",clips.length);
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
    renderLanding(result.data.detail);
    event.currentTarget.reset();
    $("loginError").textContent="";
  }catch(err){$("loginError").textContent=err.message||"حصل خطأ في تحميل المعاينة."}
  finally{btn.disabled=false}
});
if(!validId)$("loginError").textContent="اختار «معاينة لاندنج» من جدول منتجات صفقة في لوحة الإدارة علشان يفتح المنتج الصح.";
