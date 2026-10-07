const WHATSAPP_NUMBER = '201289437444';
const EXTRA_PAIR_DISCOUNT = 80;
const STORAGE_KEY = 'select_shop_v18_preview_cart';

const PRODUCTS = {
  sk: {
    id:'sk', name:'SK Sneakers', short:'SK', badge:'الأكثر طلبًا', price:680,
    description:'سنيكر خفيف بخامة Mesh مهوّاة ونعل EVA مرن للمشي والشغل والخروج والجيم.',
    variants:[
      {id:'sk1',code:'SK-1',name:'أبيض × وردي',image:'../assets/sk-1.jpg',sizes:[37,38,39,40,41]},
      {id:'sk2',code:'SK-2',name:'أسود × أزرق',image:'../assets/sk-2.jpg',sizes:[37,38,39,40,41]}
    ]
  },
  alex: {
    id:'alex', name:'ALEX Premium', short:'ALEX', badge:'ستايل فاخر', price:540,
    description:'تصميم جلدي بلمسة عصرية، تبطين داخلي ونعل خفيف ومتين للاستخدام اليومي الراقي.',
    variants:[
      {id:'alex01',code:'ALEX01',name:'أسود كامل',image:'../assets/alex01.jpg',sizes:[37,38,39,40,41,42,43,44,45,46]},
      {id:'alex02',code:'ALEX02',name:'أبيض كامل',image:'../assets/alex02.jpg',sizes:[37,38,39,40,41,42,43,44,45,46]},
      {id:'alex03',code:'ALEX03',name:'أسود بنعل أبيض',image:'../assets/alex03.jpg',sizes:[37,38,39,40,41,42,43,44,45,46]},
      {id:'alex04',code:'ALEX04',name:'أبيض بظهر أسود',image:'../assets/alex04.jpg',sizes:[42,43,44,45,46]},
      {id:'alex05',code:'ALEX05',name:'أبيض بلسان أسود',image:'../assets/alex05.jpg',sizes:[37,38,39,40,41,42,43,44,45,46]}
    ]
  },
  eqwal: {
    id:'eqwal', name:'EQWAL Street', short:'EQWAL', badge:'كاجوال يومي', price:580,
    description:'تصميم كاجوال Street بألوان هادئة وسهلة التنسيق، مناسب للخروج والاستخدام اليومي.',
    variants:[
      {id:'eqwal03',code:'EQWAL03',name:'أبيض × بيج',image:'../assets/eqwal03.jpg',sizes:[37,38,39,40,41]},
      {id:'eqwal04',code:'EQWAL04',name:'أبيض بنعل أسود',image:'../assets/eqwal04.jpg',sizes:[41,42,43,44,45]},
      {id:'eqwal05',code:'EQWAL05',name:'أبيض × رمادي بنعل رمادي',image:'../assets/eqwal05.jpg',sizes:[41,42,43,44,45]},
      {id:'eqwal07',code:'EQWAL07',name:'أبيض × بيج بنعل بيج',image:'../assets/eqwal07.jpg',sizes:[41,42,43,44,45]}
    ]
  },
  wk: {
    id:'wk', name:'WK Retro', short:'WK', badge:'8 اختيارات', price:630,
    description:'مجموعة سنيكرز يومية بطابع Retro ورياضي، بتفاصيل لونية ونعل Gum كلاسيكي، مقاسات 37–41.',
    variants:[
      {id:'wk1',code:'WK-1',name:'بوما أبيض كلاسيك',image:'../assets/wk_1.jpg',sizes:[37,38,39,40,41]},
      {id:'wk2',code:'WK-2',name:'بوما أبيض × أسود شمواه',image:'../assets/wk_2.jpg',sizes:[37,38,39,40,41]},
      {id:'wk3',code:'WK-3',name:'توين سترايب أسود',image:'../assets/wk_3.jpg',sizes:[37,38,39,40,41]},
      {id:'wk4',code:'WK-4',name:'توين سترايب أبيض كامل',image:'../assets/wk_4.jpg',sizes:[37,38,39,40,41]},
      {id:'wk5',code:'WK-5',name:'سامبا خطوط نبيتي',image:'../assets/wk_5.jpg',sizes:[37,38,39,40,41]},
      {id:'wk6',code:'WK-6',name:'سامبا خطوط أسود',image:'../assets/wk_6.jpg',sizes:[37,38,39,40,41]},
      {id:'wk7',code:'WK-7',name:'نيو بالانس حرف N أسود',image:'../assets/wk_7.jpg',sizes:[37,38,39,40,41]},
      {id:'wk8',code:'WK-8',name:'نيو بالانس حرف N نبيتي',image:'../assets/wk_8.jpg',sizes:[37,38,39,40,41]}
    ]
  }
};

