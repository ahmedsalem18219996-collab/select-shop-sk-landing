// SELECT SHOP TEMP — TirePro live customer-journey smoke test. NO orders are submitted.
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium,webkit} from "playwright";

const origin="https://selectshopeg.com";
const url=origin+"/offers/tirepro/?qa=tirepro-read-only-smoke";
await mkdir("test-results",{recursive:true});
const browser=await chromium.launch({headless:true});
let page;
try{
  page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,
    deviceScaleFactor:1,locale:"ar-EG",timezoneId:"Africa/Cairo"});
  // Extra guard: even an accidental submit in the tested page cannot create an order.
  await page.route("**/functions/v1/safka-capture-order",route=>route.abort("blockedbyclient"));
  const failures=[];
  page.on("pageerror",error=>failures.push(String(error.message||error).slice(0,250)));
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  assert(response?.ok(),"TirePro landing HTTP "+response?.status());
  await page.waitForFunction(() => {
    const top=document.querySelector("#order"),bottom=document.querySelector("#bottomOrder");
    return !!top&&!top.disabled&&!!bottom&&!bottom.disabled&&
      getComputedStyle(bottom).display!=="none";
  },null,{timeout:40000});
  // CTAs stay clickable while the product loads. Wait for verified server pricing.
  await page.waitForFunction(()=>{
    const value=document.querySelector("#currentPrice")?.textContent||"";
    return value.includes("٦٩٩")||value.includes("699");
  },null,{timeout:40000}).catch(async()=>{
    const status=await page.locator("#status").textContent();
    const price=await page.locator("#currentPrice").textContent();
    throw Error("Offer never loaded verified 699 EGP price: "+price+" | "+status);
  });
  const price=(await page.locator("#currentPrice").textContent()||"").trim();
  assert(price.includes("٦٩٩")||price.includes("699"),"Offer price verification failed");
  assert.equal(await page.locator("#bottomOrder").isDisabled(),false,
    "Mobile fixed order button remains disabled");
  assert.equal(await page.locator("#videoStage video").count(),1,
    "Verified local product video is not in primary media");
  const video=page.locator("#videoStage video");
  assert.equal(await video.isVisible(),true,"Primary product video is hidden");
  assert((await video.getAttribute("src")||"").includes("/assets/ads/tirepro-original-demo-21s.mp4"),
    "Unexpected demo video source");
  const playable=await video.evaluate(el=>new Promise(resolve=>{
    if(el.readyState>=1)return resolve(true);
    if(el.error)return resolve(false);
    const done=value=>resolve(value);
    el.addEventListener("loadedmetadata",()=>done(true),{once:true});
    el.addEventListener("error",()=>done(false),{once:true});
    setTimeout(()=>done(false),15000);
  }));
  const media=await video.evaluate(el=>({
    src:el.currentSrc,networkState:el.networkState,readyState:el.readyState,
    mediaError:el.error?{code:el.error.code,message:el.error.message}:null,
    h264Support:el.canPlayType('video/mp4; codecs="avc1.42E01E"')
  }));
  let served={status:null,type:null,length:null,error:null};
  try{
    const head=await page.request.head(media.src,{timeout:15000});
    served={status:head.status(),type:head.headers()["content-type"]||null,
      length:head.headers()["content-length"]||null};
  }catch(e){served.error=String(e.message||e).slice(0,200)}
  console.log("TIREPRO_VIDEO_DIAGNOSTICS",JSON.stringify({media,served,playable}));
  if(!playable){
    assert(media.h264Support===""&&served.status===200,
      "Video metadata unavailable even though test browser may support MP4");
  }
  assert(await page.evaluate(()=>typeof window.gtag==="function"),
    "GA4 event queue is not initialized");
  await page.locator("#bottomOrder").click();
  await page.locator("dialog.ssCoDialog[open]").waitFor({state:"visible",timeout:10000});
  await page.locator("dialog .ssCoSubmit:not([disabled])")
    .waitFor({state:"visible",timeout:60000});
  assert.equal(await page.locator('dialog select[name="governorate"] option').count()>20,true,
    "Checkout governorates did not load");
  assert.equal(await page.locator('dialog input[name="phone"]').count(),1,
    "Customer telephone field missing");
  assert.equal(await page.locator('dialog input[name="address"]').count(),1,
    "Customer address field missing");
  assert.equal(failures.length,0,"Browser JavaScript errors: "+failures.join(" | "));
  await page.locator("dialog.ssCoDialog").screenshot({path:"test-results/tirepro-order-dialog.png"});
  // The bundled Chromium omits proprietary H264; WebKit is closer to iPhone Safari.
  const safari=await webkit.launch({headless:true});
  let safariPlayback=false,safariCodec="";
  try{
    const mobileSafari=await safari.newPage({viewport:{width:390,height:844},
      isMobile:true,deviceScaleFactor:1,locale:"ar-EG"});
    await mobileSafari.route("**/functions/v1/safka-capture-order",
      route=>route.abort("blockedbyclient"));
    const safariResponse=await mobileSafari.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
    assert(safariResponse?.ok(),"Safari TirePro page is unavailable");
    await mobileSafari.locator("#videoStage video").waitFor({state:"visible",timeout:40000});
    const mediaResult=await mobileSafari.locator("#videoStage video").evaluate(el=>new Promise(resolve=>{
      const result=()=>({ready:el.readyState>=1,codec:el.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        error:el.error?.code||null});
      if(el.readyState>=1||el.error)return resolve(result());
      el.addEventListener("loadedmetadata",()=>resolve(result()),{once:true});
      el.addEventListener("error",()=>resolve(result()),{once:true});
      setTimeout(()=>resolve(result()),20000);
    }));
    safariPlayback=mediaResult.ready;
    safariCodec=mediaResult.codec;
    console.log("TIREPRO_WEBKIT_VIDEO_CHECK",JSON.stringify(mediaResult));
  }finally{await safari.close();}
  assert(safariPlayback,"WebKit could not load product video metadata; inspect codec compatibility");
  console.log("TIREPRO_LIVE_SMOKE_OK",JSON.stringify({
    offerPrice:"699 EGP",videoAssetHttpOk:served.status===200,
    videoMetadataOnWebKit:safariPlayback,webkitCodec:safariCodec,ga4QueueReady:true,
    orderButtonEnabled:true,checkoutFormReady:true,governoratesLoaded:true,
    ordersSubmitted:0,supplierOrdersSent:0
  }));
}catch(e){
  if(page){await page.screenshot({path:"test-results/tirepro-smoke-failure.png",fullPage:true}).catch(()=>{});}
  throw e;
}finally{
  await browser.close();
}
