// ===== SELECT SHOP V8 CONFIG =====
// WhatsApp international format without +, spaces or dashes. Example: 2010XXXXXXXX
const WHATSAPP_NUMBER = "201289437444";
const META_PIXEL_ID = "";

const PRICE_SINGLE = 680;
const PRICE_DOUBLE = 1280;

const PRODUCTS = {
  "SK-1": { product:"SK-1", name:"أبيض × وردي", image:"assets/sk-1.jpg" },
  "SK-2": { product:"SK-2", name:"أسود × أزرق", image:"assets/sk-2.jpg" },
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  bundle: false, // true = two paid pairs for 1280
  pairs: [
    {...PRODUCTS["SK-1"], size:""},
    {...PRODUCTS["SK-2"], size:""},
  ],
  singleSizes: [], // one size, or two trial sizes for one paid pair
  dualSize: false,
};

const heroImage = $("#heroImage");
const stage = $("#stage");
const heroMedia = $("#heroMedia");
const sheet = $("#orderSheet");
const backdrop = $("#sheetBackdrop");
const toast = $("#toast");
const dock = $("#mobileDock");

function price(){ return state.bundle ? PRICE_DOUBLE : PRICE_SINGLE; }
function priceLabel(){ return `${price()} جنيه شامل الشحن`; }
function softHaptic(ms=14){ try{ navigator.vibrate?.(ms); }catch{} }
function toastMsg(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastMsg.t);
  toastMsg.t = setTimeout(() => toast.classList.remove("show"), 3000);
}
function track(name,params={}){ if(typeof window.fbq === "function") window.fbq("track",name,params); }
function pair(n){ return state.pairs[n-1]; }
function singlePair(){ return state.pairs[0]; }
function singleSizesText(){
  if(!state.singleSizes.length) return "اختاري المقاس";
  if(state.singleSizes.length === 1) return `مقاس ${state.singleSizes[0]}`;
  return `تجربة ${state.singleSizes.join(" + ")}`;
}
function pairSummary(n){
  const p=pair(n);
  return `${p.product} • ${p.size ? `مقاس ${p.size}` : "اختاري المقاس"}`;
}
function orderReady(){
  if(state.bundle) return Boolean(pair(1).size && pair(2).size);
  if(state.dualSize) return state.singleSizes.length === 2;
  return state.singleSizes.length === 1;
}

