/* SELECT SHOP MONO GALLERY UI — design prototype only.
   This file NEVER reads, writes, or invokes customer order / supplier functions.
   Reads a public catalog for household goods; shoe examples are a historical UI
   snapshot from the existing catalog, currently hidden from live checkout. */
(() => {
"use strict";
const RPC="https://zznqdwrohrycsjfpvkhc.supabase.co/rest/v1/rpc/ss_safka_curated_catalog_v1";
const PUBLISHABLE="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const $=s=>document.querySelector(s);
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text??"");return e};
const plain=x=>String(x??"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/\s+/g," ").trim();
const money=x=>new Intl.NumberFormat("ar-EG").format(Number(x)||0)+" جنيه";
const allowedImage=x=>typeof x==="string"&&x.length<1700&&(
 /^\/assets\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(x)||
 /^https:\/\/safka\.fra1\.cdn\.digitaloceanspaces\.com\/media\/products\/[a-zA-Z0-9._-]+$/i.test(x))?x:"";
const shoes=[
 {id:"shoe-sk",type:"shoes",name:"SK Sneakers — سنيكرز حريمي",price:680,images:["/assets/sk-1.jpg","/assets/sk-2.jpg"],description:"سنيكرز SK بخامة Mesh ونعل EVA مرن للاستخدام اليومي. ظاهر هنا كمعاينة تصميمية، وليس تأكيدًا لتوفره الحالي.",sizes:[37,38,39,40,41],variants:[{id:"sk1",name:"أبيض × وردي",image:"/assets/sk-1.jpg"},{id:"sk2",name:"أسود × أزرق",image:"/assets/sk-2.jpg"}],archived:true},
 {id:"shoe-wk",type:"shoes",name:"WK Retro — سنيكرز حريمي",price:630,images:["/assets/wk_1.jpg","/assets/wk_2.jpg","/assets/wk_3.jpg"],description:"مجموعة WK الكاجوال اليومية، مع خيارات متعددة. صور من كتالوج الجزم السابق، والتوفر يحتاج مراجعة قبل أي بيع.",sizes:[37,38,39,40,41],variants:[{id:"wk1",name:"الموديل الأول",image:"/assets/wk_1.jpg"},{id:"wk2",name:"الموديل الثاني",image:"/assets/wk_2.jpg"},{id:"wk3",name:"الموديل الثالث",image:"/assets/wk_3.jpg"}],archived:true},
 {id:"shoe-eqwal",type:"shoes",name:"EQWAL Street — كاجوال",price:580,images:["/assets/eqwal03.jpg","/assets/eqwal04.jpg","/assets/eqwal05.jpg"],description:"حذاء كاجوال بألوان هادئة. المنتج من كتالوج الجزم السابق ويظهر للمعاينة البصرية فقط.",sizes:[37,38,39,40,41,42,43,44,45],variants:[{id:"eqwal03",name:"أبيض × بيج",image:"/assets/eqwal03.jpg"},{id:"eqwal04",name:"أبيض × أسود",image:"/assets/eqwal04.jpg"}],archived:true},
 {id:"shoe-alex",type:"shoes",name:"ALEX Premium — كاجوال رجالي",price:540,images:["/assets/alex01.jpg","/assets/alex02.jpg","/assets/alex03.jpg"],description:"تصميم كاجوال من مجموعة ALEX السابقة. معلومات السعر للمعاينة فقط ولا تمثل توفرًا مضمونًا.",sizes:[41,42,43,44,45],variants:[{id:"alex01",name:"أسود",image:"/assets/alex01.jpg"},{id:"alex02",name:"أبيض",image:"/assets/alex02.jpg"}],archived:true}
];
const state={all:[...shoes],category:"all",search:"",sort:"featured",cart:[],active:null,variant:null,size:null,gallery:0,ready:false,showingModal:false,showingCart:false};
let previousFocus;
function safeHome(p){
 if(!p||typeof p.id!=="string"||!(/^[a-f0-9]{24}$/i).test(p.id))return null;
 if(p.category_name!=="أدوات منزلية"||!Array.isArray(p.images)||!p.images.length)return null;
 const imgs=p.images.map(allowedImage).filter(Boolean);
 if(!imgs.length)return null;
 const vs=(Array.isArray(p.variants)?p.variants:[]).filter(v=>typeof v.id==="string"&&v.available!==false);
 const price=Number(p.display_price_egp);
 if(!Number.isFinite(price)||price<=0)return null;
 return {id:p.id,type:"home",name:plain(p.name),price,images:imgs,description:plain(p.description).slice(0,460),sizes:[],variants:vs.map(v=>({id:v.id,name:plain(v.name)||"النوع المتاح",price:Number(v.display_price_egp)||price})),archived:false};
}
async function loadCatalog(){
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  let resp;
  try{resp=await fetch(RPC,{method:"POST",cache:"no-store",headers:{"content-type":"application/json",apikey:PUBLISHABLE},body:JSON.stringify({p_page:1,p_limit:24,p_category:null,p_search:""}),signal:ctrl.signal})}finally{clearTimeout(timer)}
  if(!resp.ok)throw Error("catalog unavailable "+resp.status);
  const data=await resp.json();if(!Array.isArray(data.items))throw Error("invalid catalog");
  const home=data.items.map(safeHome).filter(Boolean);
  state.all=[...shoes,...home];
  state.ready=true;
  renderGrid();
 }catch(err){
  console.warn("Read-only catalog not available; showing photo-based shoe previews only.",err);
  state.ready=true;
  renderGrid();
  $("#productsSub").textContent="الموديلات المعروضة للمعاينة فقط. تعذر تحميل كتالوج أدوات المنزل في الوقت الحالي.";
 }
}
function goHome(push=true){
 $("#homeView").hidden=false;$("#productView").hidden=true;$("#mobileCta").hidden=true;
 state.active=null;state.size=null;state.variant=null;
 document.title="SELECT SHOP — Mono Gallery | معاينة تصميم";
 if(push)history.pushState({},"","./");
 renderGrid();
}
function navigateProduct(p,push=true){
 if(!p)return;
 state.active=p;state.variant=p.variants?.[0]||null;state.size=null;state.gallery=0;
 $("#homeView").hidden=true;$("#productView").hidden=false;$("#mobileCta").hidden=false;
 const url=new URL(location.href);url.searchParams.set("product",p.id);url.hash="";
 if(push)history.pushState({},"",url.pathname+url.search);
 document.title=p.name+" | SELECT SHOP / Mono Gallery";
 $("#crumbCategory").textContent=p.type==="shoes"?"الجزم والسنيكرز":"الأدوات المنزلية";
 $("#pdpCategory").textContent=p.type==="shoes"?"سنيكرز / معرض الجزم":"أدوات المنزل";
 $("#pdpTitle").textContent=p.name;
 $("#pdpDescription").textContent=p.description||(p.type==="home"?"تفاصيل المنتج كما وصلت من المورد.":"موديل للمعاينة فقط.");
 $("#pdpError").textContent="";
 $("#sizesBox").hidden=p.type!=="shoes";
 $("#variantBox").hidden=!p.variants.length;
 renderVariants();
 renderGallery();
 priceUpdate();
 window.scrollTo({top:0,behavior:"instant"});
}
function priceUpdate(){
 const p=state.active;if(!p)return;const price=Number(state.variant?.price)||p.price;
 $("#pdpPrice").textContent=new Intl.NumberFormat("ar-EG").format(price);
 $("#stickyPrice").textContent=money(price);
}
function renderVariants(){
 const p=state.active;if(!p)return;
 const select=$("#variantSelect");select.replaceChildren();
 for(const v of p.variants){
  const option=node("option","",v.name);option.value=v.id;select.append(option);
 }
 if(state.variant)select.value=state.variant.id;
 const sizes=$("#sizeButtons");sizes.replaceChildren();
 if(p.type==="shoes"){
  for(const size of p.sizes){
   const btn=node("button","size-btn",size);
   btn.type="button";btn.setAttribute("aria-pressed",String(state.size===size));
   btn.addEventListener("click",()=>{
    state.size=size;$("#pdpError").textContent="";$("#sizeHint").textContent="المقاس "+size;
    sizes.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.textContent)===size)));
   });
   sizes.append(btn);
  }
 }
}
function renderGallery(){
 const p=state.active;if(!p)return;
 const images=[...new Set((p.images||[]).map(allowedImage).filter(Boolean))];
 const current=state.variant?.image?allowedImage(state.variant.image):null;
 if(current){const ix=images.indexOf(current);if(ix>0){images.splice(ix,1);images.unshift(current)}}
 const track=$("#galleryTrack");track.replaceChildren();
 for(const [i,src] of images.entries()){
  const slide=node("div","gallery-slide");slide.setAttribute("aria-label","صورة "+(i+1)+" من "+images.length);
  const img=node("img");img.src=src;img.alt=p.name+" — صورة "+(i+1);img.width=650;img.height=650;img.loading=i<2?"eager":"lazy";img.decoding="async";
  slide.append(img);track.append(slide);
 }
 state.gallery=0;$("#galleryCount").textContent="1 / "+Math.max(images.length,1);
}
function slideTo(next){
 const slides=[...$("#galleryTrack").children];if(!slides.length)return;
 state.gallery=(next+slides.length)%slides.length;
 slides[state.gallery].scrollIntoView({inline:"center",block:"nearest",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
 $("#galleryCount").textContent=(state.gallery+1)+" / "+slides.length;
}
$("#prevImage").onclick=()=>slideTo(state.gallery-1);
$("#nextImage").onclick=()=>slideTo(state.gallery+1);
$("#galleryTrack").addEventListener("scroll",()=>{
 const el=$("#galleryTrack");const slides=[...el.children];if(!slides.length)return;
 const rect=el.getBoundingClientRect(),center=rect.left+rect.width/2;
 let n=0,min=Infinity;
 slides.forEach((slide,i)=>{let r=slide.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<min){min=d;n=i}});
 state.gallery=n;$("#galleryCount").textContent=(n+1)+" / "+slides.length;
},{passive:true});
$("#variantSelect").addEventListener("change",e=>{
 const p=state.active;if(!p)return;state.variant=p.variants.find(v=>v.id===e.target.value)||p.variants[0]||null;
 renderGallery();priceUpdate();
});
function enterPreviewOrder(){
 const p=state.active;if(!p)return;
 if(p.type==="shoes"&&!state.size){
  $("#pdpError").textContent="اختاري المقاس الأول علشان تكملي.";
  $("#sizesBox").scrollIntoView({behavior:"smooth",block:"center"});
  return;
 }
 const key=p.id+":"+(state.variant?.id||"default")+":"+(state.size||"na");
 const qty=state.cart.find(x=>x.key===key);
 if(qty){qty.quantity+=1}else state.cart.push({key,id:p.id,name:p.name,price:Number(state.variant?.price)||p.price,image:p.images[0],size:state.size,variant:state.variant?.name||"",quantity:1});
 updateCart();openModal();
}
$("#pdpBuy").onclick=enterPreviewOrder;$("#stickyBuy").onclick=enterPreviewOrder;
function renderGrid(){
 const grid=$("#productGrid");grid.replaceChildren();
 let rows=state.all.filter(p=>state.category==="all"||p.type===state.category);
 if(state.search){const q=state.search.toLocaleLowerCase("ar");rows=rows.filter(p=>(p.name+" "+p.description).toLocaleLowerCase("ar").includes(q))}
 if(state.sort==="price-asc")rows.sort((a,b)=>a.price-b.price);else if(state.sort==="price-desc")rows.sort((a,b)=>b.price-a.price);
 $("#productsCount").textContent=rows.length+" منتج";
 if(!rows.length){
  const msg=node("div","load-message");msg.append(node("strong","","مفيش منتجات بنفس البحث"),document.createTextNode("جرّبي كلمة تانية أو اختاري «الكل»."));grid.append(msg);return
 }
 for(const [i,p] of rows.entries()){
  const article=node("article","product-card");
  const link=node("a","product-link");link.href="?product="+encodeURIComponent(p.id);
  const media=node("div","product-media");const img=node("img");img.src=allowedImage(p.images[0]);img.alt=p.name;img.width=520;img.height=520;img.loading=i<2?"eager":"lazy";img.decoding="async";
  media.append(img);if(p.archived)media.append(node("span","product-label","معاينة فقط"));
  const info=node("div","product-info");const title=node("h3","",p.name);info.append(title,node("div","meta",p.type==="shoes"?"سنيكرز":"أدوات منزلية"));
  const price=node("div","price",new Intl.NumberFormat("ar-EG").format(p.price)+" ");price.append(node("small","","جنيه"));info.append(price);
  link.append(media,info);link.addEventListener("click",e=>{e.preventDefault();navigateProduct(p)});article.append(link);grid.append(article);
 }
}
function setCategory(cat){
 state.category=cat==="shoes"||cat==="home"?cat:"all";
 state.search="";$("#siteSearch").value="";
 document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.filter===state.category)));
 goHome();requestAnimationFrame(()=>$("#shop").scrollIntoView({behavior:"smooth",block:"start"}));
 $("#menuDetails").open=false;
}
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>setCategory(b.dataset.filter)));
document.querySelectorAll("[data-category-link]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();setCategory(a.dataset.categoryLink)}));
$("#sortSelect").onchange=e=>{state.sort=e.target.value;renderGrid()};
const search=$("#siteSearch");
$("#desktopSearch").addEventListener("submit",e=>{e.preventDefault();state.search=search.value.trim();state.category="all";goHome();$("#shop").scrollIntoView({behavior:"smooth"});$("#desktopSearch").classList.remove("mobile-active")});
search.addEventListener("input",()=>{
 state.search=search.value.trim();state.category="all";document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.filter==="all")));
 if(state.active)goHome();renderGrid();
});
$("#mobileSearchBtn").onclick=()=>{
 const form=$("#desktopSearch");form.classList.toggle("mobile-active");
 if(form.classList.contains("mobile-active"))search.focus();
};
$("#backToStore").addEventListener("click",e=>{e.preventDefault();goHome()});
function updateCart(){
 const host=$("#cartContents");host.replaceChildren();
 const n=state.cart.reduce((s,x)=>s+x.quantity,0);
 $("#cartBadge").textContent=n;$("#cartBadge").hidden=!n;
 if(!n){const empty=node("div","cart-empty","لسه السلة فاضية. اتفرجي على المنتجات واختاري اللي يعجبك.");host.append(empty)}
 for(const item of state.cart){
  const row=node("div","cart-row"),img=node("img");img.src=allowedImage(item.image);img.alt=item.name;img.width=80;img.height=80;
  const info=node("div","cart-text");info.append(node("strong","",item.name),node("small","",(item.variant?item.variant+" · ":"")+(item.size?"مقاس "+item.size:"")));
  const actions=node("div","cart-actions");
  const minus=node("button","","−");minus.type="button";minus.setAttribute("aria-label","تقليل الكمية");
  minus.onclick=()=>{item.quantity--;if(item.quantity<=0)state.cart=state.cart.filter(x=>x!==item);updateCart()};
  const label=node("span","numeral",item.quantity);label.style.alignSelf="center";
  const plus=node("button","","+");plus.type="button";plus.setAttribute("aria-label","زيادة الكمية");
  plus.onclick=()=>{if(item.quantity<9){item.quantity++;updateCart()}};
  actions.append(minus,label,plus);info.append(node("small","",money(item.price*item.quantity)),actions);
  row.append(img,info);host.append(row);
 }
 $("#cartTotal").textContent=money(state.cart.reduce((s,x)=>s+x.price*x.quantity,0));
}
function openCart(){previousFocus=document.activeElement;state.showingCart=true;$("#scrim").classList.add("active");$("#cartDrawer").classList.add("active");$("#cartDrawer").setAttribute("aria-hidden","false");document.body.classList.add("is-locked");$("#cartClose").focus()}
function closeCart(){state.showingCart=false;$("#cartDrawer").classList.remove("active");$("#cartDrawer").setAttribute("aria-hidden","true");$("#scrim").classList.remove("active");document.body.classList.remove("is-locked");previousFocus?.focus?.()}
$("#cartOpen").onclick=openCart;$("#cartClose").onclick=closeCart;
function openModal(){closeCart();previousFocus=document.activeElement;state.showingModal=true;$("#scrim").classList.add("active");$("#previewModal").classList.add("active");$("#previewModal").setAttribute("aria-hidden","false");document.body.classList.add("is-locked");$("#modalClose").focus()}
function closeModal(){state.showingModal=false;$("#previewModal").classList.remove("active");$("#previewModal").setAttribute("aria-hidden","true");$("#scrim").classList.remove("active");document.body.classList.remove("is-locked");previousFocus?.focus?.()}
$("#cartCheckout").onclick=openModal;$("#modalClose").onclick=closeModal;
$("#goLive").onclick=()=>{location.href="/"};
$("#scrim").onclick=()=>{if(state.showingModal)closeModal();else if(state.showingCart)closeCart()};
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){if(state.showingModal)closeModal();else if(state.showingCart)closeCart();$("#menuDetails").open=false}
 if(e.key!=="Tab")return;
 const dlg=state.showingModal?$("#previewModal"):state.showingCart?$("#cartDrawer"):null;
 if(!dlg)return;
 const focusable=[...dlg.querySelectorAll("a[href],button:not(:disabled),input:not(:disabled)")];
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
function route(){
 const id=new URL(location.href).searchParams.get("product");
 const p=state.all.find(x=>x.id===id);
 if(p)navigateProduct(p,false);else goHome(false);
}
window.addEventListener("popstate",route);
updateCart();loadCatalog().finally(()=>route());
})();
