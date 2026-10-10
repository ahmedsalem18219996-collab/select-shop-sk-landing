/* SELECT SHOP V2 — production commerce controller.
   Approved V2 UI; live WhatsApp handoff; GA4 and Meta integration.
   Single shared cart storage across original product landing pages.
   All pricing/availability from catalog-v2-live.js. */
(() => {
  "use strict";
  if (!window.SELECT_SHOP_V2_LIVE) throw Error("SELECT SHOP production initialization guard missing");
  const C = window.SELECT_FOUNDATION_CATALOG;
  const SETTINGS = window.SELECT_FOUNDATION_CONFIG;
  if (!C || !SETTINGS) throw Error("Foundation catalog failed to load");
  const ids = ["sk","alex","eqwal","wk","carwash48"];
  const SHOES = new Set(["sk","alex","eqwal","wk"]);
  const KEY="selectShopCart:v2"; // shoe cart shared with original ad landings
  const CAR_CART_KEY="selectShopV2CarCart:v1"; // preserve car items when legacy shoe-only pages are visited
  const PHONE="201289437444";
  const GA4_ID="G-NB8PZCX35Z";
  const testMode=window.SELECT_SHOP_TEST_MODE===true;
  const $ = (q,root=document)=>root.querySelector(q);
  const $$ = (q,root=document)=>Array.from(root.querySelectorAll(q));
  const fmt = n => new Intl.NumberFormat("ar-EG").format(n)+" جنيه";
  const htmlEsc = x => String(x ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const photo = src => /^(https?:\/\/|\/)/.test(src) ? src : "/"+src;
  const iconPlay="<svg class=\"ssIcon\" viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 5.5 19 12 8 18.5z\"/></svg>";
  const inquiryHref=message=>"https://wa.me/"+PHONE+"?text="+encodeURIComponent(message);
  // Optional direct MP4/WebM links from product or variant; no placeholder players.
  const videoUrl=(p,v)=>{
    const raw=v.video||p.video;
    if(typeof raw!=="string"||!raw.trim())return null;
    try{
      const u=new URL(raw,location.origin);
      if(!["https:","http:"].includes(u.protocol)||!/\.(mp4|webm)$/i.test(u.pathname))return null;
      if(u.protocol==="http:"&&u.hostname!==location.hostname)return null;
      return u.href;
    }catch{return null}
  };
  function resetDetailVideo(){
    const video=$("#detailVideoPlayer"),stage=$("#detailVideoWrap"),picture=$(".detailImage");
    if(!video||!stage||!picture)return;
    video.pause();video.removeAttribute("src");
    stage.hidden=true;picture.hidden=false;
  }
  function showDetailVideo(){
    if(!viewed)return;
    const p=C[viewed.productId],v=selectedVariant(p.id,viewed.variantId),src=videoUrl(p,v);
    if(!src)return;
    const player=$("#detailVideoPlayer");
    if(player.getAttribute("src")!==src)player.src=src;
    $(".detailImage").hidden=true;$("#detailVideoWrap").hidden=false;
    player.load();
    $("#detailGallery button").forEach(b=>b.classList.toggle("active",b.matches("[data-show-video]")));
  }
  const productCategory = id => id === "carwash48" ? "car" : "shoes";
  const classLabel = id => id === "carwash48" ? "عناية السيارات" : id === "sk" || id === "wk" ? "أحذية حريمي" : "أحذية رجالي وحريمي حسب المقاس";
  const selectedVariant = (productId,variantId) => C[productId]?.variants.find(v=>v.id===variantId)||C[productId]?.variants[0];
  const getProduct=id=>C[id];
  const makeId=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
  const showToast = msg => {
    const e=$("#toast");e.textContent=msg;e.hidden=false;
    clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>e.hidden=true,3500);
  };
  let filter="all",search="",viewed=null,selectedSize=null,secondSize=null;
  const cardVariant={};
  let cart=[];
  const validItem = x => {
    if(!x || !C[x.productId] || typeof x.id!=="string")return false;
    const v=selectedVariant(x.productId,x.variantId);
    if(!v || v.id!==x.variantId || !Array.isArray(x.sizes) || !["purchase","trial","primary"].includes(x.role))return false;
    if(x.productId==="carwash48")return x.role!=="trial" && x.sizes.length===0;
    return x.sizes.length>=1 && x.sizes.length<=2 && x.sizes.every(n=>v.sizes.includes(Number(n))) && new Set(x.sizes).size===x.sizes.length;
  };
  try {
    const old=JSON.parse(localStorage.getItem(KEY)||"null");
    if(old?.version===2 && Number.isFinite(old?.savedAt) && old.savedAt<=Date.now() &&
       Date.now()-old.savedAt<7*864e5 && Array.isArray(old.items)) {
      cart=old.items.filter(validItem).slice(0,20).map(x=>({
        id:x.id,productId:x.productId,variantId:x.variantId,
        sizes:x.sizes.map(Number),role:x.role==="primary"?"purchase":x.role
      }));
    }
    const carSaved=JSON.parse(localStorage.getItem(CAR_CART_KEY)||"null");
    if(carSaved?.version===1 && Number.isFinite(carSaved?.savedAt) &&
       carSaved.savedAt<=Date.now() && Date.now()-carSaved.savedAt<7*864e5 &&
       Array.isArray(carSaved.items)) {
      for(const i of carSaved.items.filter(validItem).filter(i=>i.productId==="carwash48")) {
        if(!cart.some(x=>x.id===i.id))cart.push({...i,role:"purchase"});
      }
    }
  }catch{}
  const purchasedShoes=()=>cart.filter(i=>i.role==="purchase"&&SHOES.has(i.productId)).length;
  const normalizeCart=()=>{
    if(!purchasedShoes()){
      // A trial item without a paid shoe can never be the whole order.
      const first=cart.find(i=>SHOES.has(i.productId)&&i.role==="trial");
      if(first)first.role="purchase";
    }
  };
  normalizeCart();
  const persist=()=>{
    normalizeCart();
    try {
      const shoes=cart.filter(i=>i.productId!=="carwash48");
      const cars=cart.filter(i=>i.productId==="carwash48");
      if(shoes.length){
        let foundPrimary=false;
        const compatible=shoes.map(i=>{
          const role=i.role==="trial"?"trial":(!foundPrimary?(foundPrimary=true,"primary"):"purchase");
          return {...i,role,tryTwo:i.sizes.length===2,billableQty:1};
        });
        localStorage.setItem(KEY,JSON.stringify({version:2,savedAt:Date.now(),items:compatible}));
      } else localStorage.removeItem(KEY);
      if(cars.length)localStorage.setItem(CAR_CART_KEY,JSON.stringify({version:1,savedAt:Date.now(),items:cars}));
      else localStorage.removeItem(CAR_CART_KEY);
    }catch{}
    $$("[data-cart-count]").forEach(el=>el.textContent=cart.length);
  };
  function totals(){
    const billable=cart.filter(i=>i.role==="purchase");
    const shoes=billable.filter(i=>SHOES.has(i.productId));
    const car=billable.filter(i=>i.productId==="carwash48");
    const subtotal=billable.reduce((s,i)=>s+C[i.productId].price,0);
    const discount=Math.max(0,shoes.length-1)*SETTINGS.SHOE_EXTRA_DISCOUNT;
    return {subtotal,discount,total:Math.max(0,subtotal-discount),shoes:shoes.length,car:car.length,trials:cart.filter(i=>i.role==="trial").length};
  }
  function sameCartSelection(i,pid,vid,sizes,role){
    return i.productId===pid&&i.variantId===vid&&i.role===role&&JSON.stringify(i.sizes)===JSON.stringify(sizes);
  }
  // Never send test traffic or personal customer details to marketing events.
  if(!testMode){
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag("js",new Date());
    window.gtag("config",GA4_ID,{send_page_view:true});
    const t=document.createElement("script");t.async=true;
    t.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(GA4_ID);
    document.head.appendChild(t);
  }
  const ga=(event,details={})=>{if(!testMode&&typeof window.gtag==="function")
    try{window.gtag("event",event,{...details,currency:"EGP"})}catch{}};
  const itemDetail=(p,v)=>({
    content_name:p.name+" — "+v.name,content_ids:[v.id],
    item_id:v.id,item_name:p.name+" "+v.name,value:p.price,currency:"EGP"
  });
  const trackView=(p,v)=>{
    if(testMode)return;
    window.SELECT_SHOP_META?.view(p,v);
    ga("view_item",{value:p.price,items:[{item_id:v.id,item_name:p.name+" "+v.name,price:p.price,quantity:1}]});
  };
  const cartItemsForMeta=()=>cart.map(i=>{
    const p=C[i.productId],v=selectedVariant(i.productId,i.variantId);
    return {productId:i.productId,variantId:v.id,role:i.role,
      sizes:i.sizes,price:p.price,payablePrice:i.role==="trial"?0:p.price};
  });
  const MERCH = Object.freeze({
    sk:{headline:"راحة في المشي والشغل",detail:"Mesh خفيف ونعل EVA",use:"للمشاوير اليومية",tag:"DAILY COMFORT"},
    alex:{headline:"ستايل بسيط بتفاصيل مميزة",detail:"تصميم جلدي وتبطين داخلي",use:"للخروج والكاجوال",tag:"EVERYDAY PREMIUM"},
    eqwal:{headline:"كاجوال سهل يتلبس",detail:"ألوان هادية وتصميم Street",use:"للكاجوال اليومي",tag:"STREET ESSENTIAL"},
    wk:{headline:"ستايل Retro بأكتر من اختيار",detail:"8 توليفات لونية",use:"للستايل الرياضي",tag:"RETRO EDIT"}
  });
  function shoeCard(id) {
    const p=C[id],v=selectedVariant(id,cardVariant[id]),m=MERCH[id];
    const thumbs=p.variants.map(x=>'<button class="colorMini '+(x.id===v.id?'active':'')+'" type="button" data-color="'+htmlEsc(id)+'|'+htmlEsc(x.id)+'" aria-label="عرض '+htmlEsc(x.code+" "+x.name)+'" aria-pressed="'+String(x.id===v.id)+'"><img loading="lazy" src="'+htmlEsc(photo(x.image))+'" alt=""></button>').join("");
    return '<article class="productCard editorialCard" data-product-id="'+htmlEsc(id)+'">'+
      '<div class="cardMedia"><button class="cardMediaClick" type="button" data-show-product="'+htmlEsc(id)+'" aria-label="استعراض صور وتفاصيل '+htmlEsc(p.name)+'"><img class="mainCardImage" src="'+htmlEsc(photo(v.image))+'" alt="'+htmlEsc(p.name+" "+v.name)+'" loading="lazy" width="700" height="700"></button><span class="cardTag">'+htmlEsc(m.tag)+'</span><span class="cardIndex">'+htmlEsc(v.code)+'</span><button class="cardQuick" type="button" data-show-product="'+htmlEsc(id)+'" aria-label="افتح '+htmlEsc(p.name)+'"><svg class="ssIcon ssIconArrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5M7.5 6.5h10v10"/></svg></button></div>'+
      '<div class="cardContent"><div class="cardCategory">'+htmlEsc(m.use)+' <span class="catalog-dot">•</span> '+htmlEsc(m.detail)+'</div>'+
      '<div class="cardTitle"><h3>'+htmlEsc(p.name)+'</h3><strong>'+fmt(p.price)+'</strong></div>'+
      '<p>'+htmlEsc(m.headline)+'. '+htmlEsc(p.description)+'</p>'+
      '<div class="merchColorHeader"><span>اختار الشكل واللون</span><strong>'+p.variants.length+' اختيارات</strong></div>'+
      '<div class="cardColors" role="group" aria-label="ألوان '+htmlEsc(p.name)+'">'+thumbs+'</div>'+
      '<div class="cardVariantInfo"><span class="variantSummary">'+htmlEsc(v.code+" — "+v.name)+'</span><span>المقاسات: '+htmlEsc(v.sizes.join("، "))+'</span></div>'+
      '<div class="cardBottom"><span class="includedShipping">السعر شامل الشحن</span><button type="button" data-show-product="'+htmlEsc(id)+'">اختار المقاس واطلب <span aria-hidden="true"><svg class="ssIcon ssIconArrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5M7.5 6.5h10v10"/></svg></span></button></div></div></article>';
  }
  function carProductCard(){
    // Same visual card system as shoes. Cart and order rules remain untouched.
    const p=C.carwash48,v=p.variants[0];
    return '<article class="productCard editorialCard carProductCard" data-product-id="carwash48">'+
     '<div class="cardMedia"><button class="cardMediaClick" type="button" data-show-product="carwash48" aria-label="صور وتفاصيل طقم غسيل السيارات"><img class="mainCardImage" loading="lazy" width="700" height="700" src="'+htmlEsc(photo(v.image))+'" alt="'+htmlEsc(p.name)+'"></button><span class="cardTag">CAR CARE / ESSENTIALS</span><span class="cardIndex">CW48</span><button class="cardQuick" type="button" data-show-product="carwash48" aria-label="فتح المنتج"><svg class="ssIcon ssIconArrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5M7.5 6.5h10v10"/></svg></button></div>'+
     '<div class="cardContent"><div class="cardCategory">CAR CARE <span class="catalog-dot">•</span> طقم لاسلكي ببطاريتين</div>'+
     '<div class="cardTitle"><h3>'+htmlEsc(p.name)+'</h3><strong>'+fmt(p.price)+'</strong></div>'+
     '<p>طقم غسيل سيارات لاسلكي. اعرف تفاصيله وشوف كل المحتويات قبل الطلب.</p>'+
     '<div class="merchColorHeader"><span>محتويات الطقم</span><strong>طقم ببطاريتين</strong></div>'+
     '<div class="cardVariantInfo"><span>بدون مقاسات</span><span>شامل القاهرة والجيزة • شحن المحافظات يُؤكَّد</span></div>'+
     '<div class="cardBottom"><span class="includedShipping">التوصيل حسب المحافظة</span><button type="button" data-show-product="carwash48">تفاصيل المنتج <span aria-hidden="true"><svg class="ssIcon ssIconArrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5M7.5 6.5h10v10"/></svg></span></button></div></div></article>';
  }
  function renderProducts(){
    const list=ids.filter(id=>{
      const p=C[id];
      const matchesFilter=filter==="all"||productCategory(id)===filter;
      const txt=[p.name,p.short,p.description,...p.variants.map(v=>v.name+" "+v.code)].join(" ").toLowerCase();
      return matchesFilter&&(!search||txt.includes(search));
    });
    $("#emptyState").hidden=list.length!==0;
    const shoeCount=list.filter(id=>SHOES.has(id)).length;
    const cards=list.map(id=>SHOES.has(id)?shoeCard(id):carProductCard()).join("");
    $("#productGrid").innerHTML=list.length?'<section class="merchShelf unifiedShelf" aria-label="كل المنتجات"><div class="shoeCardsGrid unifiedCardsGrid">'+cards+'</div></section>':"";
    const count=$("#resultsCount");if(count)count.textContent=String(list.length);
    const subtitle=$("#productsSubtitle");if(subtitle)subtitle.textContent=filter==="shoes"?"اختار اللون والمقاس حسب الموديل.":filter==="car"?"منتجات عناية السيارات بدون مقاسات.":"كل المنتجات في نفس تصميم الكروت؛ التفاصيل بتختلف حسب المنتج.";
  }
  function applyFilter(next){
    filter=["all","shoes","car"].includes(next)?next:"all";
    $$("[data-filter]").forEach(b=>{
      const active=b.dataset.filter===filter;
      b.classList.toggle("active",active);
      b.setAttribute("aria-pressed",String(active));
    });
    renderProducts();
  }
  function showDialog(id){
    const d=$("#"+id);
    if(!d)return;
    $$("dialog[open]").forEach(other=>{if(other!==d)other.close()});
    if(!d.open)d.showModal();
    document.body.classList.add("hasDialog");
  }
  function closeDialog(id){
    const d=$("#"+id);if(d?.open)d.close();
    if(!$$("dialog[open]").length)document.body.classList.remove("hasDialog");
    if(id==="productDialog"){
      resetDetailVideo();
      const u=new URL(location.href);u.searchParams.delete("product");u.searchParams.delete("variant");
      history.replaceState(null,"",u.pathname+u.search+u.hash);
    }
  }
  function renderDetail(){
    if(!viewed)return;
    const p=C[viewed.productId],v=selectedVariant(p.id,viewed.variantId);
    $("#detailName").textContent=p.name;
    $("#detailSku").textContent=classLabel(p.id)+" / "+v.code;
    $("#detailImage").src=photo(v.image);$("#detailImage").alt=p.name+" "+v.name;
    $("#detailBadge").textContent=p.badge;
    $("#detailPrice").textContent=fmt(p.price);
    $("#detailFooterPrice").textContent=fmt(p.price);
    $("#detailDescription").textContent=p.description;
    resetDetailVideo();
    $("#detailInquiry").href=inquiryHref("أهلاً SELECT SHOP، عندي استفسار عن "+p.name+" — "+v.code+" ("+v.name+").");
    const clip=videoUrl(p,v);
    const videoTile=clip?'<button type="button" class="ssVideoThumb" data-show-video aria-label="عرض فيديو '+htmlEsc(p.name)+'">'+iconPlay+'<span>فيديو</span></button>':"";
    const thumbs=p.variants.map(item=>'<button type="button" data-detail-variant="'+htmlEsc(item.id)+'" class="'+(item.id===v.id?'active':'')+'" aria-pressed="'+(item.id===v.id)+'"><img src="'+htmlEsc(photo(item.image))+'" loading="lazy" alt="'+htmlEsc(item.name)+'"></button>').join("");
    $("#detailGallery").innerHTML=thumbs+videoTile;
    $("#detailVariants").innerHTML=p.variants.map(item=>'<button type="button" data-detail-variant="'+htmlEsc(item.id)+'" class="variantButton '+(item.id===v.id?'active':'')+'" aria-pressed="'+(item.id===v.id)+'"><span>'+htmlEsc(item.code)+'</span><small>'+htmlEsc(item.name)+'</small></button>').join("");
    const isShoe=SHOES.has(p.id);
    $("#sizeStep").hidden=!isShoe;
    $("#purchaseRoleStep").hidden=!isShoe;
    if(isShoe){
      if(!v.sizes.includes(selectedSize))selectedSize=null;
      if(!v.sizes.includes(secondSize)||selectedSize===secondSize)secondSize=null;
      $("#detailSizes").innerHTML=v.sizes.map(n=>'<button type="button" class="sizeButton '+(selectedSize===n?'active':'')+'" data-size="'+n+'" aria-pressed="'+(selectedSize===n)+'">'+n+'</button>').join("");
      $("#detailSecondSizes").innerHTML=v.sizes.filter(n=>n!==selectedSize).map(n=>'<button type="button" class="sizeButton '+(secondSize===n?'active':'')+'" data-second-size="'+n+'" aria-pressed="'+(secondSize===n)+'">'+n+'</button>').join("");
      $("#secondSizeWrap").hidden=!$("#trySecondSize").checked;
      const trialRadio=$('[name="purchaseRole"][value="trial"]');
      trialRadio.disabled=!purchasedShoes();
      if(trialRadio.disabled) $('[name="purchaseRole"][value="purchase"]').checked=true;
    }
    $("#detailMessage").textContent=isShoe?"المقاسات حسب اللون المختار. تجربة مقاسين لنفس الموديل تُحسب زوجًا واحدًا عند الاحتفاظ بمقاس واحد.":"السعر 999 جنيه شامل توصيل القاهرة والجيزة. لباقي المحافظات يتم تأكيد تكلفة الشحن قبل الاتفاق النهائي.";
  }
  function openDetail(id,variantId=null){
    if(!C[id])return;
    const v=selectedVariant(id,variantId||cardVariant[id]);
    viewed={productId:id,variantId:v.id};
    selectedSize=null;secondSize=null;
    $("#trySecondSize").checked=false;
    $('[name="purchaseRole"][value="purchase"]').checked=true;
    renderDetail();
    const u=new URL(location.href);u.searchParams.set("product",id);u.searchParams.set("variant",v.id);
    history.replaceState(null,"",u.pathname+u.search+u.hash);
    showDialog("productDialog");
    trackView(C[id],v);
  }
  function addSelection(){
    if(!viewed)return;
    const p=C[viewed.productId],v=selectedVariant(p.id,viewed.variantId),isShoe=SHOES.has(p.id);
    if(isShoe && !v.sizes.includes(selectedSize)){showToast("اختار المقاس الأول قبل إضافة المنتج");return}
    const trialSize=isShoe&&$("#trySecondSize").checked;
    if(trialSize && (!secondSize||secondSize===selectedSize)){showToast("اختار المقاس الثاني للتجربة");return}
    let role=isShoe&&$('[name="purchaseRole"]:checked')?.value==="trial"?"trial":"purchase";
    if(role==="trial"&&!purchasedShoes())role="purchase";
    const sizes=isShoe?(trialSize?[selectedSize,secondSize]:[selectedSize]):[];
    const exists=cart.find(i=>sameCartSelection(i,p.id,v.id,sizes,role));
    if(exists){showToast("الاختيار ده موجود بالفعل في السلة");closeDialog("productDialog");openCart();return}
    const item={id:makeId(),productId:p.id,variantId:v.id,sizes,role};
    cart.push(item);
    persist();
    if(!testMode){window.SELECT_SHOP_META?.add(p,v,item,role==="trial"?0:p.price);
      ga("add_to_cart",{value:role==="trial"?0:p.price,items:[{item_id:v.id,item_name:p.name,price:role==="trial"?0:p.price,quantity:1}]});}
    closeDialog("productDialog");
    openCart();
    showToast("اتضاف للسلة");
  }
  function cartRow(i){
    const p=C[i.productId],v=selectedVariant(p.id,i.variantId),isShoe=SHOES.has(p.id);
    const editable=isShoe&&purchasedShoes()>0;
    return '<article class="cartItem" data-cart-id="'+htmlEsc(i.id)+'"><img src="'+htmlEsc(photo(v.image))+'" alt="'+htmlEsc(p.name)+'"><div><small>'+htmlEsc(v.code+" / "+v.name)+'</small><strong>'+htmlEsc(p.name)+'</strong>'+
      '<span>'+htmlEsc(isShoe?"مقاس "+i.sizes.join(" و ")+" "+(i.sizes.length===2?"(للتجربة)":""):"الطقم ببطاريتين")+'</span>'+
      (isShoe?'<div class="cartRole"><label>نوع الاختيار <select data-cart-role="'+htmlEsc(i.id)+'" '+(!editable?'disabled':'')+'><option value="purchase" '+(i.role==="purchase"?"selected":"")+'>شراء / استلام</option><option value="trial" '+(i.role==="trial"?"selected":"")+'>تجربة فقط</option></select></label></div>':'')+
      '</div><div class="cartItemPrice"><b>'+(i.role==="trial"?"غير محسوب":fmt(p.price))+'</b><button type="button" data-remove="'+htmlEsc(i.id)+'" aria-label="إزالة المنتج">حذف ×</button></div></article>';
  }
  function renderCart(){
    const container=$("#cartItems"),t=totals();
    if(!cart.length){
      container.innerHTML='<div class="cartEmpty"><span>⌑</span><h3>السلة مستنية اختياراتك</h3><p>اتفرج على المنتجات واختار اللون والمقاس قبل ما نجهز الطلب.</p></div>';
      $("#cartMath").innerHTML="";
      $("#cartPolicy").textContent="";
      $("#goCheckout").disabled=true;
    }else{
      $("#goCheckout").disabled=false;
      container.innerHTML=cart.map(cartRow).join("");
      $("#cartMath").innerHTML='<div><span>إجمالي المنتجات المطلوبة</span><strong>'+fmt(t.subtotal)+'</strong></div><div class="discount"><span>خصم الزوج الإضافي (أحذية فقط)</span><strong>− '+fmt(t.discount)+'</strong></div><div class="cartGrand"><span>الإجمالي المتوقع</span><strong>'+fmt(t.total)+'</strong></div>';
      $("#cartPolicy").textContent=[
        t.trials?"فيه "+t.trials+" اختيار للتجربة مش داخل في الإجمالي.":"",
        t.shoes>1?"كل زوج أحذية إضافي عليه خصم ٨٠ جنيه؛ المبلغ لا يشمل أي تغيرات تؤكدها خدمة العملاء.":"",
        t.car?"منتج غسيل السيارات: السعر شامل شحن القاهرة والجيزة؛ المحافظات الأخرى يتم تأكيد تكلفة شحنها قبل الاتفاق.":"",
        "اختيار مقاسين لنفس الموديل يُحسب كزوج واحد عند الاحتفاظ بزوج واحد."
      ].filter(Boolean).join(" ");
    }
    persist();
  }
  function openCart(){renderCart();showDialog("cartDialog")}
  function removeCartItem(id){cart=cart.filter(x=>x.id!==id);persist();renderCart();}
  function changeCartRole(id,role){
    const item=cart.find(x=>x.id===id);
    if(!item||!SHOES.has(item.productId)||!["purchase","trial"].includes(role))return;
    if(role==="trial"&&purchasedShoes()<=1&&item.role==="purchase"){showToast("لازم يكون فيه زوج أساسي مدفوع في السلة");renderCart();return}
    item.role=role;persist();renderCart();
  }
  const quoteNeeded=region=>cart.some(i=>i.productId==="carwash48"&&i.role!=="trial") && region!=="القاهرة"&&region!=="الجيزة";
  function updateShippingNotice(){
    const t=totals(),region=$('#checkoutForm [name="region"]').value;
    const quote=quoteNeeded(region);
    const summary=$("#checkoutSummary");
    summary.textContent="الإجمالي "+(quote?"قبل إضافة شحن مسدس الغسيل: ":"شامل التوصيل: ")+fmt(t.total)+
      (quote?" — تكلفة شحن طقم الغسيل لمحافظتك يتم تأكيدها معاك على واتساب قبل الاتفاق النهائي.":" — معاينة عند الاستلام والدفع بعد المعاينة.");
    summary.classList.toggle("shipping-warning",quote);
  }
  function beginCheckout(){
    if(!cart.length)return;
    closeDialog("cartDialog");$("#formError").hidden=true;
    $("#messagePreview").hidden=true;
    updateShippingNotice();
    if(!testMode){
      window.SELECT_SHOP_META?.checkout(cartItemsForMeta(),totals().total);
      ga("begin_checkout",{value:totals().total});
    }
    showDialog("checkoutDialog");
  }
  const normalizePhone=val=>val.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s\-()]/g,"");
  const orderReference=()=>("SS-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)).toUpperCase();
  function textOrder(data,id){
    const t=totals(),quote=quoteNeeded(data.region);
    const lines=["طلب جديد — SELECT SHOP","رقم الطلب: "+id,"",...cart.map((item,i)=>{
      const p=C[item.productId],v=selectedVariant(p.id,item.variantId);
      return (i+1)+") "+p.name+" — "+v.code+" ("+v.name+")"+
        (item.sizes.length?" — مقاس: "+item.sizes.join(" / ")+(item.sizes.length===2?" (تجربة مقاسين لنفس الزوج)":""):" — الطقم ببطاريتين")+
        " — "+(item.role==="trial"?"اختيار للتجربة فقط؛ السعر يتأكد لو احتفظت بيه":fmt(p.price));
    }),"","إجمالي المنتجات: "+fmt(t.subtotal),
      "خصم الزوج الإضافي: "+fmt(t.discount),
      (quote?"الإجمالي قبل تحديد شحن طقم الغسيل: ":"الإجمالي شامل التوصيل: ")+fmt(t.total)];
    if(quote)lines.push("مهم: تكلفة شحن مسدس الغسيل للمحافظة المذكورة تتأكد قبل اعتماد الطلب.");
    else if(t.car)lines.push("شحن مسدس الغسيل مشمول للقاهرة والجيزة.");
    lines.push("","الاسم: "+data.name.trim(),"الموبايل: "+data.phone,
      "المحافظة: "+data.region,"المنطقة: "+data.area.trim(),
      "العنوان: "+data.address.trim(),"ملاحظات: "+(data.notes?.trim()||"لا يوجد"),
      "","المعاينة قبل الدفع. الرجاء تأكيد الطلب والتوصيل.");
    return lines.join("\n");
  }
  let submitting=false;
  function submitLive(event){
    event.preventDefault();if(submitting)return;
    if(!cart.length){$("#formError").textContent="السلة فارغة";$("#formError").hidden=false;return}
    const form=event.currentTarget,d=Object.fromEntries(new FormData(form));
    d.phone=normalizePhone(String(d.phone||""));
    const validPhone=/^(?:\+?20|0)1[0125][0-9]{8}$/.test(d.phone);
    if(String(d.name||"").trim().length<3||!validPhone||!d.region||
       !String(d.area||"").trim()||!String(d.address||"").trim()){
      $("#formError").hidden=false;
      $("#formError").textContent="راجع الاسم ورقم الموبايل المصري والمحافظة والمنطقة والعنوان.";
      return;
    }
    $("#formError").hidden=true;
    const orderId=orderReference(),t=totals(),message=textOrder(d,orderId);
    const target="https://wa.me/"+PHONE+"?text="+encodeURIComponent(message);
    const fallback=$("#whatsappFallback");fallback.href=target;fallback.hidden=false;
    if(testMode){
      $("#orderPreviewText").textContent=message;
      $("#messagePreview").hidden=false;$("#messagePreview").scrollIntoView({block:"nearest"});
      showToast("وضع الاختبار: تم تجهيز نص الطلب، بدون إرسال أو تتبع");
      return;
    }
    submitting=true;
    const lineItems=cartItemsForMeta();
    const order={orderId,items:lineItems,totals:{total:t.total}};
    try{localStorage.setItem("selectShopLastOrderV2",JSON.stringify({
      orderId,createdAt:new Date().toISOString(),status:"whatsapp-prepared",
      items:lineItems.map(x=>({productId:x.productId,variantId:x.variantId,role:x.role,sizes:x.sizes}))
    }))}catch{}
    try{void Promise.resolve(window.SELECT_SHOP_META?.finish(order,{}))
      .catch(e=>console.warn("Meta lead queue unavailable",e))}catch{}
    ga("whatsapp_click",{value:t.total,order_id:orderId,items:lineItems.length});
    try{window.location.assign(target)}
    catch(error){
      submitting=false;
      $("#formError").textContent="تعذّر فتح واتساب تلقائيًا؛ اضغط رابط واتساب الظاهر تحت النموذج.";
      $("#formError").hidden=false;showToast("افتح رابط واتساب أسفل بيانات الطلب");
    }
  }
  window.addEventListener("pageshow",()=>submitting=false);
  window.addEventListener("focus",()=>submitting=false);
  function bind(){
    $$("[data-filter]").forEach(b=>b.addEventListener("click",()=>{
      applyFilter(b.dataset.filter);
      if(!b.classList.contains("tab"))$("#products").scrollIntoView({behavior:"smooth"});
    }));
    $("#searchInput").addEventListener("input",e=>{search=e.target.value.trim().toLowerCase();renderProducts()});
    $$("[data-feature-product]").forEach(button=>button.addEventListener("click",e=>{e.preventDefault();openDetail(button.dataset.featureProduct)}));
    $("#openSearch").addEventListener("click",()=>{
      $("#products").scrollIntoView({behavior:"smooth"});
      $("#searchInput").focus({preventScroll:true});
    });
    $("#resetFilters").addEventListener("click",()=>{search="";$("#searchInput").value="";applyFilter("all")});
    $$("[data-open-cart]").forEach(b=>b.addEventListener("click",openCart));
    $$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
    $$("dialog").forEach(d=>{
      d.addEventListener("click",e=>{if(e.target===d)closeDialog(d.id)});
      d.addEventListener("close",()=>{if(!$$("dialog[open]").length)document.body.classList.remove("hasDialog")});
    });
    $("#productGrid").addEventListener("click",e=>{
      const show=e.target.closest("[data-show-product]");
      if(show){openDetail(show.dataset.showProduct);return}
      const color=e.target.closest("[data-color]");
      if(color){
        const [id,variantId]=color.dataset.color.split("|");
        cardVariant[id]=variantId;
        trackView(C[id],selectedVariant(id,variantId));
        // Update only this card; don't discard focus or reset the whole product grid.
        const card=color.closest(".productCard"),v=selectedVariant(id,variantId);
        if(!card||!v)return;
        $(".mainCardImage",card).src=photo(v.image);
        $(".mainCardImage",card).alt=C[id].name+" "+v.name;
        $(".variantSummary",card).textContent=v.code+" · "+v.name;
        const sizeHint=$(".cardVariantInfo > span:last-child",card);if(sizeHint)sizeHint.textContent="المقاسات: "+v.sizes.join("، ");
        $$(".colorMini",card).forEach(btn=>{const on=btn===color;btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on))});
      }
    });
    $("#detailGallery").addEventListener("click",e=>{
      if(e.target.closest("[data-show-video]")){showDetailVideo();return}
      onDetailVariant(e);
    });
    $("[data-whatsapp-inquiry]").forEach(link=>link.addEventListener("click",e=>{
      if(testMode){e.preventDefault();showToast("وضع الاختبار: تم تعطيل فتح واتساب");return}
      ga("whatsapp_inquiry_click",{location:link.dataset.whatsappInquiry||"general",
        item_id:link.dataset.whatsappInquiry==="product"&&viewed?selectedVariant(viewed.productId,viewed.variantId).id:"general"});
    }));
    $("#detailVariants").addEventListener("click",onDetailVariant);
    $("#detailSizes").addEventListener("click",e=>{
      const b=e.target.closest("[data-size]");if(!b)return;
      selectedSize=Number(b.dataset.size);
      if(secondSize===selectedSize)secondSize=null;
      renderDetail();
    });
    $("#detailSecondSizes").addEventListener("click",e=>{
      const b=e.target.closest("[data-second-size]");if(!b)return;
      secondSize=Number(b.dataset.secondSize);
      renderDetail();
    });
    $("#trySecondSize").addEventListener("change",e=>{if(!e.target.checked)secondSize=null;renderDetail()});
    $("#addToCart").addEventListener("click",addSelection);
    $("#cartItems").addEventListener("click",e=>{
      const b=e.target.closest("[data-remove]");if(b)removeCartItem(b.dataset.remove);
    });
    $("#cartItems").addEventListener("change",e=>{
      const b=e.target.closest("[data-cart-role]");if(b)changeCartRole(b.dataset.cartRole,b.value);
    });
    $("#goCheckout").addEventListener("click",beginCheckout);
    $('#checkoutForm [name="region"]').addEventListener("change",updateShippingNotice);
    $("#checkoutForm").addEventListener("submit",submitLive);
    $("#copyOrder").addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText($("#orderPreviewText").textContent);showToast("تم نسخ رسالة المعاينة")}catch{showToast("تعذر النسخ تلقائيًا؛ يمكنك تحديد النص ونسخه يدويًا")}
    });
  }
  function onDetailVariant(e){
    const b=e.target.closest("[data-detail-variant]");if(!b||!viewed)return;
    viewed.variantId=b.dataset.detailVariant;
    const pv=C[viewed.productId];trackView(pv,selectedVariant(pv.id,viewed.variantId));
    selectedSize=null;secondSize=null;
    $("#trySecondSize").checked=false;
    renderDetail();
    const u=new URL(location.href);u.searchParams.set("variant",viewed.variantId);
    history.replaceState(null,"",u.pathname+u.search+u.hash);
  }
  $$("[data-price-product]").forEach(el=>{const product=C[el.dataset.priceProduct];if(product)el.textContent=fmt(product.price)});
  persist();bind();applyFilter("all");
  const route=new URLSearchParams(location.search);
  if(C[route.get("product")])openDetail(route.get("product"),route.get("variant"));
  window.SELECT_SHOP_FOUNDATION_TEST=Object.freeze({
    totals:()=>({...totals()}),
    catalog:()=>ids.map(id=>({id,name:C[id].name,price:C[id].price,variants:C[id].variants.length})),
    mode:testMode?"owner-test":"live",source:"V2-live"
  });
})();