const PRODUCT_IDS = Object.keys(PRODUCTS);
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const money = n => `${Number(n).toLocaleString('ar-EG')} جنيه`;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;

let currentFamily = 'sk';
let picker = { productId:'sk', variantId:'sk1', size:null, altSize:null };
let cart = loadCart();
let toastTimer;

function loadCart(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(item => PRODUCTS[item.productId] && findVariant(item.productId,item.variantId) && Number(item.size));
  }catch{return []}
}
function saveCart(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }catch{} }
function findVariant(productId, variantId){
  const p = PRODUCTS[productId];
  return p?.variants.find(v=>v.id===variantId) || p?.variants[0];
}
function itemPricing(index, item){
  const p = PRODUCTS[item.productId];
  const before = p.price;
  const discount = index > 0 ? EXTRA_PAIR_DISCOUNT : 0;
  return {before, discount, after:Math.max(0,before-discount)};
}
function totals(){
  const before = cart.reduce((s,item)=>s + PRODUCTS[item.productId].price,0);
  const discount = cart.reduce((s,item,i)=>s + itemPricing(i,item).discount,0);
  return {before,discount,after:before-discount};
}
function showToast(message){
  const el=$('#toast'); el.textContent=message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}

function renderFamilyTabs(){
  $('#familyTabs').innerHTML = PRODUCT_IDS.map(id=>{
    const p=PRODUCTS[id];
    return `<button class="family-tab ${id===currentFamily?'active':''}" data-family="${id}" role="tab" aria-selected="${id===currentFamily}">
      <strong>${p.short}</strong><small>${money(p.price)} · ${p.variants.length} موديل</small>
    </button>`;
  }).join('');
  $$('.family-tab').forEach(btn=>btn.addEventListener('click',()=>setFamily(btn.dataset.family,true)));
}

