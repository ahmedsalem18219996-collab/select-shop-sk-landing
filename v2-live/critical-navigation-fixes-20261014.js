/* SELECT SHOP — conservative storefront UX corrections (no order/pricing mutations) */
(()=>{"use strict";
const $=s=>document.querySelector(s);
function clearSearch(){const input=$("#searchInput");if(input&&input.value){input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));}}
document.addEventListener("click",e=>{
 const category=e.target.closest('.ssMobileDepartmentItem,[data-filter],[data-nav-filter]');
 if(category&&!(category.matches('[data-filter="all"]')&&e.target.closest("#resetAllShopFilters")))clearSearch();
 const top=e.target.closest('a[href="#top"],a[href="/#top"]');
 if(top){e.preventDefault();history.replaceState(null,"",location.pathname+location.search+"#top");window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}
},true);
function installReset(){const tools=$(".productsSection .toolbar");if(!tools||$("#resetAllShopFilters"))return;
 const b=document.createElement("button");b.id="resetAllShopFilters";b.type="button";b.className="tab ssResetFilters";b.textContent="مسح كل الفلاتر";b.style.minHeight="44px";
 b.addEventListener("click",()=>{clearSearch();const all=tools.querySelector('[data-filter="all"]');all?.click();});
 tools.append(b);
}
document.addEventListener("DOMContentLoaded",installReset,{once:true});
})();
