// Public READ-ONLY SELECT SHOP TEMP storefront QA. Never submits orders.
import { strict as assert } from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const base = "https://selectshopeg.com";
const sample = "69c1db9dcc2eaa4914727bbd";
const resultDir = "test-results";
await mkdir(resultDir, { recursive: true });
const failures = [];
const summary = [];
const browser = await chromium.launch({ headless: true });
const safari = await webkit.launch({ headless: true });

for (const profile of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "iphone-webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, engine: "webkit" },
]) {
  const target = profile.engine === "webkit" ? safari : browser;
  const context = await target.newContext({
    viewport: profile.viewport, isMobile: profile.isMobile,
    hasTouch: profile.hasTouch, deviceScaleFactor: 1,
    locale: "ar-EG", timezoneId: "Africa/Cairo",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e.message || e).slice(0, 250)));
  const link = base + "/?product=safka-" + sample;
  try {
    const response = await page.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert(response && response.status() === 200, "Product landing URL did not return HTTP 200");

    const productDialog = page.locator("dialog.ssSafkaDialog[open]");
    await productDialog.waitFor({ state: "visible", timeout: 60000 });
    const title = await productDialog.locator(".ssSafkaDialogShortTitle").innerText();
    assert(title.includes("البخار"), "Wrong supplier product landed");
    const body = await productDialog.innerText();
    assert(body.includes(new Intl.NumberFormat("ar-EG").format(1810)),
      "Expected supplier note recommended retail 1700 + inclusive average delivery 110 = 1810 EGP");
    assert(!/شحن\s*\+?\s*[٩٠90]{2}|سعر صفقة/i.test(body),
      "Customer-facing page exposed supplier identity or itemized internal shipping");

    const videoLink = productDialog.locator("a.ssSafkaWatchProductVideo");
    await videoLink.waitFor({ state: "visible", timeout: 8000 });
    const directVideo = await videoLink.getAttribute("href");
    assert(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/view$/.test(directVideo),
      "Direct supplier video watch link is not a safe Google Drive view URL");

    const videoThumb = productDialog.locator(".ssSafkaThumb").filter({ has: page.locator(".ssSafkaVideoThumb") }).first();
    await videoThumb.click();
    const playerCta = productDialog.locator("a.ssSafkaDrivePrimary");
    await playerCta.waitFor({ state: "visible", timeout: 8000 });
    const playerHref = await playerCta.getAttribute("href");
    assert(playerHref.endsWith("/view"), "Product video fallback must open a direct Google Drive viewer");
    const embedded=productDialog.locator(".ssSafkaInStoreVideo iframe.ssSafkaDriveVideo");
    assert.equal(await embedded.count(),1,"Product videos must play INSIDE the product gallery");
    assert((await embedded.getAttribute("src"))?.endsWith("/preview"),
      "Product embedded video should use safe Google Drive preview URL");
    const productText = await productDialog.innerText();
    assert(!/(?:سعر صفقة|كود صفقة|رابط المنتج للإعلان|نسخ رابط المنتج|\\+\\s*٩٠\\s*ج)/.test(productText),
      "Private supplier name, shipping cost breakdown or ad link leaked to customer");
    assert(!productDialog.locator(".ssSafkaTechnical").count || await productDialog.locator(".ssSafkaTechnical").count() === 0,
      "Supplier technical codes visible publicly");
    const supplierPurchase = productDialog.locator("button.ssSafkaPurchase");
    assert.equal(await supplierPurchase.count(),1,"Missing customer order button");

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - window.innerWidth;
    });
    assert(horizontalOverflow <= 4,
      "Unexpected horizontal page overflow at " + profile.viewport.width + " px: " + horizontalOverflow);

    await page.screenshot({ path: resultDir + "/" + profile.name + "-product.png", fullPage: false });
    await supplierPurchase.click();
    const orderForm = page.locator("dialog.ssCoDialog[open]");
    await orderForm.waitFor({ state:"visible",timeout:15000 });
    assert.equal(await orderForm.locator('select[name="variant"] option').count(),1,
      "Product options missing in checkout");
    await orderForm.locator('button.ssCoSubmit').waitFor({state:"visible"});
    await page.screenshot({path:resultDir+"/"+profile.name+"-checkout.png",fullPage:false});
    assert(!(await orderForm.innerText()).includes("صفقة"),
      "Supplier identity leaked into customer checkout");
    assert(!(await orderForm.innerText()).includes("110 جنيه"),
      "Shipping amount exposed in checkout");
    // Mock only the capture POST. This tests the customer's full form UI but saves NO real order.
    let testedCapture=false;
    await page.route("**/functions/v1/safka-capture-order",async route=>{
      const payload=route.request().postDataJSON();
      assert.equal(payload.productId,sample,"Wrong supplier product in captured order");
      assert.equal(payload.quantity,1,"Unexpected checkout quantity");
      assert(payload.governorateId && /^01[0125][0-9]{8}$/.test(payload.customer.phone),
        "Order customer details missing or invalid");
      assert(/^[0-9a-f]+$/.test(payload.workNonce),"Missing proof-of-work");
      testedCapture=true;
      await route.fulfill({status:201,contentType:"application/json",
        body:JSON.stringify({ok:true,orderCode:"SK-TEST-NO-WRITE",totalEgp:1810,status:"review",sentToSupplier:false})});
    });
    await orderForm.locator('input[name="name"]').fill("اختبار الواجهة فقط");
    await orderForm.locator('input[name="phone"]').fill("01012345678");
    await orderForm.locator('input[name="area"]').fill("مدينة نصر");
    await orderForm.locator('input[name="address"]').fill("عنوان تجريبي للاختبار لا يرسل للخادم");
    await orderForm.locator('select[name="governorate"]').selectOption({index:1});
    await orderForm.locator('button.ssCoSubmit').waitFor({state:"visible"});
    await orderForm.locator('button.ssCoSubmit').click({timeout:45000});
    await orderForm.getByText("اتسجّل طلبك بنجاح").waitFor({state:"visible",timeout:15000});
    assert(testedCapture,"Expected checkout capture network route was not exercised");
    await page.unroute("**/functions/v1/safka-capture-order");
    await orderForm.locator(".ssCoClose").click();
    const card = page.locator(".ssSafkaUnifiedCard").first();
    await card.waitFor({ state: "visible", timeout: 30000 });
    assert(await page.locator(".ssSafkaUnifiedCard a.ssSafkaCardVideoDirect").count() > 0,
      "Video button missing from catalog media overlay");
    const mediaCard=page.locator(".ssSafkaUnifiedCard").filter({has:page.locator("a.ssSafkaCardVideoDirect")}).first();
    await mediaCard.locator("a.ssSafkaCardVideoDirect").click();
    const mediaDialog=page.locator("dialog.ssSafkaDialog[open]");
    await mediaDialog.waitFor({state:"visible",timeout:9000});
    await mediaDialog.locator(".ssSafkaInStoreVideo iframe.ssSafkaDriveVideo").waitFor({state:"attached",timeout:9000});
    assert(!page.url().startsWith("https://drive.google.com"),"Card video must stay on SELECT SHOP");
    await mediaDialog.locator(".ssSafkaClose").click();
    const cardBuy = page.locator(".ssSafkaUnifiedCard button.ssSafkaCardBuy:not([disabled])").first();
    await cardBuy.waitFor({state:"visible"});
    assert(await cardBuy.isEnabled(),"Customer cannot order from product card");
    await cardBuy.click();
    const cardCheckout=page.locator("dialog.ssCoDialog[open]");
    await cardCheckout.waitFor({state:"visible",timeout:12000});
    await cardCheckout.locator(".ssCoClose").click();
    const cardAdd=page.locator(".ssSafkaUnifiedCard button.ssSafkaCardAdd:not([disabled])").first();
    await cardAdd.waitFor({state:"visible",timeout:15000});
    assert(await cardAdd.isEnabled(),"Imported product is missing enabled Add to Cart");
    await cardAdd.click();
    const choiceDialog=page.locator("dialog.ssBagChoice[open]");
    if(await choiceDialog.count())await choiceDialog.locator(".ssBagPrimary").click();
    const bag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
    await bag.waitFor({state:"visible",timeout:15000});
    assert(await bag.locator(".ssBagItem").count()>=1,"Supplier cart did not retain selected product");
    assert(await page.locator("[data-safka-bag-count]").count()>=1,"Supplier cart header badge missing");
    const continueShopping=bag.locator('[data-bag-continue]');
    await continueShopping.waitFor({state:"visible",timeout:12000});
    assert((await continueShopping.innerText()).includes("أضف منتج آخر"),"Smart cart must offer another product");
    await continueShopping.click();
    await bag.waitFor({state:"hidden",timeout:10000});
    await page.locator("[data-open-cart]").first().click();
    await bag.waitFor({state:"visible",timeout:11000});
    assert(await bag.locator(".ssBagItem").count()>=1,"Continue-shopping lost the selected item");
    const suggestions=bag.locator("[data-bag-recommendations] .ssBagSuggestion");
    await suggestions.first().waitFor({state:"visible",timeout:22000});
    assert(await suggestions.count()>0,"Smart cart related-product suggestions missing");
    await page.screenshot({path:resultDir+"/"+profile.name+"-smart-cart.png",fullPage:false});
    await bag.locator(".ssBagClose").click();
    const cleanAdUrl=base+"/?product="+sample+"#products";
    await page.goto(cleanAdUrl,{waitUntil:"domcontentloaded",timeout:60000});
    await page.locator("dialog.ssSafkaDialog[open]").waitFor({state:"visible",timeout:60000});
    assert(!new URL(page.url()).searchParams.get("product")?.includes("safka"),
      "Public product URL exposes supplier brand");
    await page.locator("dialog.ssSafkaDialog[open] .ssSafkaAddToBag").click();
    const sourceSelect=page.locator("dialog.ssBagChoice[open]");
    if(await sourceSelect.count())await sourceSelect.locator(".ssBagPrimary").click();
    const multiBag=page.locator("dialog.ssBagDialog[open]:not(.ssBagChoice)");
    await multiBag.waitFor({state:"visible",timeout:15000});
    assert(await multiBag.locator(".ssBagItem").count()>=1,"Product page add-to-cart failed");
    await multiBag.locator("[data-bag-checkout]").click();
    await multiBag.locator('[name="phone"]').waitFor({state:"visible",timeout:15000});
    assert((await multiBag.innerText()).includes("الإجمالي شامل التوصيل"),"Cart missing inclusive total");
    await page.screenshot({path:resultDir+"/"+profile.name+"-supplier-basket.png",fullPage:false});
    await multiBag.locator(".ssBagClose").click();
    if(profile.name==="desktop"){
      await page.goto(base,{waitUntil:"domcontentloaded",timeout:60000});
      const heroText=await page.locator("#heroTitle").innerText();
      assert(heroText.includes("DISCOVER")&&heroText.includes("YOUR NEXT."),
        "The owner's original hero headline was changed");
      for(const type of ["fashion","home","gifts"]){
        const asset="/assets/hero-select-"+type+".svg";
        const res=await page.request.get(base+asset,{timeout:12000});
        assert(res.ok(),"Custom-designed hero artwork not served: "+asset);
        const body=await res.text();
        assert(body.startsWith("<svg")&&body.includes('viewBox="0 0 640 360"'),
          "Hero artwork is missing SVG graphics");
      }
      await page.locator(".tgh-tile img").first().waitFor({state:"attached",timeout:15000});
      const heroSource=await page.locator(".tgh-tile img").first().getAttribute("src");
      assert(heroSource.includes("/assets/hero-select-"),
        "Rotating hero carousel is still using supplier images");
      await page.locator(".ssSafkaUnifiedCard").first().waitFor({state:"visible",timeout:40000});
      await page.locator(".ssSafkaUnifiedActions").scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      let loaded=await page.locator(".ssSafkaUnifiedCard").count();
      if(loaded<48){
        await page.locator(".ssSafkaUnifiedMore").click();
        await page.waitForFunction(()=>document.querySelectorAll(".ssSafkaUnifiedCard").length>=48,null,{timeout:18000});
        loaded=await page.locator(".ssSafkaUnifiedCard").count();
      }
      assert(loaded>=48,"Catalog does not load past first 24 items");
      await page.locator('[data-quick-search="تنظيف"]').click();
      await page.waitForFunction(()=>{
        const cards=document.querySelectorAll(".ssSafkaUnifiedCard");
        return cards.length>0&&[...cards].some(x=>x.innerText.includes("تنظيف"));
      },null,{timeout:20000});
      assert((await page.locator("#searchInput").inputValue())==="تنظيف","Quick search did not update catalog search");
      await page.screenshot({path:resultDir+"/desktop-expanded-catalog.png",fullPage:false});
      summary.push({profile:"desktop-large-catalog-navigation",loadedCards:loaded,quickSearch:"تنظيف",customHeroImages:3,originalHeadline:true});
    }

    summary.push({ profile: profile.name, title, video: directVideo, overflowPx: horizontalOverflow,
      supplierCardsInLoadedGrid: await page.locator(".ssSafkaUnifiedCard").count(), checkoutFormMocked:true, multiBasketUi:true, jsErrors: errors });
  } catch (error) {
    failures.push(profile.name + ": " + (error?.stack || error));
    await page.screenshot({ path: resultDir + "/" + profile.name + "-failed.png", fullPage: false })
      .catch(() => {});
  } finally {
    await context.close();
  }
}
// Read-only catalog-wide contract check. No order endpoints called.
try {
  const anonKey = "sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
  const database = "https://zznqdwrohrycsjfpvkhc.supabase.co";
  const all = [];
  let expected = null;
  for (let pageNum = 1; pageNum <= 20; pageNum++) {
    const response = await fetch(database + "/rest/v1/rpc/ss_safka_public_catalog_v2", {
      method: "POST", headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ p_page: pageNum, p_limit: 48, p_category: null, p_search: "" }),
      signal: AbortSignal.timeout(24000),
    });
    assert(response.ok, "Catalog public page " + pageNum + " returned " + response.status);
    const payload = await response.json();
    assert(Array.isArray(payload.items), "Invalid catalog JSON on page " + pageNum);
    expected ??= Number(payload.total);
    all.push(...payload.items);
    if (all.length >= expected) break;
  }
  assert(expected>=462,"Supplier catalog unexpectedly shrank; investigate the daily provider sync");
  assert.equal(all.length, expected, "Pagination omitted supplier products");
  const seen = new Set();
  let variants = 0, withVideos = 0, videoUrls = 0, withoutVideo = 0;
  let missingImages = 0, withoutDirectVideos = 0, verifiedForSale=0,blockedPrice=0;
  for (const p of all) {
    assert(/^[a-f0-9]{24}$/i.test(p.id), "Invalid supplier product ID");
    assert(!seen.has(p.id), "Duplicate supplier product ID " + p.id);
    seen.add(p.id);
    assert(p.can_purchase === false, "Unapproved supplier checkout unexpectedly opened: " + p.id);
    assert(["approved", "indicative","needs_review"].includes(p.price_status), "Missing price status " + p.id);
    if(p.price_status==="needs_review"){
      blockedPrice++;
      assert.equal(p.display_price_egp,null,"Unverified supplier retail price leaked to customer "+p.id);
    }else{
      verifiedForSale++;
      assert(Number.isInteger(p.display_price_egp) && p.display_price_egp > 0,
        "Verified retail-note +110 price missing for " + p.id);
    }
    assert(Array.isArray(p.images) && p.images.length > 0, "Missing supplier product photos " + p.id);
    if (!p.images?.length) missingImages++;
    assert(Array.isArray(p.variants) && p.variants.length > 0, "No supplier options for " + p.id);
    variants += p.variants.length;
    for (const v of p.variants) {
      assert(/^[a-f0-9]{24}$/i.test(v.id), "Invalid supplier option ID " + p.id);
      if(p.price_status==="needs_review")
        assert.equal(v.display_price_egp,null,"Unverified option price leaked "+p.id);
      else
        assert(Number.isInteger(v.display_price_egp) && v.display_price_egp > 0,
          "Verified option without displayed note-retail price "+p.id);
    }
    const prices = p.variants.filter(v=>v.available&&Number(v.display_price_egp)>0).map(v => Number(v.display_price_egp));
    if (prices.length) assert.equal(p.display_price_egp, Math.min(...prices),
      "Card does not show cheapest available price of supplier options: " + p.id);
    const videos = Array.isArray(p.videos) ? p.videos : [];
    if (videos.length) withVideos++; else withoutVideo++;
    videoUrls += videos.length;
    for (const video of videos) {
      assert(/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/preview$/.test(video),
        "Supplier video not a verified Drive file preview URL: " + p.id);
    }
  }
  assert.equal(verifiedForSale+blockedPrice,expected,"Every SKU must be verified or blocked");
  assert(blockedPrice>0,"Expected a review queue for unverified supplier retail prices");
    assert(variants>=505,"Supplier option count unexpectedly shrank");
  // Provider may delist a product after a completed sync; the correct public catalog
  // then excludes its videos too. Validate coverage of CURRENT saleable products, not
  // immutable absolute counts from a historical 469-SKU snapshot.
  assert(withVideos>=Math.floor(expected*0.85),"Supplier video coverage fell below current-catalog safety threshold");
  assert.equal(withVideos+withoutVideo,expected,"Video coverage did not include all imported products");
  assert(videoUrls>=Math.floor(expected*5.2),"Supplier media links dropped unusually sharply");
  summary.push({ profile: "full-catalog-read-only", verifiedForSale,blockedPrice,products: all.length, variants,
    productsWithSupplierVideos: withVideos, productsWithoutSupplierVideos: withoutVideo,
    linkedVideoUrls: videoUrls, missingImages, supplierCheckoutEnabled: false });
} catch (error) {
  failures.push("catalog-audit: " + (error?.stack || error));
}