function setFamily(id, scroll=false){
  if(!PRODUCTS[id]) return;
  currentFamily=id;
  const p=PRODUCTS[id], v=p.variants[0];
  $('#familyBadge').textContent=p.badge;
  $('#familyTitle').textContent = id==='sk' ? 'اختاري الكوتشي اللي يناسب يومك.' : `${p.name} — اختاري ستايلك.`;
  $('#familyDescription').textContent=p.description;
  $('#familyPrice').textContent=money(p.price);
  $('#familyHero').src=v.image;
  $('#familyHero').alt=`${p.name} ${v.code}`;
  renderFamilyTabs();
  renderVariants();
  if(scroll) $('#hero').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderVariants(){
  const p=PRODUCTS[currentFamily];
  $('#modelCount').textContent=`${p.variants.length.toLocaleString('ar-EG')} موديل`;
  $('#variantGrid').innerHTML=p.variants.map(v=>`<article class="variant-card">
    <button class="variant-card-media" data-open-product="${v.id}" aria-label="فتح ${v.code}"><img src="${v.image}" alt="${v.code} ${v.name}" loading="lazy"></button>
    <div class="variant-card-body">
      <div class="variant-card-title"><strong>${v.code}</strong><span>${v.name}</span></div>
      <p>المقاسات: ${v.sizes[0]}–${v.sizes[v.sizes.length-1]}</p>
      <div class="variant-card-price"><strong>${money(p.price)}</strong><span class="eyebrow">شامل الشحن</span></div>
      <button class="open-product" data-open-product="${v.id}" type="button">شوفي المنتج واختاري المقاس</button>
    </div>
  </article>`).join('');
  $$('[data-open-product]').forEach(btn=>btn.addEventListener('click',()=>openProduct(currentFamily,btn.dataset.openProduct)));
}

function openProduct(productId, variantId){
  const p=PRODUCTS[productId] || PRODUCTS.sk;
  const v=findVariant(productId,variantId);
  picker={productId:p.id,variantId:v.id,size:null,altSize:null};
  renderPicker();
  openSheet('product');
}

function renderPicker(){
  const p=PRODUCTS[picker.productId], v=findVariant(p.id,picker.variantId);
  const extra = cart.length>0;
  $('#sheetImage').src=v.image; $('#sheetImage').alt=`${v.code} ${v.name}`;
  $('#sheetFamily').textContent=p.short;
  $('#productSheetTitle').textContent=v.code;
  $('#sheetVariantName').textContent=v.name;
  $('#sheetVariantRail').innerHTML=p.variants.map(x=>`<button class="variant-option ${x.id===v.id?'active':''}" data-picker-variant="${x.id}" type="button"><img src="${x.image}" alt="${x.code}"><span>${x.code}</span></button>`).join('');
  $$('[data-picker-variant]').forEach(btn=>btn.addEventListener('click',()=>{
    picker.variantId=btn.dataset.pickerVariant; picker.size=null; picker.altSize=null; renderPicker();
  }));
  $('#sizeGrid').innerHTML=v.sizes.map(size=>`<button class="size-option ${picker.size===size?'active':''}" data-size="${size}" type="button">${size}</button>`).join('');
  $$('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{
    picker.size=Number(btn.dataset.size);
    if(picker.altSize===picker.size) picker.altSize=null;
    renderPicker();
  }));
  const altToggle=$('#altSizeToggle'); altToggle.disabled=!picker.size;
  $('#altSizePanel').hidden=!picker.size || !$('#altSizePanel').dataset.open;
  $('#altSizeGrid').innerHTML=v.sizes.filter(s=>s!==picker.size).map(size=>`<button class="size-option ${picker.altSize===size?'active':''}" data-alt-size="${size}" type="button">${size}</button>`).join('');
  $$('[data-alt-size]').forEach(btn=>btn.addEventListener('click',()=>{picker.altSize=Number(btn.dataset.altSize);renderPicker();}));
  $('#sizeHelp').textContent=picker.size?`المقاس المختار: ${picker.size}`:'اختاري مقاس واحد';
  const price=extra?p.price-EXTRA_PAIR_DISCOUNT:p.price;
  $('#sheetPrice').textContent=money(price);
  $('#sheetOldPrice').hidden=!extra; $('#sheetDiscountBadge').hidden=!extra;
  if(extra){$('#sheetOldPrice').textContent=money(p.price);$('#sheetDiscountBadge').textContent=`خصم ${EXTRA_PAIR_DISCOUNT} جنيه للزوج الإضافي`;}
  $('#selectionStatus').textContent=picker.size ? `${v.code} · مقاس ${picker.size}${picker.altSize?` + ${picker.altSize} للاختيار`:''}` : 'اختاري المقاس عشان نكمّل';
  $('#addToCartBtn').disabled=!picker.size;
  $('#addToCartBtn').textContent=picker.size ? `أضيفي للسلة — ${money(price)}` : 'اختاري المقاس أولًا';
}

function addPickerToCart(){
  if(!picker.size) return;
  cart.push({id:uid(),productId:picker.productId,variantId:picker.variantId,size:picker.size,altSize:picker.altSize||null});
  saveCart(); updateCartBadges(); closeSheet('product'); renderCart(); openSheet('cart'); showToast('اتضاف للسلة');
}