function sync(){
  document.body.classList.toggle("bundle-mode", state.bundle);
  document.body.classList.toggle("dual-mode", state.dualSize && !state.bundle);

  const p1=pair(1), p2=pair(2);
  $("#heroCode").textContent = state.bundle ? "2 PAIRS" : p1.product;
  $("#heroColor").textContent = state.bundle ? `${p1.product} + ${p2.product}` : p1.name;

  if(heroImage){ heroImage.src=p1.image; heroImage.alt=`${p1.product} ${p1.name}`; }
  const bundleImgs=$$("#bundlePreview img");
  if(bundleImgs[0]) bundleImgs[0].src=p1.image;
  if(bundleImgs[1]) bundleImgs[1].src=p2.image;

  const orderImage=$("#orderImage"), orderImage2=$("#orderImage2");
  if(orderImage) orderImage.src=p1.image;
  if(orderImage2){ orderImage2.src=p2.image; orderImage2.hidden=!state.bundle; }

  $("#orderCode").textContent = state.bundle ? "عرض زوجين" : p1.product;
  $("#orderColor").textContent = state.bundle ? `${p1.product} + ${p2.product}` : p1.name;
  $("#orderSizeLabel").textContent = state.bundle
    ? `${p1.size ? `مقاس ${p1.size}` : "مقاس —"} + ${p2.size ? `مقاس ${p2.size}` : "مقاس —"}`
    : singleSizesText();
  $("#orderPrice").textContent=price();

  $("#floatPriceValue").textContent=price();
  $("#floatPriceLabel").textContent=state.bundle ? "زوجين • شامل الشحن" : "شامل الشحن";
  $("#heroCtaPrice").textContent=priceLabel();
  $("#finalCtaPrice").textContent=priceLabel();
  $("#finalPriceCopy").textContent=state.bundle
    ? "أي زوجين بـ1280 جنيه شامل الشحن — كل زوج بلونه ومقاسه."
    : "زوج واحد 680 جنيه شامل الشحن — أو ضيفي زوج تاني بـ600 جنيه بس.";
  $("#dockPrice").textContent=`${price()} جنيه`;
  $("#dockChoice").textContent=state.bundle
    ? `زوجين • ${p1.size || "—"} + ${p2.size || "—"}`
    : `${p1.product} • ${singleSizesText()}`;
  $("#submitPriceText").textContent=`تأكيد الطلب — ${price()} جنيه`;

  const submitHint=$("#submitHint");
  if(submitHint){
    submitHint.textContent=state.bundle
      ? "زوجين لأي شخصين • الدفع عند الاستلام"
      : state.dualSize
        ? "مقاسين للتجربة • تستلمي الأنسب"
        : "الدفع عند الاستلام";
  }

  // Main/sheet offer mode buttons.
  $$('[data-mode]').forEach(el=>{
    const active=(el.dataset.mode==='double')===state.bundle;
    el.classList.toggle('active',active);
    el.setAttribute('aria-pressed',String(active));
  });

  // Single product controls.
  $$('[data-product]:not([data-pair-product])').forEach(el=>{
    const active=!state.bundle && el.dataset.product===p1.product;
    el.classList.toggle('active',active);
    el.setAttribute('aria-pressed',String(active));
  });
  $$('[data-size]:not([data-pair-size])').forEach(el=>el.classList.toggle('active',!state.bundle && state.singleSizes.includes(el.dataset.size)));

  // Two-pair controls, duplicated between page and checkout sheet.
  $$('[data-pair-product]').forEach(el=>{
    const p=pair(Number(el.dataset.pairProduct));
    el.classList.toggle('active',state.bundle && p.product===el.dataset.product);
  });
  $$('[data-pair-size]').forEach(el=>{
    const p=pair(Number(el.dataset.pairSize));
    el.classList.toggle('active',state.bundle && p.size===el.dataset.size);
  });

  $$('.dual-size-card').forEach(el=>{
    el.classList.toggle('active',state.dualSize && !state.bundle);
    el.setAttribute('aria-pressed',String(state.dualSize && !state.bundle));
    el.disabled=state.bundle;
  });

  const summaries={
    pair1Summary:pairSummary(1), pair2Summary:pairSummary(2),
    sheetPair1Summary:pairSummary(1), sheetPair2Summary:pairSummary(2),
  };
  Object.entries(summaries).forEach(([id,val])=>{const el=$(`#${id}`);if(el)el.textContent=val});

  document.body.classList.toggle('order-ready',orderReady());
}

function setMode(mode){
  const double=mode==='double';
  if(double===state.bundle){ sync(); return; }
  if(double){
    state.bundle=true;
    state.dualSize=false;
    // Carry an already chosen single size into pair 1 so upsell feels effortless.
    if(state.singleSizes[0]) pair(1).size=state.singleSizes[0];
    // If pair 2 was never configured, default to the other color.
    if(!pair(2).product || pair(2).product===pair(1).product){
      const other=pair(1).product==='SK-1'?'SK-2':'SK-1';
      state.pairs[1]={...PRODUCTS[other],size:pair(2).size||""};
    }
    toastMsg("عرض الزوجين اتفعل: اختاري لون ومقاس كل زوج لوحده — 1280 شامل الشحن.");
    track('AddToCart',{content_name:'SK Sneakers 2-pair offer',value:PRICE_DOUBLE,currency:'EGP'});
  }else{
    state.bundle=false;
    state.singleSizes=pair(1).size ? [pair(1).size] : [];
    state.pairs[0].size="";
    toastMsg("رجعنا لطلب زوج واحد بـ680 شامل الشحن.");
  }
  softHaptic(18); sync(); popPrices();
}
$$('[data-mode]').forEach(el=>el.addEventListener('click',()=>setMode(el.dataset.mode)));

function chooseSingleProduct(el){
  if(!el?.dataset.product) return;
  if(state.bundle) setMode('single');
  state.pairs[0]={...PRODUCTS[el.dataset.product],size:""};
  softHaptic(8);
  stage?.classList.add("switching");
  setTimeout(()=>{sync();stage?.classList.remove("switching")},120);
}
$$('[data-product]:not([data-pair-product])').forEach(el=>el.addEventListener('click',()=>chooseSingleProduct(el)));

