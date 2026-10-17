// SELECT SHOP WOMEN isolated GitHub Pages preview regression checks.
// This is a read-only mock storefront. No admin auth, order API or Supabase secrets.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const file = pathToFileURL(resolve("preview/women/index.html")).toString();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const widths = [320, 360, 390, 400, 768, 1280];
const errors = [];
try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, deviceScaleFactor: 1 });
    page.on("pageerror", (error) => errors.push(width + " page error " + error.message));
    await page.goto(file, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const size = await page.evaluate(() => ({
      inner: window.innerWidth,
      root: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      title: document.title,
      rtl: document.documentElement.dir === "rtl"
    }));
    if (size.root > size.inner + 1 || size.body > size.inner + 1) errors.push(width + " overflow " + JSON.stringify(size));
    if (!size.rtl || !size.title.includes("WOMEN")) errors.push(width + " bad title/RTL");
    if (width === 390) {
      await page.screenshot({ path: "test-results/women-preview-mobile-390.png", fullPage: true });
      await page.getByRole("button", { name: "هوديز" }).click();
      if (!(await page.locator('[data-kind="soon"]').isHidden())) errors.push("filter hoodies did not hide soon");
      await page.getByRole("button", { name: "قريبًا" }).click();
      if (!(await page.locator('[data-kind="hoodies"]').isHidden())) errors.push("filter soon did not hide hoodie");
      await page.getByRole("button", { name: "كل الموديلات" }).click();
      await page.getByRole("button", { name: /تفاصيل الموديل/ }).click();
      if (!(await page.locator("#detailDialog").evaluate(el => el.open))) errors.push("detail dialog failed to open");
      await page.getByRole("button", { name: "تمام، رجوع للمعاينة" }).click();
      if (await page.locator("#detailDialog").evaluate(el => el.open)) errors.push("detail dialog failed to close");
    }
    if (width === 1280) await page.screenshot({ path: "test-results/women-preview-desktop.png", fullPage: true });
    console.log("checked",width,JSON.stringify(size));
    await page.close();
  }
} finally { await browser.close(); }
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PASS: WOMEN read-only preview at all tested widths, filters, product detail dialog, no script error");
