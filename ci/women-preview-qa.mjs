// WOMEN Claude V2 — GitHub Pages isolated static preview acceptance.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const ROOT=resolve("preview/women"), failures=[];
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".woff2":"font/woff2",".svg":"image/svg+xml"};
const server=createServer(async (req,res)=>{
 try{
  let p=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  if(p==="/")p="/index.html";
  const path=resolve(ROOT,"."+p);
  if(path!==ROOT&&!path.startsWith(ROOT+sep)) {res.writeHead(403);res.end();return;}
  const body=await readFile(path);
  res.writeHead(200,{"Content-Type":MIME[extname(path)]||"application/octet-stream","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(body);
 }catch(e){res.writeHead(404);res.end("Not found");}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const ORIGIN="http://127.0.0.1:"+server.address().port;
const widths=[320,360,390,400,768,1280];
await mkdir("test-results",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1,reducedMotion:"reduce",isMobile:width<768,hasTouch:width<768});
  page.on("pageerror",e=>failures.push(width+" page error: "+e.message));
  page.on("console",e=>{if(e.type()==="error") failures.push(width+" browser console: "+e.text());});
  page.on("request",request=>{if(!request.url().startsWith(ORIGIN+"/"))failures.push(width+" external request: "+request.url().slice(0,100));});
  try{
   const response=await page.goto(ORIGIN+"/?design-preview=1",{waitUntil:"load",timeout:30000});
   await page.waitForFunction(()=>document.querySelectorAll("#feed .card").length===14,{timeout:30000}).catch(()=>{});
   await page.evaluate(()=>document.fonts.ready);
   const m=await page.evaluate(()=>({
    viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,scrollY,
    dir:document.documentElement.dir,demo:!document.querySelector("#demoNote")?.hidden,
    title:document.title,products:document.querySelectorAll("#feed .card").length,
    stories:document.querySelectorAll("#stories .story").length,looks:document.querySelectorAll("#looks .look").length,
    tape:document.querySelectorAll("#tape .seg").length,meta:document.querySelector('meta[name="robots"]')?.content
   }));
   console.log("Claude V2",width,response.status(),JSON.stringify(m));
   if(response.status()!==200)failures.push(width+" html HTTP "+response.status());
   if(m.dir!=="rtl"||m.scrollY>3||m.document>m.viewport+2||m.body>m.viewport+2)failures.push(width+" RTL/top/overflow "+JSON.stringify(m));
   if(!m.demo||!m.meta?.includes("noindex"))failures.push(width+" explicit design-preview banner/noindex missing");
   if(m.products!==14||m.stories!==5||m.looks!==3||m.tape!==9)failures.push(width+" original Claude interactions/data not loaded");
   if(width===390){
    await page.screenshot({path:"test-results/women-preview-mobile-390.png",fullPage:true,animations:"disabled"});
    await page.locator("#tape .seg").filter({hasText:"فساتين"}).first().click();
    await page.waitForTimeout(700);
    const count=(await page.locator("#countOut").textContent())?.trim();
    console.log("tape category result",count);
    if(count!=="3 قطع")failures.push("tape should select dresses: "+count);
    // Reset the category without changing window scroll artificially.
    await page.locator("#tape .seg").filter({hasText:"الكل"}).first().click();
    await page.waitForTimeout(500);
    await page.locator("#feed .heart").first().click();
    if((await page.locator(".savedot").first().textContent())?.trim()!=="1")failures.push("wishlist toggle failed");
    await page.locator("#feed .add").first().click();
    if(!(await page.locator("#sheet").evaluate(e=>e.classList.contains("show"))))failures.push("size sheet did not open");
    if((await page.locator("#shSizes .size").count())!==5)failures.push("size sheet choices missing");
    await page.locator("#finder summary").click();
    await page.locator("#fBust").fill("92");
    await page.locator("#fWaist").fill("76");
    const rec=await page.locator("#shSizes .size.rec").first().getAttribute("data-z");
    if(rec!=="M")failures.push("size finder incorrect: "+rec);
    await page.locator("#shAdd").click();
    await page.waitForTimeout(350);
    if((await page.locator(".bagdot").first().textContent())?.trim()!=="1")failures.push("demo bag counter failed");
    await page.locator("#stories .story").first().click();
    if(!(await page.locator("#viewer").evaluate(e=>e.classList.contains("show"))))failures.push("story viewer failed");
    await page.goBack({waitUntil:"domcontentloaded"}).catch(()=>{});
    await page.waitForTimeout(150);
    if(await page.locator("#viewer").evaluate(e=>e.classList.contains("show")))failures.push("mobile Back failed to close story");
    const fonts=await page.evaluate(()=>Array.from(document.fonts).map(x=>({family:x.family,status:x.status})));
    console.log("fonts",JSON.stringify(fonts.slice(0,12)));
   }
   if(width===1280)await page.screenshot({path:"test-results/women-preview-desktop-1280.png",fullPage:true,animations:"disabled"});
  }catch(e){failures.push(width+" test error "+e.stack?.slice(0,500));}
  finally{await page.close();}
 }
 // Public/default mode MUST NOT display Claude's 14 fake prices or invent shipping claims.
 const live=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
 try{
  const r=await live.goto(ORIGIN+"/",{waitUntil:"load",timeout:25000});
  await live.waitForFunction(()=>!!document.querySelector("#demoNote")?.textContent?.includes("متجر WOMEN"),null,{timeout:25000});
  const state=await live.evaluate(()=>({
    title:document.title, demo:window.SELECT_CONFIG.demo, count:document.querySelectorAll("#feed .card").length,
    story:document.querySelectorAll("#stories .story").length,
    fake:document.body.textContent.includes("فستان ميدي كتان"),
    note:document.querySelector("#demoNote")?.textContent?.trim(),
    width:document.documentElement.scrollWidth,viewport:innerWidth
  }));
  console.log("LIVE MODE",r.status(),JSON.stringify(state));
  if(state.demo!==false||state.fake||state.count!==0||state.story!==0||!state.note?.includes("الطلبات")||state.width>state.viewport+2)
    failures.push("Live WOMEN storefront is showing fake catalog or broken: "+JSON.stringify(state));
  await live.screenshot({path:"test-results/women-live-mobile-390.png",fullPage:true,animations:"disabled"});
 }catch(e){failures.push("Live catalog smoke "+e.message)}
 finally{await live.close();}
 for(const f of ["assets/fonts/rakkas-400-arabic.woff2","assets/fonts/readex-pro-arabic.woff2","assets/fonts/dm-mono-400-latin.woff2","css/styles.css","js/app.js"]){
  const r=await fetch(ORIGIN+"/"+f);
  console.log("asset",f,r.status,r.headers.get("content-type"));
  if(r.status!==200)failures.push("missing asset "+f);
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
if(failures.length){console.error("FAILED:\n"+failures.join("\n"));process.exitCode=1}
else console.log("PASS: original Claude V2 responsive, demo-safe, interactions and locally hosted assets");