function renderCart(){
  const empty=cart.length===0;
  $('#cartEmpty').hidden=!empty; $('#cartContent').hidden=empty; $('#cartActions').hidden=empty;
  if(empty){updateCartBadges();return;}
  $('#cartItems').innerHTML=cart.map((item,i)=>{
    const p=PRODUCTS[item.productId],v=findVariant(item.productId,item.variantId),pr=itemPricing(i,item);
    return `<article class="cart-item">
      <img src="${v.image}" alt="${v.code}">
      <div><h3>${v.code} · ${v.name}</h3><p>المقاس: <strong>${item.size}</strong>${item.altSize?` · ومعاه ${item.altSize} للاختيار عند الاستلام`:''}</p>
      <p>${item.altSize?'استلمي المقاس اللي يعجبك بس.':'معاينة قبل الدفع.'}</p>
      <div class="cart-item-price">${pr.discount?`<span class="item-old">${money(pr.before)}</span>`:''}${money(pr.after)}</div></div>
      <button class="remove-item" data-remove="${item.id}" type="button" aria-label="حذف">×</button>
    </article>`;
  }).join('');
  $$('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    cart=cart.filter(x=>x.id!==btn.dataset.remove); saveCart(); renderCart(); updateCartBadges(); showToast('اتحذف من السلة');
  }));
  const t=totals();
  $('#subtotalBefore').textContent=money(t.before);
  $('#discountTotal').textContent=`-${money(t.discount)}`;
  $('#subtotalAfter').textContent=money(t.after);
  $('#savingsMessage').textContent=t.discount?`وفرتي ${money(t.discount)} على الأزواج الإضافية.`:'ضيفي زوج تاني وخدي خصم 80 جنيه عليه.';
  $('#goCheckoutBtn').textContent=`كمّلي بيانات الطلب — ${money(t.after)}`;
  updateCartBadges();
}

function renderCheckout(){
  const t=totals();
  $('#checkoutTotal').textContent=money(t.after);
  $('#checkoutSaving').textContent=t.discount?`وفرتي ${money(t.discount)} من الإجمالي قبل الخصم ${money(t.before)}`:'السعر شامل الشحن';
  $('#submitOrderBtn').textContent=`تأكيد الطلب على واتساب — ${money(t.after)}`;
  $('#finalOrderSummary').innerHTML=`<h3>ملخص الطلب</h3>${cart.map((item,i)=>{
    const p=PRODUCTS[item.productId],v=findVariant(item.productId,item.variantId),pr=itemPricing(i,item);
    return `<p>${i+1}. ${v.code} — مقاس ${item.size}${item.altSize?` / ${item.altSize} للاختيار`:''} — ${money(pr.after)}</p>`;
  }).join('')}<p><strong>قبل الخصم:</strong> ${money(t.before)} · <strong>الخصم:</strong> ${money(t.discount)} · <strong>بعد الخصم:</strong> ${money(t.after)}</p>`;
}

function updateCartBadges(){
  const n=cart.length.toLocaleString('ar-EG');
  $('#cartCount').textContent=n; $('#dockCount').textContent=n;
}

function openSheet(name){
  const map={product:'#productSheet',cart:'#cartSheet',checkout:'#checkoutSheet'};
  const target=$(map[name]); if(!target)return;
  ['product','cart','checkout'].forEach(key=>{const el=$(map[key]);if(el!==target){el.classList.remove('open');el.setAttribute('aria-hidden','true');}});
  $('#overlay').hidden=false; target.classList.add('open'); target.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
}
function closeSheet(name){
  const map={product:'#productSheet',cart:'#cartSheet',checkout:'#checkoutSheet'};
  const el=$(map[name]); if(el){el.classList.remove('open');el.setAttribute('aria-hidden','true');}
  setTimeout(()=>{if(!$('.sheet.open')){$('#overlay').hidden=true;document.body.style.overflow='';}},180);
}
function closeAll(){['product','cart','checkout'].forEach(closeSheet);}