function chooseSingleSize(raw){
  const size=String(raw||""); if(!size || state.bundle) return;
  softHaptic(10);
  if(!state.dualSize){ state.singleSizes=[size]; }
  else if(state.singleSizes.includes(size)) state.singleSizes=state.singleSizes.filter(s=>s!==size);
  else if(state.singleSizes.length<2){
    state.singleSizes.push(size); state.singleSizes.sort((a,b)=>Number(a)-Number(b));
    if(state.singleSizes.length===2) toastMsg(`تمام — هنجرب ${state.singleSizes[0]} و${state.singleSizes[1]} لنفس الزوج وتختاري الأنسب.`);
  }else{ toastMsg("اختاري مقاسين بس للتجربة."); softHaptic(22); }
  sync();
}
$$('[data-size]:not([data-pair-size])').forEach(el=>el.addEventListener('click',()=>chooseSingleSize(el.dataset.size)));

function toggleDualSize(){
  if(state.bundle){ toastMsg("في عرض الزوجين اختاري مقاس كل زوج لوحده. تجربة مقاسين متاحة للزوج الواحد فقط."); return; }
  state.dualSize=!state.dualSize;
  if(!state.dualSize && state.singleSizes.length>1) state.singleSizes=[state.singleSizes[0]];
  softHaptic(state.dualSize?18:8);sync();
  toastMsg(state.dualSize?"اختاري مقاسين لنفس الزوج للتجربة عند الاستلام.":"رجعنا لاختيار مقاس واحد.");
}
$("#dualSizeToggle")?.addEventListener("click",toggleDualSize);
$("#dualSizeToggleSheet")?.addEventListener("click",toggleDualSize);

function choosePairProduct(el){
  const n=Number(el.dataset.pairProduct); if(!n) return;
  if(!state.bundle) setMode('double');
  const oldSize=pair(n).size;
  state.pairs[n-1]={...PRODUCTS[el.dataset.product],size:oldSize};
  softHaptic(8); sync();
}
$$('[data-pair-product]').forEach(el=>el.addEventListener('click',()=>choosePairProduct(el)));
function choosePairSize(el){
  const n=Number(el.dataset.pairSize); if(!n) return;
  if(!state.bundle) setMode('double');
  pair(n).size=el.dataset.size;
  softHaptic(10);sync();
  if(pair(1).size && pair(2).size) toastMsg(`جاهز: زوج 1 مقاس ${pair(1).size} + زوج 2 مقاس ${pair(2).size} — 1280 شامل الشحن.`);
}
$$('[data-pair-size]').forEach(el=>el.addEventListener('click',()=>choosePairSize(el)));

// Touch swipe on hero changes pair 1 / single color.
let startX=0,startY=0,deltaX=0,swiping=false;
stage?.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||state.bundle)return;swiping=true;startX=e.clientX;startY=e.clientY;deltaX=0;stage.setPointerCapture?.(e.pointerId)});
stage?.addEventListener('pointermove',e=>{if(!swiping)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>Math.abs(dy)*1.2){deltaX=dx;stage.style.transition='none';stage.style.transform=`translateX(${Math.max(-42,Math.min(42,dx))}px) rotate(${dx*.025}deg)`}});
function endSwipe(){if(!swiping)return;swiping=false;stage.style.transition='';stage.style.transform='';if(Math.abs(deltaX)>44){const target=pair(1).product==='SK-1'?'SK-2':'SK-1';chooseSingleProduct($(`[data-product="${target}"]:not([data-pair-product])`))}deltaX=0}
stage?.addEventListener('pointerup',endSwipe);stage?.addEventListener('pointercancel',endSwipe);

// Subtle desktop parallax only.
if(!reduceMotion&&heroMedia&&stage&&matchMedia('(hover:hover) and (pointer:fine)').matches){let targetX=0,targetY=0,currentX=0,currentY=0;const update=()=>{currentX+=(targetX-currentX)*.08;currentY+=(targetY-currentY)*.08;if(!state.bundle)stage.style.transform=`rotateX(${currentY*-2.4}deg) rotateY(${currentX*3}deg)`;requestAnimationFrame(update)};heroMedia.addEventListener('pointermove',e=>{const r=heroMedia.getBoundingClientRect();targetX=((e.clientX-r.left)/r.width-.5);targetY=((e.clientY-r.top)/r.height-.5)});heroMedia.addEventListener('pointerleave',()=>{targetX=0;targetY=0});requestAnimationFrame(update)}

