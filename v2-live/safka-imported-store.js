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
    const label=c.key==="uncategorized"?"بانتظار التصنيف":c.name;
    const b=node("button","tab ssSafkaFilterTab",label+" ("+Number(c.count).toLocaleString("ar-EG")+")");
    b.type="button";b.dataset.filter=key;b.setAttribute("aria-pressed","false");
    tabs.append(b);
  }
  // Category navigation reuses the SAME collection state and product cards.
  // Keep the eight real supplier categories in the desktop dropdown and mobile rail.
  // The pending category is a review status, not a supplier category.
  const verified=entries.filter(c=>c.key!=="uncategorized");
  const menu=$("#navCategoryMenu"),rail=$(".mobileCategoryRail");
  if(menu){
    menu.querySelectorAll(".ssSafkaNavLink,.navComing").forEach(x=>x.remove());
    for(const c of verified){
      const a=node("a","ssSafkaNavLink",c.name);
      a.href="/#products";a.dataset.filter="safka:"+c.key;
      a.append(node("small","",Number(c.count).toLocaleString("ar-EG")+" منتج"));
      a.addEventListener("click",()=>{
        menu.hidden=true;
        const trigger=$("#navCategoryButton");if(trigger)trigger.setAttribute("aria-expanded","false");
      });
      menu.append(a);
    }
  }
  // Mobile header should not become a second wall of department chips.
  // The compact accessible dropdown in the main collection owns these choices.
  if(rail){
    rail.querySelectorAll(".ssSafkaMobileNavLink").forEach(x=>x.remove());
    const shortcut=node("a","ssSafkaMobileNavLink","تصفح الأقسام");
    shortcut.href="/#products";
    shortcut.addEventListener("click",()=>{
      const picker=$(".ssMobileDepartmentSelect");
      if(picker)requestAnimationFrame(()=>picker.focus({preventScroll:true}));
    });
    rail.append(shortcut);
  }
  const toolbar=$(".productsSection .toolbar");
  if(toolbar){
    let wrap=$(".ssMobileCategoryPicker",toolbar);
    if(!wrap){
      wrap=node("label","ssMobileCategoryPicker");
      wrap.append(node("span","ssMobileCategoryLabel","القسم"));
      const select=node("select","ssMobileDepartmentSelect");
      select.setAttribute("aria-label","اختار قسم المنتجات");
      select.addEventListener("change",()=>{
        const value=select.value;
        if(!value)return;
        const tab=Array.from(tabs.querySelectorAll("[data-filter]")).find(el=>el.dataset.filter===value);
        if(tab)tab.click();
      });
      wrap.append(select);
      toolbar.insertBefore(wrap,$(".searchWrap",toolbar));
    }
    const select=$(".ssMobileDepartmentSelect",wrap);
    select.replaceChildren();
    const empty=node("option","","تصفح الأقسام");empty.value="";select.append(empty);
    for(const c of verified){
      const option=node("option","",c.name+" ("+Number(c.count).toLocaleString("ar-EG")+")");
      option.value="safka:"+c.key;
      select.append(option);
    }
    // Keep the uncategorized items browseable via 'All'; not a real supplier category.
  }
}
function syncDepartmentPicker(){
  const select=$(".ssMobileDepartmentSelect");
  if(!select)return;
  const key=current.filter;
  select.value=Array.from(select.options).some(o=>o.value===key)?key:"";
  select.parentElement?.classList.toggle("is-selected",!!select.value);
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

function cleanSupplierText(value){
  if(typeof value!=="string")return "";
  const plain=value.slice(0,3500)
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/(?:p|div|li|h[1-6]|ul|ol)>/gi,"\n")
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/[ \t]+/g," ").replace(/ *\n */g,"\n")
    .replace(/\n{3,}/g,"\n\n").trim();
  return plain.slice(0,2600);
}
function choiceName(s){
  const v=String(s||"").trim();
  if(!v)return "اختيار واحد";
  if(/^(free\s*size|freesize|one size)$/i.test(v))return "مقاس واحد (فري سايز)";
  return v;
}
function openProduct(p,trigger){
  if(!validId(p?.id))return;
  const d=ensureDialog();
  lastFocus=trigger||document.activeElement;
  for(const existing of document.querySelectorAll("dialog[open]"))if(existing!==d)existing.close();
  const u=new URL(location.href);
  u.searchParams.set("product","safka-"+p.id);
  history.replaceState(null,"",u.pathname+u.search+u.hash);
  d.replaceChildren();

  const header=node("div","ssSafkaDialogHead");
  const brand=node("div","ssSafkaDialogBrand");
  brand.append(node("span","ssSafkaEyebrow","SELECT SHOP / PRODUCT"),
    node("strong","ssSafkaDialogShortTitle",p.name));
  const close=node("button","ssSafkaClose","×");
  close.type="button";close.setAttribute("aria-label","إغلاق تفاصيل المنتج");
  close.addEventListener("click",()=>d.close());
  header.append(brand,close);

  const layout=node("div","ssSafkaDetailLayout");
  const media=node("div","ssSafkaMedia");
  const stageWrap=node("div","ssSafkaStageWrap"),stage=node("div","ssSafkaStage");
  const thumbs=node("div","ssSafkaThumbs"),counter=node("span","ssSafkaGalleryCounter");
  const photos=(Array.isArray(p.images)?p.images:[]).map(safeMedia).filter(Boolean);
  const videos=(Array.isArray(p.videos)?p.videos:[]).map(safeMedia).filter(Boolean);
  const all=[
    ...photos.map(url=>({url,kind:"image"})),
    ...videos.map(url=>({url,kind:"video"}))
  ].slice(0,32);
  let active=0;
  const buttons=[];
  const nav=node("div","ssSafkaGalleryNav");
  const prev=node("button","ssSafkaGalleryArrow","‹");
  const next=node("button","ssSafkaGalleryArrow","›");
  prev.type="button";next.type="button";
  prev.setAttribute("aria-label","الصورة السابقة");
  next.setAttribute("aria-label","الصورة التالية");
  const select=index=>{
    if(!all.length)return;
    active=(index+all.length)%all.length;
    const item=all[active];
    stage.querySelector("video")?.pause();
    stage.replaceChildren();
    if(item.kind==="image"){
      const img=node("img","ssSafkaHeroImage");
      img.src=item.url;img.alt="صورة "+(active+1)+" — "+p.name;
      img.decoding="async";
      img.addEventListener("error",()=>{
        stage.replaceChildren(node("p","ssSafkaPlaceholder","تعذر تحميل الصورة من المورد"));
      },{once:true});
      stage.append(img);
    }else if(/\.(mp4|webm)$/i.test(new URL(item.url).pathname)){
      const video=node("video");video.controls=true;video.playsInline=true;video.preload="metadata";
      video.src=item.url;stage.append(video);
    }else{
      const link=node("a","","شاهد فيديو المنتج");
      link.href=item.url;link.target="_blank";link.rel="noopener noreferrer";
      stage.append(link);
    }
    counter.textContent=(active+1).toLocaleString("ar-EG")+" / "+all.length.toLocaleString("ar-EG");
    buttons.forEach((b,k)=>{
      const selected=k===active;
      b.classList.toggle("active",selected);
      b.setAttribute("aria-pressed",String(selected));
    });
    buttons[active]?.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
  };
  prev.addEventListener("click",()=>select(active-1));
  next.addEventListener("click",()=>select(active+1));
  nav.append(prev,counter,next);
  for(const [i,item] of all.entries()){
    const b=node("button","ssSafkaThumb");
    b.type="button";b.setAttribute("aria-label",(item.kind==="image"?"عرض الصورة ":"عرض الفيديو ")+(i+1));
    b.setAttribute("aria-pressed","false");
    if(item.kind==="image"){
      const image=node("img");
      image.src=item.url;image.loading="lazy";image.alt="";
      b.append(image);
    }else b.append(node("span","ssSafkaVideoThumb","▶ فيديو"));
    b.addEventListener("click",()=>select(i));
    buttons.push(b);thumbs.append(b);
  }
  if(all.length)select(0);
  else {stage.append(node("p","ssSafkaPlaceholder","لا توجد صور متاحة لهذا المنتج"));nav.hidden=true}
  stageWrap.append(stage);
  if(all.length>1)stageWrap.append(nav);
  media.append(stageWrap);
  if(all.length>1)media.append(thumbs);

  const body=node("div","ssSafkaDetailBody");
  const eyebrow=node("div","ssSafkaDetailEyebrow");
  eyebrow.append(node("span","ssSafkaTag",categoryName(p.category_name)),
    node("span","ssSafkaAvailability","قيد تجهيز السعر"));
  body.append(eyebrow,node("h2","",p.name));
  const info=node("div","ssSafkaPriceInfo");
  info.append(node("span","","السعر النهائي"),node("strong","",price(p)));
  body.append(info);
  const summary=cleanSupplierText(p.description);
  if(summary){
    const descSection=node("section","ssSafkaDescription");
    descSection.append(node("h3","","تفاصيل المنتج"));
    const desc=node("p","ssSafkaDesc");
    const limit=460;
    const long=summary.length>limit;
    desc.textContent=long?summary.slice(0,limit).trim()+"…":summary;
    descSection.append(desc);
    if(long){
      const readMore=node("button","ssSafkaReadMore","عرض الوصف كاملًا");
      readMore.type="button";
      let expanded=false;
      readMore.addEventListener("click",()=>{
        expanded=!expanded;
        desc.textContent=expanded?summary:summary.slice(0,limit).trim()+"…";
        readMore.textContent=expanded?"عرض أقل":"عرض الوصف كاملًا";
        readMore.setAttribute("aria-expanded",String(expanded));
      });
      readMore.setAttribute("aria-expanded","false");
      descSection.append(readMore);
    }
    descSection.append(node("small","ssSafkaDescDisclaimer","الوصف من المورد، ويُراجع قبل إتاحة الشراء."));
    body.append(descSection);
  }
  if(Array.isArray(p.variants)&&p.variants.length){
    const variants=node("section","ssSafkaVariantSection");
    variants.append(node("h3","","الألوان والمقاسات"));
    const options=node("div","ssSafkaOptions");
    p.variants.slice(0,36).forEach(v=>{
      const option=node("span","ssSafkaOption",choiceName(v.name));
      option.classList.toggle("is-unavailable",v.available===false);
      option.title=v.available===false?"غير متوفر عند آخر مزامنة":"حسب بيانات المورد";
      options.append(option);
    });
    variants.append(options);
    body.append(variants);
  }
  const technical=node("details","ssSafkaTechnical");
  technical.append(node("summary","","أكواد المنتج والمورد"));
  const codes=node("div","ssSafkaCodes");
  codes.append(node("span","","كود المنتج في صفقة"),node("code","",p.id));
  if(p.barcode)codes.append(node("span","","الباركود"),node("code","",p.barcode));
  (Array.isArray(p.variants)?p.variants:[]).slice(0,24).forEach(v=>{
    if(v.id){codes.append(node("span","",choiceName(v.name)),node("code","",v.id))}
  });
  technical.append(codes);body.append(technical);
  const action=node("div","ssSafkaDetailAction");
  action.append(node("p","","الطلب غير متاح لحين مراجعة السعر والتوفر."));
  const disabled=node("button","ssSafkaDisabled","قريبًا — جارٍ تجهيز المنتج");
  disabled.type="button";disabled.disabled=true;action.append(disabled);
  body.append(action);
  layout.append(media,body);
  d.append(header,layout);
  d.showModal();
  d.scrollTop=0;
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
  syncDepartmentPicker();
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