function buildWhatsAppMessage(data){
  const t=totals();
  const orderId=`SS-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const items=cart.map((item,i)=>{
    const p=PRODUCTS[item.productId],v=findVariant(item.productId,item.variantId),pr=itemPricing(i,item);
    return `${i+1}) ${v.code} - ${v.name}\nالمقاس: ${item.size}${item.altSize?`\nمقاس إضافي للاختيار عند الاستلام: ${item.altSize} (العميل يستلم اللي يعجبه فقط)`:''}\nالسعر: ${pr.discount?`${pr.before} → `:''}${pr.after} جنيه`;
  }).join('\n\n');
  return `طلب جديد من SELECT SHOP\nرقم الطلب: ${orderId}\n\n${items}\n\nالإجمالي قبل الخصم: ${t.before} جنيه\nالخصم: ${t.discount} جنيه\nالإجمالي بعد الخصم: ${t.after} جنيه\n\nالاسم: ${data.name}\nالموبايل: ${data.phone}\nالمحافظة: ${data.governorate}\nالمنطقة: ${data.area}\nالعنوان: ${data.address}\n${data.inquiry?`الاستفسار: ${data.inquiry}\n`:''}${data.courierNotes?`ملاحظات للمندوب: ${data.courierNotes}\n`:''}\nالدفع عند الاستلام - معاينة قبل الدفع.`;
}

function validatePhone(value){
  const p=String(value||'').replace(/\s|-/g,'');
  return /^(?:\+?20|0)?1[0125]\d{8}$/.test(p);
}

$('#heroBuyBtn').addEventListener('click',()=>openProduct(currentFamily,PRODUCTS[currentFamily].variants[0].id));
$('#heroMediaBtn').addEventListener('click',()=>openProduct(currentFamily,PRODUCTS[currentFamily].variants[0].id));
$('#dockBuyBtn').addEventListener('click',()=>openProduct(currentFamily,PRODUCTS[currentFamily].variants[0].id));
$('#openCartBtn').addEventListener('click',()=>{renderCart();openSheet('cart')});
$('#dockCartBtn').addEventListener('click',()=>{renderCart();openSheet('cart')});
$('#addToCartBtn').addEventListener('click',addPickerToCart);
$('#altSizeToggle').addEventListener('click',()=>{const panel=$('#altSizePanel');panel.dataset.open=panel.hidden?'1':'';panel.hidden=!panel.hidden;});
$('#clearAltSize').addEventListener('click',()=>{picker.altSize=null;$('#altSizePanel').dataset.open='';renderPicker();});
$('#addAnotherBtn').addEventListener('click',()=>{closeSheet('cart');openProduct(currentFamily,PRODUCTS[currentFamily].variants[0].id);});
$('#continueShoppingBtn').addEventListener('click',()=>closeSheet('cart'));
$('#emptyBrowseBtn').addEventListener('click',()=>closeSheet('cart'));
$('#goCheckoutBtn').addEventListener('click',()=>{if(!cart.length)return;renderCheckout();openSheet('checkout');});
$('#checkoutBackBtn').addEventListener('click',()=>{renderCart();openSheet('cart');});
$('#overlay').addEventListener('click',closeAll);
$$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeSheet(btn.dataset.close)));

$('#checkoutForm').addEventListener('submit',e=>{
  e.preventDefault(); if(!cart.length)return;
  const fd=new FormData(e.currentTarget); const data=Object.fromEntries(fd.entries());
  if(!validatePhone(data.phone)){showToast('راجعي رقم الموبايل');e.currentTarget.elements.phone.focus();return;}
  const message=buildWhatsAppMessage(data);
  window.location.href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
});

function applyDeepLink(){
  const params=new URLSearchParams(location.search); const q=(params.get('product')||'').toLowerCase();
  if(!q)return;
  for(const [pid,p] of Object.entries(PRODUCTS)){
    const v=p.variants.find(x=>x.id===q || x.code.toLowerCase()===q);
    if(v){currentFamily=pid;setFamily(pid,false);setTimeout(()=>openProduct(pid,v.id),150);return;}
  }
  if(PRODUCTS[q]) setFamily(q,false);
}

setFamily('sk',false); renderCart(); updateCartBadges(); applyDeepLink();