// SELECT SHOP WOMEN — neutral GitHub Pages Claude-design handoff smoke.
// Read-only: public path must be safe, RTL, responsive, and not offer fake purchases.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const url = pathToFileURL(resolve("preview/women/index.html")).toString();
const widths = [320,360,390,400,768,1280];
const errors=[];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:860}});
    page.on("pageerror",err=>errors.push(width+" JS error "+err.message));
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>document.fonts.ready);
    const state=await page.evaluate(()=>({
      viewport:innerWidth,root:document.documentElement.scrollWidth,
      body:document.body.scrollWidth,rtl:document.documentElement.dir==="rtl",
      title:document.title,heading:document.querySelector("h1")?.textContent||"",
      scripts:document.scripts.length,images:document.images.length,
      buttons:document.querySelectorAll("button").length,
    }));
    if(state.root>width+1||state.body>width+1)errors.push(width+" overflow "+JSON.stringify(state));
    if(!state.rtl||!state.title.includes("WOMEN")||!state.heading.includes("التصميم الجديد"))errors.push(width+" handoff placeholder mismatch");
    if(state.scripts!==0||state.buttons!==0||state.images!==0)errors.push(width+" old interactive design unexpectedly present");
    if(width===390)await page.screenshot({path:"test-results/women-preview-mobile-390.png",fullPage:true});
    if(width===1280)await page.screenshot({path:"test-results/women-preview-desktop.png",fullPage:true});
    console.log("WOMEN GitHub Pages clean handoff",width,JSON.stringify(state));
    await page.close();
  }
} finally { await browser.close(); }
if(errors.length){console.error("FAIL:\n"+errors.join("\n"));process.exitCode=1}
else console.log("PASS: clean neutral GitHub Pages handoff with zero old designs and no checkout.");
