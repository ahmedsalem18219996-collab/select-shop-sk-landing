/* SELECT SHOP TEMPORARY STORE — Safqa draft collection, owner test only.
   No order API, no supplier keys, no unverified prices or claims, no CLEAN.
   Drive media may require access; owner must verify before public sale.
*/
(()=>{"use strict";
if(window.SELECT_SHOP_TEST_MODE!==true)return;
const mount=document.getElementById("safkaOwnerProducts");
if(!mount)return;
const storeItems=[
 {id:"6a9c3d2bc9d99a6b86da4ff6",name:"كشاف إضاءة مغناطيسي متعدد الاستخدامات",category:"إضاءة وأدوات",short:"كشاف إضاءة مغناطيسي للاستخدامات المتنوعة.",detail:"قوة الإضاءة ومصدر الطاقة والملحقات لم يتم التحقق منها بعد.",images:[],videos:[]},
 {id:"6a8f3489ff4bc0f14e9997ff",name:"قطاعة ومبشرة المطبخ 3×1",category:"المطبخ",short:"قطاعة ومبشرة متعددة الوظائف للمطبخ.",detail:"محتويات الطقم والخامات وطريقة الاستخدام قيد مراجعة المورد.",images:[],videos:[]},
 {id:"6aa81321ca38d5013caa41fc",name:"مجفف الأحذية الحراري 360° — وحدتين",category:"العناية بالأحذية",short:"وحدتان للمساعدة على تجفيف الرطوبة داخل الأحذية.",detail:"ملف المورد يذكر قدرة 10 وات وحرارة تشغيل 45–65 درجة مئوية؛ هذه المواصفات وفعالية أي تعقيم تحتاج تأكيد قبل نشرها كحقائق إعلانية.",images:[
 "1Sw9MuVLZBMuvkzJt1W0sPV7L1vHVa-EL","1-0JTreWfa0blLIMjFJWhoF96hm5hHtRH",
 "1AmAa__sXFaNmtrtP_0jUzMl6rrIb1wmc","1TwDCoVQ4WaTjFTUewxE8vYUXCm5wgIY0",
 "1DxcBMYQMA6bytOMuPYqIv7rGphAkxjss","1RJhoScvvtACuxvBHZyarJJ7kHbNKsLXq",
 "1aLadJAjoWzL0sbDFbq-RXJHzpiAJz8ze","1jZeVoTxQZp9DSa7wAY0AE5E6peqAbD0d"
 ],videos:[
 "1OL0p60imS4wh0qyI97Mcy69chGDHq4SJ","1wFQxyrPDbNnV8NKmVMRWEtPRqgBFC3gI",
 "1rj0QEQowKdDaY3r-l8OtU1gs9HKd7QUl","1fg2MND2vb_72GOl-F4jkOkJe_W5sRaZf",
 "14wZzYIwMpGCOCEUiCI2hnOiMuLhWwDhX","1vmXNI4rCEbSN8WkphIJEsTJ_Fw2jVZGe"
 ]},
 {id:"6aa80df0ca38d5013ca7d692",name:"حافظة فرش الأسنان الذكية UV",category:"العناية الشخصية",short:"حافظة لفرش الأسنان بوظيفة أشعة UV حسب وصف المورد.",detail:"طريقة التشغيل وفعالية الأشعة قيد التحقق؛ لا توجد وعود بتعقيم مضمون.",images:[],videos:[]},
 {id:"6aa16dfdca38d5013ca5eea5",name:"كرات مساج مبردة للوجه",category:"العناية الشخصية",short:"كرات تُستخدم للمساج البارد للوجه.",detail:"الخامات وتعليمات التبريد والتنظيف قيد التأكيد.",images:[],videos:[]}
];
function el(tag,cls,txt){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(txt!==undefined)e.textContent=String(txt);
 return e;
}
const driveImg=id=>"https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w1000";
const drivePreview=id=>"https://drive.google.com/file/d/"+encodeURIComponent(id)+"/preview";
const driveView=id=>"https://drive.google.com/file/d/"+encodeURIComponent(id)+"/view";
const root=el("section","ssSafqaCollection");
root.append(el("div","ssDraftEyebrow","SELECT SHOP / OWNER REVIEW"));
const head=el("div","ssDraftIntro");
head.append(el("h3","", "منتجات صفقة — داخل متجرك"));
head.append(el("p","", "صور وفيديوهات من المورد للمراجعة. المنتجات والأسعار مش متاحة للشراء لحد ما نراجع الوصف والشحن والربح."));
root.append(head);
const cards=el("div","ssDraftGrid");
root.append(cards);mount.replaceChildren(root);mount.hidden=false;
const dialog=el("dialog","ssDraftDialog");
dialog.setAttribute("aria-label","تفاصيل منتج صفقة للمراجعة");
document.body.append(dialog);
let previousFocus=null;
function mediaShell(product){
 const outer=el("div","ssMediaShell");
 const stage=el("div","ssMediaStage");
 const bar=el("div","ssMediaThumbs");
 bar.setAttribute("aria-label","صور وفيديوهات المنتج");
 const available=[
  ...product.images.map((id,index)=>({id,type:"image",label:"صورة "+(index+1)})),
  ...product.videos.map((id,index)=>({id,type:"video",label:"فيديو "+(index+1)}))
 ];
 const mediaItems=[];
 let current=0;
 function selectMedia(i){
   if(i<0||i>=available.length)return;
   current=i;stage.replaceChildren();
   const item=available[i];
   if(item.type==="image"){
     const img=el("img","ssMediaImage");img.alt="صورة المنتج من ملف المورد: "+product.name;
     img.decoding="async";img.loading="eager";img.src=driveImg(item.id);
     const fallback=el("div","ssMediaError","الصورة مش ظاهرة؛ افتح المصدر على Drive للمراجعة.");
     fallback.hidden=true;
     img.addEventListener("error",()=>{img.hidden=true;fallback.hidden=false});
     stage.append(img,fallback);
   }else{
     const iframe=el("iframe","ssMediaVideo");iframe.src=drivePreview(item.id);
     iframe.title=item.label+" — "+product.name;iframe.loading="eager";
     iframe.referrerPolicy="no-referrer";iframe.allow="fullscreen";iframe.allowFullscreen=true;
     stage.append(iframe);
   }
   const badge=el("div","ssMediaCount",(i+1)+" / "+available.length);
   stage.append(badge);
   for(let index=0;index<mediaItems.length;index++){
     const btn=mediaItems[index];const active=index===i;
     btn.classList.toggle("active",active);
     btn.setAttribute("aria-pressed",String(active));
   }
   const source=outer.querySelector(".ssMediaSource");
   if(source)source.href=item.type==="video"?driveView(item.id):driveView(item.id);
 }
 if(available.length){
   const controls=el("div","ssMediaControls");
   const back=el("button","ssMediaNav","‹");back.type="button";back.setAttribute("aria-label","الوسيط السابق");
   const next=el("button","ssMediaNav","›");next.type="button";next.setAttribute("aria-label","الوسيط التالي");
   back.addEventListener("click",()=>selectMedia((current-1+available.length)%available.length));
   next.addEventListener("click",()=>selectMedia((current+1)%available.length));
   controls.append(back,next);
   stage.append(controls);
   available.forEach((item,i)=>{
     const btn=el("button","ssMediaThumb "+(item.type==="video"?"ssMediaThumbVideo":""),item.type==="video"?"▶ "+item.label:"");
     btn.type="button";btn.setAttribute("aria-label","اعرض "+item.label);
     btn.setAttribute("aria-pressed","false");
     if(item.type==="image"){
       const im=el("img");im.alt="";im.loading="lazy";im.src=driveImg(item.id);
       btn.append(im);
     }
     btn.addEventListener("click",()=>selectMedia(i));
     mediaItems.push(btn);bar.append(btn);
   });
   outer.append(stage,bar);
   const foot=el("div","ssMediaFoot");
   const source=el("a","ssMediaSource","فتح الملف الأصلي ↗");source.href=driveView(available[0].id);
   source.target="_blank";source.rel="noopener noreferrer";foot.append(source);
   foot.append(el("span","",product.images.length+" صور · "+product.videos.length+" فيديو"));
   outer.append(foot);
   selectMedia(0);
 }else{
   stage.classList.add("ssMediaAwaiting");
   stage.append(el("strong","","الميديا الأصلية قيد الإضافة"),el("p","","مش هنستخدم صورة أو فيديو لمنتج مختلف. هنربط ميديا المورد المطابقة قبل النشر."));
   outer.append(stage);
 }
 return outer;
}
function openProduct(product,trigger){
 previousFocus=trigger||document.activeElement;
 dialog.replaceChildren();
 const top=el("div","ssDetailTop");
 const caption=el("div","");
 caption.append(el("span","ssDraftEyebrow","SELECT SHOP / PRODUCT REVIEW"),
   el("span","ssDetailReview","معاينة خاصة — الطلب متوقف"));
 const close=el("button","ssDraftClose","إغلاق ×");close.type="button";
 close.setAttribute("aria-label","إغلاق تفاصيل المنتج");
 close.addEventListener("click",()=>dialog.close());
 top.append(caption,close);
 const layout=el("div","ssDetailLayout");
 const media=mediaShell(product);
 const details=el("div","ssDetailInfo");
 details.append(el("span","ssDetailCategory",product.category));
 details.append(el("h2","",product.name));
 details.append(el("p","ssDetailLead",product.short));
 const spec=el("div","ssDetailSpec");
 spec.append(el("strong","","المعلومات اللي لسه بنراجعها"),el("p","",product.detail));
 details.append(spec);
 const status=el("div","ssDetailPricing");
 status.append(el("span","","السعر النهائي شامل الشحن"),el("strong","","لسه تحت المراجعة"));
 details.append(status);
 details.append(el("p","ssDetailNote","قبل البيع: نثبت التكلفة ومقاسات/اختيارات المنتج، ونراجع الميديا والشحن حسب المحافظة."));
 const disabled=el("button","ssDraftDisabled","الطلب غير متاح حاليًا");
 disabled.type="button";disabled.disabled=true;details.append(disabled);
 layout.append(media,details);
 dialog.append(top,layout);
 if(!dialog.open)dialog.showModal();
 dialog.scrollTop=0;
}
dialog.addEventListener("close",()=>{
 dialog.replaceChildren();
 if(previousFocus&&typeof previousFocus.focus==="function")previousFocus.focus({preventScroll:true});
});
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
function makeCard(product){
 const article=el("article","ssDraftCard");
 const open=el("button","ssDraftOpen");
 open.type="button";open.setAttribute("aria-label","اعرض تفاصيل "+product.name);
 const cover=el("div","ssDraftCover");
 if(product.images.length){
   const img=el("img","ssDraftCoverImage");img.src=driveImg(product.images[0]);
   img.loading="lazy";img.decoding="async";img.alt="صورة من المورد: "+product.name;
   const pending=el("span","ssDraftNoMedia","الصورة غير متاحة الآن");
   pending.hidden=true;
   img.addEventListener("error",()=>{img.hidden=true;pending.hidden=false});
   cover.append(img,pending);
 }else{
   cover.classList.add("ssDraftCoverPending");
   cover.append(el("span","ssDraftNoMedia","صور المنتج قيد التجهيز"));
 }
 const badge=el("span","ssDraftMediaTag",
   product.videos.length?product.images.length+" صور · "+product.videos.length+" فيديو":"الميديا قيد الإضافة");
 cover.append(badge);
 const content=el("div","ssDraftCardBody");
 content.append(el("small","",product.category));
 content.append(el("h4","",product.name));
 content.append(el("p","",product.short));
 content.append(el("strong","ssDraftNoPrice","السعر شامل الشحن: تحت المراجعة"));
 content.append(el("span","ssDraftExplore","عرض صور المنتج والتفاصيل ↗"));
 open.append(cover,content);
 open.addEventListener("click",()=>openProduct(product,open));
 article.append(open);
 return article;
}
storeItems.forEach(p=>cards.append(makeCard(p)));
const initial=new URLSearchParams(window.location.search).get("safka_review");
const deepLinked=storeItems.find(p=>p.id===initial);
if(deepLinked)openProduct(deepLinked);
})();