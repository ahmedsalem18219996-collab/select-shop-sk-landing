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
let autoPager=null,autoPagerTarget=null;
const connections={saveData:!!navigator.connection?.saveData};
let closeMobileDepartments=()=>{};
function categoryName(raw){
  return /صفقة|safka/i.test(raw)?"منتجات متنوعة":(raw||"منتجات متنوعة");
}
function hasVariantPriceRange(p){
 const nums=(Array.isArray(p?.variants)?p.variants:[]).filter(v=>v.available!==false).map(v=>Number(v.display_price_egp)).filter(v=>Number.isFinite(v)&&v>0);
 return nums.length>1 && Math.max(...nums)>Math.min(...nums);
}
function price(p){
  const amount=p.final_price_egp||p.display_price_egp;
  return amount&&Number(amount)>0?
    (hasVariantPriceRange(p)?"يبدأ من ":"")+Number(amount).toLocaleString("ar-EG")+" ج.م":
    "السعر قيد المراجعة";
}
function addCategoryTabs(){
  const tabs=$(".productsSection .toolbar .tabs");
  if(!tabs)return;
  tabs.querySelectorAll(".ssSafkaFilterTab").forEach(x=>x.remove());
  const existing=new Set(Array.from(tabs.querySelectorAll("[data-filter]"),x=>x.dataset.filter));
  const entries=categories.filter(c=>c&&c.key!=="uncategorized"&&typeof c.key==="string"&&Number(c.count)>0);
  const pendingCategory=categories.find(c=>c?.key==="uncategorized"&&Number(c.count)>0);
  for(const c of entries){
    const key=c.key==="uncategorized"?"safka-other":"safka:"+c.key;
    if(existing.has(key))continue;
    const label=c.name;
    const b=node("button","tab ssSafkaFilterTab",label+" ("+Number(c.count).toLocaleString("ar-EG")+")");
    b.type="button";b.dataset.filter=key;b.setAttribute("aria-pressed","false");
    tabs.append(b);
  }
  // Suppliers can have unmatched category data. Show it only as a review bucket.
  // Never mislabel these as a source-verified category.
  if(pendingCategory){
    const b=node("button","tab ssSafkaFilterTab ssSafkaUnverifiedTab",
      "منتجات متنوعة ("+Number(pendingCategory.count).toLocaleString("ar-EG")+")");
    b.type="button";b.dataset.filter="safka-other";b.setAttribute("aria-pressed","false");
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
    if(pendingCategory){
      const a=node("a","ssSafkaNavLink ssSafkaUnverifiedNav","منتجات متنوعة");
      a.href="/#products";a.dataset.filter="safka-other";
      a.append(node("small","",Number(pendingCategory.count).toLocaleString("ar-EG")+" منتج — القسم غير مؤكد"));
      a.addEventListener("click",()=>{menu.hidden=true;$("#navCategoryButton")?.setAttribute("aria-expanded","false")});
      menu.append(a);
    }
  }
  // Only a compact shortcut stays in the mobile header.
  if(rail){
    rail.querySelectorAll(".ssSafkaMobileNavLink").forEach(x=>x.remove());
    const shortcut=node("a","ssSafkaMobileNavLink","تصفح الأقسام");
    shortcut.href="#products";
    shortcut.addEventListener("click",event=>{
      event.preventDefault();
      $("#products")?.scrollIntoView({block:"start",behavior:"smooth"});
      requestAnimationFrame(()=>{
        const button=$(".ssMobileDepartmentButton");
        if(button&&button.getAttribute("aria-expanded")==="false")button.click();
      });
    });
    rail.append(shortcut);
  }
  const toolbar=$(".productsSection .toolbar");
  if(toolbar){
    // Use an IN-PAGE category panel, NEVER a browser-native <select> popup.
    // The native menu overlaid most of the viewport on 390px Chrome devices.
    toolbar.querySelectorAll(".ssMobileCategoryPicker,.ssMobileDepartmentPanel").forEach(x=>x.remove());
    const wrap=node("div","ssMobileCategoryPicker");
    const picker=node("button","ssMobileDepartmentButton");
    picker.type="button";
    picker.setAttribute("aria-label","تصفح أقسام المنتجات");
    picker.setAttribute("aria-controls","ssMobileDepartments");
    picker.setAttribute("aria-expanded","false");
    picker.append(node("span","ssMobileDepartmentText","تصفح الأقسام"),node("span","ssMobileDepartmentChevron","⌄"));
    wrap.append(picker);

    const panel=node("div","ssMobileDepartmentPanel");
    panel.id="ssMobileDepartments";panel.hidden=true;
    panel.setAttribute("role","region");
    panel.setAttribute("aria-label","اختيار قسم من أقسام SELECT SHOP");
    const top=node("div","ssMobileDepartmentHead");
    top.append(node("strong","","أقسام المتجر"));
    const dismiss=node("button","ssMobileDepartmentClose","✕");
    dismiss.type="button";dismiss.setAttribute("aria-label","إغلاق الأقسام");
    top.append(dismiss);
    const choices=node("div","ssMobileDepartmentChoices");
    // Footwear belongs to the same departments menu as the supplier categories.
    const shoeItem=node("button","ssMobileDepartmentItem");
    shoeItem.type="button";shoeItem.dataset.category="shoes";
    shoeItem.append(node("strong","","الأحذية"),node("small","","4 موديلات"));
    shoeItem.addEventListener("click",()=>{
      const shoeTab=tabs.querySelector('[data-filter="shoes"]');
      closeMobileDepartments();
      if(shoeTab)shoeTab.click();
    });
    choices.append(shoeItem);
    for(const c of verified){
      const item=node("button","ssMobileDepartmentItem");
      item.type="button";
      item.dataset.category="safka:"+c.key;
      item.append(node("strong","",c.name),node("small","",Number(c.count).toLocaleString("ar-EG")+" منتج"));
      item.addEventListener("click",()=>{
        const tab=Array.from(tabs.querySelectorAll("[data-filter]"))
          .find(el=>el.dataset.filter===item.dataset.category);
        closeMobileDepartments();
        if(tab)tab.click();
      });
      choices.append(item);
    }
    if(pendingCategory){
      const item=node("button","ssMobileDepartmentItem ssSafkaUnverifiedItem");
      item.type="button";item.dataset.category="safka-other";
      item.append(node("strong","","منتجات متنوعة"),
        node("small","",Number(pendingCategory.count).toLocaleString("ar-EG")+" منتج — لم يتم تأكيد القسم"));
      item.addEventListener("click",()=>{
        closeMobileDepartments();
        tabs.querySelector('[data-filter="safka-other"]')?.click();
      });
      choices.append(item);
    }
    panel.append(top,choices);
    panel.append(node("p","ssMobileDepartmentHint","كل المنتجات متاحة أيضًا من زر «الكل» والبحث."));
    const searchWrap=$(".searchWrap",toolbar);
    toolbar.insertBefore(wrap,searchWrap);
    toolbar.insertBefore(panel,searchWrap);
    const setOpen=open=>{
      const next=!!open;
      panel.hidden=!next;
      picker.setAttribute("aria-expanded",String(next));
      wrap.classList.toggle("is-open",next);
      toolbar.classList.toggle("ssDepartmentsExpanded",next);
    };
    closeMobileDepartments=()=>setOpen(false);
    picker.addEventListener("click",()=>setOpen(panel.hidden));
    dismiss.addEventListener("click",()=>{setOpen(false);picker.focus()});
    // Keyboard support and close-on-outside-click.
    if(!document.documentElement.dataset.ssDepartmentEvents){
      document.documentElement.dataset.ssDepartmentEvents="1";
      document.addEventListener("keydown",e=>{
        if(e.key==="Escape")closeMobileDepartments();
      });
      document.addEventListener("click",e=>{
        if(!e.target.closest(".ssMobileCategoryPicker,.ssMobileDepartmentPanel,.ssSafkaMobileNavLink")){
          closeMobileDepartments();
        }
      });
    }
  }
}
function syncDepartmentPicker(){
  const picker=$(".ssMobileDepartmentButton");
  if(!picker)return;
  const currentFilter=current.filter;
  const selected=categories.find(c=>c.key!=="uncategorized"&&("safka:"+c.key)===currentFilter);
  const name=currentFilter==="shoes"?"الأحذية":currentFilter==="safka-other"?"منتجات متنوعة":selected?.name||"الأقسام";
  const title=$(".ssMobileDepartmentText",picker);
  if(title)title.textContent=name;
  picker.classList.toggle("is-selected",!!selected||currentFilter==="shoes"||currentFilter==="safka-other");
  document.querySelectorAll(".ssMobileDepartmentItem").forEach(b=>{
    const active=b.dataset.category===currentFilter;
    b.classList.toggle("is-active",active);
    b.setAttribute("aria-pressed",String(active));
  });
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
  // Auto-load only near the current live collection's bottom; reconnect after
  // a category/search redraw because the main catalog rebuilds the DOM.
  if("IntersectionObserver" in window&&!connections.saveData){
    if(!autoPager)autoPager=new IntersectionObserver(entries=>{
      const visible=entries.some(e=>e.isIntersecting&&e.target.isConnected&&!e.target.hidden);
      if(visible&&!loading&&items.length<total&&current.filter!=="shoes"){
        page+=1;loadPage(true);
      }
    },{rootMargin:"0px 0px 280px 0px",threshold:0.01});
    if(autoPagerTarget!==actions){
      autoPager.disconnect();autoPager.observe(actions);autoPagerTarget=actions;
    }
  }
  return {shelf,grid,status,actions,more:$("button",actions)};
}
function mediaSources(p){
  const photos=(Array.isArray(p.images)?p.images:[]).map(safeMedia).filter(Boolean);
  const video=(Array.isArray(p.videos)?p.videos:[]).map(safeMedia).filter(Boolean);
  return {photos:[...new Set(photos)],videos:[...new Set(video)]};
}
function productCard(p){
  const article=node("article","productCard editorialCard ssSafkaUnifiedCard");
  article.dataset.supplier="safka";
  const {photos,videos}=mediaSources(p);
  const media=node("div","cardMedia ssSafkaUnifiedMedia");
  const open=node("button","cardMediaClick ssSafkaUnifiedOpen");
  open.type="button";open.setAttribute("aria-label","اعرض صور وتفاصيل "+p.name);
  if(photos.length){
    // Soft-focus bleed behind a fully contained, uncropped primary image.
    // Supplier posters have inconsistent ratios; NEVER stretch or crop the hero.
    const backdrop=node("span","ssSafkaMediaBackdrop");
    backdrop.style.backgroundImage="url("+JSON.stringify(photos[0])+")";
    backdrop.setAttribute("aria-hidden","true");
    open.append(backdrop);
    const frame=node("span","ssSafkaImageFrame");
    const pic=node("img","ssSafkaCardImage");
    pic.src=photos[0];pic.loading="lazy";pic.decoding="async";
    pic.width=720;pic.height=720;pic.alt="صورة "+p.name;
    pic.addEventListener("load",()=>{
      const ratio=pic.naturalHeight>0?pic.naturalWidth/pic.naturalHeight:0;
      pic.classList.toggle("ssSafkaNearSquare",ratio>=.83&&ratio<=1.2);
    });
    let imageIndex=0;
    pic.addEventListener("error",()=>{
      imageIndex++;
      if(imageIndex<photos.length){pic.src=photos[imageIndex];backdrop.style.backgroundImage="url("+JSON.stringify(photos[imageIndex])+")";}
      else{frame.replaceChildren(node("span","ssSafkaNoImage","الصورة غير متاحة"));backdrop.remove()}
    });
    frame.append(pic);open.append(frame);
  }else if(videos.length){
    const placeholder=node("span","ssSafkaVideoPlaceholder","▶");
    placeholder.setAttribute("aria-hidden","true");open.append(placeholder);
  }else open.append(node("span","ssSafkaNoImage","الصورة غير متاحة"));
  const openFn=()=>openProduct(p,open);
  open.addEventListener("click",openFn);
  media.append(open,node("span","cardTag","SELECT SHOP"));
  const mediaBadges=node("div","ssSafkaMediaBadges");
  if(photos.length>1)mediaBadges.append(node("span","ssSafkaMediaCount",photos.length.toLocaleString("ar-EG")+" صور"));
  if(videos.length)mediaBadges.append(node("span","ssSafkaVideoBadge","▶ "+videos.length.toLocaleString("ar-EG")+" فيديو"));
  if(mediaBadges.childElementCount)media.append(mediaBadges);
  const body=node("div","cardContent ssSafkaUnifiedBody");
  body.append(node("span","cardCategory",categoryName(p.category_name)));
  const title=node("div","cardTitle ssSafkaUnifiedTitle");
  title.append(node("h3","",p.name),node("strong","",price(p)));body.append(title);
  if(p.display_price_egp)
    body.append(node("small","ssSafkaPricePreview","السعر شامل التوصيل"));

  article.dataset.supplierProductId=p.id;
  const bottom=node("div","cardBottom ssSafkaUnifiedBottom");
  const buyNow=node("button","ssSafkaCardBuy","اطلب الآن");
  buyNow.type="button";
  const orderable=(Array.isArray(p.variants)?p.variants:[]).some(v=>v.available===true&&validId(v.id)&&Number(v.display_price_egp)>0);
  buyNow.disabled=!orderable;
  buyNow.addEventListener("click",()=>{
    if(orderable&&window.SS_SAFKA_CHECKOUT?.open)window.SS_SAFKA_CHECKOUT.open(p);
    else openFn();
  });
  bottom.append(buyNow);
  const add=node("button","ssSafkaCardAdd","أضف إلى السلة");
  add.type="button";add.disabled=!orderable;
  add.addEventListener("click",()=>window.SS_SAFKA_CART?.choose(p));
  bottom.append(add);
  // Product title/image open full product details; avoid a fourth giant button in a small card.
  title.querySelector("h3").addEventListener("click",openFn);
  title.querySelector("h3").tabIndex=0;title.querySelector("h3").setAttribute("role","button");
  title.querySelector("h3").setAttribute("aria-label","تفاصيل "+p.name);
  title.querySelector("h3").addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();openFn();}
  });

  if(videos.length){
    const direct=videos[0].match(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/preview$/)?
      videos[0].replace(/\/preview$/,"/view"):videos[0];
    const watch=node("a","ssSafkaCardVideoDirect","▶ مشاهدة الفيديو");
    watch.href=direct;watch.target="_blank";watch.rel="noopener noreferrer";
    watch.setAttribute("aria-label","شاهد فيديو "+p.name+" داخل الموقع");
    watch.addEventListener("click",event=>{
      event.preventDefault();openProduct(p,watch,true);
    });
    media.append(watch);
  }
  body.append(bottom);article.append(media,body);return article;
}

