// Admin V3 security smoke: public static HTML may load, but no demo can bypass login.
// No real credentials, orders, user accounts or Supabase writes are used.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";

const ROOT=resolve("preview/women/admin-v3");
const appJs=readFileSync(resolve(ROOT,"js/app.js"),"utf8");
const apiJs=readFileSync(resolve(ROOT,"js/api.js"),"utf8");
const html=readFileSync(resolve(ROOT,"index.html"),"utf8");
assert(!/data-demo|enterDemo|data-exit-demo/.test(appJs),"Demo-entry UI or handler must not exist");
assert(!/getMock|enterDemo|mode\(\) === 'demo'/.test(apiJs),"Demo authentication or mock backend bypass must not exist");
assert(/export const hasSession = \(\) => !!session/.test(apiJs),"Real authenticated session must gate dashboard");
assert(/sessionStorage\.getItem\(KEY\)/.test(apiJs),"Token should be scoped to a browser tab");
assert(!html.includes("js/app.js?v=4"),"Browser must fetch updated, cache-busted entry");
await assert.rejects(access(resolve(ROOT,"js/mock.js")),"Public mock admin backend must not ship");

const failures=[];
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  if(pathname==="/")pathname="/index.html";
  const full=resolve(ROOT,"."+pathname);
  if(full!==ROOT&&!full.startsWith(ROOT+sep)){res.writeHead(403);res.end();return}
  const buffer=await readFile(full);
  res.writeHead(200,{"Content-Type":types[extname(full)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(buffer);
 }catch(e){res.writeHead(404);res.end("Not found")}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
mkdirSync("test-results",{recursive:true});
try{
 for(const width of [320,360,390,400,768,1280]){
  const page=await browser.newPage({viewport:{width,height:850}});
  page.on("pageerror",err=>failures.push(width+" runtime: "+err.message));
  const attempts=[];
  page.on("request",req=>{if(req.url().includes("/functions/v1/women-admin/call"))attempts.push(req.url());});
  try{
   await page.addInitScript(()=>{
     // Verify that old persistent token and obsolete demo flag never bypass login.
     sessionStorage.setItem("wa.mode","demo");
     localStorage.setItem("wa.session",JSON.stringify({
       access_token:"fake-demo-token",refresh_token:"fake-refresh",expires_at:Date.now()+3600000,email:"test@example.invalid"
     }));
   });
   await page.goto(origin+"/",{waitUntil:"load",timeout:30000});
   await page.locator("form#login").waitFor({state:"visible",timeout:15000});
   const x=await page.evaluate(()=>({
    width:innerWidth,document:document.documentElement.scrollWidth,
    login:!!document.querySelector("form#login"),
    demoButtons:document.querySelectorAll("[data-demo]").length,
    emailField:!!document.querySelector("#email"),
    passwordField:!!document.querySelector("#password"),
    oldToken:!!localStorage.getItem("wa.session"),
    oldMode:sessionStorage.getItem("wa.mode")
   }));
   console.log("Admin V3 login guard",width,JSON.stringify(x));
   if(x.document>x.width+2||!x.login||x.demoButtons!==0||!x.emailField||!x.passwordField||x.oldToken||x.oldMode)
     failures.push(width+" unauthenticated guard invalid: "+JSON.stringify(x));
   if(attempts.length)failures.push(width+" unauthenticated API attempt without real session");
   if(width===390){
    const password=page.locator("#password");
    await password.fill("test-no-real-credentials");
    const eye=page.locator("[data-peek]");
    await eye.click();
    if(await password.getAttribute("type")!=="text")failures.push("password eye show not working");
    await eye.click();
    if(await password.getAttribute("type")!=="password")failures.push("password eye hide not working");
    await page.screenshot({path:"test-results/women-admin-v3-login-390.png",fullPage:true,animations:"disabled"});
   }
  }catch(e){failures.push(width+" test: "+e.message)}
  finally{await page.close()}
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
if(failures.length){console.error("FAIL:\n"+failures.join("\n"));process.exitCode=1}
else console.log("PASS: password-protected Admin V3, no Demo Owner/Staff bypass, clean logged-out view at six widths");
