/* Automated Single-Run Batch QA & Screenshot Generator for SELECT SHOP */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const PORT = 8085;
const ROOT_DIR = __dirname;
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Minimal static HTTP server supporting both root / and GitHub Pages subpath /select-shop-sk-landing/
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath.startsWith('/select-shop-sk-landing/')) {
    reqPath = reqPath.slice('/select-shop-sk-landing/'.length);
  }
  if (reqPath.startsWith('/')) reqPath = reqPath.slice(1);
  if (!reqPath || reqPath.endsWith('/')) reqPath += 'index.html';

  const filePath = path.join(ROOT_DIR, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

class ChromeCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Evaluation error');
    }
    return res.result?.value;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 600));
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });
    await this.send('Emulation.setVisibleSize', { width, height });
    await new Promise(r => setTimeout(r, 150));
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runQA() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`[QA SERVER] Serving on http://127.0.0.1:${PORT}`);

  const chromeCandidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ]
    : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  const chromePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
  if (!chromePath) throw new Error('No Chromium browser found for QA');
  const qaProfile = path.join(os.tmpdir(), `select-shop-qa-${process.pid}-${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-proxy-server',
    '--hide-scrollbars',
    `--user-data-dir=${qaProfile}`,
    '--no-sandbox'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const versionRes = await fetch('http://127.0.0.1:9222/json/new', { method: 'PUT' });
  const target = await versionRes.json();
  const cdp = new ChromeCDP(target.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const results = [];
  const record = (name, pass, details = '') => {
    results.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${details ? '— ' + details : ''}`);
  };

  try {
    // 1. Root HTTP Preview Load
    await cdp.navigate(`http://127.0.0.1:${PORT}/`);
    const title = await cdp.eval('document.title');
    record('Root HTTP preview loads', title.includes('SELECT SHOP'), `Title: ${title}`);
    await cdp.eval(`localStorage.removeItem('selectShopCart'); sessionStorage.clear(); location.reload(); true`);
    await new Promise(r => setTimeout(r, 700));
    const cleanCartCount = await cdp.eval(`document.querySelector('#cartCount')?.textContent?.trim()`);
    record('Clean first-visit cart starts empty', cleanCartCount === '0', `Cart count: ${cleanCartCount}`);

    // 2. Responsive Viewports & Horizontal Overflow Check
    const viewports = [
      { w: 320, h: 568 },
      { w: 349, h: 700 },
      { w: 360, h: 740 },
      { w: 375, h: 812 },
      { w: 390, h: 844 },
      { w: 412, h: 915 },
      { w: 430, h: 932 },
      { w: 768, h: 1024 },
      { w: 1024, h: 768 },
      { w: 1366, h: 768 },
      { w: 1440, h: 900 }
    ];

    let overflowFree = true;
    for (const vp of viewports) {
      await cdp.setViewport(vp.w, vp.h);
      const scrollWidth = await cdp.eval('document.documentElement.scrollWidth');
      const innerWidth = await cdp.eval('window.innerWidth');
      const ok = scrollWidth <= innerWidth;
      if (!ok) overflowFree = false;
      record(`Viewport ${vp.w}px overflow check`, ok, `scrollWidth: ${scrollWidth}, innerWidth: ${innerWidth}`);
    }
    record('Zero horizontal overflow across all tested viewports', overflowFree);

    // 3. Capture screenshots at required resolutions
    const screenshotConfigs = [
      { name: 'screenshot_390x844.png', w: 390, h: 844 },
      { name: 'screenshot_430x932.png', w: 430, h: 932 },
      { name: 'screenshot_1366x768.png', w: 1366, h: 768 },
      { name: 'screenshot_320x568.png', w: 320, h: 568 },
      { name: 'screenshot_1440x900.png', w: 1440, h: 900 }
    ];

    for (const sc of screenshotConfigs) {
      await cdp.setViewport(sc.w, sc.h);
      await cdp.eval('window.scrollTo(0, 0)');
      await new Promise(r => setTimeout(r, 200));
      const scPath = path.join(SCREENSHOTS_DIR, sc.name);
      await cdp.captureScreenshot(scPath);
      record(`Screenshot ${sc.name}`, fs.existsSync(scPath), `Saved (${fs.statSync(scPath).size} bytes)`);
    }

    // 4. Test View Product ("عرض الموديل") and product switching
    await cdp.setViewport(390, 844);
    const switchRes = await cdp.eval(`
      (() => {
        const alexBtn = document.querySelector('[data-select-product="alex"]');
        if (!alexBtn) return { found: false };
        alexBtn.click();
        const activeProduct = document.body.dataset.product;
        const heroTitle = document.querySelector('#heroCode')?.textContent;
        const heroPrice = document.querySelector('#heroPrice')?.textContent;
        const browserCurrent = document.querySelector('#browserCurrent')?.textContent;
        const toastText = document.querySelector('#toast')?.textContent;
        return {
          found: true,
          activeProduct,
          heroTitle,
          heroPrice,
          browserCurrent,
          toastText
        };
      })()
    `);
    const alexSwitchOk = switchRes.activeProduct === 'alex' && switchRes.browserCurrent === 'ALEX';
    record('View Product ("عرض الموديل") switches product', alexSwitchOk, JSON.stringify(switchRes));

    // 4b. Product views are GA4 ecommerce events, deduplicated once per model per session.
    const analyticsRes = await cdp.eval(`
      (() => {
        const events = [];
        const listener = event => events.push(event.detail);
        window.addEventListener('selectshop:analytics', listener);
        trackProductView(PRODUCTS.eqwal, 'qa_first');
        trackProductView(PRODUCTS.eqwal, 'qa_duplicate');
        window.removeEventListener('selectshop:analytics', listener);
        const payload = ga4Payload('view_item', {
          item_id: 'eqwal',
          item_name: 'EQWAL',
          item_category: 'Sneakers',
          value: 680,
          currency: 'EGP'
        });
        return {
          events,
          viewed: JSON.parse(sessionStorage.getItem('selectShopViewedModels:v1') || '[]'),
          payload
        };
      })()
    `);
    const viewDedupOk = analyticsRes.events.length === 1
      && analyticsRes.events[0].name === 'view_item'
      && analyticsRes.viewed.includes('sk')
      && analyticsRes.viewed.includes('alex')
      && analyticsRes.viewed.includes('eqwal');
    record('Product view fires once per model per session', viewDedupOk, JSON.stringify(analyticsRes.viewed));
    const ga4ItemsOk = analyticsRes.payload.items?.[0]?.item_id === 'eqwal'
      && analyticsRes.payload.items?.[0]?.item_name === 'EQWAL';
    record('GA4 view_item uses the standard ecommerce items payload', ga4ItemsOk, JSON.stringify(analyticsRes.payload.items));

    // 5. Test valid sizes logic per product & variant
    const sizesRes = await cdp.eval(`
      (() => {
        openProductSheet('alex', { variantId: 'alex04' });
        const sizes = Array.from(document.querySelectorAll('#sizeRail .size-btn')).map(b => b.textContent.trim());
        closeAllSheets();
        return sizes;
      })()
    `);
    const alex04SizesOk = sizesRes.join(',') === '42,43,44,45,46';
    record('Valid sizes per product/variant (ALEX04 starts at 42)', alex04SizesOk, `Sizes: ${sizesRes.join(', ')}`);

    // 6. Test Primary Product Purchase + Try-On Addition + Totals
    const cartRes = await cdp.eval(`
      (() => {
        cart = [];
        // Add SK as primary purchase
        cart.push({
          id: 'sk_primary',
          productId: 'sk',
          variantId: 'sk1',
          sizes: [38],
          tryTwo: false,
          role: 'primary',
          billableQty: 1
        });
        const singleTotal = calcTotals(cart);

        // Add ALEX as trial item
        cart.push({
          id: 'alex_trial',
          productId: 'alex',
          variantId: 'alex01',
          sizes: [39],
          tryTwo: false,
          role: 'trial',
          billableQty: 1
        });
        const trialTotal = calcTotals(cart);

        // Convert ALEX to explicit purchase
        cart[1].role = 'purchase';
        const doublePurchaseTotal = calcTotals(cart);

        return {
          singleTotal,
          trialTotal,
          doublePurchaseTotal
        };
      })()
    `);

    // SK alone: 680 EGP
    const skAloneOk = cartRes.singleTotal.total === 680 && cartRes.singleTotal.pairCount === 1;
    record('SK primary purchase alone = 680 EGP', skAloneOk, `Total: ${cartRes.singleTotal.total}`);

    // SK + ALEX trial: total MUST remain 680 EGP!
    const tryOnZeroOk = cartRes.trialTotal.total === 680 && cartRes.trialTotal.pairCount === 1 && cartRes.trialTotal.trialCount === 1;
    record('TRY-ON item does NOT increase total (Trial = 0 EGP)', tryOnZeroOk, `Total with trial: ${cartRes.trialTotal.total}, trialCount: ${cartRes.trialTotal.trialCount}`);

    // SK + ALEX purchase: 680 + 540 = 1220 - 80 shipping saving = 1140 EGP!
    const doublePurchaseOk = cartRes.doublePurchaseTotal.total === 1140 && cartRes.doublePurchaseTotal.shippingSaving === 80;
    record('Converting TRY-ON to purchase applies single shipping saving (1140 EGP)', doublePurchaseOk, `Double total: ${cartRes.doublePurchaseTotal.total}`);

    // 7. Test WhatsApp Checkout Message & Target Number
    const waRes = await cdp.eval(`
      (() => {
        cart[1].role = 'trial';
        saveCart();

        return {
          waNumber: CONFIG.WHATSAPP_NUMBER,
          shopWaConst: SHOP_WHATSAPP_NUMBER,
          hasTrialTag: cart.some(i => i.role === 'trial')
        };
      })()
    `);

    const waNumOk = waRes.waNumber === '201289437444' && waRes.shopWaConst === '201289437444';
    record('Merchant WhatsApp number is exactly 201289437444', waNumOk, `Number: ${waRes.waNumber}`);

    // 8. Test GitHub Pages Repository Subpath Navigation
    await cdp.navigate(`http://127.0.0.1:${PORT}/select-shop-sk-landing/`);
    const subpathTitle = await cdp.eval('document.title');
    record('GitHub Pages repository subpath /select-shop-sk-landing/ loads correctly', subpathTitle.includes('SELECT SHOP'), `Title: ${subpathTitle}`);

    // 9. Test Direct Product Link on Subpath
    await cdp.navigate(`http://127.0.0.1:${PORT}/select-shop-sk-landing/product/alex01/`);
    const alexDirect = await cdp.eval('document.body.dataset.product');
    record('Direct product route /product/alex01/ activates ALEX', alexDirect === 'alex', `Active: ${alexDirect}`);

    // 10. Test file:// Preview Graceful Fallback
    const fileUrl = `file:///${ROOT_DIR.replace(/\\/g, '/')}/index.html`;
    await cdp.navigate(fileUrl);
    const fileClickOk = await cdp.eval(`
      (() => {
        try {
          const btn = document.querySelector('[data-select-product="eqwal"]');
          if (btn) btn.click();
          return { ok: true, active: document.body.dataset.product };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      })()
    `);
    record('file:// local preview handles "عرض الموديل" without throwing', fileClickOk.ok && fileClickOk.active === 'eqwal', JSON.stringify(fileClickOk));

    // 11. Verify all 19 image assets load and decode without errors
    await cdp.navigate(`http://127.0.0.1:${PORT}/`);
    const imagesDecoded = await cdp.eval(`
      Promise.all(Object.values(PRODUCTS).flatMap(p => p.variants).map(v => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth > 0);
          img.onerror = () => resolve(false);
          img.src = v.image;
        });
      })).then(results => results.every(Boolean))
    `);
    record('All 19 product variant images load & decode with non-zero dimensions', imagesDecoded);

  } catch (err) {
    console.error('[QA ERROR]', err);
    record('Fatal QA error', false, err.message);
  } finally {
    cdp.close();
    chromeProc.kill();
    server.close();
    try { fs.rmSync(qaProfile, { recursive: true, force: true }); } catch {}
  }

  const allPassed = results.every(r => r.pass);
  console.log(`\n========================================`);
  console.log(`QA SUMMARY: ${results.filter(r => r.pass).length} / ${results.length} CHECKS PASSED`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL PASS ✅' : 'FAIL ❌'}`);
  console.log(`========================================\n`);

  fs.writeFileSync(path.join(ROOT_DIR, 'qa_results.json'), JSON.stringify(results, null, 2));
}

runQA();
