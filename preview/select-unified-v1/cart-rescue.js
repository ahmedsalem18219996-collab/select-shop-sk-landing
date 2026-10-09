/* SELECT SHOP preview cart reliability guard.
   Independent of the legacy shoe engine: no duplicate checkout or discount logic. */
(function(){
  "use strict";
  const cartKey="selectShopUnifiedV1PreviewCart:v2";
  const CART_URL="/preview/select-unified-v1/";
  function hasSavedItems(){
    try { const data=JSON.parse(localStorage.getItem(cartKey)||"null");
      return !!(data && data.version===2 && Array.isArray(data.items) && data.items.length); }
    catch (_) { return false; }
  }
  function opened(){return !!document.getElementById("cartSheet")?.classList.contains("show");}
  function openFallback(){
    const sheet=document.getElementById("cartSheet");
    if(!sheet || opened()) return;
    // If the store JS is unavailable, the drawer still opens, with an accurate recovery path.
    document.querySelectorAll(".sheet.show").forEach(node=>{
      node.classList.remove("show");node.setAttribute("aria-hidden","true");
    });
    const backdrop=document.getElementById("sheetBackdrop");
    if(backdrop){backdrop.hidden=false;backdrop.classList.add("show");}
    sheet.classList.add("show");
    sheet.setAttribute("aria-hidden","false");
    document.documentElement.classList.add("sheet-open");
    document.body.classList.add("sheet-open");
    const empty=document.getElementById("emptyCart");
    if(hasSavedItems()){
      if(empty)empty.hidden=true;
      let warning=document.getElementById("ssfCartRecoveryMessage");
      if(!warning){
        warning=document.createElement("div");
        warning.id="ssfCartRecoveryMessage";
        warning.className="ssf-cart-recovery-note";
        warning.setAttribute("role","status");
        warning.innerHTML='<strong>تعذر تحميل تفاصيل السلة.</strong><span>اختياراتك محفوظة في المتصفح. جرّب تحديث الصفحة عشان تظهر وتكمل الطلب.</span><button type="button" id="ssfReloadCart">تحديث الصفحة</button>';
        sheet.querySelector(".sheet-scroll")?.prepend(warning);
        warning.querySelector("button")?.addEventListener("click",()=>location.reload());
      }
      const checkout=document.getElementById("cartCheckout");
      if(checkout)checkout.disabled=true;
    }else if(empty){empty.hidden=false;}
  }
  function openReliable(){
    if(opened()) return;
    try {
      // Exposed only by the preview core and uses its real renderer/prices.
      if(typeof window.SELECT_SHOP_OPEN_CART==="function"){
        window.SELECT_SHOP_OPEN_CART();
        if(opened())return;
      }
    }catch(err){console.warn("SELECT SHOP preview cart open failed:",err);}
    openFallback();
  }
  document.addEventListener("click",function(event){
    if(event.target?.closest?.("[data-close-sheet]") || event.target?.id==="sheetBackdrop"){
      setTimeout(function(){
        if(!opened())return;
        // Safety exit only if the native store handler did not close the drawer.
        const sheet=document.getElementById("cartSheet");
        sheet?.classList.remove("show");
        sheet?.setAttribute("aria-hidden","true");
        const backdrop=document.getElementById("sheetBackdrop");
        if(backdrop){backdrop.classList.remove("show");backdrop.hidden=true;}
        document.body.classList.remove("sheet-open");
        document.documentElement.classList.remove("sheet-open");
      },80);
      return;
    }
    if(!event.target?.closest?.("[data-open-cart]"))return;
    // Native click handler runs first and remains the preferred route.
    setTimeout(function(){if(!opened())openReliable();},80);
  },true);
  if(new URLSearchParams(location.search).get("open_cart")==="1"){
    const init=()=>setTimeout(openReliable,230);
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
    else init();
  }
})();