// Exercise actual Supabase order backend without inserting any order or contacting a supplier.
// All customer details below are synthetic and validateOnly keeps them out of the DB.
try {
  const { randomUUID, createHash } = await import("node:crypto");
  const requestId=randomUUID();
  let nonce=null;
  for(let i=0;i<1500000;i++){
    const trial=i.toString(16);
    const digest=createHash("sha256").update("SELECT-SHOP-ORDER:"+requestId+":"+trial).digest("hex");
    if(digest.startsWith("0000")){nonce=trial;break}
  }
  assert(nonce!==null,"Unable to compute anti-spam proof for the test");
  const payload={
    requestId,productId:"69c1db9dcc2eaa4914727bbd",
    variantId:"69c1db9dcc2eaa4914727bbe",quantity:1,
    governorateId:"64879004dc16090c1858e69e",cityId:"",
    customer:{name:"اختبار حساب السعر فقط",phone:"01000000000",
      area:"اختبار داخلي",address:"عنوان اختبار لمراجعة سعر المنتج فقط",notes:""},
    workNonce:nonce,website:"",validateOnly:true
  };
  const response=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/safka-capture-order",{
    method:"POST",
    headers:{"origin":"https://selectshopeg.com",
      "apikey":"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa",
      "content-type":"application/json"},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)
  });
  const body=await response.json();
  assert(response.ok&&body.ok&&body.validated===true,
    "Real order validation API did not accept the sample: "+JSON.stringify({status:response.status,error:body.error}));
  assert.equal(body.totalEgp,1810,"Wrong confirmed supplier note-retail + 110 server quote");
  assert.equal(body.orderSaved,false,"Validation mode unexpectedly created an order");
  assert.equal(body.sentToSupplier,false,"Validation mode unexpectedly contacted supplier");
  summary.push({profile:"live-order-backend-no-write",serverQuoteEgp:body.totalEgp,storedOrder:false,supplierOrder:false});
}catch(error){failures.push("backend-no-write: "+(error?.stack||error));}

