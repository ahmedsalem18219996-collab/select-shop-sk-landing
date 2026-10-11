/* SELECT SHOP TEMP: actual imported Safqa products, public read-only catalog.
   The only source is safe Supabase public RPC; no supplier secrets, price speculation,
   or checkout calls. Product link: /?product=safka-<24-char-id>#products
*/
(()=>{"use strict";
const MOUNT=document.getElementById("ssSafqaImported");
if(!MOUNT)return;
const DB="https://zznqdwrohrycsjfpvkhc.supabase.co";
const KEY="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const state={categories:[],items:[],count:0,page:1,cat:null,loading:false,selected:null};
const el=(tag,cls,t)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(t!==undefined)x.textContent=String(t??"");return x;
};
function imageUrl(raw){
 if(typeof raw!=="string"||raw.length>1600)return null;
 try{
  const u=new URL(raw),host=u.hostname.toLowerCase();
  if(u.protocol!=="https:"||u.username||u.password||host==="localhost"||host.endsWith(".local")||
     /^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)||
     /(?:token|signature|secret|api.?key|credential|x-amz-|x-goog-)/i.test(u.search))return null;
  return u.href;
 }catch{return null}
}
async function rpc(method,body){
 const res=await fetch(DB+"/rest/v1/rpc/"+method,{
  method:"POST",redirect:"error",cache:"no-store",
  headers:{"apikey":KEY,"content-type":"application/json"},
  body:JSON.stringify(body||{}),signal:AbortSignal.timeout(14000)
 });
 if(!res.ok)throw new Error("public_catalog_unavailable");
 return res.json();
}
function slug(p){return "?product=safka-"+encodeURIComponent(p.id)+"#products"}
function validId(s){return typeof s==="string"&&/^[a-f0-9]{24}$/i.test(s)}
const heading=el("div","ssSafkaTop");
const label=el("span","ssSafkaEyebrow","SELECT SHOP / SAFQA COLLECTION");
heading.append(label,el("h2","","منتجات صفقة"));
heading.append(el("p","","تصفّح المنتجات الجديدة بنفس كود المورد وصورها والأقسام الأصلية المتاحة. الشراء للمنتجات الجديدة بيتفعّل بعد اعتماد سعرها شامل الشحن."));
const controls=el("div","ssSafkaControls");
const categories=el("div","ssSafkaCategories");
categories.setAttribute("role","group");
categories.setAttribute("aria-label","أقسام منتجات صفقة");
controls.append(categories);
const overview=el("p","ssSafkaOverview","");
const grid=el("div","ssSafkaGrid");
const actionBar=el("div","ssSafkaActions");
const more=el("button","ssSafkaMore","عرض منتجات أكثر");more.type="button";
actionBar.append(more);
MOUNT.append(heading,controls,overview,grid,actionBar);
const details=el("dialog","ssSafkaDialog");details.setAttribute("aria-label","تفاصيل منتج صفقة");document.body.append(details);
let lastFocus=null;
details.addEventListener("close",()=>{
  details.replaceChildren();
  if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
});
details.addEventListener("click",e=>{if(e.target===details)details.close()});
function openProduct(p,button){
 lastFocus=button||document.activeElement;
 const current=new URL(location.href);
 current.searchParams.set("product","safka-"+p.id);
 history.replaceState(null,"",current.pathname+current.search+current.hash);
 details.replaceChildren();
 const top=el("div","ssSafkaDialogHead");
 const hint=el("span","ssSafkaEyebrow","SELECT SHOP / SAFQA · المنتج الأصلي");
 const close=el("button","ssSafkaClose","إغلاق ×");close.type="button";
 close.addEventListener("click",()=>details.close());
 top.append(hint,close);
 const layout=el("div","ssSafkaDetailLayout");
 const mediaRoot=el("div","ssSafkaMedia");
 const stage=el("div","ssSafkaStage"),thumbs=el("div","ssSafkaThumbs");
 const sourceImages=(Array.isArray(p.images)?p.images:[]).map(imageUrl).filter(Boolean);
 const sourceVideos=(Array.isArray(p.videos)?p.videos:[]).map(imageUrl).filter(Boolean);
 const media=[...sourceImages.map(url=>({type:"image",url})),...sourceVideos.map(url=>({type:"video",url}))];
 const thumbElements=[];
 function show(i){
  stage.replaceChildren();
  const item=media[i];if(!item)return;
  if(item.type==="image"){
   const image=el("img");image.src=item.url;image.alt="صورة من المورد: "+p.name;
   image.addEventListener("error",()=>{image.remove();stage.append(el("p","","تعذّر عرض صورة المورد."))});
   stage.append(image);
  }else{
   const url=new URL(item.url),path=url.pathname;
   if(/\.(mp4|webm)$/i.test(path)){
     const video=el("video");video.controls=true;video.playsInline=true;video.preload="metadata";
     const source=el("source");source.src=item.url;source.type=/\.webm$/i.test(path)?"video/webm":"video/mp4";
     video.append(source);stage.append(video);
   }else{
     const a=el("a","ssSafkaMediaLink","شاهد فيديو المنتج على المصدر ↗");
     a.href=item.url;a.target="_blank";a.rel="noopener noreferrer";
     stage.append(a);
   }
  }
  thumbElements.forEach((t,k)=>t.classList.toggle("active",k===i));
 }
 media.slice(0,42).forEach((item,i)=>{
  const t=el("button","ssSafkaThumb",item.type==="video"?"▶ فيديو":"");t.type="button";
  if(item.type==="image"){const im=el("img");im.src=item.url;im.alt="";im.loading="lazy";t.append(im)}
  t.addEventListener("click",()=>show(i));
  thumbElements.push(t);thumbs.append(t);
 });
 if(media.length){mediaRoot.append(stage,thumbs);show(0)}
 else stage.append(el("p","ssSafkaPlaceholder","مفيش صور أو فيديوهات مرجعة من API صفقة لهذا المنتج حتى الآن."));
 if(!media.length)mediaRoot.append(stage);
 const body=el("div","ssSafkaDetailBody");
 body.append(el("span","ssSafkaTag",p.category_name||"غير مصنف من صفقة"));
 body.append(el("h2","",p.name));
 body.append(el("p","ssSafkaSku","Product ID: "+p.id));
 if(p.barcode)body.append(el("p","ssSafkaSku","Barcode: "+p.barcode));
 body.append(el("p","ssSafkaDesc","تفاصيل ومواصفات المنتج قيد مطابقة بيانات المورد قبل تفعيل الطلب."));
 if(Array.isArray(p.variants)&&p.variants.length){
  body.append(el("h3","","اختيارات المورد وأكوادها"));
  const options=el("div","ssSafkaOptions");
  for(const v of p.variants.slice(0,40)){
   const option=el("div","ssSafkaOption");
   option.append(el("strong","",v.name||"اختيار"),el("span","",v.available?"متاح حسب المورد":"غير مؤكد"));
   if(v.id)option.append(el("code","",String(v.id)));
   options.append(option);
  }body.append(options);
 }
 body.append(el("p","ssSafkaPrice",p.final_price_egp?
   "السعر النهائي شامل الشحن: "+Number(p.final_price_egp).toLocaleString("ar-EG")+" ج.م":
   "السعر شامل الشحن: قيد التجهيز"));
 const disabled=el("button","ssSafkaDisabled","الطلب غير متاح لحد تفعيل ربط صفقة");
 disabled.disabled=true;body.append(disabled);
 layout.append(mediaRoot,body);
 details.append(top,layout);
 details.showModal();
}
function card(p){
 const item=el("article","ssSafkaCard");
 const button=el("button","ssSafkaCardOpen");button.type="button";
 button.setAttribute("aria-label","تفاصيل "+p.name);
 const photo=el("div","ssSafkaCardImage");
 const image=(Array.isArray(p.images)?p.images:[]).map(imageUrl).find(Boolean);
 if(image){
  const img=el("img");img.src=image;img.loading="lazy";img.alt="صورة "+p.name;
  img.addEventListener("error",()=>{img.remove();photo.append(el("span","ssSafkaNoImage","صورة المورد غير متاحة"))});
  photo.append(img);
 }else photo.append(el("span","ssSafkaNoImage","صورة المورد غير متاحة"));
 photo.append(el("span","ssSafkaSourceTag","صفقة"));
 const content=el("div","ssSafkaCardContent");
 content.append(el("span","ssSafkaCategory",p.category_name||"غير مصنف من صفقة"));
 content.append(el("h3","",p.name));
 content.append(el("span","ssSafkaSku","كود: "+(p.barcode||p.id)));
 const formatted=p.final_price_egp?Number(p.final_price_egp).toLocaleString("ar-EG")+" ج.م":"السعر شامل الشحن قيد التجهيز";
 content.append(el("strong","ssSafkaRetail",formatted));
 content.append(el("span","ssSafkaExplore","شوف الصور والتفاصيل ←"));
 button.append(photo,content);
 button.addEventListener("click",()=>openProduct(p,button));
 item.append(button);
 return item;
}
async function load(append=false){
 if(state.loading)return;
 state.loading=true;more.disabled=true;
 try{
  const data=await rpc("ss_safka_public_catalog",{
   p_page:state.page,p_limit:24,p_category:state.cat
  });
  if(!data||!Array.isArray(data.items))throw Error("invalid_public_catalog");
  state.count=Number(data.total)||0;
  if(!append)grid.replaceChildren();
  for(const product of data.items){
   if(validId(product.id)){grid.append(card(product));state.items.push(product)}
  }
  overview.textContent="منتجات صفقة المعروضة: "+Math.min(state.page*24,state.count).toLocaleString("ar-EG")+
   " من "+state.count.toLocaleString("ar-EG")+". الأسعار قيد التجهيز مش متاحة للطلب بعد.";
  more.hidden=state.page*24>=state.count;
  MOUNT.hidden=state.count===0;
  if(state.count>0){
    const drafts=document.getElementById("safkaOwnerProducts");if(drafts)drafts.hidden=true;
  }
  const param=new URLSearchParams(location.search).get("product");
  const requested=param?.startsWith("safka-")?param.slice(6):null;
  if(validId(requested)&&!details.open){
    const match=state.items.find(p=>p.id.toLowerCase()===requested.toLowerCase());
    if(match)openProduct(match,null);
  }
 }catch{
  overview.textContent="تعذّر تحميل منتجات صفقة حاليًا. باقي منتجات المتجر متاحة كالمعتاد.";
  if(!append)MOUNT.hidden=true;
 }finally{state.loading=false;more.disabled=false}
}
async function updateCategory(key){
 if(state.loading)return;
 state.cat=key;state.page=1;state.items=[];
 for(const btn of categories.querySelectorAll("button"))btn.setAttribute("aria-pressed",String(btn.dataset.key===(key||"")));
 await load(false);
}
async function boot(){
 try{
  const data=await rpc("ss_safka_public_categories",{});
  if(!Array.isArray(data)||!data.length)return;
  state.categories=data;
  const all=el("button","ssSafkaCategoryButton","الكل");all.dataset.key="";all.type="button";
  all.setAttribute("aria-pressed","true");all.addEventListener("click",()=>updateCategory(null));categories.append(all);
  for(const category of data.slice(0,80)){
   const button=el("button","ssSafkaCategoryButton",(category.name||"غير مصنف")+" ("+category.count+")");
   button.type="button";button.dataset.key=category.key||"";
   button.setAttribute("aria-pressed","false");
   button.addEventListener("click",()=>updateCategory(button.dataset.key));categories.append(button);
  }
  state.page=1;await load(false);
 }catch{MOUNT.hidden=true}
}
more.addEventListener("click",async()=>{if(!state.loading){state.page++;await load(true)}});
boot();
})();