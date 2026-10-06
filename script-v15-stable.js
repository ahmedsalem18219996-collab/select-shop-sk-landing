/* SELECT SHOP — Production Core Engine
   Single source of truth for products, pricing, cart, try-on logic, and WhatsApp ordering. */

const SHOP_WHATSAPP_NUMBER = "201289437444";

const CONFIG = Object.freeze({
  WHATSAPP_NUMBER: SHOP_WHATSAPP_NUMBER,
  GA4_ID: "G-XXXXXXXXXX",
  META_PIXEL_ID: "000000000000000",
  SHIPPING_FEE: 80
});

const PRODUCTS = Object.freeze({
  sk: {
    id: "sk", name: "SK Sneakers", short: "SK", price: 680, badge: "الأكثر طلبًا",
    headline: "راحة تحسيها.<br><em>ستايل يبان.</em>",
    description: "سنيكر خفيف بخامة Mesh مهوّاة ونعل EVA مرن للمشي، الشغل، الخروج والجيم.",
    hero: "assets/sk-1.jpg", sizeSummary: "37–41",
    features: [
      { title: "Mesh مهوّاة", copy: "خامة خفيفة تساعد القدم تتنفس وتفضل مرتاحة طول اليوم." },
      { title: "نعل EVA ممتص للصدمات", copy: "مرن وخفيف جداً لخطوة مريحة بدون إجهاد." },
      { title: "لكل المشاوير", copy: "مثالي للمشي والشغل والجامعة والجيم." },
      { title: "طلب مطمّن 100%", copy: "معاينة وتجربة مع المندوب والدفع عند الاستلام." }
    ],
    variants: [
      { id: "sk1", code: "SK-1", name: "أبيض × وردي", image: "assets/sk-1.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "sk2", code: "SK-2", name: "أسود × أزرق", image: "assets/sk-2.jpg", sizes: [37, 38, 39, 40, 41] }
    ]
  },
  alex: {
    id: "alex", name: "ALEX Premium", short: "ALEX", price: 540, badge: "ستايل فاخر",
    headline: "تفاصيل فخمة.<br><em>خطوة واثقة.</em>",
    description: "تصميم جلدي بلمسة عصرية، تبطين داخلي ونعل خفيف ومتين للاستخدام اليومي الراقي.",
    hero: "assets/alex01.jpg", sizeSummary: "37–46*",
    features: [
      { title: "خامة جلد فاخرة", copy: "تشطيب نظيف ولمسة أنيقة تدوم وتتحمل." },
      { title: "تبطين داخلي مريح", copy: "راحة فائقة مع اللبس اليومي لساعات طويلة." },
      { title: "5 اختيارات لونية", copy: "ألوان كلاسيكية واضحة وسهلة التنسيق مع كل لبسك." },
      { title: "مقاس حسب اللون", copy: "ALEX04 يبدأ من 42؛ باقي الألوان من 37 حتى 46." }
    ],
    variants: [
      { id: "alex01", code: "ALEX01", name: "أسود كامل", image: "assets/alex01.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
      { id: "alex02", code: "ALEX02", name: "أبيض كامل", image: "assets/alex02.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
      { id: "alex03", code: "ALEX03", name: "أسود بنعل أبيض", image: "assets/alex03.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
      { id: "alex04", code: "ALEX04", name: "أبيض بظهر أسود", image: "assets/alex04.jpg", sizes: [42, 43, 44, 45, 46] },
      { id: "alex05", code: "ALEX05", name: "أبيض بلسان أسود", image: "assets/alex05.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] }
    ]
  },
  eqwal: {
    id: "eqwal", name: "EQWAL Street", short: "EQWAL", price: 580, badge: "كاجوال يومي",
    headline: "كاجوال نظيف.<br><em>سهل يتلبس.</em>",
    description: "تصميم كاجوال Street بألوان هادئة وسهلة التنسيق، مناسب للخروج والاستخدام اليومي.",
    hero: "assets/eqwal03.jpg", sizeSummary: "37–45*",
    features: [
      { title: "ستايل ستريت كاجوال", copy: "شكل تريندي وشيك يليق على الجينز واللبس الكاجوال." },
      { title: "4 توليفات ألوان", copy: "اختيارات لونية مميزة وتفاصيل شمواه أنيقة." },
      { title: "مقاس حسب الموديل", copy: "EQWAL03: مقاسات 37–41، وباقي الموديلات 41–45." },
      { title: "شحن التجربة مجاني", copy: "جرّبي موديل إضافي من غير أي شحن زيادة، ولو احتفظتي بزوج إضافي يظهر لك الخصم كنسبة مئوية قبل التأكيد." }
    ],
    variants: [
      { id: "eqwal03", code: "EQWAL03", name: "أبيض × بيج", image: "assets/eqwal03.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "eqwal04", code: "EQWAL04", name: "أبيض بنعل أسود", image: "assets/eqwal04.jpg", sizes: [41, 42, 43, 44, 45] },
      { id: "eqwal05", code: "EQWAL05", name: "أبيض × رمادي بنعل رمادي", image: "assets/eqwal05.jpg", sizes: [41, 42, 43, 44, 45] },
      { id: "eqwal07", code: "EQWAL07", name: "أبيض × بيج بنعل بيج", image: "assets/eqwal07.jpg", sizes: [41, 42, 43, 44, 45] }
    ]
  },
  wk: {
    id: "wk", name: "WK Retro", short: "WK", price: 630, badge: "8 اختيارات",
    headline: "ثمانية اختيارات.<br><em>ستايلك أنتِ.</em>",
    description: "مجموعة سنيكرز يومية بطابع Retro ورياضي جذاب، بتفاصيل لونية ونعل Gum كلاسيكي، مقاسات 37–41.",
    hero: "assets/wk_1.jpg", sizeSummary: "37–41",
    features: [
      { title: "8 تصميمات ريترو", copy: "بدّلي بين 8 اختيارات مستوحاة من أشهر الموديلات الكلاسيكية." },
      { title: "نعل Gum أصيل", copy: "ثبات عالي ولمسة كلاسيكية مميزة جداً." },
      { title: "مقاسات 37–41", copy: "كل اختيارات WK متوفرة بنفس المقاسات الحقيقية." },
      { title: "شحن التجربة مجاني", copy: "جرّبي موديل إضافي من غير أي شحن زيادة، ولو احتفظتي بزوج إضافي يظهر لك الخصم كنسبة مئوية قبل التأكيد." }
    ],
    variants: [
      { id: "wk1", code: "WK-1", name: "بوما أبيض كلاسيك", image: "assets/wk_1.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk2", code: "WK-2", name: "بوما أبيض × أسود شمواه", image: "assets/wk_2.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk3", code: "WK-3", name: "توين سترايب أسود", image: "assets/wk_3.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk4", code: "WK-4", name: "توين سترايب أبيض كامل", image: "assets/wk_4.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk5", code: "WK-5", name: "سامبا خطوط نبيتي", image: "assets/wk_5.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk6", code: "WK-6", name: "سامبا خطوط أسود", image: "assets/wk_6.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk7", code: "WK-7", name: "نيو بالانس حرف N أسود", image: "assets/wk_7.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk8", code: "WK-8", name: "نيو بالانس حرف N نبيتي", image: "assets/wk_8.jpg", sizes: [37, 38, 39, 40, 41] }
    ]
  }
});

window.SELECT_SHOP_PRODUCTS = PRODUCTS;

const PRODUCT_IDS = Object.keys(PRODUCTS);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => `${Number(value).toLocaleString("ar-EG")} جنيه`;
const discountPercentForPrice = price => Math.round((CONFIG.SHIPPING_FEE / Number(price || 1)) * 100);
const discountPercentText = price => `${discountPercentForPrice(price).toLocaleString("ar-EG")}٪`;
const extraPairDiscountLabel = productId => `خصم ${discountPercentText(getProduct(productId).price)}`;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const validProductId = value => PRODUCT_IDS.includes(String(value || "").toLowerCase());
const getProduct = id => PRODUCTS[validProductId(id) ? id.toLowerCase() : "sk"];
const getVariant = (productId, variantId) => {
  const prod = getProduct(productId);
  return prod.variants.find(item => item.id === variantId) || prod.variants[0];
};

/* Safe Base URL & Router Architecture */
let baseHref = document.baseURI || window.location.href;
baseHref = baseHref.replace(/\/[^\/]+\.[a-zA-Z0-9]+(\?.*)?(#.*)?$/, '/');
if (!baseHref.endsWith('/')) baseHref += '/';
const APP_BASE = new URL(baseHref);

const baseElem = document.querySelector("base");
if (baseElem && location.protocol !== "file:") {
  try { baseElem.href = APP_BASE.href; } catch {}
}

function safeUpdateUrl(url, state, push = true) {
  try {
    if (push) history.pushState(state, "", url);
    else history.replaceState(state, "", url);
  } catch (e) {
    // Graceful fallback for file:// or cross-origin restrictions:
    try {
      if (location.protocol === "file:" && state?.productId) {
        location.hash = `product=${state.productId}&variant=${state.variantId || ""}`;
      }
    } catch {}
  }
}

function readRoute() {
  // 1. Check hash fallback (works on file:// and offline previews)
  if (location.hash && location.hash.includes("product=")) {
    try {
      const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
      const p = hashParams.get("product");
      if (validProductId(p)) {
        return {
          productId: p.toLowerCase(),
          variantId: getVariant(p.toLowerCase(), hashParams.get("variant")).id
        };
      }
    } catch {}
  }

  // 2. Check path slug (works for /product/alex01/ on GitHub Pages and custom domain)
  try {
    const relativePath = location.pathname.slice(APP_BASE.pathname.length);
    const slug = relativePath.match(/^product\/([a-z0-9-]+)(?:\/|$)/i)?.[1]?.toLowerCase();
    if (slug) {
      for (const product of Object.values(PRODUCTS)) {
        const variant = product.variants.find(item => item.id === slug);
        if (variant) return { productId: product.id, variantId: variant.id };
        if (product.id === slug) return { productId: product.id, variantId: product.variants[0].id };
      }
    }
  } catch {}

  // 3. Check search query params (?product=alex&variant=alex01)
  try {
    const params = new URLSearchParams(location.search);
    const productId = validProductId(params.get("product")) ? params.get("product").toLowerCase() : "sk";
    return { productId, variantId: getVariant(productId, params.get("variant")).id };
  } catch {
    return { productId: "sk", variantId: "sk1" };
  }
}

const initialRoute = readRoute();
let currentProductId = initialRoute.productId;
let currentVariantByProduct = Object.fromEntries(PRODUCT_IDS.map(id => [id, PRODUCTS[id].variants[0].id]));
currentVariantByProduct[currentProductId] = initialRoute.variantId;

let cart = [];
let sheetState = { productId: "sk", variantId: "sk1", sizes: [], tryTwo: false, editId: null, intent: "buy", role: "primary" };
let checkoutState = { items: [] };
let lastFocus = null;

try {
  const saved = JSON.parse(localStorage.getItem("selectShopCart") || "[]");
  cart = Array.isArray(saved) ? saved.filter(item => {
    const product = PRODUCTS[item.productId];
    const variant = product?.variants.find(entry => entry.id === item.variantId);
    return variant && Array.isArray(item.sizes) && item.sizes.length >= 1 && item.sizes.length <= 2 && item.sizes.every(size => variant.sizes.includes(Number(size)));
  }) : [];
} catch { cart = []; }
normalizeCart();

function productUrl(id, variantId = null) {
  const slug = getVariant(id, variantId).id;
  if (location.protocol === "file:") {
    const url = new URL(location.href);
    url.searchParams.set("product", id);
    if (variantId) url.searchParams.set("variant", variantId);
    return url;
  }
  const url = new URL(`product/${slug}/`, APP_BASE);
  const params = new URLSearchParams(location.search);
  for (const [key, value] of params) {
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

function normalizeCart() {
  let primaryFound = false;
  cart = cart.map(item => {
    let role = ["primary", "trial", "purchase"].includes(item.role) ? item.role : "trial";
    if (role === "primary") {
      role = primaryFound ? "trial" : "primary";
      primaryFound = true;
    }
    return { ...item, role, billableQty: 1 };
  });
  if (cart.length && !primaryFound) {
    cart[0].role = "primary";
  }
}

function calcTotals(items) {
  const validItems = items.filter(item => PRODUCTS[item.productId]);
  const payable = validItems.filter(item => item.role !== "trial");
  const pairCount = payable.length;
  const subtotal = payable.reduce((sum, item) => sum + PRODUCTS[item.productId].price, 0);
  const shippingSaving = Math.max(0, pairCount - 1) * CONFIG.SHIPPING_FEE;
  return {
    subtotal,
    discount: shippingSaving,
    shippingSaving,
    shippingCharged: pairCount ? CONFIG.SHIPPING_FEE : 0,
    pairCount,
    trialCount: validItems.length - pairCount,
    total: Math.max(0, subtotal - shippingSaving)
  };
}

const roleLabel = item => item.role === "trial" ? "للتجربة والمعاينة فقط" : item.role === "purchase" ? "شراء إضافي مؤكّد" : "الموديل الأساسي للشراء";

function additionalPairPrice(item) {
  return Math.max(0, getProduct(item.productId).price - CONFIG.SHIPPING_FEE);
}

function alternativeTotal(items, item) {
  const promoted = items.map(entry => entry.id === item.id ? { ...entry, role: "purchase" } : entry);
  return calcTotals(promoted).total;
}

function payableSummary(items) {
  const totals = calcTotals(items);
  const alternatives = items.filter(item => item.role === "trial");
  const extrasPurchased = items.filter(item => item.role === "purchase");
  return `
    <div class="payable-heading">
      <span>${alternatives.length ? "لو هتاخدي الأساسي فقط" : "الإجمالي عند الاستلام"}</span>
      <b id="cartTotal">${money(totals.total)}</b>
    </div>
    ${alternatives.length ? `
      <p class="payable-note">الموديل اللي للتجربة <b>مش محسوب في الإجمالي</b>. لو عجبك، هتشوفي السعر الأصلي والسعر بعد الخصم قبل أي تأكيد.</p>
    ` : `<p class="payable-note">السعر النهائي شامل الشحن والمعاينة قبل الدفع.</p>`}
    ${extrasPurchased.length ? `
      <p class="purchase-note">✓ تم تطبيق خصم الزوج الإضافي على ${extrasPurchased.length.toLocaleString("ar-EG")} ${extrasPurchased.length === 1 ? "زوج" : "أزواج"}.</p>
    ` : ""}
    <small class="delivery-detail">الشحن داخل السعر المعروض، وتجربة موديل أو مقاس إضافي بدون شحن إضافي.</small>
  `;
}

function saveCart() {
  normalizeCart();
  try { localStorage.setItem("selectShopCart", JSON.stringify(cart)); } catch {}
  updateCartUI();
}

/* Analytics */
function analyticsConfigured(value, placeholder) { return Boolean(value && value !== placeholder); }
function bootAnalytics() {
  if (analyticsConfigured(CONFIG.GA4_ID, "G-XXXXXXXXXX")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA4_ID}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.GA4_ID, { send_page_view: true });
  }
  if (analyticsConfigured(CONFIG.META_PIXEL_ID, "000000000000000")) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CONFIG.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }
}

function track(name, payload = {}) {
  window.dispatchEvent(new CustomEvent("selectshop:analytics", { detail: { name, payload } }));
  try {
    if (window.gtag) window.gtag("event", name, payload);
    if (window.fbq) {
      const standard = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", whatsapp_click: "Contact" }[name];
      const metaPayload = { content_name: payload.item_name, content_ids: payload.item_id ? [payload.item_id] : undefined, value: payload.value, currency: "EGP" };
      if (standard) window.fbq("track", standard, metaPayload);
      else window.fbq("trackCustom", name, metaPayload);
    }
  } catch {}
}

function syncViewport() {
  const viewport = window.visualViewport;
  const gap = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  document.documentElement.style.setProperty("--vv-bottom", `${Math.round(gap)}px`);
}

function syncProgress() {
  const root = document.documentElement;
  const max = root.scrollHeight - innerHeight;
  const progress = $("#scrollProgress");
  if (progress) progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
}

function setupDockVisibility() {
  const dock = $("#mobileDock");
  const heroActions = $(".hero-actions");
  if (!dock || !heroActions) return;
  if (!("IntersectionObserver" in window)) {
    const syncDock = () => dock.classList.toggle("visible", heroActions.getBoundingClientRect().bottom < 0);
    window.addEventListener("scroll", syncDock, { passive: true });
    syncDock();
    return;
  }
  const dockObserver = new IntersectionObserver(([entry]) => {
    dock.classList.toggle("visible", !entry.isIntersecting && entry.boundingClientRect.top < 0);
  }, { threshold: 0.1 });
  dockObserver.observe(heroActions);
}

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateImageSwap(image) {
  if (reduceMotion || !image?.animate) return;
  image.animate([
    { opacity: 0.35, transform: "scale(0.96) translateY(4px)" },
    { opacity: 1, transform: "scale(1) translateY(0)" }
  ], { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
}

function animateHeroChange() {
  if (reduceMotion) return;
  const targets = [$("#heroTitle"), $("#heroDescription"), $(".hero-price-row"), $(".product-stage")].filter(Boolean);
  targets.forEach((element, index) => element.animate([
    { opacity: 0.3, transform: "translateY(8px)" },
    { opacity: 1, transform: "translateY(0)" }
  ], { duration: 340, delay: index * 35, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }));
}

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); revealObserver.unobserve(entry.target); }
  }), { threshold: 0.1 });
  $$(".reveal").forEach(element => revealObserver.observe(element));
} else {
  $$(".reveal").forEach(element => element.classList.add("in"));
}

function renderHero({ announce = true } = {}) {
  const product = getProduct(currentProductId);
  const variant = getVariant(product.id, currentVariantByProduct[product.id]);
  document.body.dataset.product = product.id;
  currentVariantByProduct[product.id] = variant.id;

  const badgeElem = $("#heroBadge"); if (badgeElem) badgeElem.textContent = product.badge;
  const codeElem = $("#heroCode"); if (codeElem) codeElem.textContent = product.name;
  const titleElem = $("#heroTitle"); if (titleElem) titleElem.innerHTML = product.headline;
  const descElem = $("#heroDescription"); if (descElem) descElem.textContent = product.description;
  const priceElem = $("#heroPrice"); if (priceElem) priceElem.textContent = product.price.toLocaleString("ar-EG");
  const discountPill = $("#heroDiscountPill"); if (discountPill) discountPill.textContent = `${extraPairDiscountLabel(product.id)} على الزوج الإضافي`;
  const buyMetaElem = $("#heroBuyMeta"); if (buyMetaElem) buyMetaElem.textContent = `اختيار المقاس واللون • ${money(product.price)}`;
  const sizesElem = $("#heroSizes"); if (sizesElem) sizesElem.textContent = product.sizeSummary;
  const kickerElem = $("#featureKicker"); if (kickerElem) kickerElem.textContent = `ليه ${product.short}؟`;
  
  const microFeatures = $("#microFeatures");
  if (microFeatures) {
    microFeatures.innerHTML = product.features.map((feature, index) => `
      <article class="micro-feature reveal in">
        <span>0${index + 1}</span>
        <div><b>${feature.title}</b><small>${feature.copy}</small></div>
      </article>
    `).join("");
  }

  const heroVariants = $("#heroVariants");
  if (heroVariants) {
    heroVariants.innerHTML = product.variants.map(item => `
      <button class="hero-variant ${item.id === variant.id ? "active" : ""}" type="button" data-hero-variant="${item.id}" aria-pressed="${item.id === variant.id}">
        <img src="${item.image}" alt="${item.code} ${item.name}" width="96" height="96" loading="lazy">
        <span><b>${item.code}</b><small>${item.name}</small></span>
      </button>
    `).join("");

    $$('[data-hero-variant]', heroVariants).forEach(button => {
      button.addEventListener("click", () => setHeroVariant(button.dataset.heroVariant));
    });

    requestAnimationFrame(() => $("#heroVariants .hero-variant.active")?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" }));
  }

  updateHeroImage(variant, false);

  document.title = `${product.name} | SELECT SHOP`;
  const meta = $('meta[name="description"]');
  if (meta) meta.content = `${product.name} — ${product.description} السعر ${product.price} جنيه شامل الشحن.`;
  const ogTitle = $('meta[property="og:title"]');
  const ogDescription = $('meta[property="og:description"]');
  if (ogTitle) ogTitle.content = `${product.name} | SELECT SHOP`;
  if (ogDescription) ogDescription.content = `${product.description} السعر ${product.price} جنيه شامل الشحن.`;

  updateCatalogSelection();
  updateCartUI();
  if (announce) track("view_item", { item_id: product.id, item_name: product.name, value: product.price, currency: "EGP" });
}

function updateHeroImage(variant, animate = true) {
  const image = $("#heroProductImage");
  if (image) {
    image.src = variant.image;
    image.alt = `${variant.code} ${variant.name}`;
    if (animate) animateImageSwap(image);
  }
  const varCode = $("#heroVariantCode"); if (varCode) varCode.textContent = variant.code;
  const varName = $("#heroVariantName"); if (varName) varName.textContent = variant.name;
}

function setHeroVariant(variantId) {
  const product = getProduct(currentProductId);
  const variant = getVariant(product.id, variantId);
  currentVariantByProduct[product.id] = variant.id;
  safeUpdateUrl(productUrl(product.id, variant.id), { productId: product.id, variantId: variant.id }, false);
  $$('[data-hero-variant]', $("#heroVariants")).forEach(button => {
    const active = button.dataset.heroVariant === variant.id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateHeroImage(variant);
  $("#heroVariants .hero-variant.active")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
  track("select_color", { item_id: `${product.id}:${variant.id}`, item_name: `${product.name} ${variant.name}`, value: product.price, currency: "EGP" });
}

function selectProduct(productId, { push = true, scrollTop = true } = {}) {
  if (!validProductId(productId)) return;
  currentProductId = productId;
  const targetVariant = currentVariantByProduct[productId] || PRODUCTS[productId].variants[0].id;
  safeUpdateUrl(productUrl(productId, targetVariant), { productId, variantId: targetVariant }, push);
  renderHero();
  animateHeroChange();
  document.body.classList.add("product-switching");
  setTimeout(() => document.body.classList.remove("product-switching"), 520);
  toast(`أنتِ بتشاهدي ${PRODUCTS[productId].name} الآن ✓`);
  if (scrollTop) {
    const topElem = $("#top") || $("#main");
    topElem?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
}

function renderCatalog() {
  const rail = $("#modelRail");
  if (!rail) return;
  rail.innerHTML = PRODUCT_IDS.map(id => {
    const product = PRODUCTS[id];
    return `
      <article class="model-card ${id === currentProductId ? "active" : ""}" data-model-card="${id}">
        <div class="model-card-media">
          <img src="${product.hero}" alt="${product.name}" width="900" height="720" loading="lazy">
          <span class="model-card-badge">${product.badge}</span>
        </div>
        <div class="model-card-body">
          <div class="model-card-head">
            <h3>${product.name}</h3>
            <div class="model-price"><b>${product.price}</b><span>جنيه</span></div>
          </div>
          <p>${product.description}</p>
          <div class="model-meta">
            <span>${product.variants.length} ألوان</span>
            <span>مقاسات ${product.sizeSummary}</span>
            <span>شامل الشحن</span>
            <span class="extra-pair-deal">زوج إضافي: ${extraPairDiscountLabel(product.id)}</span>
          </div>
          <div class="model-card-actions">
            <a class="btn primary" href="?product=${id}" data-select-product="${id}">اختاري الموديل</a>
            <button class="share-link" type="button" data-share-product="${id}" aria-label="مشاركة رابط ${product.name}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$('[data-select-product]').forEach(link => {
    link.href = productUrl(link.dataset.selectProduct).href;
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const id = link.dataset.selectProduct;
      selectProduct(id, { push: true, scrollTop: false });
      requestAnimationFrame(() => openProductSheet(id, { intent: cart.length ? "trial" : "buy", variantId: currentVariantByProduct[id] }));
    });
  });

  $$('[data-share-product]').forEach(button => {
    button.addEventListener("click", () => shareProduct(button.dataset.shareProduct));
  });

  rail.addEventListener("scroll", syncRailStatus, { passive: true });
  requestAnimationFrame(syncRailStatus);
}

function updateCatalogSelection() {
  $$('[data-model-card]').forEach(card => {
    const id = card.dataset.modelCard;
    const items = cart.filter(item => item.productId === id);
    card.classList.toggle("active", id === currentProductId);
    card.classList.toggle("is-primary", items.some(item => item.role === "primary"));
    card.classList.toggle("is-trial", items.some(item => item.role === "trial") && !items.some(item => item.role === "primary"));
    const badge = $(".model-card-badge", card);
    if (badge) {
      badge.textContent = items.some(item => item.role === "primary")
        ? "✓ اختيارك الأساسي"
        : items.some(item => item.role === "trial")
          ? "◇ مضاف للتجربة"
          : id === currentProductId
            ? "● معروض الآن"
            : PRODUCTS[id].badge;
    }
  });
  const index = PRODUCT_IDS.indexOf(currentProductId);
  const curElem = $("#browserCurrent"); if (curElem) curElem.textContent = PRODUCTS[currentProductId].short;
  const countElem = $("#browserCount"); if (countElem) countElem.textContent = `${index + 1} / ${PRODUCT_IDS.length}`;
}

function syncRailStatus() {
  cancelAnimationFrame(syncRailStatus.frame);
  syncRailStatus.frame = requestAnimationFrame(() => {
    const rail = $("#modelRail");
    if (!rail) return;
    const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    let nearest = null;
    let distance = Infinity;
    $$('[data-model-card]', rail).forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardDistance = Math.abs(rect.left + rect.width / 2 - center);
      if (cardDistance < distance) { distance = cardDistance; nearest = card; }
    });
    $$('[data-model-card]', rail).forEach(card => card.classList.toggle("is-near", card === nearest));
    if (nearest) {
      const index = PRODUCT_IDS.indexOf(nearest.dataset.modelCard);
      const cur = $("#browserCurrent"); if (cur) cur.textContent = PRODUCTS[nearest.dataset.modelCard].short;
      const cnt = $("#browserCount"); if (cnt) cnt.textContent = `${index + 1} / ${PRODUCT_IDS.length}`;
    }
  });
}

function moveCatalog(direction) {
  const rail = $("#modelRail");
  if (!rail) return;
  const cards = $$('[data-model-card]', rail);
  const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
  let current = cards.reduce((best, card, index) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - center);
    return distance < best.distance ? { index, distance } : best;
  }, { index: 0, distance: Infinity }).index;
  current = Math.max(0, Math.min(cards.length - 1, current + direction));
  cards[current].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
}

async function shareProduct(productId) {
  const url = productUrl(productId, currentVariantByProduct[productId]).toString();
  try {
    if (navigator.share) await navigator.share({ title: `${PRODUCTS[productId].name} | SELECT SHOP`, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast("تم نسخ رابط المنتج ✓"); }
    else { window.prompt("انسخ رابط المنتج:", url); }
  } catch (error) {
    if (error?.name !== "AbortError") window.prompt("انسخ رابط المنتج:", url);
  }
}

function openSheet(sheet) {
  if (!sheet) return;
  lastFocus = document.activeElement;
  closeAllSheets(false, false);
  const backdrop = $("#sheetBackdrop");
  if (backdrop) {
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("show"));
  }
  sheet.classList.add("show");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("sheet-open");
  document.documentElement.classList.add("sheet-open");
  requestAnimationFrame(() => $("[data-close-sheet]", sheet)?.focus());
}

function closeAllSheets(hideBackdrop = true, restoreFocus = true) {
  $$(".sheet.show").forEach(sheet => {
    sheet.classList.remove("show");
    sheet.setAttribute("aria-hidden", "true");
  });
  if (hideBackdrop) {
    const backdrop = $("#sheetBackdrop");
    if (backdrop) {
      backdrop.classList.remove("show");
      setTimeout(() => { if (!$(".sheet.show")) backdrop.hidden = true; }, 220);
    }
    document.body.classList.remove("sheet-open");
    document.documentElement.classList.remove("sheet-open");
    if (restoreFocus && lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true });
  }
}

function openProductSheet(productId, { intent = "buy", editId = null, variantId = null } = {}) {
  const product = getProduct(productId);
  const existing = editId ? cart.find(item => item.id === editId) : null;
  const selectedVariant = existing?.variantId || variantId || currentVariantByProduct[product.id] || product.variants[0].id;
  sheetState = {
    productId: product.id,
    variantId: selectedVariant,
    sizes: existing ? [...existing.sizes] : [],
    tryTwo: existing?.sizes?.length === 2,
    editId: editId || null,
    intent,
    role: existing?.role || (cart.length ? "trial" : "primary")
  };
  renderProductSheet();
  openSheet($("#productSheet"));
  track("view_item", { item_id: product.id, item_name: product.name, value: product.price, currency: "EGP" });
}

function updatePurchaseJourney() {
  const hasSize = Boolean(sheetState?.sizes?.length);
  const steps = {
    model: document.querySelector('[data-journey-step="model"]'),
    size: document.querySelector('[data-journey-step="size"]'),
    confirm: document.querySelector('[data-journey-step="confirm"]')
  };
  steps.model?.classList.add("done");
  steps.size?.classList.toggle("active", !hasSize);
  steps.size?.classList.toggle("done", hasSize);
  steps.confirm?.classList.toggle("active", hasSize);
  const product = sheetState ? getProduct(sheetState.productId) : null;
  const variant = sheetState && product ? getVariant(product.id, sheetState.variantId) : null;
  const summary = $("#selectionSummaryText");
  if (summary && product && variant) {
    summary.textContent = hasSize
      ? `${variant.code} • مقاس ${sheetState.sizes.join(" / ")} • ${sheetState.role === "trial" ? "للتجربة" : "للشراء"}`
      : `${variant.code} • اختاري المقاس للمتابعة`;
  }
}

function renderProductSheet() {
  const product = getProduct(sheetState.productId);
  const variant = getVariant(product.id, sheetState.variantId);
  
  const kicker = $("#productSheetKicker"); if (kicker) kicker.textContent = product.badge;
  const title = $("#productSheetTitle"); if (title) title.textContent = product.name;
  const pName = $("#sheetProductName"); if (pName) pName.textContent = `${product.name} — ${variant.name}`;
  const vCode = $("#sheetVariantCode"); if (vCode) vCode.textContent = variant.code;
  const pPrice = $("#sheetProductPrice"); if (pPrice) pPrice.textContent = money(product.price);
  
  const image = $("#sheetProductImage");
  if (image) {
    image.src = variant.image;
    image.alt = `${product.name} ${variant.name}`;
  }

  const vRail = $("#variantRail");
  if (vRail) {
    vRail.innerHTML = product.variants.map(item => `
      <button class="variant-btn ${item.id === variant.id ? "active" : ""}" type="button" data-variant="${item.id}" aria-pressed="${item.id === variant.id}">
        <span class="variant-thumb"><img src="${item.image}" alt="" width="180" height="180" loading="lazy"><i aria-hidden="true">✓</i></span>
        <span class="variant-label"><b>${item.code}</b><small>${item.name}</small></span>
      </button>
    `).join("");
    $$('[data-variant]', vRail).forEach(button => button.addEventListener("click", () => selectSheetVariant(button.dataset.variant)));
  }

  renderSizes();

  const toggle = $("#trySizeToggle");
  if (toggle) {
    toggle.classList.toggle("active", sheetState.tryTwo);
    toggle.setAttribute("aria-pressed", String(sheetState.tryTwo));
  }
  const sHint = $("#sizeHint");
  if (sHint) {
    sHint.textContent = sheetState.tryTwo ? "اختاري مقاسين — زوج واحد وسعر واحد" : "اختاري مقاسك المعتاد";
  }

  const pCopy = $("#productDetailCopy");
  if (pCopy) {
    pCopy.innerHTML = `<p>${product.description}</p><ul>${product.features.map(feature => `<li><b>${feature.title}:</b> ${feature.copy}</li>`).join("")}</ul>`;
  }

  const mIntent = $("#modelIntent");
  if (mIntent) {
    mIntent.hidden = !cart.length || sheetState.role === "primary";
    mIntent.innerHTML = `
      <p>الموديل ده هيكون إيه في طلبك؟ اختاري قبل المقاس.</p>
      <div>
        <button type="button" data-intent="trial" class="${sheetState.role === "trial" ? "active" : ""}" aria-pressed="${sheetState.role === "trial"}">
          ◇ للتجربة والمعاينة فقط
        </button>
        <button type="button" data-intent="purchase" class="${sheetState.role === "purchase" ? "active" : ""}" aria-pressed="${sheetState.role === "purchase"}">
          ✓ شراء الموديلين معاً
        </button>
      </div>
      <small>${sheetState.role === "trial" ? "شحن التجربة مجاني؛ هتعايني الاتنين، تحتفظي بالأنسب والبديل يرجع مع المندوب." : "لو قررتي تحتفظي بيه، هتشوفي السعر قبل وبعد ونسبة الخصم بوضوح قبل التأكيد."}</small>
    `;
    $$("[data-intent]", mIntent).forEach(button => button.addEventListener("click", () => {
      sheetState.role = button.dataset.intent;
      renderProductSheet();
    }));
  }

  const btnAdd = $("#sheetAddCart");
  if (btnAdd) {
    btnAdd.textContent = sheetState.editId ? "إلغاء التعديل" : "تغيير الموديل";
  }
  const btnBuy = $("#sheetBuyNow");
  if (btnBuy) {
    btnBuy.textContent = sheetState.editId
      ? "حفظ التعديل"
      : sheetState.role === "trial"
        ? "أضيفيه للتجربة"
        : "تأكيد الاختيار";
    btnBuy.hidden = false;
  }
  updatePurchaseJourney();
}

function selectSheetVariant(variantId) {
  const product = getProduct(sheetState.productId);
  const variant = getVariant(product.id, variantId);
  if (variant.id === sheetState.variantId) return;
  sheetState.variantId = variant.id;
  // Clear sizes not valid for this variant
  sheetState.sizes = sheetState.sizes.filter(size => variant.sizes.includes(size));
  currentVariantByProduct[product.id] = variant.id;
  renderProductSheet();
  animateImageSwap($("#sheetProductImage"));
  if (product.id === currentProductId) setHeroVariant(variant.id);
  else track("select_color", { item_id: `${product.id}:${variant.id}`, item_name: `${product.name} ${variant.name}`, value: product.price, currency: "EGP" });
}

function renderSizes() {
  const variant = getVariant(sheetState.productId, sheetState.variantId);
  const rail = $("#sizeRail");
  if (!rail) return;
  rail.innerHTML = variant.sizes.map(size => `
    <button class="size-btn ${sheetState.sizes.includes(size) ? "active" : ""}" type="button" data-sheet-size="${size}" aria-pressed="${sheetState.sizes.includes(size)}">
      ${size}
    </button>
  `).join("");
  $$('[data-sheet-size]', rail).forEach(button => button.addEventListener("click", () => toggleSize(Number(button.dataset.sheetSize))));
}

function toggleSize(size) {
  const index = sheetState.sizes.indexOf(size);
  if (index >= 0) {
    sheetState.sizes.splice(index, 1);
  } else if (sheetState.tryTwo) {
    if (sheetState.sizes.length >= 2) {
      toast("يمكنك اختيار مقاسين فقط للتجربة");
      return;
    }
    sheetState.sizes.push(size);
  } else {
    sheetState.sizes = [size];
  }
  renderSizes();
  updatePurchaseJourney();
  const active = $("#sizeRail .size-btn.active:last-of-type");
  if (active && !reduceMotion) {
    active.classList.remove("just-selected");
    requestAnimationFrame(() => active.classList.add("just-selected"));
  }
}

function validateSheetSelection() {
  if (sheetState.tryTwo && sheetState.sizes.length !== 2) {
    toast("يرجى اختيار مقاسين للتجربة مع المندوب");
    return false;
  }
  if (!sheetState.tryTwo && sheetState.sizes.length !== 1) {
    toast("يرجى اختيار المقاس أولاً");
    return false;
  }
  return true;
}

function stateToItem() {
  return {
    id: sheetState.editId || uid(),
    productId: sheetState.productId,
    variantId: sheetState.variantId,
    sizes: [...sheetState.sizes],
    tryTwo: sheetState.tryTwo,
    role: sheetState.role,
    billableQty: 1,
    addedAt: Date.now()
  };
}

function celebrateCart() {
  if (reduceMotion) return;
  $$(".cart-trigger, .dock-cart").forEach(node => {
    node.classList.remove("cart-bump");
    requestAnimationFrame(() => node.classList.add("cart-bump"));
    setTimeout(() => node.classList.remove("cart-bump"), 620);
  });
}

function updateCartUI() {
  const totals = calcTotals(cart);
  const count = cart.length;
  const countElem = $("#cartCount"); if (countElem) countElem.textContent = count;
  const dockCountElem = $("#dockCartCount"); if (dockCountElem) dockCountElem.textContent = count;
  $$('[data-open-cart]').forEach(button => button.setAttribute("aria-label", `فتح السلة، ${count} منتجات`));
  
  const dockLabel = $("#dockLabel");
  const dockPrice = $("#dockPrice");
  const dockBuy = $("#dockBuy");
  if (count) {
    if (dockLabel) dockLabel.textContent = totals.trialCount ? `أساسي + ${totals.trialCount} للتجربة` : `${totals.pairCount} للشراء`;
    if (dockPrice) dockPrice.textContent = money(totals.total);
    if (dockBuy) dockBuy.textContent = "إتمام الطلب";
  } else {
    const product = getProduct(currentProductId);
    if (dockLabel) dockLabel.textContent = product.name;
    if (dockPrice) dockPrice.textContent = money(product.price);
    if (dockBuy) dockBuy.textContent = "اطلبي الآن";
  }
  updateCatalogSelection();
}

function renderCart() {
  const list = $("#cartList");
  const summary = $("#cartSummary");
  const upsell = $("#cartUpsell");
  const empty = $("#emptyCart");
  const checkoutBtn = $("#cartCheckout");

  const hasTrial = cart.some(item => item.role === "trial");
  if (empty) empty.hidden = Boolean(cart.length);
  if (summary) summary.hidden = !cart.length;
  if (upsell) upsell.hidden = !cart.length || hasTrial || cart.length >= 2;
  if (checkoutBtn) checkoutBtn.disabled = !cart.length;

  if (list) {
    list.innerHTML = cart.map(item => {
      const product = getProduct(item.productId);
      const variant = getVariant(item.productId, item.variantId);
      const isTrial = item.role === "trial";
      const isPurchase = item.role === "purchase";
      const discountText = discountPercentText(product.price);
      const discountedPrice = additionalPairPrice(item);
      return `
        <article class="cart-item role-${item.role}" data-cart-id="${item.id}">
          <div class="cart-line-top">
            <img src="${variant.image}" alt="${variant.code} ${variant.name}" width="180" height="180">
            <div class="cart-item-main">
              <span class="role-tag ${item.role}">${roleLabel(item)}</span>
              <b>${product.name}</b>
              <small>${variant.name} • ${item.sizes.length === 2 ? "تجربة مقاسين" : "مقاس"} ${item.sizes.join(" / ")}</small>
              ${!isTrial && !isPurchase ? `
                <div class="cart-primary-price"><b>${money(product.price)}</b><small>شامل الشحن</small></div>
              ` : ""}
            </div>
            <div class="cart-item-tools">
              <button type="button" data-cart-edit="${item.id}">تعديل</button>
              <button type="button" data-cart-remove="${item.id}" aria-label="حذف ${product.name}">حذف</button>
            </div>
          </div>

          ${isTrial ? `
            <div class="keep-offer">
              <div class="keep-offer-head">
                <strong>لو عجبك وعايزة تحتفظي بيه</strong>
                <span class="discount-badge">خصم ${discountText}</span>
              </div>
              <div class="keep-price">
                <del>${money(product.price)}</del>
                <b>${money(discountedPrice)}</b>
              </div>
              <button type="button" data-buy-both="${item.id}">احتفظي بيه بخصم ${discountText}</button>
              <small>لو مش مناسب، بيرجع مع المندوب ومش بيتحسب عليكِ كشراء.</small>
            </div>
            <div class="cart-role-actions">
              <button type="button" data-make-primary="${item.id}" class="action-swap">خليه المنتج الأساسي بدل الحالي</button>
            </div>
          ` : isPurchase ? `
            <div class="purchase-offer">
              <div class="keep-offer-head">
                <strong>زوج إضافي بخصم ${discountText}</strong>
                <span class="discount-badge">تم الخصم</span>
              </div>
              <div class="keep-price"><del>${money(product.price)}</del><b>${money(discountedPrice)}</b></div>
            </div>
            <div class="cart-role-actions">
              <button type="button" data-trial-only="${item.id}">رجّعيه للتجربة فقط</button>
            </div>
          ` : ""}
          ${item.sizes.length === 2 ? '<span class="trial-badge">هتحتفظي بمقاس واحد فقط والبديل يرجع مع المندوب</span>' : ""}
        </article>
      `;
    }).join("");

    $$('[data-cart-remove]', list).forEach(button => {
      button.onclick = () => {
        cart = cart.filter(item => item.id !== button.dataset.cartRemove);
        saveCart();
        renderCart();
        toast("تم حذف المنتج من السلة");
      };
    });

    $$('[data-cart-edit]', list).forEach(button => {
      button.onclick = () => {
        const item = cart.find(entry => entry.id === button.dataset.cartEdit);
        if (item) openProductSheet(item.productId, { editId: item.id });
      };
    });

    const changeRole = (id, role) => {
      if (role === "primary") {
        cart.forEach(item => { if (item.role === "primary") item.role = "trial"; });
      }
      const item = cart.find(entry => entry.id === id);
      if (item) item.role = role;
      saveCart();
      renderCart();
      toast(role === "purchase" ? "تم تطبيق خصم الزوج الإضافي ✓" : "تم تحديث اختيارك ✓");
    };

    $$('[data-make-primary]', list).forEach(button => button.onclick = () => changeRole(button.dataset.makePrimary, "primary"));
    $$('[data-buy-both]', list).forEach(button => button.onclick = () => changeRole(button.dataset.buyBoth, "purchase"));
    $$('[data-trial-only]', list).forEach(button => button.onclick = () => changeRole(button.dataset.trialOnly, "trial"));
  }

  if (summary) summary.innerHTML = cart.length ? payableSummary(cart) : "";
}

function openCart() {
  renderCart();
  openSheet($("#cartSheet"));
}

function openCheckout(items) {
  checkoutState = { items: items.map(item => ({ ...item, sizes: [...item.sizes] })) };
  const itemsContainer = $("#checkoutItems");
  if (itemsContainer) {
    itemsContainer.innerHTML = checkoutState.items.map(item => {
      const product = getProduct(item.productId);
      const variant = getVariant(item.productId, item.variantId);
      return `
        <div class="checkout-line role-${item.role}">
          <div>
            <span class="role-tag ${item.role}">${roleLabel(item)}</span>
            <b>${product.name} — ${variant.name}</b>
            <small>${item.sizes.length === 2 ? "تجربة مقاسين (للاحتفاظ بواحد)" : "المقاس"}: ${item.sizes.join(" / ")}</small>
          </div>
          <strong>${item.role === "trial" ? "للتجربة — شحن مجاني" : item.role === "purchase" ? `${money(additionalPairPrice(item))} بعد الخصم` : money(product.price)}</strong>
        </div>
      `;
    }).join("");
  }
  const totals = calcTotals(checkoutState.items);
  const savings = $("#checkoutSavings");
  if (savings) {
    savings.innerHTML = payableSummary(checkoutState.items).replace('id="cartTotal"', 'id="checkoutTotal"');
  }
  const err = $("#formError"); if (err) err.textContent = "";
  openSheet($("#checkoutSheet"));
  track("begin_checkout", { value: totals.total, currency: "EGP", items: totals.pairCount, try_on_models: totals.trialCount });
}

function normalizePhone(value) { return (value || "").replace(/\D/g, ""); }
function validPhone(value) {
  const phone = normalizePhone(value);
  return /^01[0125]\d{8}$/.test(phone) || /^201[0125]\d{8}$/.test(phone);
}

function toast(text) {
  const element = $("#toast");
  if (!element) return;
  element.textContent = text;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2500);
}

const tryToggle = $("#trySizeToggle");
if (tryToggle) {
  tryToggle.addEventListener("click", () => {
    sheetState.tryTwo = !sheetState.tryTwo;
    if (!sheetState.tryTwo && sheetState.sizes.length > 1) {
      sheetState.sizes = sheetState.sizes.slice(0, 1);
    }
    renderProductSheet();
  });
}

function commitSheetItem() {
  if (!validateSheetSelection()) return false;
  const item = stateToItem();
  const product = getProduct(item.productId);
  if (sheetState.editId) {
    const index = cart.findIndex(entry => entry.id === sheetState.editId);
    if (index >= 0) cart[index] = item;
  } else {
    const exactDuplicate = cart.find(entry =>
      entry.productId === item.productId &&
      entry.variantId === item.variantId &&
      entry.role === item.role &&
      JSON.stringify([...entry.sizes].sort()) === JSON.stringify([...item.sizes].sort())
    );
    if (exactDuplicate) {
      toast("الاختيار ده موجود بالفعل في السلة");
      return true;
    }
    cart.push(item);
    track("add_to_cart", {
      item_id: product.id,
      item_name: product.name,
      value: item.role === "trial" ? 0 : product.price,
      currency: "EGP",
      selection_role: item.role
    });
  }
  saveCart();
  celebrateCart();
  toast(item.role === "trial" ? "أُضيف للتجربة ✓ مش محسوب شراء دلوقتي" : "تم حفظ اختيارك للسلة ✓");
  return true;
}

const addCartBtn = $("#sheetAddCart");
if (addCartBtn) addCartBtn.addEventListener("click", () => {
  const wasEditing = Boolean(sheetState.editId);
  closeAllSheets();
  if (wasEditing) {
    setTimeout(openCart, 160);
  } else {
    setTimeout(() => $("#catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 180);
  }
});

const buyNowBtn = $("#sheetBuyNow");
if (buyNowBtn) buyNowBtn.addEventListener("click", () => {
  if (commitSheetItem()) openCart();
});

const heroBuy = $("#heroBuy");
if (heroBuy) heroBuy.addEventListener("click", () => openProductSheet(currentProductId, { intent: "buy", variantId: currentVariantByProduct[currentProductId] }));

const heroAdd = $("#heroAdd");
if (heroAdd) heroAdd.addEventListener("click", () => $("#catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));

const catPrev = $("#catalogPrev");
if (catPrev) catPrev.addEventListener("click", () => moveCatalog(-1));

const catNext = $("#catalogNext");
if (catNext) catNext.addEventListener("click", () => moveCatalog(1));

$$('[data-open-cart]').forEach(button => button.addEventListener("click", openCart));
$$('[data-close-sheet]').forEach(button => button.addEventListener("click", () => closeAllSheets()));

const backdrop = $("#sheetBackdrop");
if (backdrop) backdrop.addEventListener("click", () => closeAllSheets());

const dockBuy = $("#dockBuy");
if (dockBuy) dockBuy.addEventListener("click", () => cart.length ? openCart() : openProductSheet(currentProductId, { intent: "buy", variantId: currentVariantByProduct[currentProductId] }));

const cartCheckout = $("#cartCheckout");
if (cartCheckout) cartCheckout.addEventListener("click", () => { if (cart.length) openCheckout(cart); });

$$('[data-close-and-shop]').forEach(button => button.addEventListener("click", () => {
  closeAllSheets();
  setTimeout(() => $("#catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 180);
}));

$$('[data-scroll-catalog]').forEach(button => button.addEventListener("click", () => {
  $("#catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}));

/* WhatsApp Checkout Submission */
const checkoutForm = $("#checkoutForm");
if (checkoutForm) {
  checkoutForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    
    if (!data.name?.trim() || !validPhone(data.phone) || !data.governorate?.trim() || !data.area?.trim() || !data.address?.trim()) {
      const err = $("#formError");
      if (err) err.textContent = "يرجى كتابة الاسم، ورقم موبايل صحيح (01xxxxxxxxx)، والمحافظة، والمنطقة، والعنوان بالتفصيل.";
      const firstInvalid = !data.name?.trim()
        ? event.currentTarget.elements.name
        : !validPhone(data.phone)
          ? event.currentTarget.elements.phone
          : !data.governorate?.trim()
            ? event.currentTarget.elements.governorate
            : !data.area?.trim()
              ? event.currentTarget.elements.area
              : event.currentTarget.elements.address;
      firstInvalid?.focus();
      return;
    }

    const totals = calcTotals(checkoutState.items);
    const purchased = checkoutState.items.filter(i => i.role !== "trial");
    const trials = checkoutState.items.filter(i => i.role === "trial");

    let message = `🛍️ طلب جديد — SELECT SHOP\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `👟 المنتجات للشراء (${totals.pairCount} زوج):\n`;
    purchased.forEach((item, index) => {
      const prod = getProduct(item.productId);
      const vr = getVariant(item.productId, item.variantId);
      const tag = item.role === "primary" ? "الموديل الأساسي" : "شراء إضافي مؤكد";
      message += `${index + 1}) ${prod.name} [${tag}]\n`;
      message += `   • كود اللون: ${vr.code} (${vr.name})\n`;
      if (item.sizes.length === 2) {
        message += `   • المقاس: تجربة مقاسين (${item.sizes.join(" و ")}) — للاحتفاظ بمقاس واحد فقط\n`;
      } else {
        message += `   • المقاس: ${item.sizes[0]}\n`;
      }
      if (item.role === "purchase") {
        message += `   • سعر الزوج الإضافي بعد ${extraPairDiscountLabel(item.productId)}: ${money(Math.max(0, prod.price - CONFIG.SHIPPING_FEE))} (بدل ${money(prod.price)})\n\n`;
      } else {
        message += `   • السعر: ${money(prod.price)} شامل الشحن\n\n`;
      }
    });

    if (trials.length) {
      message += `🔍 موديلات للتجربة والمعاينة عند الاستلام (غير محسوبة في الإجمالي الآن):\n`;
      trials.forEach((item, index) => {
        const prod = getProduct(item.productId);
        const vr = getVariant(item.productId, item.variantId);
        message += `${index + 1}) ${prod.name} [للتجربة والمعاينة فقط]\n`;
        message += `   • كود اللون: ${vr.code} (${vr.name})\n`;
        if (item.sizes.length === 2) {
          message += `   • المقاس: تجربة مقاسين (${item.sizes.join(" و ")})\n`;
        } else {
          message += `   • المقاس: ${item.sizes[0]}\n`;
        }
        message += `   • شحن التجربة: مجاني\n`;
        message += `   • لو الاحتفاظ به كزوج إضافي: ${money(Math.max(0, prod.price - CONFIG.SHIPPING_FEE))} بعد ${extraPairDiscountLabel(item.productId)} (بدل ${money(prod.price)})\n`;
        message += `   (غير محسوب كشراء الآن — الخصم يطبق فقط لو قررتي الاحتفاظ به كزوج إضافي)\n\n`;
      });
    }

    message += `💳 ملخص الحساب:\n`;
    message += `• عدد الأزواج للشراء: ${totals.pairCount}\n`;
    if (totals.trialCount > 0) {
      message += `• موديلات التجربة: ${totals.trialCount} (غير محسوبة في الإجمالي الآن)\n`;
    }
    message += `• شحن الطلب الأساسي: مشمول في السعر\n`;
    if (totals.trialCount > 0) {
      message += `• شحن موديلات التجربة: مجاني\n`;
    }
    if (totals.shippingSaving > 0) {
      message += `• خصم الأزواج الإضافية: مطبق كنسبة مئوية حسب كل موديل\n`;
    }
    message += `• المبلغ المطلوب عند الاستلام: ${money(totals.total)}\n\n`;

    message += `👤 بيانات العميل والاستلام:\n`;
    message += `• الاسم: ${data.name.trim()}\n`;
    message += `• رقم الموبايل: ${normalizePhone(data.phone)}\n`;
    message += `• المحافظة: ${data.governorate.trim()}\n`;
    message += `• المنطقة: ${data.area.trim()}\n`;
    message += `• العنوان بالتفصيل: ${data.address.trim()}\n`;
    if (data.notes?.trim()) {
      message += `• ملاحظات: ${data.notes.trim()}\n`;
    }
    message += `\n✨ تم إنشاء الطلب عبر موقع SELECT SHOP`;

    track("whatsapp_click", { value: totals.total, currency: "EGP", items: totals.pairCount });
    toast("سيتم تحويلك لواتساب SELECT SHOP لتأكيد الطلب 💬");

    const targetUrl = `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 400);
  });
}

document.addEventListener("keydown", event => {
  const activeSheet = $(".sheet.show");
  if (event.key === "Escape" && activeSheet) { closeAllSheets(); return; }
  if (event.key !== "Tab" || !activeSheet) return;
  const focusable = $$('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', activeSheet).filter(element => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

function setupPremiumMotion() {
  if (reduceMotion) return;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!finePointer) return;
  $$(".model-card, .product-stage").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      const rx = ((y / rect.height) - .5) * -3.5;
      const ry = ((x / rect.width) - .5) * 4.5;
      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
}

window.addEventListener("popstate", () => {
  closeAllSheets();
  const route = readRoute();
  currentProductId = route.productId;
  currentVariantByProduct[currentProductId] = route.variantId;
  renderHero();
});

window.addEventListener("scroll", syncProgress, { passive: true });
window.addEventListener("resize", syncViewport);
window.visualViewport?.addEventListener("resize", syncViewport);
window.visualViewport?.addEventListener("scroll", syncViewport);

renderCatalog();
const skipLink = document.querySelector('.skip-link');
if (skipLink) skipLink.href = `${location.pathname}${location.search}#main`;
renderHero({ announce: false });
updateCartUI();
bootAnalytics();
track("view_item", { item_id: currentProductId, item_name: getProduct(currentProductId).name, value: getProduct(currentProductId).price, currency: "EGP" });
syncViewport();
syncProgress();
setupDockVisibility();
setupPremiumMotion();
requestAnimationFrame(() => document.body.classList.add("loaded"));