// Real multi-line server quote validation, without saving any customer or supplier order.
try{
 const {randomUUID,createHash}=await import("node:crypto");
 const requestId=randomUUID();
 let nonce=null;
 for(let i=0;i<1500000;i++){
  const n=i.toString(16);
  if(createHash("sha256").update("SELECT-SHOP-ORDER:"+requestId+":"+n).digest("hex").startsWith("0000")){nonce=n;break}
 }
 assert(nonce!==null);
 const source=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/rest/v1/rpc/ss_safka_public_catalog_v2",{
  method:"POST",headers:{"apikey":"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa","content-type":"application/json"},
  body:JSON.stringify({p_page:1,p_limit:1,p_category:null,p_search:"69c1db9dcc2eaa4914727bbd"})
 });
 const first=(await source.json()).items[0];
 assert(first?.id);
 const secondResult=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/rest/v1/rpc/ss_safka_public_catalog_v2",{
  method:"POST",headers:{"apikey":"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa","content-type":"application/json"},
  body:JSON.stringify({p_page:1,p_limit:8,p_category:null,p_search:""})
 });
 const second=(await secondResult.json()).items.find(x=>x.id!==first.id&&x.variants.some(v=>v.available));
 assert(second?.id);
 const lines=[first,second].map(x=>({productId:x.id,
  variantId:x.variants.find(v=>v.available).id,quantity:1}));
 const expected=[first,second].reduce((s,x)=>s+x.variants.find(v=>v.available).display_price_egp,0);
 const res=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/safka-capture-cart",{
  method:"POST",headers:{origin:"https://selectshopeg.com",
   apikey:"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa","content-type":"application/json"},
  body:JSON.stringify({requestId,items:lines,governorateId:"64879004dc16090c1858e69e",cityId:"",
   customer:{name:"اختبار تحقق حسابي",phone:"01000000000",area:"منطقة اختبار",
    address:"عنوان تجريبي اختبار فقط",notes:""},workNonce:nonce,website:"",validateOnly:true}),
  signal:AbortSignal.timeout(25000)
 });
 const result=await res.json();
 assert(res.ok&&result.ok&&result.validated===true,
   "Multi-line read-only server validation failed: "+JSON.stringify({status:res.status,error:result.error}));
 assert.equal(result.totalEgp,expected,"Server-calculated multi-product total mismatch");
 assert.equal(result.lineCount,2);
 assert.equal(result.orderSaved,false);
 assert.equal(result.sentToSupplier,false);
 summary.push({profile:"live-multi-cart-validation-no-write",lines:2,totalEgp:result.totalEgp,orderSaved:false});
}catch(error){failures.push("cart-backend-no-write: "+(error?.stack||error))}
// Read live supplier catalog count via server-side key; aggregate only, one global rate-limited check.
if(process.env.GITHUB_EVENT_NAME==="workflow_dispatch"){
try{
 const res=await fetch("https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/safka-live-audit",{
  method:"GET",headers:{origin:"https://selectshopeg.com",
   apikey:"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa"},
  signal:AbortSignal.timeout(115000)
 });
 const source=await res.json();
 summary.push({profile:"supplier-source-live-count",httpStatus:res.status,...source});
 // Supplier availability reports don't imply a numerical warehouse stock count.
 if(res.ok){assert(source.complete);assert.equal(source.physicalStockQuantityExposed,false)}
}catch(error){summary.push({profile:"supplier-source-live-count",error:String(error?.message||error)})}
}
await browser.close();
await safari.close();
await writeFile(resultDir + "/summary.json", JSON.stringify({ summary, failures }, null, 2));
console.log(JSON.stringify({ summary, failures }, null, 2));
if (failures.length) process.exitCode = 1;
