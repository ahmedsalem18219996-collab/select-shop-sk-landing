/* SELECT SHOP / Design Review Studio
 * Isolated to preview/foundation-v1; never alters store data, analytics, orders or checkout.
 * Client-only localStorage persistence. Sending feedback requires user's explicit copy/download.
 */
(() => {
  'use strict';
  if (!window.SELECT_SHOP_PREVIEW_ONLY || !location.pathname.startsWith('/preview/foundation-v1/')) return;
  const STORAGE = 'selectShop:designReview:v1';
  const options = [
    {id:'palette',title:'الألوان والهوية',hint:'ثلاث هويات متناسقة — بدون تغيير بيانات المنتجات',selector:'.siteHeader',choices:[['copper','Graphite × Copper','فحمي ونحاسي'],['violet','Midnight Violet','بنفسجي ليلي'],['silver','Silver × Blue','رصاصي وأزرق']]},
    {id:'type',title:'الخطوط والتيكست',hint:'قارن الوزن والمسافات وطريقة عرض العناوين',selector:'.premiumHero h1',choices:[['editorial','Editorial','خطوط قوية'],['modern','Modern','هادئ ومساحات أكبر'],['minimal','Minimal','بسيط ومكثف']]},
    {id:'ticker',title:'البانر المتحرك',hint:'حركته وتأثيره على الانتباه والأداء',selector:'.premiumTicker',choices:[['scroll','متحرك','شريط دائم'],['static','ثابت','بدون حركة'],['off','إخفاء','بدون بانر']]},
    {id:'header',title:'الهيدر والقائمة',hint:'طريقة ظهور الشعار والقائمة وأيقونة السلة',selector:'.siteHeader',choices:[['classic','Premium','أساسي'],['slim','Slim','نحيف'],['floating','Floating','عائم وشفاف']]},
    {id:'hero',title:'واجهة المتجر الأولى',hint:'مقارنة توزيع النص مع صورة المنتج',selector:'.premiumHero',choices:[['split','Split','نص وصورة'],['image','Image First','الصورة أكبر'],['stack','Statement','نص بالأعلى وصورة بعرض كامل']]},
    {id:'categories',title:'أقسام المتجر',hint:'دخول الأحذية أو عناية السيارات بدون زحمة',selector:'.categoriesSection',choices:[['editorial','Editorial','قسمين واضحين'],['photographic','Photo Focus','الصورة هي البطل'],['compact','Compact','أقسام مختصرة']]},
    {id:'cards',title:'كروت الكوتشي',hint:'تجربة الصور والاختيارات والأسعار على الشاشة',selector:'.merchShelf:not(.carMerchShelf)',choices:[['showcase','Showcase','صورتان في الصف'],['dense','Dense','ثلاثة في الصف'],['list','Compare','قائمة للمقارنة']]},
    {id:'photos',title:'خلفيات صور المنتجات',hint:'لون خلفية الصورة من غير تعديل الصورة الأصلية',selector:'.shoeCardsGrid',choices:[['warm','Warm Studio','فاتح دافئ'],['white','Clean White','أبيض محايد'],['graphite','Graphite','رمادي داكن']]},
    {id:'car',title:'عرض منتج السيارات',hint:'هل نخليه قسم بارز أو مختصر؟',selector:'.carMerchShelf',choices:[['split','Spotlight','صورة ومعلومات'],['wide','Visual First','الصورة أكبر'],['compact','Compact','عرض مختصر']]},
    {id:'details',title:'نافذة تفاصيل المنتج',hint:'المسافة بين معرض الصور والألوان والمقاسات',selector:'.productDrawer',choices:[['comfortable','Comfortable','مساحات واسعة'],['compact','Compact','أقصر وأسهل'],['contrast','High Contrast','تباين أقوى']]},
    {id:'cta',title:'زر السلة على الموبايل',hint:'مكان وشكل زر الوصول للمنتجات والسلة',selector:'.mobileBar',choices:[['fixed','Fixed Bar','شريط كامل'],['mini','Compact','صغير'],['off','بدون شريط','القائمة فقط']]},
    {id:'motion',title:'الأنيميشن وسرعة الحركة',hint:'لما تحس إن تأثيرًا تقيل، اختار تقليل أو إيقاف',selector:'.techShowcase',choices:[['balanced','Balanced','حركة هادئة'],['lively','Lively','حركة أوضح'],['still','Off','إلغاء الحركات']]},
    {id:'tech',title:'TechText في الموقع',hint:'قد يكون جميلًا لكن مش لازم في صفحة شراء',selector:'.techShowcase',choices:[['on','Interactive','تفاعل بالحروف'],['quiet','Quiet','بدون تفاعل'],['off','إخفاؤه','البيع أولًا']]}
  ];
  const optionMap = Object.fromEntries(options.map(o=>[o.id,o]));
  const defaults=Object.fromEntries(options.map(o=>[o.id,o.choices[0][0]]));
  const presets={
    'editorial':{palette:'copper',type:'editorial',ticker:'scroll',header:'classic',hero:'split',categories:'editorial',cards:'showcase',photos:'warm',car:'split',details:'comfortable',cta:'fixed',motion:'balanced',tech:'on'},
    'luxury':{palette:'silver',type:'modern',ticker:'static',header:'slim',hero:'image',categories:'photographic',cards:'showcase',photos:'white',car:'wide',details:'compact',cta:'mini',motion:'still',tech:'off'},
    'creative':{palette:'violet',type:'editorial',ticker:'scroll',header:'floating',hero:'stack',categories:'editorial',cards:'dense',photos:'graphite',car:'split',details:'contrast',cta:'fixed',motion:'lively',tech:'on'}
  };
  let stored={};
  try{stored=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}
  let chosen={...defaults};
  for(const opt of options){
    const saved=stored.choices?.[opt.id];
    if(opt.choices.some(c=>c[0]===saved))chosen[opt.id]=saved;
  }
  const notes={};
  for(const opt of options){
    const v=stored.notes?.[opt.id];
    if(v && typeof v==='object'){
      notes[opt.id]={issue:['شكل','أداء','سهولة استخدام','موبايل','غير ذلك'].includes(v.issue)?v.issue:'شكل',comment:String(v.comment||'').slice(0,2000)};
    }
  }
  let active=optionMap[stored.active] ? stored.active : 'hero';
  let inspect=false, panelOpen=false, comparison=false;
  const $=s=>document.querySelector(s);
  const make=(tag,cls,text)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  };
  const setAttr=(node,name,value)=>node.setAttribute(name,value);
  function persist(){
    try{localStorage.setItem(STORAGE,JSON.stringify({choices:chosen,notes,active}))}catch{}
  }
  function applyChoices(){
    for(const [id,value] of Object.entries(comparison?defaults:chosen)) document.body.dataset['design'+id.charAt(0).toUpperCase()+id.slice(1)]=value;
    document.documentElement.classList.toggle('select-design-review-active',panelOpen);
    document.body.classList.toggle('select-design-inspect',inspect&&panelOpen);
    const tabs=$('#selectDesignCompare');
    if(tabs) tabs.textContent=comparison?'عرض اختياراتي':'مقارنة بالأصلي';
  }
  const host=make('div','selectDesignUi');
  host.id='selectDesignUi';
  const launcher=make('button','selectDesignLauncher','✦ راجع التصميم');
  launcher.type='button';
  launcher.id='selectDesignLauncher';
  launcher.setAttribute('aria-controls','selectDesignPanel');
  launcher.setAttribute('aria-expanded','false');
  host.appendChild(launcher);
  const panel=make('aside','selectDesignPanel');
  panel.id='selectDesignPanel';
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','SELECT SHOP Design Review Studio');
  panel.hidden=true;
  panel.innerHTML=
    '<div class="sdrTop"><div><small>SELECT SHOP / DESIGN STUDIO</small><h2>اختار الستايل بنفسك</h2><p>غيّر شكل أي جزء، وعلّم على اللي محتاج يتصلح.</p></div><button type="button" id="sdrClose" aria-label="إغلاق المراجعة">×</button></div>'+
    '<div class="sdrPresets"><span>تشكيلات جاهزة متناسقة</span><div id="sdrPresetOptions" class="sdrPresetOptions"></div></div>'+
    '<div class="sdrModes"><button type="button" id="sdrInspect" aria-pressed="false">◎ اختار جزء من الصفحة</button><button type="button" id="selectDesignCompare">مقارنة بالأصلي</button></div>'+
    '<p class="sdrModeHint" id="sdrModeHint">اضغط على أي جزء من المتجر لتحديده، أو اختاره من القائمة. الاختيارات للمعاينة البصرية، وليست اختبار سرعة فعلي.</p>'+
    '<div class="sdrSections" id="sdrSections" role="group" aria-label="أجزاء المتجر"></div>'+
    '<div class="sdrEditing"><div class="sdrEditingHeading"><small>الجزء المحدد</small><h3 id="sdrTitle"></h3><p id="sdrHint"></p></div><div id="sdrOptions" class="sdrOptionGrid" role="group"></div>'+
    '<label for="sdrIssue">إيه المشكلة في الجزء ده؟</label><select id="sdrIssue"><option>شكل</option><option>أداء</option><option>سهولة استخدام</option><option>موبايل</option><option>غير ذلك</option></select>'+
    '<label for="sdrComment">قولّي بالظبط تعدّل إيه</label><textarea id="sdrComment" rows="3" maxlength="2000" placeholder="مثال: الصورة بتتقصف على الموبايل، عايز خلفية أهدى وزر أكبر..."></textarea>'+
    '<button type="button" id="sdrJump">↗ روح للجزء ده</button></div>'+
    '<div class="sdrFooter"><div class="sdrFootActions"><button type="button" id="sdrCopy" class="sdrMain">نسخ التقرير وإبعتهولي</button><button type="button" id="sdrDownload">تحميل .txt</button></div><button type="button" id="sdrReset">إرجاع الاختيارات الافتراضية</button><p id="sdrStatus" role="status" aria-live="polite">اختياراتك بتتحفظ على نفس الجهاز. محتاج تبعتلي التقرير علشان أشوفها.</p></div>';
  host.appendChild(panel);
  const pickHint=make('div','sdrPickHint');
  pickHint.id='sdrPickHint';
  pickHint.innerHTML='<strong>اضغط على الجزء اللي عايز تعدّله</strong><small>بعد ما تختاره، هنرجعك للاختيارات وملاحظاتك.</small><button type="button" id="sdrCancelPick">إلغاء التحديد</button>';
  host.appendChild(pickHint);
  document.body.appendChild(host);
  const presetEl=$('#sdrPresetOptions');
  for(const [id,name] of [['editorial','Dark Editorial'],['luxury','Clean Luxury'],['creative','Midnight Creative']]){
    const button=make('button','sdrPreset',name);
    button.type='button';button.dataset.preset=id;
    button.addEventListener('click',()=>{
      Object.assign(chosen,presets[id]);comparison=false;applyChoices();persist();renderOptions();renderPresets();
      setStatus('التشكيلة اتطبقت. تقدر تعدّل كل جزء لوحده.');
    });
    presetEl.appendChild(button);
  }
  const sectEl=$('#sdrSections'),optsEl=$('#sdrOptions');
  for(const opt of options){
    const b=make('button','sdrSectionButton',opt.title);
    b.type='button';b.dataset.section=opt.id;
    b.addEventListener('click',()=>selectSection(opt.id,true));
    sectEl.appendChild(b);
  }
  function renderPresets(){
    presetEl.querySelectorAll('button').forEach(b=>{
      const picked=presets[b.dataset.preset];
      b.classList.toggle('active',!comparison&&Object.keys(picked).every(k=>picked[k]===chosen[k]));
    });
  }
  function renderOptions(){
    const opt=optionMap[active];if(!opt)return;
    $('#sdrTitle').textContent=opt.title;
    $('#sdrHint').textContent=opt.hint;
    optsEl.setAttribute('aria-label','اختيارات '+opt.title);
    optsEl.replaceChildren();
    for(const [value,title,desc] of opt.choices){
      const button=make('button','sdrOption');
      button.type='button';button.setAttribute('aria-pressed',String(chosen[active]===value&&!comparison));
      button.innerHTML='<span class="sdrOptionDot" aria-hidden="true"></span><strong></strong><small></small>';
      button.querySelector('strong').textContent=title;
      button.querySelector('small').textContent=desc;
      button.addEventListener('click',()=>{
        chosen[active]=value;comparison=false;applyChoices();persist();renderOptions();renderPresets();
      });
      optsEl.appendChild(button);
    }
    $('#sdrIssue').value=notes[active]?.issue||'شكل';
    $('#sdrComment').value=notes[active]?.comment||'';
    sectEl.querySelectorAll('button').forEach(b=>{
      const yes=b.dataset.section===active;
      b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));
    });
    highlightTarget();
  }
  let highlight=null;
  function highlightTarget(){
    if(highlight)highlight.classList.remove('sdrTarget');
    highlight=optionMap[active]?.selector ? $(optionMap[active].selector):null;
    if(panelOpen && highlight)highlight.classList.add('sdrTarget');
  }
  function selectSection(id,scroll=false){
    if(!optionMap[id])return;
    active=id;persist();renderOptions();
    if(scroll){
      const target=$(optionMap[id].selector);
      if(target && !target.closest('dialog:not([open])')) target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
      else setStatus('افتح تفاصيل منتج أو السلة من المتجر علشان تشوف التعديل.');
    }
  }
  function setStatus(text){$('#sdrStatus').textContent=text}
  function openPanel(){
    panelOpen=true;panel.hidden=false;launcher.setAttribute('aria-expanded','true');
    applyChoices();renderOptions();renderPresets();
  }
  function closePanel(){
    panelOpen=false;inspect=false;panel.hidden=true;launcher.setAttribute('aria-expanded','false');
    if(highlight)highlight.classList.remove('sdrTarget');
    applyChoices();
  }
  launcher.addEventListener('click',()=>panelOpen?closePanel():openPanel());
  $('#sdrClose').addEventListener('click',closePanel);
  $('#sdrCancelPick').addEventListener('click',()=>{if(inspect)$('#sdrInspect').click()});
  $('#sdrInspect').addEventListener('click',()=>{
    inspect=!inspect;
    $('#sdrInspect').setAttribute('aria-pressed',String(inspect));
    $('#sdrInspect').textContent=inspect?'✓ اختيار الجزء مفعّل':'◎ اختار جزء من الصفحة';
    $('#sdrModeHint').textContent=inspect?'اضغط على الهيدر أو الهيرو أو الكروت أو قسم السيارات، وهنتقل تلقائيًا لاختياراته. مش هيفتح أي طلب في وضع التحديد.':'الوضع العادي شغال. اختار جزء من القائمة أو فعّل التحديد بالضغط.';
    applyChoices();
  });
  $('#selectDesignCompare').addEventListener('click',()=>{comparison=!comparison;applyChoices();renderOptions();renderPresets()});
  $('#sdrJump').addEventListener('click',()=>selectSection(active,true));
  $('#sdrIssue').addEventListener('change',e=>{
    if(!notes[active])notes[active]={issue:'شكل',comment:''};
    notes[active].issue=e.target.value;persist();setStatus('اتحفظ نوع الملاحظة محليًا.');
  });
  $('#sdrComment').addEventListener('input',e=>{
    if(!notes[active])notes[active]={issue:'شكل',comment:''};
    notes[active].comment=e.target.value.slice(0,2000);persist();
  });
  function compileReport(){
    const time=new Date().toLocaleString('ar-EG');
    const lines=[
      'SELECT SHOP — تقرير مراجعة التصميم',
      'نسخة المعاينة: https://selectshopeg.com/preview/foundation-v1/',
      'التاريخ: '+time,
      'ملاحظة: اختيارات تجريبية ولم تُطبق على المتجر الحقيقي.',
      '',
      'الاختيارات:'
    ];
    options.forEach(o=>{
      const choice=o.choices.find(c=>c[0]===chosen[o.id]);
      lines.push('• '+o.title+': '+choice[1]+' — '+choice[2]);
    });
    lines.push('','الملاحظات على الأجزاء:');
    let n=0;
    options.forEach(o=>{
      const v=notes[o.id];
      if(v && String(v.comment||'').trim()){
        n++;
        lines.push('['+o.title+'] ('+v.issue+'): '+v.comment.trim());
      }
    });
    if(!n)lines.push('لا توجد ملاحظات مكتوبة.');
    lines.push('','المطلوب: نفّذ اختيارات التصميم أعلاه كمراجعة منفصلة، مع الحفاظ على بيانات المنتجات والسلة والطلب والتتبع، وراجع الأداء على الموبايل قبل النشر.');
    return lines.join('\n');
  }
  $('#sdrCopy').addEventListener('click',async()=>{
    const report=compileReport();
    try{
      if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(report);setStatus('التقرير اتنسخ. الصقه هنا في الشات وهنفّذ الملاحظات.');return}
      throw Error('clipboard unsupported');
    }catch{
      const t=make('textarea','sdrCopyFallback');t.value=report;panel.appendChild(t);t.focus();t.select();
      let ok=false;try{ok=document.execCommand('copy')}catch{}
      t.remove();setStatus(ok?'التقرير اتنسخ؛ الصقه هنا في الشات.':'النسخ التلقائي مش متاح؛ استخدم زر تحميل .txt وأبعت الملف.');
    }
  });
  $('#sdrDownload').addEventListener('click',()=>{
    const blob=new Blob([compileReport()],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='SELECT-SHOP-design-feedback.txt';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setStatus('اتحمّل التقرير على جهازك؛ ابعتهولي في الشات.');
  });
  $('#sdrReset').addEventListener('click',()=>{
    if(!confirm('ترجع كل اختيارات التصميم والملاحظات المحفوظة للوضع الافتراضي؟'))return;
    chosen={...defaults};Object.keys(notes).forEach(k=>delete notes[k]);
    comparison=false;active='hero';persist();applyChoices();renderOptions();renderPresets();setStatus('رجعنا للاختيارات الافتراضية.');
  });
  document.addEventListener('click',event=>{
    if(!panelOpen||!inspect||event.target.closest('#selectDesignUi'))return;
    const matched=options.slice().reverse().find(o=>{
      const t=$(o.selector);
      return !!t && (t===event.target || t.contains(event.target)) && !(t.closest('dialog:not([open])'));
    });
    if(!matched)return;
    event.preventDefault();event.stopImmediatePropagation();
    selectSection(matched.id,false);
    $('#sdrInspect').click(); // stop selection after one click so buying controls are safe again
    setStatus('اتحدد جزء «'+matched.title+'». اختار شكلًا أو اكتب ملاحظتك.');
  },true);
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape' && panelOpen && !document.querySelector('dialog[open]'))closePanel();
  });
  applyChoices();
  if(new URLSearchParams(location.search).has('review'))openPanel();
  window.SELECT_SHOP_DESIGN_STUDIO={version:1,getSelection:()=>({...chosen}),getReport:compileReport};
})();