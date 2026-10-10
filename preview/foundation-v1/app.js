/* SELECT SHOP — NEW FOUNDATION V1
   Independent, dependency-free storefront for preview only.
   Never sends a live order or fires analytics. Product data in catalog.js.
   No imports of legacy V20 UI, cart, or analytics engine.
*/
(() => {
  "use strict";
  if (!window.SELECT_SHOP_PREVIEW_ONLY) throw Error("Foundation preview safety guard missing");
  const C = window.SELECT_FOUNDATION_CATALOG;
  const SETTINGS = window.SELECT_FOUNDATION_CONFIG;
  if (!C || !SETTINGS) throw Error("Foundation catalog failed to load");
  const ids = ["sk","alex","eqwal","wk","carwash48"];
  const SHOES = new Set(["sk","alex","eqwal","wk"]);
  const KEY="selectShopFoundationV1:cart"; // separate from all real and legacy carts
  const $ = (q,root=document)=>root.querySelector(q);
  const $$ = (q,root=document)=>Array.from(root.querySelectorAll(q));
  const fmt = n => new Intl.NumberFormat("ar-EG").format(n)+" جنيه";
  const htmlEsc = x => String(x ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const photo = src => /^(https?:\/\/|\/)/.test(src) ? src : "/"+src;
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
    if(!v || v.id!==x.variantId || !Array.isArray(x.sizes) || !["purchase","trial"].includes(x.role))return false;
    if(x.productId==="carwash48")return x.role==="purchase" && x.sizes.length===0;
    return x.sizes.length>=1 && x.sizes.length<=2 && x.sizes.every(n=>v.sizes.includes(Number(n))) && new Set(x.sizes).size===x.sizes.length;
  };
  try {
    const old=JSON.parse(localStorage.getItem(KEY)||"null");
    if(old?.v===1 && Number.isFinite(old?.at) && old.at<=Date.now() && Date.now()-old.at<7*864e5 && Array.isArray(old.items)) {
      cart=old.items.filter(validItem).slice(0,20);
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
      if(cart.length)localStorage.setItem(KEY,JSON.stringify({v:1,at:Date.now(),items:cart}));
      else localStorage.removeItem(KEY);
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
      '<div class="cardMedia"><button class="cardMediaClick" type="button" data-show-product="'+htmlEsc(id)+'" aria-label="استعراض صور وتفاصيل '+htmlEsc(p.name)+'"><img class="mainCardImage" src="'+htmlEsc(photo(v.image))+'" alt="'+htmlEsc(p.name+" "+v.name)+'" loading="lazy" width="700" height="700"></button><span class="cardTag">'+htmlEsc(m.tag)+'</span><span class="cardIndex">'+htmlEsc(v.code)+'</span><button class="cardQuick" type="button" data-show-product="'+htmlEsc(id)+'" aria-label="افتح '+htmlEsc(p.name)+'">↗</button></div>'+
      '<div class="cardContent"><div class="cardCategory">'+htmlEsc(m.use)+' <span class="catalog-dot">•</span> '+htmlEsc(m.detail)+'</div>'+
      '<div class="cardTitle"><h3>'+htmlEsc(p.name)+'</h3><strong>'+fmt(p.price)+'</strong></div>'+
      '<p>'+htmlEsc(m.headline)+'. '+htmlEsc(p.description)+'</p>'+
      '<div class="merchColorHeader"><span>اختار الشكل واللون</span><strong>'+p.variants.length+' اختيارات</strong></div>'+
      '<div class="cardColors" role="group" aria-label="ألوان '+htmlEsc(p.name)+'">'+thumbs+'</div>'+
      '<div class="cardVariantInfo"><span class="variantSummary">'+htmlEsc(v.code+" — "+v.name)+'</span><span>المقاسات: '+htmlEsc(v.sizes.join("، "))+'</span></div>'+
      '<div class="cardBottom"><span class="includedShipping">السعر شامل الشحن</span><button type="button" data-show-product="'+htmlEsc(id)+'">اختار المقاس واطلب <span aria-hidden="true">↗</span></button></div></div></article>';
  }
  function carSpotlight(){
    const p=C.carwash48, v=p.variants[0];
    return '<article class="carSpotlight" data-product-id="carwash48">'+
       '<div class="carSpotlightImage"><span class="carSpotlightIndex">SELECT / CAR CARE</span><button class="carSpotlightImageButton" data-show-product="carwash48" type="button" aria-label="اعرض تفاصيل طقم غسيل السيارات"><img loading="lazy" width="850" height="700" src="'+htmlEsc(photo(v.image))+'" alt="طقم غسيل سيارات لاسلكي ببطاريتين وملحقاته"></button><span class="carSpotlightPhotoNote">صورة الطقم الفعلي المعروض</span></div>'+
       '<div class="carSpotlightBody"><span class="carSpotlightEyebrow">للبيت والعربية / CAR CARE</span><h3>'+htmlEsc(p.name)+'</h3><p class="carSpotlightDescription">طقم لاسلكي ببطاريتين، يسحب المياه من جردل ويخليك تغسل العربية من غير وصلة مياه ثابتة.</p>'+
       '<div class="carSpotlightSpecs"><span><b>02</b> بطاريتين مع الطقم</span><span><b>↗</b> سحب المياه من جردل</span><span><b>✓</b> معاينة قبل الدفع</span></div>'+
       '<div class="carSpotlightPurchase"><div><small>السعر للقاهرة والجيزة شامل الشحن</small><strong>'+fmt(p.price)+'</strong><span>باقي المحافظات: الشحن يتأكد قبل تأكيد الطلب</span></div><button type="button" data-show-product="carwash48">اعرف التفاصيل واطلب <span aria-hidden="true">↗</span></button></div></div></article>';
  }
  function renderProducts(){
    const list=ids.filter(id=>{
      const p=C[id];
      const matchesFilter=filter==="all"||productCategory(id)===filter;
      const txt=[p.name,p.short,p.description,...p.variants.map(v=>v.name+" "+v.code)].join(" ").toLowerCase();
      return matchesFilter&&(!search||txt.includes(search));
    });
    const shoes=list.filter(id=>SHOES.has(id)), cars=list.filter(id=>id==="carwash48");
    $("#emptyState").hidden=list.length!==0;
    const shoeSection=shoes.length?'<section class="merchShelf" aria-label="موديلات الأحذية"><div class="merchShelfHeader"><div><span class="merchShelfEyebrow">FOOTWEAR / THE EDIT</span><h3>اختار ستايلك، وشوف الألوان.</h3></div><span>'+shoes.length+' موديلات بألوان ومقاسات مختلفة</span></div><div class="shoeCardsGrid">'+shoes.map(shoeCard).join("")+'</div></section>':"";
    const carSection=cars.length?'<section class="merchShelf carMerchShelf" aria-label="عناية السيارات"><div class="merchShelfHeader"><div><span class="merchShelfEyebrow">BEYOND FOOTWEAR / CAR CARE</span><h3>حاجة عملية لعربيتك.</h3></div><span>منتج مستقل بشروط شحن واضحة</span></div>'+carSpotlight()+'</section>':"";
    $("#productGrid").innerHTML=shoeSection+carSection;
    const count=$("#resultsCount");if(count)count.textContent=String(list.length);
    const subtitle=$("#productsSubtitle");if(subtitle)subtitle.textContent=filter==="shoes"?"شوف كل موديل، بدّل الألوان، واختار المقاس المتاح للون نفسه.":filter==="car"?"عرض كامل لطقم غسيل السيارات قبل ما تضيفه للسلة.":"الأحذية في مجموعة مستقلة وعناية السيارات في عرض خاص؛ اختار المنتج اللي تحتاجه.";
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
    const thumbs=p.variants.map(item=>'<button type="button" data-detail-variant="'+htmlEsc(item.id)+'" class="'+(item.id===v.id?'active':'')+'" aria-pressed="'+(item.id===v.id)+'"><img src="'+htmlEsc(photo(item.image))+'" loading="lazy" alt="'+htmlEsc(item.name)+'"></button>').join("");
    $("#detailGallery").innerHTML=thumbs;
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
    $("#detailMessage").textContent=isShoe?"المقاسات دي حسب اللون المختار. تجربة مقاسين معناها زوج واحد بس لو استلمت مقاس واحد.":"السعر شامل توصيل القاهرة والجيزة، وخارجهم تكلفة الشحن تتأكد قبل الطلب.";
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
    cart.push({id:makeId(),productId:p.id,variantId:v.id,sizes,role});
    persist();
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
        t.car?"منتج غسيل السيارات: ٩٩٩ جنيه شامل شحن القاهرة والجيزة فقط. أي محافظة أخرى يتم تأكيد تكلفة شحنها قبل الطلب.":"",
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
  function updateShippingNotice(){
    const region=$('#checkoutForm [name="region"]').value;
    const t=totals();
    const carOutside=t.car>0 && !SETTINGS.CAR_INCLUDED_REGIONS.includes(region);
    const msg=carOutside
      ? "⚠️ الشحن خارج القاهرة والجيزة لطقم غسيل السيارات غير محدد. "+fmt(t.total)+" هو مجموع المنتجات بعد الخصم فقط؛ الإجمالي النهائي يحتاج تأكيد تكلفة الشحن قبل إتمام الطلب."
      : "الإجمالي المتوقع: "+fmt(t.total)+(t.car?" — يشمل شحن طقم السيارات داخل القاهرة والجيزة.":" — أسعار الأحذية شاملة الشحن.");
    const summary=$("#checkoutSummary");
    summary.textContent=region?msg:"الإجمالي المتوقع: "+fmt(t.total)+" — اختر المحافظة للتأكد من شروط توصيل المنتج.";
    summary.classList.toggle("shipping-warning",carOutside);
  }
  function previewCheckout(){
    if(!cart.length)return;
    closeDialog("cartDialog");
    $("#messagePreview").hidden=true;
    $("#formError").hidden=true;
    updateShippingNotice();
    showDialog("checkoutDialog");
  }
  const normalizePhone = val=>val.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s\-()]/g,"");
  function textOrder(data){
    const t=totals();
    const lines=["طلب جديد — SELECT SHOP [معاينة فقط]","",...cart.map((item,i)=>{
      const p=C[item.productId],v=selectedVariant(p.id,item.variantId);
      return (i+1)+") "+p.name+" — "+v.code+" ("+v.name+")"+(item.sizes.length?" — مقاس: "+item.sizes.join(" / "):"")+" — "+(item.role==="trial"?"للتجربة فقط، لا يُحسب في الإجمالي":fmt(p.price));
    }),"","إجمالي المنتجات: "+fmt(t.subtotal),"خصم الأحذية الإضافية: "+fmt(t.discount),"الإجمالي المتوقع: "+fmt(t.total)];
    if(t.car&& !SETTINGS.CAR_INCLUDED_REGIONS.includes(data.region))lines.push("تنبيه: شحن منتج العناية بالسيارات للمحافظة المحددة يحتاج تأكيدًا، والإجمالي غير نهائي.");
    lines.push("","الاسم: "+data.name,"الموبايل: "+data.phone,"المحافظة: "+data.region,"المنطقة: "+data.area,"العنوان: "+data.address,"ملاحظات: "+(data.notes||"لا يوجد"),"","طلب للمعاينة فقط — لم يُرسل.");
    return lines.join("\n");
  }
  function submitPreview(event){
    event.preventDefault();
    if(!cart.length){$("#formError").textContent="السلة فارغة";$("#formError").hidden=false;return;}
    const form=event.currentTarget,d=Object.fromEntries(new FormData(form));
    const phone=normalizePhone(String(d.phone||""));
    if(String(d.name||"").trim().length<3||!(/^(?:\+?20|0)1[0125][0-9]{8}$/.test(phone))||!d.region||!String(d.area||"").trim()||!String(d.address||"").trim()){
      $("#formError").hidden=false;
      $("#formError").textContent="راجع الاسم ورقم الموبايل المصري (11 رقمًا يبدأ بـ01) والمحافظة والمنطقة والعنوان.";
      return;
    }
    $("#formError").hidden=true;
    d.phone=phone;
    const result=textOrder(d);
    $("#orderPreviewText").textContent=result;
    $("#messagePreview").hidden=false;
    $("#messagePreview").scrollIntoView({block:"start",behavior:"smooth"});
    // Absolutely no WhatsApp redirect, networking, analytics, or Purchase event.
  }
  function bind(){
    $$("[data-filter]").forEach(b=>b.addEventListener("click",()=>{
      applyFilter(b.dataset.filter);
      if(!b.classList.contains("tab"))$("#products").scrollIntoView({behavior:"smooth"});
    }));
    $("#searchInput").addEventListener("input",e=>{search=e.target.value.trim().toLowerCase();renderProducts()});
    $("[data-feature-product]").forEach(button=>button.addEventListener("click",e=>{e.preventDefault();openDetail(button.dataset.featureProduct)}));
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
        // Update only this card; don't discard focus or reset the whole product grid.
        const card=color.closest(".productCard"),v=selectedVariant(id,variantId);
        if(!card||!v)return;
        $(".mainCardImage",card).src=photo(v.image);
        $(".mainCardImage",card).alt=C[id].name+" "+v.name;
        $(".variantSummary",card).textContent=v.code+" · "+v.name;
        $$(".colorMini",card).forEach(btn=>{const on=btn===color;btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on))});
      }
    });
    $("#detailGallery").addEventListener("click",onDetailVariant);
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
    $("#goCheckout").addEventListener("click",previewCheckout);
    $('#checkoutForm [name="region"]').addEventListener("change",updateShippingNotice);
    $("#checkoutForm").addEventListener("submit",submitPreview);
    $("#copyOrder").addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText($("#orderPreviewText").textContent);showToast("تم نسخ رسالة المعاينة")}catch{showToast("تعذر النسخ تلقائيًا؛ يمكنك تحديد النص ونسخه يدويًا")}
    });
  }
  function onDetailVariant(e){
    const b=e.target.closest("[data-detail-variant]");if(!b||!viewed)return;
    viewed.variantId=b.dataset.detailVariant;
    selectedSize=null;secondSize=null;
    $("#trySecondSize").checked=false;
    renderDetail();
    const u=new URL(location.href);u.searchParams.set("variant",viewed.variantId);
    history.replaceState(null,"",u.pathname+u.search+u.hash);
  }
  $("[data-price-product]").forEach(el=>{const product=C[el.dataset.priceProduct];if(product)el.textContent=fmt(product.price)});
  persist();bind();applyFilter("all");
  const route=new URLSearchParams(location.search);
  if(C[route.get("product")])openDetail(route.get("product"),route.get("variant"));
  window.SELECT_SHOP_FOUNDATION_TEST=Object.freeze({
    totals:()=>({...totals()}),
    catalog:()=>ids.map(id=>({id,name:C[id].name,price:C[id].price,variants:C[id].variants.length})),
    mode:"preview-only"
  });
})();