function ensureDialog(){
  if(dialog)return dialog;
  dialog=node("dialog","ssSafkaDialog");dialog.setAttribute("aria-label","تفاصيل منتج من SELECT SHOP");
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{
    dialog.replaceChildren();
    const u=new URL(location.href),param=u.searchParams.get("product")||"";
    if(param.startsWith("safka-")||validId(param)){
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
function productLink(id){
  return location.origin+"/?product="+encodeURIComponent(id)+"#products";
}
async function copyProductLink(id,button){
  if(!validId(id))return;
  const link=productLink(id);
  const previous=button.textContent;
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(link);
      button.textContent="تم نسخ الرابط";
    }else{
      // iOS/Safari clipboard may be unavailable without permission.
      const input=node("textarea");
      input.value=link;input.readOnly=true;input.style.position="fixed";
      input.style.top="0";input.style.opacity="0";
      document.body.append(input);input.select();
      const copied=document.execCommand("copy");input.remove();
      if(!copied)throw Error("copy_not_supported");
      button.textContent="تم نسخ الرابط";
    }
  }catch{
    button.textContent="تعذر النسخ — افتح التفاصيل";
    if(button.closest(".ssSafkaDialog")){
      const linkNode=node("a","ssSafkaExternalMedia","افتح رابط المنتج");
      linkNode.href=link;linkNode.target="_blank";linkNode.rel="noopener noreferrer";
      button.parentElement.append(linkNode);
    }
  }
  setTimeout(()=>{if(button.isConnected)button.textContent=previous},2400);
}
function openProduct(p,trigger,showVideo=false){
  if(window.SELECT_SHOP_TEST_MODE!==true&&typeof window.gtag==="function")
    try{window.gtag("event","view_item",{currency:"EGP",
      value:Number(p.display_price_egp)||0,
      items:[{item_id:p.id,item_name:String(p.name).slice(0,100),
        price:Number(p.display_price_egp)||0,quantity:1}]})}catch{}

  if(!validId(p?.id))return;
  const d=ensureDialog();
  lastFocus=trigger||document.activeElement;
  for(const existing of document.querySelectorAll("dialog[open]"))if(existing!==d)existing.close();
  const u=new URL(location.href);
  u.searchParams.set("product",p.id);
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
  const {photos,videos}=mediaSources(p);
  const all=[
    ...photos.map(url=>({url,kind:"image"})),
    ...videos.map(url=>({url,kind:"video"}))
  ];
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
        stage.replaceChildren(node("p","ssSafkaPlaceholder","تعذر تحميل الصورة"));
      },{once:true});
      stage.append(img);
    }else if(/\.(mp4|webm)$/i.test(new URL(item.url).pathname)){
      const video=node("video");video.controls=true;video.playsInline=true;video.preload="metadata";
      if(photos.length)video.poster=photos[0];
      video.src=item.url;stage.append(video);
    }else if(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/preview$/.test(item.url)){
      // Play videos IN the product gallery. Google Drive may block some embeds;
      // an external viewer link remains visible without exposing supplier details.
      const viewer=item.url.replace(/\/preview$/,"/view");
      const player=node("div","ssSafkaInStoreVideo");
      const iframe=node("iframe","ssSafkaDriveVideo");
      iframe.title="فيديو المنتج: "+p.name;
      iframe.src=item.url;iframe.loading="eager";
      iframe.referrerPolicy="strict-origin-when-cross-origin";
      iframe.allow="autoplay; fullscreen; picture-in-picture";
      iframe.setAttribute("allowfullscreen","");
      player.append(iframe);
      const help=node("div","ssSafkaVideoHelp");
      help.append(node("span","","الفيديو داخل المتجر"));
      const fallback=node("a","ssSafkaDrivePrimary","فتح الفيديو لو مش شغّال");
      fallback.href=viewer;fallback.target="_blank";fallback.rel="noopener noreferrer";
      help.append(fallback);player.append(help);stage.append(player);
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
    }else {
      if(photos.length){
        const preview=node("img");preview.src=photos[0];preview.loading="lazy";
        preview.alt="";b.append(preview);
      }
      b.append(node("span","ssSafkaVideoThumb","▶ فيديو"));
    }
    b.addEventListener("click",()=>select(i));
    buttons.push(b);thumbs.append(b);
  }
  if(all.length)select(showVideo&&videos.length?photos.length:0);
  else {stage.append(node("p","ssSafkaPlaceholder","لا توجد صور متاحة لهذا المنتج"));nav.hidden=true}
  stageWrap.append(stage);
  if(all.length>1)stageWrap.append(nav);
  media.append(stageWrap);
  if(all.length>1)media.append(thumbs);
  // Exact supplier-backed media resource verified for this specific Product ID.
  // This is a Drive media folder (with a فيديو subfolder), NOT a direct playable video.


  const body=node("div","ssSafkaDetailBody");
  const eyebrow=node("div","ssSafkaDetailEyebrow");
  eyebrow.append(node("span","ssSafkaTag",categoryName(p.category_name)),
    node("span","ssSafkaAvailability","متاح للطلب"));
  body.append(eyebrow,node("h2","",p.name));
  const info=node("div","ssSafkaPriceInfo");
  info.append(node("span","","السعر شامل التوصيل"),node("strong","",price(p)));
  body.append(info);
  const confidence=node("div","ssSafkaConversionAssurance");
  confidence.setAttribute("aria-label","معلومات الطلب");
  confidence.append(
    node("span","","السعر شامل التوصيل"),
    node("span","","تأكيد قبل التجهيز"),
    node("span","","الدفع عند الاستلام")
  );
  body.append(confidence);
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

    body.append(descSection);
  }
  if(Array.isArray(p.variants)&&p.variants.length){
    const variants=node("section","ssSafkaVariantSection");
    variants.append(node("h3","","الألوان والمقاسات"));
    const options=node("div","ssSafkaOptions");
    p.variants.slice(0,36).forEach(v=>{
      const option=node("span","ssSafkaOption",choiceName(v.name));
      if(v.display_price_egp&&v.available!==false)
        option.append(node("small","ssSafkaVariantPrice"," · "+Number(v.display_price_egp).toLocaleString("ar-EG")+" ج"));
      option.classList.toggle("is-unavailable",v.available===false);
      option.title=v.available===false?"غير متوفر حاليًا":"متوفر";
      options.append(option);
    });
    variants.append(options);
    body.append(variants);
  }

  const action=node("div","ssSafkaDetailAction");
  if(videos.length){
    const first=videos[0];
    const drive=/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/preview$/.test(first);
    const watch=node("a","ssSafkaWatchProductVideo","▶ شاهد فيديو المنتج");
    watch.href=drive?first.replace(/\/preview$/,"/view"):first;
    watch.rel="noopener noreferrer";watch.target="_blank";
    watch.setAttribute("aria-label","شاهد فيديو المنتج "+p.name+" داخل الموقع");
    watch.addEventListener("click",event=>{
      event.preventDefault();
      select(photos.length);
      stageWrap.scrollIntoView({block:"nearest",behavior:"smooth"});
    });
    action.append(watch);
  }


  const choices=(Array.isArray(p.variants)?p.variants:[]).filter(v=>v.available===true&&validId(v.id)&&Number(v.display_price_egp)>0);
  if(choices.length&&Number(p.display_price_egp)>0){
    const buy=node("button","ssSafkaPurchase","اطلب الآن");
    buy.type="button";
    buy.addEventListener("click",()=>{
      d.close();
      if(window.SS_SAFKA_CHECKOUT?.open)window.SS_SAFKA_CHECKOUT.open(p);
      else window.alert("تعذر فتح نموذج الطلب. جرّب تحديث الصفحة.");
    });
    action.prepend(buy);
    const addToBag=node("button","ssSafkaAddToBag","أضف إلى السلة");
    addToBag.type="button";
    addToBag.addEventListener("click",()=>{
      d.close();
      if(window.SS_SAFKA_CART?.choose)window.SS_SAFKA_CART.choose(p);
      else window.alert("تعذر فتح السلة. حدّث الصفحة.");
    });
    buy.after(addToBag);
  }else{
    const unavailable=node("button","ssSafkaDisabled","غير متوفر حاليًا");
    unavailable.type="button";unavailable.disabled=true;action.prepend(unavailable);
  }
  // Place the customer order CTA immediately after the total price, before long descriptions.
  info.after(action);
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
      stage.status.textContent="تعذر تحميل بعض المنتجات الآن. اضغط عرض منتجات أكثر لإعادة المحاولة.";
      if(append){page=Math.max(1,page-1);stage.actions.hidden=false;stage.more.disabled=false;}
      else stage.actions.hidden=true;
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
    const id=param.startsWith("safka-")?param.slice(6):(validId(param)?param:"");
    if(validId(id)){
      const found=await rpc("ss_safka_public_catalog_v2",{p_page:1,p_limit:1,p_search:id});
      const product=found?.items?.find(x=>x.id.toLowerCase()===id.toLowerCase());
      if(product&&!dialog?.open)openProduct(product,null);
    }
  }catch{
    const stage=ensureStage();
    if(stage)stage.status.textContent="المنتجات غير متاحة الآن، حاول تحديث الصفحة.";
  }
}
document.querySelectorAll("[data-quick-search]").forEach(button=>{
  button.addEventListener("click",()=>{
    const input=$("#searchInput");
    if(!input)return;
    input.value=button.dataset.quickSearch||"";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    $("#products")?.scrollIntoView({block:"start",behavior:"smooth"});
  });
});
window.addEventListener("selectshop:collection-rendered",e=>{if(categories.length)onCollectionRendered(e.detail)});
document.addEventListener("DOMContentLoaded",boot,{once:true});
})();