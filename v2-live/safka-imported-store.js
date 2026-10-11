/* SELECT SHOP TEMP ONLY — Safka products are cards in the MAIN collection.
 * No independent Safka section; no unverified supplier sale, price, or order calls.
 * Canonical shoe collection/cart remains controlled by storefront-v2-live.js.
 */
(()=>{"use strict";
const DB="https://zznqdwrohrycsjfpvkhc.supabase.co";
const KEY="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const $=(s,p=document)=>p.querySelector(s);
const node=(tag,cls,value)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(value!==undefined)n.textContent=String(value??"");
  return n;
};
const validId=s=>typeof s==="string"&&/^[a-f0-9]{24}$/i.test(s);
const safeMedia=raw=>{
  if(typeof raw!=="string"||raw.length>1600)return null;
  try{
    const u=new URL(raw),host=u.hostname.toLowerCase();
    if(u.protocol!=="https:"||u.username||u.password||host==="localhost"||
      host.endsWith(".local")||(/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))||
      /(?:token|signature|secret|api.?key|credential|x-amz-|x-goog-)/i.test(u.search))return null;
    return u.href;
  }catch{return null}
};
async function rpc(name,body={},signal){
  const res=await fetch(DB+"/rest/v1/rpc/"+name,{
    method:"POST",cache:"no-store",redirect:"error",
    headers:{"apikey":KEY,"content-type":"application/json"},
    body:JSON.stringify(body),signal:signal||AbortSignal.timeout(18000)
  });
  if(!res.ok)throw Error("catalog_request_failed");
  return res.json();
}
let categories=[],current={filter:"all",search:"",shoeCount:4},items=[],total=0,page=1,token=0,loading=false;
let dialog=null,lastFocus=null;
function categoryName(raw){
  return raw==="غير مصنف من صفقة"?"القسم قيد المطابقة":(raw||"القسم قيد المطابقة");
}
function price(p){
  return p.final_price_egp&&Number(p.final_price_egp)>0?
    Number(p.final_price_egp).toLocaleString("ar-EG")+" ج.م":
    "السعر قيد المراجعة";
}
function addCategoryTabs(){
  const tabs=$(".productsSection .toolbar .tabs");
  if(!tabs)return;
  tabs.querySelectorAll(".ssSafkaFilterTab").forEach(x=>x.remove());
  const existing=new Set(Array.from(tabs.querySelectorAll("[data-filter]"),x=>x.dataset.filter));
  const entries=categories.filter(c=>c&&typeof c.key==="string"&&Number(c.count)>0);
  for(const c of entries){
    const key=c.key==="uncategorized"?"safka-other":"safka:"+c.key;
    if(existing.has(key))continue;
    const label=c.key==="uncategorized"?"منتجات أخرى":c.name;
    const b=node("button","tab ssSafkaFilterTab",label+" ("+Number(c.count).toLocaleString("ar-EG")+")");
    b.type="button";b.dataset.filter=key;b.setAttribute("aria-pressed","false");
    tabs.append(b);
  }
}
function categoryFilter(f){
  return f==="all"?null:f==="safka-other"?"uncategorized":
    /^safka:[a-f0-9]{24}$/i.test(f)?f.slice(6):null;
}
function countResults(n){
  const count=$("#resultsCount");
  if(count)count.textContent=String(n);
  const empty=$("#emptyState");if(empty)empty.hidden=n!==0;
}
function ensureStage(){
  const root=$("#productGrid");if(!root)return null;
  let shelf=$(".merchShelf.unifiedShelf",root);
  if(!shelf){
    shelf=node("section","merchShelf unifiedShelf");
    shelf.setAttribute("aria-label","منتجات SELECT SHOP");
    shelf.append(node("div","shoeCardsGrid unifiedCardsGrid"));
    root.append(shelf);
  }
  const grid=$(".unifiedCardsGrid",shelf);
  let status=$(".ssSafkaInlineStatus",shelf),actions=$(".ssSafkaUnifiedActions",shelf);
  if(!status){status=node("p","ssSafkaInlineStatus");status.setAttribute("role","status");shelf.append(status)}
  if(!actions){
    actions=node("div","ssSafkaUnifiedActions");
    const more=node("button","ssSafkaUnifiedMore","عرض منتجات أكثر");
    more.type="button";more.addEventListener("click",()=>{if(!loading){page++;loadPage(true)}});
    actions.append(more);shelf.append(actions);
  }
  return {shelf,grid,status,actions,more:$("button",actions)};
}
function productCard(p){
  const article=node("article","productCard editorialCard ssSafkaUnifiedCard");
  const media=node("div","cardMedia ssSafkaUnifiedMedia");
  const open=node("button","cardMediaClick ssSafkaUnifiedOpen");
  open.type="button";open.setAttribute("aria-label","تفاصيل "+p.name);
  const image=(Array.isArray(p.images)?p.images:[]).map(safeMedia).find(Boolean);
  if(image){
    const pic=node("img","mainCardImage");pic.src=image;pic.loading="lazy";pic.decoding="async";
    pic.alt="صورة المنتج "+p.name;pic.width=700;pic.height=700;
    pic.addEventListener("error",()=>{pic.remove();open.append(node("span","ssSafkaNoImage","الصورة غير متاحة"))});
    open.append(pic);
  }else open.append(node("span","ssSafkaNoImage","الصورة غير متاحة"));
  const openFn=()=>openProduct(p,open);
  open.addEventListener("click",openFn);
  media.append(open,node("span","cardTag","SELECT SHOP"));
  const body=node("div","cardContent ssSafkaUnifiedBody");
  body.append(node("span","cardCategory",categoryName(p.category_name)));
  const title=node("div","cardTitle");
  title.append(node("h3","",p.name),node("strong","",price(p)));body.append(title);
  body.append(node("p","ssSafkaUnifiedCode","كود المنتج: "+(p.barcode||p.id)));
  const bottom=node("div","cardBottom ssSafkaUnifiedBottom");
  bottom.append(node("span","includedShipping",p.final_price_egp?"راجع التوفر قبل الطلب":"قيد مراجعة السعر"));
  const button=node("button","","شوف الصور والتفاصيل");
  button.type="button";button.addEventListener("click",openFn);bottom.append(button);
  body.append(bottom);article.append(media,body);return article;
}
function ensureDialog(){
  if(dialog)return dialog;
  dialog=node("dialog","ssSafkaDialog");dialog.setAttribute("aria-label","تفاصيل منتج من SELECT SHOP");
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{
    dialog.replaceChildren();
    const u=new URL(location.href),param=u.searchParams.get("product")||"";
    if(param.startsWith("safka-")){
      u.searchParams.delete("product");
      history.replaceState(null,"",u.pathname+u.search+u.hash);
    }
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    document.body.classList.remove("hasDialog");
  });
  document.body.append(dialog);return dialog;
}
function openProduct(p,trigger){
  if(!validId(p?.id))return;
  const d=ensureDialog();lastFocus=trigger||document.activeElement;
  for(const existing of document.querySelectorAll("dialog[open]"))if(existing!==d)existing.close();
  const u=new URL(location.href);u.searchParams.set("product","safka-"+p.id);
  history.replaceState(null,"",u.pathname+u.search+u.hash);
  d.replaceChildren();
  const header=node("div","ssSafkaDialogHead");
  const close=node("button","ssSafkaClose","إغلاق ×");close.type="button";close.addEventListener("click",()=>d.close());
  header.append(node("span","ssSafkaEyebrow","SELECT SHOP / PRODUCT DETAILS"),close);
  const layout=node("div","ssSafkaDetailLayout"),media=node("div","ssSafkaMedia");
  const stage=node("div","ssSafkaStage"),thumbs=node("div","ssSafkaThumbs");
  const photos=(Array.isArray(p.images)?p.images:[]).map(safeMedia).filter(Boolean);
  const videos=(Array.isArray(p.videos)?p.videos:[]).map(safeMedia).filter(Boolean);
  const all=[...photos.map(url=>({url,kind:"image"})),...videos.map(url=>({url,kind:"video"}))];
  const buttons=[];
  const select=i=>{
    const item=all[i];if(!item)return;
    stage.replaceChildren();
    if(item.kind==="image"){
      const img=node("img");img.src=item.url;img.alt="صورة "+p.name;stage.append(img);
    }else if(/\.(mp4|webm)$/i.test(new URL(item.url).pathname)){
      const video=node("video");video.controls=true;video.playsInline=true;video.preload="metadata";
      video.src=item.url;stage.append(video);
    }else{
      const link=node("a","","افتح فيديو المصدر");link.href=item.url;
      link.target="_blank";link.rel="noopener noreferrer";stage.append(link);
    }
    buttons.forEach((b,k)=>b.classList.toggle("active",k===i));
  };
  all.slice(0,48).forEach((item,i)=>{
    const b=node("button","ssSafkaThumb",item.kind==="image"?"صورة "+(i+1):"▶ فيديو");
    b.type="button";b.addEventListener("click",()=>select(i));buttons.push(b);thumbs.append(b);
  });
  if(all.length)select(0);else stage.append(node("p","ssSafkaPlaceholder","ميديا المنتج غير متوفرة."));
  media.append(stage,thumbs);
  const body=node("div","ssSafkaDetailBody");
  body.append(node("span","ssSafkaTag",categoryName(p.category_name)),node("h2","",p.name),
    node("p","ssSafkaSku","Product ID: "+p.id));
  if(p.barcode)body.append(node("p","ssSafkaSku","Barcode: "+p.barcode));
  body.append(node("p","ssSafkaDesc","بيانات المورد للمراجعة. السعر النهائي والطلب غير متاحين حاليًا لهذا المنتج."));
  if(Array.isArray(p.variants)&&p.variants.length){
    body.append(node("h3","","اختيارات المورد وأكوادها"));
    const variants=node("div","ssSafkaOptions");
    p.variants.slice(0,60).forEach(v=>{
      const option=node("div","ssSafkaOption");
      option.append(node("strong","",v.name||"اختيار"),node("span","",v.available?"متاح لدى المورد حسب آخر استيراد":"التوفر غير مؤكد"));
      if(v.id)option.append(node("code","",v.id));variants.append(option);
    });
    body.append(variants);
  }
  body.append(node("p","ssSafkaPrice",price(p)));
  const disabled=node("button","ssSafkaDisabled","الشراء متوقف لحين اعتماد السعر والتوريد");
  disabled.type="button";disabled.disabled=true;body.append(disabled);
  layout.append(media,body);d.append(header,layout);d.showModal();
  document.body.classList.add("hasDialog");
}
function stateSnapshot(s){
  return {filter:String(s?.filter||"all"),search:String(s?.search||"").slice(0,80),
    shoeCount:Number.isInteger(s?.shoeCount)?s.shoeCount:4};
}
async function loadPage(append=false){
  const version=token,stage=ensureStage();if(!stage)return;
  if(loading)return;
  if(current.filter==="shoes"){stage.actions.hidden=true;stage.status.textContent="";
    countResults(current.shoeCount);return}
  loading=true;stage.more.disabled=true;
  if(!append){stage.status.textContent="جاري تحميل المنتجات...";stage.actions.hidden=true}
  try{
    const data=await rpc("ss_safka_public_catalog_v2",{
      p_page:page,p_limit:24,p_category:categoryFilter(current.filter),p_search:current.search
    });
    if(version!==token)return;
    if(!Array.isArray(data.items))throw Error("invalid_result");
    total=Math.max(0,Number(data.total)||0);
    const values=data.items.filter(p=>validId(p.id));
    values.forEach(p=>{items.push(p);stage.grid.append(productCard(p))});
    const combined=total+current.shoeCount;
    countResults(combined);
    stage.status.textContent=total>24?"تم تحميل "+items.length+" من "+total+" منتج إضافي.":"";
    stage.actions.hidden=items.length>=total;
    stage.more.disabled=false;
    if(!values.length&&items.length<total){stage.status.textContent="تعذر تحميل بقية المنتجات.";stage.actions.hidden=true}
  }catch{
    if(version===token){
      stage.status.textContent="تعذر تحميل بعض المنتجات الآن، حاول مرة أخرى.";
      stage.actions.hidden=true;
      countResults(current.shoeCount+total);
    }
  }finally{if(version===token)loading=false}
}
function onCollectionRendered(s){
  current=stateSnapshot(s);
  token++;loading=false;page=1;items=[];total=0;
  const stage=ensureStage();if(!stage)return;
  stage.status.textContent="";stage.actions.hidden=true;
  // The main controller reconstructed its shoe card grid before this event.
  if(current.filter==="shoes"){countResults(current.shoeCount);return}
  loadPage(false);
}
async function boot(){
  try{
    const source=await rpc("ss_safka_public_categories",{});
    if(Array.isArray(source))categories=source;
    addCategoryTabs();
    if(window.SELECT_SHOP_COLLECTION_STATE)onCollectionRendered(window.SELECT_SHOP_COLLECTION_STATE);
    const param=new URLSearchParams(location.search).get("product")||"";
    const id=param.startsWith("safka-")?param.slice(6):"";
    if(validId(id)){
      const found=await rpc("ss_safka_public_catalog_v2",{p_page:1,p_limit:1,p_search:id});
      const product=found?.items?.find(x=>x.id.toLowerCase()===id.toLowerCase());
      if(product&&!dialog?.open)openProduct(product,null);
    }
  }catch{
    const stage=ensureStage();
    if(stage)stage.status.textContent="منتجات المورد غير متاحة الآن، حاول تحديث الصفحة.";
  }
}
window.addEventListener("selectshop:collection-rendered",e=>{if(categories.length)onCollectionRendered(e.detail)});
document.addEventListener("DOMContentLoaded",boot,{once:true});
})();