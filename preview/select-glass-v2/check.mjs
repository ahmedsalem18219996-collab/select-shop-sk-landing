import assert from "node:assert/strict";
import {chromium} from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const base="http://127.0.0.1:4173/preview/select-glass-v2/";
const output="test-results/select-glass-v2";
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const sample=Array.from({length:20},(_,i)=>({
 id:(i+1).toString(16).padStart(24,"0"),
 name:["منفاخ الإطارات TirePro","كشاف وراديو الطوارئ","فرشاة التنظيف 5×1","كاميرا الفحص","منظم السيارة","مروحة إضاءة ذكية","ماكينة العناية","كشاف إضاءة مغناطيسي"][i%8]+" "+(i+1),
 display_price_egp:585+(i*40),price_status:"indicative",
 category_key:i%2===0?"car":"home",
 category_name:i%2===0?"للعربية":"للبيت",
 images:[],variants:[{id:(i+80).toString(16).padStart(24,"0"),available:true,display_price_egp:585+i*40}]
}));
let count=0;
for(const [label,width,height] of [["desktop",1440,960],["mobile",390,844],["small",320,720]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 const external=[];
 await page.route("**/functions/v1/**",r=>{external.push("MUTATION? "+r.request().url());return r.abort();});
 await page.route("**/rest/v1/rpc/ss_safka_curated_catalog_v1",r=>{
   assert.equal(r.request().method(),"POST");
   return r.fulfill({status:200,contentType:"application/json",
     body:JSON.stringify({items:sample,categories:[{key:"car",name:"للعربية",count:10},{key:"home",name:"للبيت",count:10}],total:20,curated_mode:true})});
 });
 await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
 await page.locator(".product-card").first().waitFor({state:"visible",timeout:15000});
 assert.equal(await page.locator(".product-card").count(),8);
 assert.equal(await page.locator("#heroHeading").innerText().then(s=>s.includes("Everyday Luxury")),true);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert(overflow<=4,label+" horizontal overflow: "+overflow);
 assert.equal(await page.locator("#previewCart").count(),1);
 assert.equal(await page.locator(".values-grid .value-item").count(),4,"Premium values section incomplete");
 assert.equal(await page.locator("#membershipForm").count(),1,"Private membership CTA missing");
 assert.equal(await page.locator(".story-card").count(),1,"Editorial storytelling missing");
 assert.equal(await page.locator(".brand-ribbon").count(),1,"Brand editorial strip missing");

 assert.equal(external.length,0,"Unexpected order/payment API invoked");
 const blur=await page.locator(".hero-content").evaluate(x=>getComputedStyle(x).backdropFilter);
 assert(blur.includes("blur"),"Missing frosted-glass effect");
 await page.screenshot({path:path.join(output,label+".png"),fullPage:true,animations:"disabled"});
 if(label==="desktop"){
   await page.locator("#memberEmail").fill("preview@example.invalid");
   await page.locator("#membershipForm button[type=submit]").click();
   assert((await page.locator("#memberFeedback").innerText()).includes("لم نحفظ أو نرسل"),"Membership falsely claims a subscription");
   assert.equal(await page.locator("#memberEmail").inputValue(),"","Preview accidentally retained email");
 }
 await page.locator("#themeToggle").click();
 assert.equal(await page.locator("body.theme-light").count(),1);
 assert.equal(await page.locator("#themeName").innerText(),"Dark");
 if(label==="desktop"){
   await page.locator("#categoryFilters button[data-category='car']").click();
   assert.equal(await page.locator(".product-card").count(),10);
   await page.locator("#categoryFilters button[data-category='all']").click();
   await page.locator("#productSearch").fill("TirePro");
   assert.equal(await page.locator(".product-card").count(),3);
   await page.locator("#productSearch").fill("");
   await page.locator("#loadMore").click();
   assert.equal(await page.locator(".product-card").count(),20);
   await page.locator(".inspect-btn").first().click();
   assert.equal(await page.locator("dialog[open]").count(),1);
   await page.locator("#closeDialog").click();
   assert.equal(await page.locator("dialog[open]").count(),0);
   await page.screenshot({path:path.join(output,"desktop-light.png"),fullPage:true,animations:"disabled"});
 }else{
   await page.locator("#menuToggle").click();
   assert.equal(await page.locator("#mobileNav").isVisible(),true);
   await page.locator("#mobileNav a[href='#products']").click();
   assert.equal(await page.locator("#mobileNav").isVisible(),false);
 }
 assert.equal(external.length,0,"Unexpected live write endpoint request");
 count++;
 await page.close();
}
await browser.close();
console.log(JSON.stringify({ok:true,profiles:count,productData:"mocked read-only",noOrders:true,output},null,2));
