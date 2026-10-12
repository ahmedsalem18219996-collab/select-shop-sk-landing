// Public READ-ONLY SELECT SHOP TEMP storefront QA. Never submits orders.
import { strict as assert } from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = "https://selectshopeg.com";
const sample = "69c1db9dcc2eaa4914727bbd";
const resultDir = "test-results";
await mkdir(resultDir, { recursive: true });
const failures = [];
const summary = [];
const browser = await chromium.launch({ headless: true });

for (const profile of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]) {
  const context = await browser.newContext({
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
await browser.close();
await writeFile(resultDir + "/summary.json", JSON.stringify({ summary, failures }, null, 2));
console.log(JSON.stringify({ summary, failures }, null, 2));
if (failures.length) process.exitCode = 1;
