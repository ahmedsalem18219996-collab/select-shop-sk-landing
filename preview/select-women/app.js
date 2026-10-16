/* SELECT SHOP / WOMENSWEAR EDIT
 * Standalone design laboratory. No checkout, payments, Meta Pixel, Supabase or user data.
 * Replace DEMO_PRODUCTS imagery and metadata after supplier photos and verified sizes/prices arrive.
 */
(() => {
"use strict";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const el=(name,cls,text)=>{const n=document.createElement(name);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const fmtCat={jackets:"جاكيتات",hoodies:"هوديات",dresses:"فساتين",sets:"أطقم",tops:"بلوزات",bottoms:"بناطيل"};
const offerIsActive=p=>p.offerEndsAt && Date.now()<new Date(p.offerEndsAt).getTime();
const getPriceText=p=>p.offerEndsAt&&!offerIsActive(p)?"انتهى العرض — السعر قيد التحديث":(p.price ? `${p.price.toLocaleString("ar-EG")} جنيه + مصاريف الشحن`:"السعر بعد التأكيد");
const DEMO_PRODUCTS=Object.freeze([
 {id:"sw-001",code:"SW-001",name:"جاكيت جينز حريمي بأكمام كحلي",category:"jackets",label:"SW-001",
  images:[
   "./media/sw-001-01.webp",
   "./media/sw-001-02.webp",
   "./media/sw-001-03.webp",
   "./media/sw-001-04.webp",
   "./media/sw-001-05.webp",
   "./media/sw-001-06.webp"
  ],
  sizes:[],color:"جينز أزرق × كحلي",
  description:"جاكيت حريمي بتصميم جينز أزرق وأكمام كحلي، ياقة جينز وأزرار وجيوب أمامية. الصور أصلية للقطعة نفسها من عدة زوايا. السعر والمقاسات لسه قيد التأكيد."
 },
 {id:"sw-002",code:"SW-002",name:"هودي كحلي بياقة تريكو بيضاء",category:"hoodies",label:"SW-002",
  images:[
   "./media/sw-002-01-v2.webp",
   "./media/sw-002-02.webp",
   "./media/sw-002-03-v2.webp",
   "./media/sw-002-04-v2.webp",
   "./media/sw-002-05-v2.webp"
  ],
  price:699,shippingIncluded:false,offerEndsAt:"2026-10-19T23:59:59+03:00",
  sizes:[],color:"كحلي × أبيض",
  description:"هودي كحلي بياقة تريكو بيضاء بخط كحلي، بطباعة Artistic Department على الصدر ورقم 83 على الكم. سعر العرض 699 جنيه غير شامل مصاريف الشحن. العرض متاح حتى 19 أكتوبر 2026، والمقاسات لم تُؤكد بعد."
 }
]);
const state={filter:"all",search:"",sort:"curated",liked:new Set(),selected:null,size:null,active:null,previousFocus:null};
let toastTimer;
function label(category){return fmtCat[category]||"ملابس حريمي"}
function notify(message){const t=$("#toast");clearTimeout(toastTimer);t.textContent=message;t.style.display="block";toastTimer=setTimeout(()=>t.style.display="none",3200)}
function emptyMessage(){const n=el("div","empty-state");n.append(el("strong","", "مفيش موديلات مطابقة"),el("span","", "اختاري قسم تاني أو امسحي كلمة البحث."));return n}
function buildCard(p,i){
 const card=el("article","product-card"),media=el("div","product-photo");
 media.tabIndex=0;media.setAttribute("role","button");media.setAttribute("aria-label","فتح تفاصيل "+p.name);
 const img=el("img");img.src=p.images[0];img.alt=p.name+" — صورة المنتج الأصلية";img.width=570;img.height=760;img.loading=i<2?"eager":"lazy";img.decoding="async";
 media.append(img,el("span","mock-badge",offerIsActive(p)?"عرض لفترة محدودة":p.code));
 const fav=el("button","fav-button");fav.type="button";fav.setAttribute("aria-label","أضيفي الموديل للمفضلة التجريبية");fav.setAttribute("aria-pressed",String(state.liked.has(p.id)));
 fav.innerHTML='<svg aria-hidden="true"><use href="#i-heart"/></svg>';
 fav.addEventListener("click",e=>{e.stopPropagation();state.liked.has(p.id)?state.liked.delete(p.id):state.liked.add(p.id);fav.setAttribute("aria-pressed",String(state.liked.has(p.id)));notify(state.liked.has(p.id)?"اتضاف للمفضلة التجريبية":"اتشال من المفضلة")});
 media.append(fav);media.addEventListener("click",e=>{if(!e.target.closest("button"))showProduct(p.id)});
 media.addEventListener("keydown",e=>{if(e.target===media&&(e.key==="Enter"||e.key===" ")){e.preventDefault();showProduct(p.id)}});
 card.append(media,el("h3","product-title",p.name),el("p","product-subtitle",p.code+" · "+p.color));
 const price=el("p","product-price");price.append(el("strong","",getPriceText(p)));card.append(price);
 if(offerIsActive(p))card.append(el("p","offer-end","عرض SW-002 حتى 19 أكتوبر 2026 · من غير سعر قديم مفترض"));
 const btn=el("button","view-product","تفاصيل الموديل ←");btn.type="button";btn.addEventListener("click",()=>showProduct(p.id));card.append(btn);
 return card
}
function render(){
 const grid=$("#productsGrid");grid.replaceChildren();
 let rows=DEMO_PRODUCTS.filter(p=>(state.filter==="all"||state.filter===p.category)&&(!state.search||(p.name+" "+label(p.category)).toLocaleLowerCase("ar").includes(state.search.toLocaleLowerCase("ar"))));
 if(state.sort==="name")rows=rows.slice().sort((a,b)=>a.name.localeCompare(b.name,"ar"));
 rows.forEach((p,i)=>grid.append(buildCard(p,i)));
 if(!rows.length)grid.append(emptyMessage());
 $("#resultCount").textContent=rows.length+" موديلات للمعاينة";
 $$(".filter-btn").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.filter===state.filter)));
}
function toShop(){$("#shop").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"})}
function setCategory(v){state.filter=fmtCat[v]||v==="all"?v:"all";state.search="";$("#searchInput").value="";render();$("#menuPanel").hidden=true;$("#menuOpen").setAttribute("aria-expanded","false");toShop()}
$$("[data-category]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();setCategory(a.dataset.category)}));
$$("[data-filter]").forEach(b=>b.addEventListener("click",()=>setCategory(b.dataset.filter)));
$("#sortProducts").onchange=e=>{state.sort=e.target.value;render()};
function activate(selector,focusTarget){
 state.previousFocus=document.activeElement;
 closeAll(false);
 const panel=$(selector);panel.classList.add("is-open");panel.setAttribute("aria-hidden","false");
 if(selector!=="#searchSheet")$("#backdrop").classList.add("is-open");else $("#backdrop").classList.add("is-open");
 state.active=selector;
 document.body.classList.add("dialog-open");
 setTimeout(()=>panel.querySelector(focusTarget||"button,input")?.focus(),0);
}
function closeAll(restore=true){
 for(const sel of ["#productDrawer","#cartDrawer","#searchSheet"]){const p=$(sel);p.classList.remove("is-open");p.setAttribute("aria-hidden","true")}
 $("#backdrop").classList.remove("is-open");document.body.classList.remove("dialog-open");
 state.active=null;if(restore)state.previousFocus?.focus?.()
}
$("#backdrop").onclick=()=>closeAll();
$$("[data-close]").forEach(b=>b.onclick=()=>closeAll());
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){closeAll();$("#menuPanel").hidden=true;$("#menuOpen").setAttribute("aria-expanded","false")}
 if(e.key==="Tab"&&state.active){
 const items=[...$(state.active).querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],select:not([disabled])')].filter(n=>n.getClientRects().length);
 if(!items.length)return;
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
function showProduct(id){
 const p=DEMO_PRODUCTS.find(p=>p.id===id);if(!p)return;
 state.selected=p;state.size=null;
 $("#detailTitle").textContent=p.name;
 $("#detailDescription").textContent=p.code+" · "+p.description;
 $("#detailPrice").textContent=getPriceText(p);
 $("#detailOffer").hidden=!offerIsActive(p);
 const imgs=$("#detailImages");imgs.replaceChildren();
 for(const src of p.images){const img=el("img");img.src=src;img.alt=p.name+" — صورة أصلية للمنتج";img.width=430;img.height=550;img.loading="lazy";imgs.append(img)}
 const sizes=$("#detailSizes");sizes.replaceChildren();
 if(!p.sizes.length){sizes.append(el("p","detail-meta","المقاسات لسه قيد التأكيد من المورد."));}
 for(const val of p.sizes){
 const b=el("button","",val);b.type="button";b.setAttribute("aria-pressed","false");
 b.addEventListener("click",()=>{state.size=val;sizes.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))});
 sizes.append(b);
 }
 activate("#productDrawer","[data-close]");
}
$("#demoOrder").onclick=()=>{
 if(!state.selected?.sizes?.length){notify("المقاسات غير مؤكدة — الطلبات غير مفعلة في النسخة التجريبية.");return}
 if(!state.size){notify("اختاري مقاسًا تجريبيًا الأول");return}
 notify("الطلبات الحقيقية متوقفة في النسخة التجريبية — هنفتحها بعد رفع الصور والمقاسات والأسعار المؤكدة");
};
$("#cartOpen").onclick=()=>activate("#cartDrawer","[data-close]");
$("#mobileCart").onclick=()=>activate("#cartDrawer","[data-close]");
$("#cartInfo").onclick=()=>notify("مفيش أوردرات أو بيانات عملاء بتتسجل في نسخة SELECT WOMEN التجريبية");
$("#searchOpen").onclick=()=>activate("#searchSheet","#searchInput");
$("#searchForm").addEventListener("submit",e=>{e.preventDefault();state.search=$("#searchInput").value.trim();state.filter="all";closeAll();render();toShop()});
$("#menuOpen").onclick=()=>{const p=$("#menuPanel");p.hidden=!p.hidden;$("#menuOpen").setAttribute("aria-expanded",String(!p.hidden))};
$("#mobileHome").onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
$("#mobileProducts").onclick=toShop;
function syncLimitedOffer(){
 const limited=DEMO_PRODUCTS.find(p=>p.id==="sw-002");
 if(!limited)return;
 const active=offerIsActive(limited);
 $("#sw002TilePrice").textContent=active?"SW-002 · 699 جنيه + الشحن ←":"SW-002 · فترة العرض انتهت ←";
 if(state.selected?.id==="sw-002"){
   $("#detailPrice").textContent=getPriceText(limited);
   $("#detailOffer").hidden=!active;
 }
 render();
}
syncLimitedOffer();
const expiry=new Date("2026-10-19T23:59:59+03:00").getTime();
const waiting=expiry-Date.now();
if(waiting>0) setTimeout(syncLimitedOffer,waiting+1000);
const requested=new URLSearchParams(window.location.search).get("product");
if(requested && DEMO_PRODUCTS.some(p=>p.id===requested))showProduct(requested);
})();
