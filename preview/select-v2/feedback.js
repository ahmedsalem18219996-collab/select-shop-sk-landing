/* SELECT SHOP Review V2 — Annotation overlay.
   Local-only notes. No network, analytics, checkout, cart or product mutations.
*/
(() => {
 'use strict';
 if(!window.SELECT_SHOP_PREVIEW_ONLY || !location.pathname.startsWith('/preview/select-v2/'))return;
 const STORAGE='selectShop:reviewV2:notes';
 const $=q=>document.querySelector(q), make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e};
 const areas=[
  {id:'ticker',title:'البانر المتحرك',selector:'.premiumTicker'},
  {id:'header',title:'الهيدر والشعار',selector:'.siteHeader'},
  {id:'heroText',title:'التيكست وعناوين الهيرو',selector:'.premiumHero .heroText'},
  {id:'heroImages',title:'صور الهيرو وحوافها',selector:'.premiumHero .heroVisual'},
  {id:'trust',title:'مميزات المتجر',selector:'.trust'},
  {id:'categories',title:'الأقسام',selector:'.categoriesSection'},
  {id:'shoeImages',title:'صور موديلات الأحذية',selector:'.shoeCardsGrid .cardMedia'},
  {id:'shoeCards',title:'كروت الأحذية',selector:'.shoeCardsGrid .productCard'},
  {id:'car',title:'منتج السيارات',selector:'[data-product-id="carwash48"]'},
  {id:'details',title:'نافذة تفاصيل المنتج',selector:'.productDrawer'},
  {id:'cart',title:'السلة',selector:'.cartDrawer'},
  {id:'mobileCTA',title:'زر الموبايل السفلي',selector:'.mobileBar'},
  {id:'footer',title:'الفوتر',selector:'.siteFooter'}
 ];
 const byId=Object.fromEntries(areas.map(a=>[a.id,a]));
 let notes=[],stored={};try{stored=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}
 if(Array.isArray(stored.notes))notes=stored.notes.filter(x=>byId[x.id]).map(x=>({id:x.id,kind:x.kind||'شكل',comment:String(x.comment||'').slice(0,2000),productId:String(x.productId||'').slice(0,30)}));
 let open=false,picking=false,selected=byId[stored.selected]?stored.selected:'heroText',productId='';
 const wrap=make('div','v2Feedback');wrap.id='v2Feedback';
 const launcher=make('button','v2FeedbackLauncher','✎ علّم على جزء');launcher.type='button';launcher.setAttribute('aria-expanded','false');
 const panel=make('aside','v2FeedbackPanel');panel.id='v2FeedbackPanel';panel.hidden=true;panel.setAttribute('aria-label','ملاحظات على SELECT SHOP V2');
 panel.innerHTML='<div class="v2fbTop"><div><small>SELECT SHOP / REVIEW MODE</small><h2>إيه اللي محتاج يتظبط؟</h2><p>علّم على الجزء في المعاينة واكتب ملاحظتك.</p></div><button type="button" id="v2fbClose" aria-label="إغلاق">×</button></div>'+
 '<button class="v2fbPick" id="v2fbPick" type="button">◎ حدّد جزء من الصفحة</button>'+
 '<label for="v2fbSection">أو اختار الجزء بالاسم</label><select id="v2fbSection"></select>'+
 '<div class="v2fbSelected" id="v2fbSelected"></div>'+
 '<label for="v2fbIssue">نوع الملاحظة</label><select id="v2fbIssue"><option>شكل</option><option>موبايل</option><option>أداء</option><option>تجربة استخدام</option><option>أنيميشن</option><option>نصوص</option></select>'+
 '<label for="v2fbComment">قولّي تعدّل إيه بالضبط</label><textarea id="v2fbComment" rows="4" maxlength="2000" placeholder="مثال: حواف صورة الموديل ده مش متناسقة، وعايز الأسهم أهدى..."></textarea>'+
 '<div class="v2fbActions"><button type="button" id="v2fbSave">احفظ الملاحظة</button><button type="button" id="v2fbCopy">انسخ التقرير</button><button type="button" id="v2fbDownload">تحميل التقرير</button></div>'+
 '<p id="v2fbStatus" role="status" aria-live="polite">الاختيارات محفوظة على جهازك فقط. التقرير مش بيوصلني إلا لما تبعته في الشات.</p>';
 const pickHint=make('div','v2fbHint');pickHint.id='v2fbHint';
 pickHint.innerHTML='<strong>اضغط على الجزء اللي عايز تعدّله</strong><button type="button" id="v2fbCancel">إلغاء</button>';
 wrap.append(launcher,panel,pickHint);document.body.appendChild(wrap);
 const select=$('#v2fbSection');
 areas.forEach(o=>{const el=make('option','',o.title);el.value=o.id;select.appendChild(el)});
 const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify({notes,selected}))}catch{}};
 const status=msg=>$('#v2fbStatus').textContent=msg;
 function entry(){return notes.find(n=>n.id===selected&&n.productId===productId)}
 function update(){
   select.value=selected;
   $('#v2fbSelected').textContent=byId[selected].title+(productId?' — '+(window.SELECT_FOUNDATION_CATALOG?.[productId]?.name||productId):'');
   const e=entry();$('#v2fbIssue').value=e?.kind||'شكل';$('#v2fbComment').value=e?.comment||'';
   document.querySelectorAll('.v2fbMark').forEach(el=>el.classList.remove('v2fbMark'));
   const target=$(byId[selected].selector);if(open && target)target.classList.add('v2fbMark');
 }
 function toggle(show){
   open=show;panel.hidden=!show;launcher.setAttribute('aria-expanded',String(show));
   if(!show)picking=false;document.body.classList.toggle('v2fbPicking',picking);
   update();
 }
 function pick(next){
   picking=next;document.body.classList.toggle('v2fbPicking',picking);
   if(picking)panel.hidden=true;
   else if(open)panel.hidden=false;
 }
 launcher.addEventListener('click',()=>toggle(!open));
 $('#v2fbClose').addEventListener('click',()=>toggle(false));
 $('#v2fbPick').addEventListener('click',()=>pick(true));
 $('#v2fbCancel').addEventListener('click',()=>pick(false));
 select.addEventListener('change',()=>{selected=select.value;productId='';persist();update()});
 document.addEventListener('click',e=>{
   if(!picking||e.target.closest('#v2Feedback'))return;
   let found=null,node=e.target;
   while(node && node!==document.body){
     found=areas.find(a=>node.matches?.(a.selector));
     if(found)break;node=node.parentElement;
   }
   if(!found)return;
   e.preventDefault();e.stopImmediatePropagation();
   selected=found.id;productId=e.target.closest('[data-product-id]')?.dataset.productId||'';
   persist();pick(false);update();
   status('اتحدد '+byId[selected].title+'. اكتب ملاحظتك واضغط حفظ.');
 },true);
 $('#v2fbSave').addEventListener('click',()=>{
   const text=$('#v2fbComment').value.trim(),kind=$('#v2fbIssue').value;
   if(!text){status('اكتب الملاحظة الأول.');return}
   notes=notes.filter(n=>!(n.id===selected&&n.productId===productId));
   notes.push({id:selected,kind,comment:text.slice(0,2000),productId});
   persist();status('اتحفظت الملاحظة على جهازك. عدد الملاحظات: '+notes.length);
 });
 function report(){
   const lines=[
    'SELECT SHOP — ملاحظات على النسخة الجديدة',
    'الرابط: https://selectshopeg.com/preview/select-v2/',
    'نسخة منفصلة، لا تغييرات حقيقية في الطلبات أو الشحن.',
    'التاريخ: '+new Date().toLocaleString('ar-EG'),
    '',
    'اختيارات التصميم المثبتة: Graphite × Copper، Editorial، شريط متحرك، هيدر عائم، Statement Hero، أقسام مختصرة، Showcase cards، صور Warm Studio، منتج السيارات Compact، تفاصيل High Contrast، Mobile Fixed CTA، حركة Balanced، بدون TechText.',
    '',
    'الملاحظات:'
   ];
   if(!notes.length)lines.push('لا توجد ملاحظات محفوظة بعد.');
   notes.forEach((n,i)=>lines.push((i+1)+'. ['+byId[n.id].title+(n.productId?' — '+(window.SELECT_FOUNDATION_CATALOG?.[n.productId]?.name||n.productId):'')+'] ('+n.kind+'): '+n.comment));
   lines.push('','المطلوب: راجع الملاحظات أعلاه على نفس نسخة V2 دون تغيير المنتجات والأسعار أو السلة والطلب والتتبع ودون نشر الموقع الحقيقي.');
   return lines.join('\n');
 }
 $('#v2fbCopy').addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(report());status('تم نسخ التقرير. الصقه هنا في الشات.')}
   catch{status('النسخ مش متاح في المتصفح؛ استخدم تحميل التقرير.')}
 });
 $('#v2fbDownload').addEventListener('click',()=>{
   const a=document.createElement('a'),url=URL.createObjectURL(new Blob([report()],{type:'text/plain;charset=utf-8'}));
   a.href=url;a.download='SELECT-SHOP-V2-feedback.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
   status('تم تحميل التقرير. ابعته في الشات.');
 });
 window.SELECT_SHOP_V2_FEEDBACK={getReport:report,count:()=>notes.length};
 if(new URLSearchParams(location.search).has('review'))toggle(true);
})();