function openSheet(){
  sync();backdrop.hidden=false;sheet.hidden=false;document.body.style.overflow='hidden';dock?.classList.add('hide');requestAnimationFrame(()=>{backdrop.classList.add('show');sheet.classList.add('show')});
  track('InitiateCheckout',{content_name:state.bundle?'SK Sneakers 2-pair offer':'SK Sneakers',value:price(),currency:'EGP',quantity:state.bundle?2:1});
}
function closeSheet(){backdrop.classList.remove('show');sheet.classList.remove('show');document.body.style.overflow='';dock?.classList.remove('hide');setTimeout(()=>{backdrop.hidden=true;sheet.hidden=true},380)}
$$('[data-open-order]').forEach(b=>b.addEventListener('click',openSheet));$$('[data-close-order]').forEach(b=>b.addEventListener('click',closeSheet));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)closeSheet()});

function cleanPhone(v){return v.replace(/[^0-9]/g,'')}
function validPhone(v){const p=cleanPhone(v);return /^01[0125][0-9]{8}$/.test(p)||/^201[0125][0-9]{8}$/.test(p)}

$("#orderForm")?.addEventListener('submit',async e=>{
  e.preventDefault();
  const error=$("#formError");error.classList.remove('show');
  const name=$("#name").value.trim(),phone=$("#phone").value.trim(),gov=$("#governorate").value,address=$("#address").value.trim(),notes=$("#notes")?.value.trim()||"";

  if(state.bundle){
    if(!pair(1).size||!pair(2).size){error.textContent='اختاري مقاس الزوج الأول والزوج الثاني.';error.classList.add('show');return}
  }else{
    if(!state.singleSizes.length){error.textContent='اختاري المقاس الأول.';error.classList.add('show');return}
    if(state.dualSize&&state.singleSizes.length!==2){error.textContent='اختاري المقاس التاني، أو اقفلي خيار تجربة مقاسين.';error.classList.add('show');return}
  }
  if(!name||!phone||!gov||!address){error.textContent='كمّلي بيانات الاستلام الأول.';error.classList.add('show');return}
  if(!validPhone(phone)){error.textContent='اكتبي رقم موبايل مصري صحيح.';error.classList.add('show');return}

  let orderLines=[];
  if(state.bundle){
    orderLines=[
      'العرض: زوجين بـ1280 جنيه شامل الشحن',
      `الزوج 1: ${pair(1).product} - ${pair(1).name} - مقاس ${pair(1).size}`,
      `الزوج 2: ${pair(2).product} - ${pair(2).name} - مقاس ${pair(2).size}`,
      'التوفير: 80 جنيه (الزوج الثاني محسوب بـ600 فقط)'
    ];
  }else if(state.dualSize){
    orderLines=[
      `المنتج: ${pair(1).product} - ${pair(1).name}`,
      `مقاسات للتجربة لنفس الزوج: ${state.singleSizes.join(' و ')}`,
      'ملاحظة: تجربة مقاسين واستلام الأنسب فقط، حسب التوافر وقت التأكيد.'
    ];
  }else{
    orderLines=[`المنتج: ${pair(1).product} - ${pair(1).name}`,`المقاس: ${state.singleSizes[0]}`];
  }

  const message=[
    'طلب جديد - SELECT SHOP','',...orderLines,`السعر النهائي: ${price()} جنيه شامل الشحن`,'',
    `الاسم: ${name}`,`الموبايل: ${phone}`,`المحافظة: ${gov}`,`العنوان: ${address}`,
    notes?`ملاحظات: ${notes}`:'','',
    'الدفع عند الاستلام - معاينة عند الاستلام'
  ].filter(Boolean).join('\n');

  track('Lead',{content_name:state.bundle?'SK Sneakers 2-pair offer':'SK Sneakers',value:price(),currency:'EGP',quantity:state.bundle?2:1,size_mode:state.bundle?'two-independent-pairs':state.dualSize?'two-size-trial':'single-size'});
  softHaptic(20);
  if(WHATSAPP_NUMBER){
    window.location.href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }else{
    try{await navigator.clipboard.writeText(message);toastMsg('الطلب اتجهز واتنسخ. حط رقم واتسابك في أول script.js عشان الإرسال يبقى مباشر.')}catch{toastMsg('الطلب جاهز. أضف رقم واتسابك في script.js للإرسال المباشر.')}
  }
});

