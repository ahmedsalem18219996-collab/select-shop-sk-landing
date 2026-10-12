/* SELECT SHOP TEMP: one shopper-facing basket entrance, two safe fulfillment routes.
 * Shoe orders keep their existing WhatsApp checkout. Supplier orders stay review-only.
 * Never silently mix shipping costs, discounts, or supplier-order status.
 */
(()=>{"use strict";
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const format=n=>new Intl.NumberFormat("ar-EG").format(n);
let hub=null,allowShoe=false;
function counts(){
 const supplier=Number(window.SS_SAFKA_CART?.count||0);
 const shoes=Number(q("[data-cart-count]")?.textContent?.trim()||0);
 return {shoes:Number.isFinite(shoes)?shoes:0,supplier:Number.isFinite(supplier)?supplier:0};
}
function sync(){
 const n=counts();
 qa("[data-ss-unified-count]").forEach(x=>x.textContent=format(n.shoes+n.supplier));
 qa("[data-open-cart]").forEach(b=>b.setAttribute("aria-label",
   "افتح السلة، "+format(n.shoes+n.supplier)+" منتجات"));
}
const el=(tag,cls,text)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(text!==undefined)x.textContent=text;return x;
};
function openShoes(){
 const button=q("[data-open-cart]");
 if(!button)return;
 allowShoe=true;
 try{button.click()}finally{allowShoe=false}
}
function openSuppliers(){if(typeof window.SS_SAFKA_CART?.open==="function")window.SS_SAFKA_CART.open();}
function choose(target){
 if(hub?.open)hub.close();
 if(target==="shoes")openShoes();else openSuppliers();
}
function openHub(){
 if(hub?.open)return;
 const n=counts();
 if(n.shoes>0&&n.supplier===0){openShoes();return}
 if(n.supplier>0&&n.shoes===0){openSuppliers();return}
 hub=el("dialog","ssUnifiedHub");
 hub.setAttribute("aria-label","اختار سلة المشتريات");
 const content=el("div","ssUnifiedHubContent");
 const header=el("div","ssUnifiedHubHead");
 header.append(el("h2","","سلة SELECT SHOP"));
 const close=el("button","ssUnifiedHubClose","×");close.type="button";
 close.setAttribute("aria-label","إغلاق");close.onclick=()=>hub.close();
 header.append(close);
 const explain=el("p","ssUnifiedHubNote",
  "كل اختياراتك في مكان واحد. هنفتح سلة كل مجموعة عشان طريقة تأكيد الطلب مختلفة.");
 const routes=el("div","ssUnifiedHubRoutes");
 const original=el("button","ssUnifiedHubOption");
 original.type="button";
 original.append(el("strong","","الأحذية الأصلية"));
 original.append(el("span","","اختيار المقاس والمعاينة، والتأكيد على واتساب"));
 original.append(el("b","",format(n.shoes)+" قطع"));
 original.onclick=()=>choose("shoes");
 const supplier=el("button","ssUnifiedHubOption");
 supplier.type="button";
 supplier.append(el("strong","","باقي منتجات المتجر"));
 supplier.append(el("span","","منتجات المنزل والجمال وغيرها، رقم طلب واحد للمراجعة"));
 supplier.append(el("b","",format(n.supplier)+" قطع"));
 supplier.onclick=()=>choose("supplier");
 routes.append(supplier,original);
 const note=el("small","ssUnifiedHubFoot","مهم: لو عندك منتجات من المجموعتين، هيتأكدوا كطلبين منفصلين. مفيش رسوم أو خصومات مشتركة بينهم.");
 const browse=el("button","ssUnifiedHubBrowse","＋ كمّل التسوق");
 browse.type="button";browse.onclick=()=>{
  hub.close();q("#products")?.scrollIntoView({behavior:"smooth",block:"start"});
 };
 content.append(header,explain,routes,note,browse);
 hub.append(content);
 hub.addEventListener("click",e=>{if(e.target===hub)hub.close()});
 const instance=hub;
 instance.addEventListener("close",()=>{instance.remove();if(hub===instance)hub=null},{once:true});
 document.body.append(hub);hub.showModal();
}
function install(){
 const entries=qa("[data-open-cart]");
 if(!entries.length)return;
 entries.forEach(button=>{
   const badge=el("strong","ssUnifiedCount","0");badge.dataset.ssUnifiedCount="";
   const existing=q("[data-cart-count]",button);
   if(existing)existing.after(badge);else button.append(badge);
 });
 document.addEventListener("click",e=>{
  const trigger=e.target?.closest?.("[data-open-cart]");
  if(!trigger||allowShoe)return;
  e.preventDefault();e.stopImmediatePropagation();openHub();
 },true);
 // Browser-originated cart counters remain the source of truth.
 const tracked=qa("[data-cart-count],[data-safka-bag-count]");
 const observer=new MutationObserver(()=>sync());
 tracked.forEach(x=>observer.observe(x,{characterData:true,childList:true,subtree:true}));
 window.addEventListener("storage",()=>sync());
 document.documentElement.classList.add("ssUnifiedCartReady");
 sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
else install();
})();
