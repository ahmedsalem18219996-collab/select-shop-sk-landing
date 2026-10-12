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
    assert(body.includes(new Intl.NumberFormat("ar-EG").format(1290)),
      "Expected Safqa suggested retail 1200 + shipping 90 = 1290 EGP");
    assert(body.includes("٩٠") || body.includes("90"),
      "Explanation of Safqa plus-90 shipping missing");

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
    assert(playerHref.endsWith("/view"), "Gallery primary video opens a preview iframe instead of Drive viewer");
    assert(await productDialog.locator(".ssSafkaDriveInline").count() > 0,
      "Missing optional in-page player for compatible browsers");
    const supplierPurchase = productDialog.locator("button.ssSafkaPurchase");
    assert(await supplierPurchase.count() === 0,
      "Supplier checkout must stay locked until owner-approved launch");

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - window.innerWidth;
    });
    assert(horizontalOverflow <= 4,
      "Unexpected horizontal page overflow at " + profile.viewport.width + " px: " + horizontalOverflow);

    await page.screenshot({ path: resultDir + "/" + profile.name + "-product.png", fullPage: false });
    await productDialog.locator(".ssSafkaClose").click();
    const card = page.locator(".ssSafkaUnifiedCard").first();
    await card.waitFor({ state: "visible", timeout: 30000 });
    assert(await page.locator(".ssSafkaUnifiedCard a.ssSafkaCardVideoDirect").count() > 0,
      "No direct video buttons on supplier product cards");

    summary.push({ profile: profile.name, title, video: directVideo, overflowPx: horizontalOverflow,
      supplierCardsInLoadedGrid: await page.locator(".ssSafkaUnifiedCard").count(), jsErrors: errors });
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
  assert.equal(expected, 462, "Unexpected Safqa product count (source should have 462)");
  assert.equal(all.length, expected, "Pagination omitted supplier products");
  const seen = new Set();
  let variants = 0, withVideos = 0, videoUrls = 0, withoutVideo = 0;
  let missingImages = 0, withoutDirectVideos = 0;
  for (const p of all) {
    assert(/^[a-f0-9]{24}$/i.test(p.id), "Invalid supplier product ID");
    assert(!seen.has(p.id), "Duplicate supplier product ID " + p.id);
    seen.add(p.id);
    assert(p.can_purchase === false, "Unapproved supplier checkout unexpectedly opened: " + p.id);
    assert(["approved", "indicative"].includes(p.price_status), "Missing price status " + p.id);
    assert(Number.isInteger(p.display_price_egp) && p.display_price_egp > 0,
      "Missing visible indicative price for " + p.id);
    assert(Array.isArray(p.images) && p.images.length > 0, "Missing supplier product photos " + p.id);
    if (!p.images?.length) missingImages++;
    assert(Array.isArray(p.variants) && p.variants.length > 0, "No supplier options for " + p.id);
    variants += p.variants.length;
    for (const v of p.variants) {
      assert(/^[a-f0-9]{24}$/i.test(v.id), "Invalid supplier option ID " + p.id);
      assert(Number.isInteger(v.display_price_egp) && v.display_price_egp > 0,
        "Supplier variant without independent displayed price " + p.id);
    }
    const prices = p.variants.filter(v => v.available).map(v => Number(v.display_price_egp));
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
  assert.equal(variants, 505, "Unexpected supplier option prices count");
  assert.equal(withVideos, 411, "Supplier videos coverage unexpectedly changed");
  assert.equal(withoutVideo, 51, "Unexpected no-video product count");
  assert.equal(videoUrls, 2678, "Video links missing from public catalog");
  summary.push({ profile: "full-catalog-read-only", products: all.length, variants,
    productsWithSupplierVideos: withVideos, productsWithoutSupplierVideos: withoutVideo,
    linkedVideoUrls: videoUrls, missingImages, supplierCheckoutEnabled: false });
} catch (error) {
  failures.push("catalog-audit: " + (error?.stack || error));
}

await browser.close();
await safari.close();
await writeFile(resultDir + "/summary.json", JSON.stringify({ summary, failures }, null, 2));
console.log(JSON.stringify({ summary, failures }, null, 2));
if (failures.length) process.exitCode = 1;