// Reveal / progress
const ro=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');ro.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -20px 0px'});$$('[data-reveal]').forEach(el=>ro.observe(el));
const progress=$("#progress");function onScroll(){const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${max>0?(scrollY/max)*100:0}%`}addEventListener('scroll',onScroll,{passive:true});onScroll();

// CTA tactile response.
$$('.cta,.mobile-dock button,.nav-buy,.submit-order,.mode-card,.smart-upsell,.pair-card button').forEach(btn=>{btn.addEventListener('pointerdown',e=>{const r=btn.getBoundingClientRect();btn.style.setProperty('--tap-x',`${Math.round(((e.clientX-r.left)/r.width)*100)}%`);btn.animate([{transform:'scale(1)'},{transform:'scale(.975)'},{transform:'scale(1)'}],{duration:190,easing:'ease-out'});softHaptic(8)})});

$("#year").textContent=new Date().getFullYear();sync();

if(META_PIXEL_ID){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',META_PIXEL_ID);fbq('track','PageView');fbq('track','ViewContent',{content_name:'SK Sneakers',value:PRICE_SINGLE,currency:'EGP'})}

// ===== Mobile viewport safety + app-like micro interactions =====
const stickyNav=document.querySelector('#stickyNav');
function updateViewportSafe(){const vv=window.visualViewport;let bottom=0;if(vv){bottom=Math.max(0,Math.round(window.innerHeight-(vv.height+vv.offsetTop)));if(bottom>180)bottom=0}document.documentElement.style.setProperty('--vv-bottom',`${bottom}px`)}
updateViewportSafe();window.addEventListener('resize',updateViewportSafe,{passive:true});window.visualViewport?.addEventListener('resize',updateViewportSafe,{passive:true});window.visualViewport?.addEventListener('scroll',updateViewportSafe,{passive:true});
function syncStickyNav(){stickyNav?.classList.toggle('scrolled',window.scrollY>20)}window.addEventListener('scroll',syncStickyNav,{passive:true});syncStickyNav();
if(!reduceMotion){window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){document.documentElement.style.setProperty('--pointer-x',`${e.clientX}px`);document.documentElement.style.setProperty('--pointer-y',`${e.clientY}px`)}},{passive:true});heroMedia?.addEventListener('pointermove',e=>{const r=heroMedia.getBoundingClientRect();const x=Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)),y=Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100));heroMedia.style.setProperty('--spot-x',`${x}%`);heroMedia.style.setProperty('--spot-y',`${y}%`)},{passive:true})}
function burstAt(el,color='#a68cff'){if(reduceMotion||!el)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,count=7;for(let i=0;i<count;i++){const dot=document.createElement('i');dot.className='micro-burst';dot.style.setProperty('--burst',color);dot.style.left=`${cx}px`;dot.style.top=`${cy}px`;document.body.appendChild(dot);const a=(Math.PI*2/count)*i+Math.random()*.35,d=18+Math.random()*18;dot.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d}px)) scale(.15)`,opacity:0}],{duration:420+Math.random()*180,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>dot.remove()}}
function pop(el,cls='pick-pop'){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),380)}
function popPrices(){['#floatPriceValue','#heroCtaPrice','#finalCtaPrice','#dockPrice','#orderPrice','#submitPriceText'].forEach(sel=>pop(document.querySelector(sel),'price-pop'))}
$$('[data-product],[data-pair-product]').forEach(el=>el.addEventListener('click',()=>{burstAt(el,el.dataset.product==='SK-2'?'#55a7ff':'#ff79bb');pop(el);setTimeout(popPrices,120)}));
$$('[data-size],[data-pair-size]').forEach(el=>el.addEventListener('click',()=>{burstAt(el,'#77efad');pop(el)}));
$$('[data-mode]').forEach(el=>el.addEventListener('click',()=>{burstAt(el,el.dataset.mode==='double'?'#f5b95f':'#a68cff');pop(el);setTimeout(popPrices,30)}));
$$('[data-open-order]').forEach(el=>el.addEventListener('click',()=>burstAt(el,'#ffffff')));
$$('.quick-jump a').forEach(a=>a.addEventListener('click',()=>{softHaptic(6);document.querySelector(a.getAttribute('href'))?.style.setProperty('scroll-margin-top','108px')}));
