/* SELECT SHOP Review V2 — standalone brand interactions.
   No cart, order, analytics or product pricing code.
   CSS-only transitions plus IntersectionObserver for scroll entrances.
*/
(() => {
 "use strict";
 if (!window.SELECT_SHOP_PREVIEW_ONLY || !location.pathname.startsWith("/preview/select-v2/")) return;
 const $=s=>document.querySelector(s);
 const $$=s=>Array.from(document.querySelectorAll(s));
 const menuButton=$("#navCategoryButton"), menu=$("#navCategoryMenu");
 function openMenu(open){
   if(!menuButton||!menu)return;
   menu.hidden=!open;
   menuButton.setAttribute("aria-expanded",String(open));
 }
 menuButton?.addEventListener("click",()=>openMenu(menu.hidden));
 document.addEventListener("click",e=>{
   if(!e.target.closest(".navDropdownHost"))openMenu(false);
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape")openMenu(false)});
 const navFilters=$$("[data-nav-filter]");
 function changeFilter(id){
   const tab=$('.tabs [data-filter="'+id+'"]');
   if(tab)tab.click();
   navFilters.forEach(el=>{if(el.dataset.navFilter===id)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current")});
   openMenu(false);
 }
 navFilters.forEach(a=>a.addEventListener("click",e=>{changeFilter(a.dataset.navFilter)}));
 // The shop's product data may create cards synchronously after DOMContentLoaded.
 // Entrance animations use opacity/transform only and avoid CLS.
 const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(!reduce && "IntersectionObserver" in window){
   const io=new IntersectionObserver(entries=>{
     entries.forEach(ent=>{if(ent.isIntersecting){ent.target.classList.add("is-visible");io.unobserve(ent.target)}})
   },{threshold:.07,rootMargin:"0px 0px 30px 0px"});
   function observe(){
     $$(".sectionHead,.gatewayCard,.productCard,.carSpotlight,.story").forEach(el=>{
       if(el.dataset.v2Observed)return;
       el.dataset.v2Observed="1";
       el.classList.add("v2-reveal");
       io.observe(el);
     });
   }
   observe();
   const grid=$("#productGrid");
   if(grid){
     const mo=new MutationObserver(observe);
     mo.observe(grid,{childList:true,subtree:false});
   }
 }
 // Use a single delegated handler for the arrow animation cue, CSS drives the motion.
 document.documentElement.classList.add("select-v2-ready");
 window.SELECT_SHOP_V2=Object.freeze({previewOnly:true,visuals:"ink-copper-iris",shippingPolicy:"proposed-only"});
})();