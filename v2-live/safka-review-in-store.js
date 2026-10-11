/* SELECT SHOP temporary site owner review draft, inside the REAL storefront.
   Only visible when shop_test=1; NO purchasing, NO supplier API keys,
   NO catalog mutations. Products become sellable only after owner approves
   provider costs, nationwide shipping, media, descriptions and checkout.
*/
(()=>{"use strict";
if(window.SELECT_SHOP_TEST_MODE!==true)return;
const container=document.getElementById("safkaOwnerProducts");
if(!container)return;
const items=[
 {id:"6a9c3d2bc9d99a6b86da4ff6",name:"كشاف إضاءة مغناطيسي متعدد الاستخدامات",category:"إضاءة وأدوات",symbol:"✦",summary:"كشاف إضاءة مغناطيسي. قوة الإضاءة وطريقة الشحن والمحتويات قيد المراجعة مع المورد.",detail:"نراجع تفاصيل قدرة الإضاءة والمقاسات وطريقة التثبيت قبل اعتماد وصف البيع.",videos:[],images:[]},
 {id:"6a8f3489ff4bc0f14e9997ff",name:"قطاعة ومبشرة المطبخ 3×1",category:"المطبخ",symbol:"◈",summary:"أداة متعددة الوظائف لتقطيع وبشر مكونات المطبخ. الملحقات والخامات تحتاج تأكيد.",detail:"محتويات الطقم ونوع الشفرات والمقاسات تحت المراجعة قبل النشر.",videos:[],images:[]},
 {id:"6aa81321ca38d5013caa41fc",name:"مجفف الأحذية الحراري 360° — وحدتين",category:"العناية بالأحذية",symbol:"◉",summary:"وحدتان للمساعدة على تجفيف الرطوبة داخل الأحذية. وصف مبدئي؛ راجع مدى الحرارة والقدرة على العبوة.",detail:"المعلومات الموجودة في ملف المورد تشير إلى وحدتين ودرجة حرارة 45–65° مئوية وقدرة 10 وات. نتحقق من المواصفات عمليًا قبل نشرها، ولا نؤكد التعقيم بالأشعة فوق البنفسجية بدون دليل.",videos:[
 "1OL0p60imS4wh0qyI97Mcy69chGDHq4SJ","1wFQxyrPDbNnV8NKmVMRWEtPRqgBFC3gI","1rj0QEQowKdDaY3r-l8OtU1gs9HKd7QUl","1fg2MND2vb_72GOl-F4jkOkJe_W5sRaZf","14wZzYIwMpGCOCEUiCI2hnOiMuLhWwDhX","1vmXNI4rCEbSN8WkphIJEsTJ_Fw2jVZGe"],images:[
 "1Sw9MuVLZBMuvkzJt1W0sPV7L1vHVa-EL","1-0JTreWfa0blLIMjFJWhoF96hm5hHtRH","1AmAa__sXFaNmtrtP_0jUzMl6rrIb1wmc"]},
 {id:"6aa80df0ca38d5013ca7d692",name:"حافظة فرش الأسنان الذكية UV",category:"العناية الشخصية",symbol:"✧",summary:"حافظة فرش أسنان مزودة بوظيفة أشعة UV حسب المورد. آلية العمل والفعالية تحتاج تحقق.",detail:"المنتج قيد مراجعة المواصفات وطريقة الاستخدام. لا ننشر ادعاءات تعقيم مضمونة بدون إثبات.",videos:[],images:[]},
 {id:"6aa16dfdca38d5013ca5eea5",name:"كرات مساج مبردة للوجه",category:"العناية الشخصية",symbol:"❋",summary:"كرات مساج للوجه تُستخدم باردة حسب تعليمات المورد. نراجع الخامات وطريقة الاستخدام.",detail:"الخامات المناسبة للبشرة ودرجة التبريد وإرشادات التنظيف قيد المراجعة.",videos:[],images:[]}
];
const $=id=>document.getElementById(id);
const tag=(t,c,value)=>{const e=document.createElement(t);if(c)e.className=c;if(value!==undefined)e.textContent=value;return e;};
container.hidden=false;
const title=tag("div","ssDraftIntro");
title.append(tag("span","ssDraftEyebrow","SELECT SHOP / SAFQA · OWNER TEST"));
title.append(tag("h3","", "منتجات صفقة داخل المتجر المؤقت"));
title.append(tag("p","","دي معاينة المنتجات في نفس صفحة SELECT SHOP الرئيسية. الأسعار والشراء متوقفين لحين مراجعة التكلفة والشحن والوصف والميديا."));
container.append(title);
const grid=tag("div","ssDraftGrid");container.append(grid);
const dialog=tag("dialog","ssDraftDialog");
dialog.setAttribute("aria-label","مراجعة منتج صفقة داخل المتجر");
document.body.append(dialog);
function mediaViewer(p){
 const wrap=tag("div","ssDraftMediaBox");
 const caption=tag("p","ssDraftCaption","روابط ميديا المورد مرشحة للمراجعة فقط. التشغيل والمطابقة مش مؤكدين.");
 wrap.append(caption);
 if(p.images.length){
   const pictures=tag("div","ssDraftImageGallery");
   const mainImage=tag("img","ssDraftMainImage");
   mainImage.loading="lazy";
   mainImage.alt="صورة مرشحة من ملف المورد، لم تتم مراجعة الموديل بصريًا";
   const explanation=tag("p","ssDraftImageFallback","لو الصورة ما ظهرتش، افتح المصدر لمراجعتها في Google Drive.");
   mainImage.addEventListener("error",()=>{mainImage.hidden=true;explanation.hidden=false;});
   explanation.hidden=true;
   pictures.append(mainImage,explanation);
   const rail=tag("div","ssDraftPhotos");
   for(const [index,fileId] of p.images.slice(0,3).entries()){
     const btn=tag("button","","صورة "+(index+1));
     btn.type="button";
     btn.addEventListener("click",()=>{
       mainImage.hidden=false;explanation.hidden=true;
       mainImage.src="https://drive.google.com/thumbnail?id="+encodeURIComponent(fileId)+"&sz=w850";
       rail.querySelectorAll("button").forEach(n=>n.classList.toggle("active",n===btn));
     });
     if(index===0)btn.classList.add("active");
     rail.append(btn);
   }
   mainImage.src="https://drive.google.com/thumbnail?id="+encodeURIComponent(p.images[0])+"&sz=w850";
   const source=tag("a","ssDraftSourceLink","افتح المصدر على Drive ↗");
   source.href="https://drive.google.com/file/d/"+p.images[0]+"/view";
   source.target="_blank";source.rel="noopener noreferrer";
   pictures.append(rail,source);wrap.append(pictures);
 }
 if(p.videos.length){
  const select=tag("div","ssDraftVideos");
  const videoId=p.videos[0],frame=tag("iframe");
  frame.title="فيديو مرشح من ملفات المورد — قد يحتاج صلاحية مشاهدة";
  frame.src="https://drive.google.com/file/d/"+videoId+"/preview";
  frame.loading="lazy";frame.referrerPolicy="no-referrer";
  frame.allow="fullscreen";frame.allowFullscreen=true;select.append(frame);
  const rail=tag("div","ssDraftVideoButtons");
  p.videos.forEach((fileId,i)=>{
    const b=tag("button","", "فيديو "+(i+1));b.type="button";
    b.addEventListener("click",()=>{
      frame.src="https://drive.google.com/file/d/"+fileId+"/preview";
      rail.querySelectorAll("button").forEach(n=>n.classList.toggle("active",n===b));
    });
    if(i===0)b.classList.add("active");rail.append(b);
  });
  select.append(rail);wrap.append(select);
 }else wrap.append(tag("p","ssDraftNoVideo","لم يتم ربط فيديو مؤكّد بهذا المنتج حتى الآن."));
 return wrap;
}
function openProduct(p){
 dialog.replaceChildren();
 const close=tag("button","ssDraftClose","إغلاق ×");close.type="button";
 close.addEventListener("click",()=>dialog.close());dialog.append(close);
 dialog.append(tag("span","ssDraftEyebrow","داخل المتجر · مسودة غير منشورة للبيع"));
 dialog.append(tag("h2","",p.name));
 dialog.append(tag("p","ssDraftDesc",p.summary));
 dialog.append(tag("p","ssDraftDetail",p.detail));
 dialog.append(mediaViewer(p));
 const foot=tag("p","ssDraftWarning","لم يتم اعتماد سعر شامل الشحن أو تكلفة المورد أو التوافر. زر الشراء غير متاح.");
 dialog.append(foot);
 const buy=tag("button","ssDraftDisabled","الطلب متوقف لحين اعتماد المنتج");
 buy.type="button";buy.disabled=true;dialog.append(buy);
 dialog.showModal();
}
items.forEach(p=>{
 const card=tag("article","ssDraftCard");
 const media=tag("div","ssDraftCover");
 media.append(tag("span","ssDraftSymbol",p.symbol));
 if(p.images.length)media.append(tag("span","ssDraftMediaTag","ميديا المورد تحتاج مراجعة"));
 else media.append(tag("span","ssDraftMediaTag","الصور قيد التجهيز"));
 card.append(media);
 const body=tag("div","ssDraftCardBody");
 body.append(tag("small","",p.category+" · صفقة"));
 body.append(tag("h4","",p.name));
 body.append(tag("p","",p.summary));
 body.append(tag("strong","ssDraftNoPrice","السعر الشامل للشحن: تحت المراجعة"));
 const action=tag("button","ssDraftExplore","اعرض التفاصيل والميديا");
 action.type="button";action.addEventListener("click",()=>openProduct(p));
 body.append(action);card.append(body);grid.append(card);
});
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
const selected=new URLSearchParams(window.location.search).get("safka_review");
const incoming=items.find(p=>p.id===selected);
if(incoming)openProduct(incoming);
})();
