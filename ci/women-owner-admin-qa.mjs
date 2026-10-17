// Standalone browser and API regression. No credentials or writes.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const file = pathToFileURL(resolve("preview/women/admin/index.html")).toString();
const pageHtml = readFileSync("preview/women/admin/index.html","utf8");
const previewHtml = readFileSync("preview/women/index.html","utf8");
const failures = [];
if(!pageHtml.includes("women-store-bridge")||!pageHtml.includes("auth/v1/token")||!pageHtml.includes('id="loginForm"')) failures.push("login integration missing");
if(!previewHtml.includes('href="./admin/"')) failures.push("Owner admin link missing from WOMEN temporary preview");
if(!pageHtml.includes("sessionStorage")||pageHtml.includes("SUPABASE_SECRET_KEY")) failures.push("secret/auth session guard missing");
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
mkdirSync("test-results",{recursive:true});
try{
 for(const width of [320,360,390,400,768,1280]){
  const page=await browser.newPage({viewport:{width,height:840}});
  page.on("pageerror",e=>failures.push(width+" js exception "+e.message));
  await page.goto(file,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>document.fonts.ready);
  const m=await page.evaluate(()=>({w:window.innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,dir:document.documentElement.dir,login:!!document.querySelector("#loginForm"),hidden:document.querySelector("#appScreen").hidden}));
  if(m.document>m.w+1||m.body>m.w+1)failures.push(width+" sideways scroll "+JSON.stringify(m));
  if(!m.login||m.dir!=="rtl"||!m.hidden)failures.push(width+" admin interface invalid");
  if(width===390)await page.screenshot({path:"test-results/women-admin-login-390.png",fullPage:true});
  if(width===1280)await page.screenshot({path:"test-results/women-admin-login-desktop.png",fullPage:true});
  console.log("Admin UI "+width+"px",JSON.stringify(m));
  await page.close();
 }
}finally{await browser.close()}
async function check(url,expected){
 try{
  const res=await fetch(url,{headers:{Origin:"https://selectshopeg.com",Accept:"application/json"},signal:AbortSignal.timeout(15000)});
  let parsed=null;
  try{parsed=await res.json()}catch{}
  console.log("Edge "+url.substring(url.lastIndexOf("/")+1)+" HTTP "+res.status+" "+JSON.stringify(parsed).slice(0,150));
  if(res.status!==expected)failures.push("API "+url+" expected "+expected+" got "+res.status);
  if(expected===200&&(!parsed||typeof parsed!=="object"))failures.push("API did not return JSON");
 }catch(e){failures.push("API "+url+" failed "+e.message)}
}
const base="https://byluoipdunralsurwebt.supabase.co/functions/v1/women-store-bridge";
await check(base+"/health",200);
await check(base+"/catalog",200);
await check(base+"/admin/session",401);
try {
 const options=await fetch(base+"/admin/products",{
   method:"OPTIONS",
   headers:{Origin:"https://selectshopeg.com","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"authorization,content-type"},
   signal:AbortSignal.timeout(10000)
 });
 const allowed=options.headers.get("access-control-allow-origin");
 console.log("Edge preflight",options.status,allowed);
 if(options.status!==204 || allowed!=="https://selectshopeg.com")failures.push("Owner CORS preflight failed");
} catch(e){failures.push("Owner CORS preflight error "+e.message)}
if(failures.length){console.error("FAIL:\n"+failures.join("\n"));process.exitCode=1}
else console.log("PASS: responsive Owner admin UI and real WOMEN-only edge readiness");
