// SELECT SHOP UX walk-through: real Chromium desktop, Chrome-sized mobile and iPhone WebKit.
// Strictly read-only: never submit, simulate or store a real customer order.
import {chromium, webkit} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
const root="https://selectshopeg.com";
const out="test-results/customer-journey";
await mkdir(out,{recursive:true});
const RESULTS=[];
const runners={chromium:await chromium.launch({headless:true}),webkit:await webkit.launch({headless:true})};
const profiles=[
 {name:"desktop",engine:"chromium",width:1440,height:900,isMobile:false,hasTouch:false},
 {name:"mobile-android",engine:"chromium",width:390,height:844,isMobile:true,hasTouch:true},
 {name:"mobile-iphone-safari",engine:"webkit",width:390,height:844,isMobile:true,hasTouch:true}
];
const record=(res,type,title,value,detail="")=>res.events.push({type,title,value,detail});
const step=async(res,title,fn)=>{
 try{const value=await fn();record(res,"pass",title,value);return value}
 catch(e){record(res,"fail",title,false,String(e.message||e).slice(0,400));return null}
};
const inspect=()=>({
 width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
 scrollY:window.scrollY,bodyHeight:document.body.scrollHeight,
 title:document.getElementById("heroTitle")?.innerText||"",
 carts:[...document.querySelectorAll("[data-open-cart],[data-safka-bag-open]")].map(b=>({
  label:b.getAttribute("aria-label")||b.textContent.trim(),visible:!!(b.offsetWidth||b.offsetHeight),
  rect:(()=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()
 })),
 heroImages:[...document.querySelectorAll(".tgh-tile img")].slice(0,20).map(img=>({
  src:img.getAttribute("src"),loaded:img.complete&&img.naturalWidth>0
 })),
 productCards:document.querySelectorAll(".ssSafkaUnifiedCard").length,
 chips:document.querySelectorAll("[data-quick-search]").length
});
for(const p of profiles){
 const browser=runners[p.engine];
 const context=await browser.newContext({viewport:{width:p.width,height:p.height},
   deviceScaleFactor:1,isMobile:p.isMobile,hasTouch:p.hasTouch,
   locale:"ar-EG",timezoneId:"Africa/Cairo"});
 const page=await context.newPage();
 const res={device:p.name,events:[],jsErrors:[],failedRequests:[],headlines:[],snapshots:[]};
 RESULTS.push(res);
 page.on("pageerror",e=>res.jsErrors.push(String(e.message||e).slice(0,280)));
 page.on("requestfailed",q=>{
   if(/selectshopeg.com|supabase.co/.test(q.url()))res.failedRequests.push(q.url().slice(0,190)+" "+q.failure()?.errorText)
 });
 try{
   await step(res,"Open homepage",async()=>{
      const r=await page.goto(root,{waitUntil:"domcontentloaded",timeout:60000});
      if(r.status()!==200)throw Error("Unexpected HTTP "+r.status());
      await page.locator("#heroTitle").waitFor({state:"visible",timeout:20000});
      await page.screenshot({path:out+"/"+p.name+"-01-home.png"});
      return{status:r.status(),title:await page.locator("#heroTitle").innerText()}
   });
   await step(res,"Homepage layout and hero images",async()=>{
      await page.waitForTimeout(1900);
      const data=await page.evaluate(inspect);
      if(data.scrollWidth>data.width+4)throw Error("Horizontal overflow "+(data.scrollWidth-data.width)+"px");
      if(!data.heroImages.length)throw Error("Hero has no rotating images");
      if(data.heroImages.every(im=>!im.loaded))throw Error("No hero carousel images loaded");
      if(!data.title.includes("DISCOVER"))throw Error("Unexpected hero text");
      return data;
   });
   await step(res,"Single cart entry explains separate fulfillment",async()=>{
      const original=page.locator("[data-open-cart]").first();
      await original.click();
      const hub=page.locator("dialog.ssUnifiedHub[open]");
      await hub.waitFor({state:"visible",timeout:9000});
      const choices=hub.locator(".ssUnifiedHubOption");
      if(await choices.count()!==2)throw Error("Cart chooser must explain both item groups");
      if(!(await hub.innerText()).includes("طلبين منفصلين"))
        throw Error("Separate checkout costs must be explained to shoppers");
      await choices.first().click();
      const supplier=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      await supplier.waitFor({state:"visible",timeout:13000});
      await supplier.locator(".ssBagClose").click();
      return{oneVisibleCartEntrance:true,separateFulfillmentDisclosed:true};
   });
   await step(res,"Discover catalog from hero CTA",async()=>{
      const heroCTA=page.locator(".heroActions a[href*='#products']").first();
      await heroCTA.click({timeout:12000});
      await page.locator(".ssSafkaUnifiedCard").first().waitFor({state:"visible",timeout:25000});
      await page.screenshot({path:out+"/"+p.name+"-02-catalog.png"});
      return{scrollY:await page.evaluate(()=>window.scrollY),firstCards:await page.locator(".ssSafkaUnifiedCard").count()};
   });
   await step(res,"Search relevant product",async()=>{
      const input=page.locator("#searchInput");
      await input.fill("تنظيف");
      await page.waitForTimeout(1500);
      const cards=await page.locator(".ssSafkaUnifiedCard").count();
      if(cards<1)throw Error("Search returned no supplier cards");
      const sample=await page.locator(".ssSafkaUnifiedCard").first().innerText();
      await page.screenshot({path:out+"/"+p.name+"-03-search.png"});
      await input.fill("");
      await page.waitForTimeout(800);
      return{query:"تنظيف",cards,sample:sample.slice(0,130)};
   });
   await step(res,"Open product details and video",async()=>{
      await page.locator(".ssSafkaUnifiedCard").first().locator(".ssSafkaUnifiedOpen").click({timeout:15000});
      const modal=page.locator("dialog.ssSafkaDialog[open]");
      await modal.waitFor({state:"visible",timeout:15000});
      const price=await modal.innerText();
      const videos=await modal.locator(".ssSafkaVideoThumb").count();
      let embed="";
      if(videos){
        await modal.locator(".ssSafkaVideoThumb").first().click();
        embed=await modal.locator(".ssSafkaInStoreVideo iframe").first().getAttribute("src");
      }
      await page.screenshot({path:out+"/"+p.name+"-04-detail.png"});
      await modal.locator(".ssSafkaClose").click();
      if(/سعر صفقة|كود صفقة|90 جنيه|110 جنيه/.test(price))throw Error("Supplier or shipping note exposed");
      return{videoOptions:videos,inlineEmbed:!!embed,excerpt:price.slice(0,180)};
   });
   await step(res,"Add a product to shopping bag",async()=>{
      const card=page.locator(".ssSafkaUnifiedCard").filter({has:page.locator("button.ssSafkaCardAdd:not([disabled])")}).first();
      await card.locator(".ssSafkaCardAdd").click({timeout:15000});
      const choice=page.locator("dialog.ssBagChoice[open]");
      if(await choice.count())await choice.locator(".ssBagPrimary").click();
      const bag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      await bag.waitFor({state:"visible",timeout:12000});
      const lines=await bag.locator(".ssBagItem").count();
      if(lines!==1)throw Error("Expected one cart line, got "+lines);
      const options=await bag.locator('[data-bag-recommendations] .ssBagSuggestion').count();
      await page.screenshot({path:out+"/"+p.name+"-05-bag.png"});
      return{items:lines,suggestionsInitially:options,text:(await bag.innerText()).slice(0,340)};
   });
   await step(res,"Smart-cart suggestion adds a second item",async()=>{
      const bag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      const rec=bag.locator("[data-bag-recommendations] .ssBagSuggestion").first();
      await rec.waitFor({state:"visible",timeout:22000});
      await rec.locator("button.ssBagSuggestionAdd").click();
      const choice=page.locator("dialog.ssBagChoice[open]");
      if(await choice.count())await choice.locator(".ssBagPrimary").click();
      const reopened=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      await reopened.waitFor({state:"visible",timeout:15000});
      const count=await reopened.locator(".ssBagItem").count();
      if(count<2)throw Error("Suggested item not added to same basket");
      await page.screenshot({path:out+"/"+p.name+"-06-two-products.png"});
      return{lines:count,total:await reopened.locator("[data-bag-total]").innerText()};
   });
   await step(res,"Change quantities and continue shopping",async()=>{
      const bag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      const before=await bag.locator("[data-bag-total]").innerText();
      await bag.locator(".ssBagItem").first().locator(".ssBagQty button").nth(1).click();
      const after=await bag.locator("[data-bag-total]").innerText();
      if(before===after)record(res,"warning","Quantity control requires extra taps",before);
      await bag.locator("[data-bag-continue]").click();
      await bag.waitFor({state:"hidden",timeout:9000});
      await page.locator("[data-open-cart]").first().click({timeout:12000});
      await bag.waitFor({state:"visible",timeout:10000});
      const lines=await bag.locator(".ssBagItem").count();
      if(lines<2)throw Error("Continue shopping cleared bag");
      return{lines,totalBefore:before,totalAfter:after};
   });
   await step(res,"Review checkout without creating an order",async()=>{
      const bag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      await bag.locator("[data-bag-checkout]").click();
      const phone=bag.locator('[name="phone"]');
      await phone.waitFor({state:"visible",timeout:15000});
      const inputs=await bag.locator("input:not([type=hidden]),select,textarea").count();
      const disabled=await bag.locator('button[type="submit"]').isDisabled();
      await page.screenshot({path:out+"/"+p.name+"-07-checkout.png"});
      return{fields:inputs,submitWaitingForValidation:disabled,summary:(await bag.innerText()).slice(-350)};
   });
   await step(res,"Check basket survives a refresh",async()=>{
      await page.reload({waitUntil:"domcontentloaded",timeout:60000});
      await page.locator("[data-open-cart]").first().click({timeout:14000});
      const bag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
      await bag.waitFor({state:"visible",timeout:14000});
      const count=await bag.locator(".ssBagItem").count();
      if(count<2)throw Error("Local shopping bag lost products on reload");
      await bag.locator(".ssBagClose").click();
      return{lines:count};
   });
   await step(res,"Global navigation and competing carts",async()=>{
      const initial=await page.evaluate(inspect);
      const supplierLauncher=page.locator("[data-safka-bag-open]");
      if(await supplierLauncher.count()&&await supplierLauncher.isVisible())
        throw Error("Two visible cart buttons confuse customers");
      const unified=page.locator("[data-open-cart]").first();
      const countBadge=await unified.locator("[data-ss-unified-count]").innerText();
      if(!countBadge.trim()||countBadge.trim()==="0"||countBadge.trim()==="٠")
        throw Error("Unified cart badge doesn't include supplier items");
      const unusable=initial.carts.filter(x=>x.visible&&x.rect.w<40);
      if(unusable.length)record(res,"warning","Small cart tap targets",unusable);
      return{cartButtons:initial.carts,smallTapTargets:unusable.length};
   });
   await step(res,"Confirm desktop density and Safari checkout select contrast",async()=>{
     const css=await page.evaluate(()=>{
       const grid=document.querySelector(".shoeCardsGrid.unifiedCardsGrid");
       const columns=grid?getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length:0;
       return {gridColumns:columns};
     });
     if(p.name==="desktop"&&css.gridColumns<4)throw Error("Only "+css.gridColumns+" giant desktop cards per row");
     if(p.engine==="webkit"){
       const shoe=page.locator(".ssSafkaUnifiedCard button.ssSafkaCardBuy:not([disabled])").first();
       await shoe.click();
       const modal=page.locator("dialog.ssCoDialog[open]");
       await modal.waitFor({state:"visible",timeout:11000});
       const select=modal.locator("select.ssCoInput").first();
       const colors=await select.evaluate(el=>{
         const style=getComputedStyle(el);
         return {background:style.backgroundColor,color:style.color,fill:style.getPropertyValue("-webkit-text-fill-color")};
       });
       await page.screenshot({path:out+"/"+p.name+"-08-readable-dropdown.png"});
       await modal.locator(".ssCoClose").click();
       if(/rgb\\(255, 255, 255\\)/.test(colors.background))throw Error("Safari dropdown white on white");
       return {gridColumns:css.gridColumns,selectColors:colors};
     }
     return css;
   });
   await step(res,"Check image and viewport health",async()=>{
     const d=await page.evaluate(()=>{
       const imgs=[...document.querySelectorAll(".ssSafkaUnifiedCard img")].filter(x=>{
          const r=x.getBoundingClientRect();
          return r.width>0&&r.top<innerHeight*3
       });
       const broken=imgs.filter(img=>img.complete&&img.naturalWidth===0).map(img=>img.src.slice(0,110));
       return{viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
         imagesExamined:imgs.length,broken};
     });
     if(d.scrollWidth>d.viewport+4)throw Error("Horizontal overflow");
     if(d.broken.length)record(res,"warning","Broken visible images",d.broken);
     return d;
   });
 }catch(e){record(res,"critical","Whole journey crashed",false,String(e.stack||e).slice(0,1000))}
 finally{
  await writeFile(out+"/"+p.name+".json",JSON.stringify(res,null,2),"utf8");
  await context.close();
 }
}
for(const x of Object.values(runners))await x.close();
const tally=RESULTS.map(p=>({device:p.device,passed:p.events.filter(e=>e.type==="pass").length,
  failed:p.events.filter(e=>e.type==="fail").length,
  warnings:p.events.filter(e=>e.type==="warning").length,errors:p.jsErrors.length,
  failures:p.events.filter(e=>e.type!=="pass")}));
await writeFile(out+"/report.json",JSON.stringify({created:new Date().toISOString(),tally,results:RESULTS},null,2));
console.log("CUSTOMER_JOURNEY_REPORT_JSON_START");
console.log(JSON.stringify({created:new Date().toISOString(),tally,results:RESULTS}));
console.log("CUSTOMER_JOURNEY_REPORT_JSON_END");
if(tally.some(x=>x.failed||x.errors))process.exitCode=1;
