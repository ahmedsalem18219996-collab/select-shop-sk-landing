/* SELECT SHOP TEMP ONLY — editorial shortlist sourced from public verified prices.
 * Never exposes reference supplier costs, unverified stock quantities or draft pricing.
 * Entries self-hide when source catalog no longer allows the relevant variant/order.
 */
(()=>{"use strict";
const root=document.getElementById("ssOwnerPicks");
if(!root)return;
const idPattern=/^[a-f0-9]{24}$/i;
const ids=["6a71f70b4d956cf608604baa","6abac80af2dfbd30480af5ee"];
const base="https://zznqdwrohrycsjfpvkhc.supabase.co";
const key="sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
const available=p=>idPattern.test(p?.id||"")&&Number.isInteger(Number(p.display_price_egp))&&Number(p.display_price_egp)>110&&p.price_status!=="needs_review"&&Array.isArray(p.variants)&&p.variants.some(v=>v.available===true&&Number(v.display_price_egp)>0);
const safePhoto=p=>Array.isArray(p.images)?p.images.find(x=>typeof x==="string"&&/^https:\/\/safka\.fra1\.cdn\.digitaloceanspaces\.com\/media\/products\//.test(x)):null;
async function fetchOne(id){
 const response=await fetch(base+"/rest/v1/rpc/ss_safka_public_catalog_v2",{
  method:"POST",cache:"no-store",headers:{"apikey":key,"content-type":"application/json"},
  body:JSON.stringify({p_page:1,p_limit:1,p_category:null,p_search:id}),
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error("catalog_not_ready");
 const data=await response.json();
 return (data.items||[]).find(x=>x.id===id);
}
async function load(){
 try{
  const results=await Promise.all(ids.map(fetchOne));
  const cards=results.filter(available);
  if(!cards.length)return;
  const content=el("div","ssFeaturedGrid");
  for(const p of cards){
    const link=el("a","ssFeaturedCard");
    const url=new URL("/",window.location.origin);
    url.searchParams.set("product","safka-"+p.id);
    for(const k of ["utm_source","utm_medium","utm_campaign","utm_content"]){
     const v=new URLSearchParams(location.search).get(k);
     if(v&&v.length<110)url.searchParams.set(k,v);
    }
    link.href=url.pathname+url.search+"#products";
    const photo=safePhoto(p);
    if(photo){const image=el("img","ssFeaturedImage");image.src=photo;image.alt=p.name;image.loading="lazy";image.decoding="async";link.append(image);}
    const body=el("span","ssFeaturedBody");
    body.append(el("span","ssFeaturedEyebrow","اختيارات SELECT SHOP"),
      el("strong","ssFeaturedName",p.name),
      el("span","ssFeaturedValue",Number(p.display_price_egp).toLocaleString("ar-EG")+" ج.م — شامل التوصيل"),
      el("span","ssFeaturedAction","شوف التفاصيل واطلب للتأكيد ←"));
    link.append(body);content.append(link);
  }
  root.querySelector("[data-featured-cards]")?.replaceChildren(content);
  root.hidden=false;
 }catch{
  // Fail closed: no price, image, or call to action if live supplier quote fails.
  root.hidden=true;
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else void load();
})();