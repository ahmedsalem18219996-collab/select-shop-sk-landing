/* SELECT SHOP — Production Core Engine
   Single source of truth for products, pricing, cart, try-on logic, and WhatsApp ordering. */

const SHOP_WHATSAPP_NUMBER = "201289437444";

const CONFIG = Object.freeze({
  WHATSAPP_NUMBER: SHOP_WHATSAPP_NUMBER,
  GA4_ID: "G-NB8PZCX35Z",
  META_PIXEL_ID: "000000000000000",
  SHIPPING_FEE: 80,
  PROF_BRIDGE_URL: "" // يظل فارغاً حتى نحصل على API/Integration رسمي من Prof
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
const NEW_DESIGN_IDS = new Set(["eqwal", "wk"]);
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
let cardVariantIndex = Object.fromEntries(PRODUCT_IDS.map(id => [id, 0]));
currentVariantByProduct[currentProductId] = initialRoute.variantId;

let cart = [];
let sheetState = { productId: "sk", variantId: "sk1", sizes: [], tryTwo: false, editId: null, intent: "buy", role: "primary" };
let checkoutState = { items: [] };
let addProductMode = "purchase";
let lastFocus = null;

const CART_STORAGE_KEY = location.pathname.includes("/preview-v17/") ? "selectShopCartV17Preview" : "selectShopCart";

try {
  const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
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

const roleLabel = item => item.role === "trial" ? "اختيار إضافي عند الاستلام" : item.role === "purchase" ? "زوج إضافي بعد الخصم" : "الطلب الأساسي";

function additionalPairPrice(item) {
  return Math.max(0, getProduct(item.productId).price - CONFIG.SHIPPING_FEE);
}

function alternativeTotal(items, item) {
  const promoted = items.map(entry => entry.id === item.id ? { ...entry, role: "purchase" } : entry);
  return calcTotals(promoted).total;
}

function payableSummary(items) {
  const totals = calcTotals(items);
  const optionalChoices = items.filter(item => item.role === "trial");
  const allSelectedTotals = optionalChoices.length
    ? calcTotals(items.map(item => item.role === "trial" ? { ...item, role: "purchase" } : item))
    : totals;
  return `
    <div class="price-summary-grid">
      <div><span>الإجمالي قبل الخصم</span><b>${money(totals.subtotal)}</b></div>
      <div class="discount-row"><span>الخصم</span><b>-${money(totals.discount)}</b></div>
      <div class="final-row"><span>الإجمالي بعد الخصم</span><b id="cartTotal">${money(totals.total)}</b></div>
    </div>
    ${optionalChoices.length ? `
      <div class="optional-choice-total">
        <strong>لو عجبك الاختيار الإضافي واستلمتيه كمان</strong>
        <div><span>قبل الخصم</span><del>${money(allSelectedTotals.subtotal)}</del></div>
        <div><span>بعد الخصم</span><b>${money(allSelectedTotals.total)}</b></div>
        <small>وقت الاستلام اختاري اللي يعجبك. اللي مش مناسب سيبيه مع المندوب ومش هتدفعي ثمنه.</small>
      </div>
    ` : `<p class="payable-note">السعر النهائي شامل الشحن والمعاينة قبل الدفع.</p>`}
    <small class="delivery-detail">المبلغ النهائي بيتحدد حسب الأزواج اللي قررتي تستلميها فعلاً.</small>
  `;
}

function saveCart() {
  normalizeCart();
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch {}
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

const PRODUCT_VIEW_SESSION_KEY = "selectShopViewedModels:v1";
const viewedProductIds = new Set((() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PRODUCT_VIEW_SESSION_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(id => typeof id === "string") : [];
  } catch {
    return [];
  }
})());

function ga4Payload(name, payload) {
  if (!payload.item_id || !["view_item", "add_to_cart"].includes(name)) return payload;
  return {
    ...payload,
    items: [{
      item_id: payload.item_id,
      item_name: payload.item_name,
      item_category: payload.item_category || "Sneakers",
      item_variant: payload.item_variant,
      price: payload.value,
      quantity: payload.quantity || 1
    }]
  };
}

function track(name, payload = {}) {
  window.dispatchEvent(new CustomEvent("selectshop:analytics", { detail: { name, payload } }));
  try {
    if (window.gtag) window.gtag("event", name, ga4Payload(name, payload));
    if (window.fbq) {
      const standard = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", whatsapp_click: "Contact" }[name];
      const metaPayload = { content_name: payload.item_name, content_ids: payload.item_id ? [payload.item_id] : undefined, value: payload.value, currency: "EGP" };
      if (standard) window.fbq("track", standard, metaPayload);
      else window.fbq("trackCustom", name, metaPayload);
    }
  } catch {}
}

function trackProductView(product, viewContext) {
  if (!product || viewedProductIds.has(product.id)) return;
  viewedProductIds.add(product.id);
  try { sessionStorage.setItem(PRODUCT_VIEW_SESSION_KEY, JSON.stringify([...viewedProductIds])); } catch {}
  track("view_item", {
    item_id: product.id,
    item_name: product.name,
    item_category: "Sneakers",
    value: product.price,
    currency: "EGP",
    view_context: viewContext
  });
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

const SELECT_SHOP_THEME_KEY = "selectShopTheme";
function applyTheme() {
  document.body.classList.remove("theme-night");
  document.documentElement.style.colorScheme = "light";
  try { localStorage.setItem(SELECT_SHOP_THEME_KEY, "light"); } catch {}
}
function initTheme() {
  applyTheme();
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
  if (announce) trackProductView(product, "model_switch");
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
    const index = Math.max(0, Math.min(product.variants.length - 1, cardVariantIndex[id] || 0));
    const variant = product.variants[index];
    const thumbs = product.variants.slice(0,4).map((item, thumbIndex) => `
      <button class="card-thumb ${thumbIndex === index ? "active" : ""}" type="button" data-card-thumb-product="${id}" data-card-thumb-index="${thumbIndex}" aria-label="${item.name}">
        <img src="${item.image}" alt="" loading="lazy">
      </button>
    `).join("");
    return `
      <article class="model-card ${id === currentProductId ? "active" : ""}" data-model-card="${id}">
        <div class="model-card-media">
          <img class="zoomable-product-image" data-product-zoom-image data-card-image="${id}" src="${variant.image}" alt="${product.name} ${variant.name}" data-zoom-caption="${product.name} — ${variant.code} — ${variant.name}" width="900" height="900" loading="lazy" role="button" tabindex="0" aria-label="تكبير صورة ${product.name}">
          <span class="model-card-badge">${product.badge}</span>
          ${NEW_DESIGN_IDS.has(id) ? `<span class="new-design-mini">NEW</span>` : ""}
          <button class="card-variant-nav prev" type="button" data-card-prev="${id}" aria-label="اللون السابق">›</button>
          <button class="card-variant-nav next" type="button" data-card-next="${id}" aria-label="اللون التالي">‹</button>
          <span class="card-variant-label" data-card-label="${id}">${variant.name}</span>
          <button class="card-zoom" type="button" data-card-zoom="${id}">تكبير</button>
        </div>
        <div class="model-card-body">
          <div class="model-card-head">
            <h3>${product.name}</h3>
            <div class="model-price"><b>${product.price}</b><span>جنيه</span></div>
          </div>
          <p>${product.description}</p>
          <div>
            <div class="card-thumbs">${thumbs}</div>
            <div class="card-variant-name" data-card-label-secondary="${id}">${variant.code} • ${variant.name}</div>
          </div>
          <div class="model-meta">
            <span>${product.variants.length} ألوان</span>
            <span>المقاسات: ${product.sizeSummary}</span>
            <span>الشحن شامل السعر</span>
            <span class="extra-pair-deal">خصم ${discountPercentText(product.price)} على الزوج الإضافي</span>
          </div>
          <div class="model-card-actions">
            <a class="btn primary" href="${productUrl(id, variant.id).href}" data-select-product="${id}">اختاري الموديل</a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$('[data-select-product]').forEach(link => {
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const id = link.dataset.selectProduct;
      const product = PRODUCTS[id];
      const variant = product.variants[cardVariantIndex[id] || 0] || product.variants[0];
      currentVariantByProduct[id] = variant.id;
      selectProduct(id, { push: true, scrollTop: false });
      requestAnimationFrame(() => openProductSheet(id, { intent: cart.length ? "trial" : "buy", variantId: variant.id }));
    });
  });
  $$('[data-card-prev]').forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    cycleCardVariant(button.dataset.cardPrev, -1);
  }));
  $$('[data-card-next]').forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    cycleCardVariant(button.dataset.cardNext, 1);
  }));
  $$('[data-card-thumb-product]').forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    setCardVariant(button.dataset.cardThumbProduct, Number(button.dataset.cardThumbIndex));
  }));
  $$('[data-card-zoom]').forEach(button => button.addEventListener("click", () => openProductLightbox(button.dataset.cardZoom)));
}

function setCardVariant(productId, index) {
  const product = PRODUCTS[productId];
  if (!product?.variants?.length) return;
  cardVariantIndex[productId] = Math.max(0, Math.min(product.variants.length - 1, index));
  refreshCardVariant(productId);
}
function cycleCardVariant(productId, direction) {
  const product = PRODUCTS[productId];
  if (!product?.variants?.length) return;
  const length = product.variants.length;
  cardVariantIndex[productId] = ((cardVariantIndex[productId] || 0) + direction + length) % length;
  refreshCardVariant(productId);
}
function refreshCardVariant(productId) {
  const product = PRODUCTS[productId];
  const index = cardVariantIndex[productId] || 0;
  const variant = product.variants[index] || product.variants[0];
  const image = document.querySelector(`[data-card-image="${productId}"]`);
  const label = document.querySelector(`[data-card-label="${productId}"]`);
  const secondary = document.querySelector(`[data-card-label-secondary="${productId}"]`);
  const link = document.querySelector(`[data-select-product="${productId}"]`);
  if (image) {
    image.src = variant.image;
    image.alt = `${product.name} ${variant.name}`;
    image.dataset.zoomCaption = `${product.name} — ${variant.code} — ${variant.name}`;
    animateImageSwap(image);
  }
  if (label) label.textContent = variant.name;
  if (secondary) secondary.textContent = `${variant.code} • ${variant.name}`;
  if (link) link.href = productUrl(productId, variant.id).href;
  document.querySelectorAll(`[data-card-thumb-product="${productId}"]`).forEach(btn => btn.classList.toggle("active", Number(btn.dataset.cardThumbIndex) === index));
}
function openImageLightbox(src, captionText = "") {
  const box = $("#productLightbox");
  const image = $("#productLightboxImage");
  const caption = $("#productLightboxCaption");
  if (!box || !image || !src) return;
  image.src = src;
  image.alt = captionText || "صورة المنتج مكبرة";
  if (caption) caption.textContent = captionText;
  box.hidden = false;
  box.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function openProductLightbox(productId) {
  const product = PRODUCTS[productId];
  if (!product) return;
  const variant = product.variants[cardVariantIndex[productId] || 0] || product.variants[0];
  openImageLightbox(variant.image, `${product.name} — ${variant.code} — ${variant.name}`);
}
function closeProductLightbox() {
  const box = $("#productLightbox");
  if (!box) return;
  box.hidden = true;
  box.setAttribute("aria-hidden", "true");
  if (!document.body.classList.contains("sheet-open")) document.body.style.overflow = "";
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
          ? "◇ اختيار إضافي"
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
  const sheetScroll = $(".sheet-scroll", sheet);
  if (sheetScroll) sheetScroll.scrollTop = 0;
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
    role: existing?.role || (!cart.length ? "primary" : intent === "purchase" ? "purchase" : "trial")
  };
  renderProductSheet();
  openSheet($("#productSheet"));
  trackProductView(product, "product_sheet");
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
      ? `${variant.code} • مقاس ${sheetState.sizes.join(" / ")} • ${sheetState.role === "trial" ? "اختيار عند الاستلام" : "للشراء"}`
      : `${variant.code} • اختاري المقاس للمتابعة`;
  }

  const ready = sheetState?.tryTwo ? sheetState.sizes.length === 2 : sheetState?.sizes?.length === 1;
  const primaryCta = $("#sheetBuyNow");
  if (primaryCta && product) {
    primaryCta.disabled = !ready;
    primaryCta.setAttribute("aria-disabled", String(!ready));
    if (!ready) {
      primaryCta.textContent = sheetState?.tryTwo ? "اختاري المقاسين أولاً" : "اختاري المقاس أولاً";
    } else if (sheetState.editId) {
      primaryCta.textContent = "حفظ التعديل";
    } else if (sheetState.role === "trial") {
      primaryCta.textContent = "ضيفيه واختاري وقت الاستلام";
    } else if (sheetState.role === "purchase" && cart.length) {
      primaryCta.textContent = `ضيفي الزوج — ${money(Math.max(0, product.price - CONFIG.SHIPPING_FEE))}`;
    } else {
      primaryCta.textContent = `أضيفي للسلة — ${money(product.price)}`;
    }
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
    image.dataset.zoomCaption = `${product.name} — ${variant.code} — ${variant.name}`;
    image.setAttribute("aria-label", `تكبير صورة ${product.name} ${variant.name}`);
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
          ◇ اختيار إضافي عند الاستلام
        </button>
        <button type="button" data-intent="purchase" class="${sheetState.role === "purchase" ? "active" : ""}" aria-pressed="${sheetState.role === "purchase"}">
          ✓ شراء الموديلين معاً
        </button>
      </div>
      <small>${sheetState.role === "trial" ? "اختاري براحتك عند الاستلام: اللي يعجبك استلميه، واللي مش مناسب سيبيه مع المندوب بدون ما تدفعي ثمنه." : "لو قررتي تحتفظي بيه، هتشوفي السعر قبل وبعد ونسبة الخصم بوضوح قبل التأكيد."}</small>
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
  if (btnBuy) btnBuy.hidden = false;
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
    if (dockLabel) dockLabel.textContent = totals.trialCount ? `أساسي + ${totals.trialCount} اختيار إضافي` : `${totals.pairCount} للشراء`;
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
  const addMore = $("#cartAddMore");
  const trialLimit = $("#cartTrialLimit");
  const empty = $("#emptyCart");
  const checkoutBtn = $("#cartCheckout");

  const hasTrial = cart.some(item => item.role === "trial");
  if (empty) empty.hidden = Boolean(cart.length);
  if (summary) summary.hidden = !cart.length;
  if (addMore) addMore.hidden = !cart.length;
  if (trialLimit) trialLimit.hidden = !hasTrial;
  const trialAddButton = addMore?.querySelector('[data-add-product-mode="trial"]');
  if (trialAddButton) { trialAddButton.disabled = hasTrial; trialAddButton.setAttribute("aria-disabled", String(hasTrial)); }
  if (checkoutBtn) {
    checkoutBtn.disabled = !cart.length;
    checkoutBtn.textContent = cart.length ? `إتمام الطلب — ${money(calcTotals(cart).total)}` : "إتمام الطلب";
  }

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
            <img class="zoomable-product-image" data-product-zoom-image src="${variant.image}" alt="${variant.code} ${variant.name}" data-zoom-caption="${product.name} — ${variant.code} — ${variant.name}" width="180" height="180" role="button" tabindex="0" aria-label="تكبير صورة ${product.name}">
            <div class="cart-item-main">
              <span class="role-tag ${item.role}">${roleLabel(item)}</span>
              <b>${product.name}</b>
              <small>${variant.name} • ${item.sizes.length === 2 ? "اختيار بين مقاسين" : "مقاس"} ${item.sizes.join(" / ")}</small>
              ${!isTrial && !isPurchase ? `
                <div class="cart-primary-price"><b>${money(product.price)}</b><small>شامل الشحن</small></div>
              ` : ""}
            </div>
            <div class="cart-item-tools">
              <button type="button" data-cart-view="${item.id}">عرض المنتج</button>
              <button type="button" data-cart-edit="${item.id}">تعديل</button>
              <button type="button" data-cart-remove="${item.id}" aria-label="حذف ${product.name}">حذف</button>
            </div>
          </div>

          ${isTrial ? `
            <div class="keep-offer">
              <div class="keep-offer-head">
                <strong>لو عجبك وقت الاستلام</strong>
                <span class="discount-badge">خصم ${discountText}</span>
              </div>
              <div class="keep-price">
                <del>${money(product.price)}</del>
                <b>${money(discountedPrice)}</b>
              </div>
              <button type="button" data-buy-both="${item.id}">استلميه بخصم ${discountText}</button>
              <small>لو مش مناسب، سيبيه مع المندوب ومش هتدفعي ثمنه.</small>
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
              <button type="button" data-trial-only="${item.id}">خليه اختيار عند الاستلام</button>
            </div>
          ` : ""}
          ${item.sizes.length === 2 ? '<span class="trial-badge">اختاري المقاس الأنسب وقت الاستلام وسيبي المقاس التاني مع المندوب</span>' : ""}
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

    $$('[data-cart-view]', list).forEach(button => {
      button.onclick = () => {
        const item = cart.find(entry => entry.id === button.dataset.cartView);
        if (item) openProductSheet(item.productId, { editId: item.id, variantId: item.variantId });
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

function renderAddProductPicker(mode = "purchase") {
  addProductMode = mode === "trial" ? "trial" : "purchase";
  const hasTrial = cart.some(item => item.role === "trial");
  if (addProductMode === "trial" && hasTrial) { toast("عندك اختيار إضافي بالفعل — عدليه من السلة أو أضيفي زوج شراء"); return false; }
  const note = $("#addProductNote"), grid = $("#addProductGrid"), title = $("#addProductTitle"), kicker = $("#addProductKicker");
  if (title) title.textContent = addProductMode === "trial" ? "اختاري موديل إضافي" : "اختاري الزوج الإضافي";
  if (kicker) kicker.textContent = addProductMode === "trial" ? "اختاري براحتك عند الاستلام" : "خصم واضح على الزوج الإضافي";
  if (note) note.innerHTML = addProductMode === "trial"
    ? `<b>◇ اختيار إضافي عند الاستلام</b><span>المندوب يجيبلك الاختيارين. اللي يعجبك استلميه، ولو أخدتي الاتنين يظهر الخصم تلقائيًا.</span>`
    : `<b>＋ زوج شراء إضافي</b><span>اختاري الموديل وبعدها اللون والمقاس. الخصم بيتحسب تلقائي ويظهر قبل التأكيد.</span>`;
  if (grid) {
    grid.innerHTML = PRODUCT_IDS.map(id => {
      const product = PRODUCTS[id], discounted = Math.max(0, product.price - CONFIG.SHIPPING_FEE);
      return `<button class="add-product-card" type="button" data-picker-product="${id}"><img class="zoomable-product-image" data-product-zoom-image src="${product.hero}" alt="${product.name}" data-zoom-caption="${product.name}" width="240" height="200" loading="lazy" role="button" tabindex="0" aria-label="تكبير صورة ${product.name}"><span><b>${product.name}</b><small>${product.variants.length} ألوان • ${product.sizeSummary}</small></span><em>${addProductMode === "trial" ? "اختيار عند الاستلام" : `<del>${money(product.price)}</del><strong>${money(discounted)}</strong><small>${extraPairDiscountLabel(id)}</small>`}</em></button>`;
    }).join("");
    $$('[data-picker-product]', grid).forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.pickerProduct;
      closeAllSheets(false, false);
      openProductSheet(id, { intent: addProductMode, variantId: currentVariantByProduct[id] });
    }));
  }
  return true;
}

function openAddProductPicker(mode) {
  if (!cart.length) { openProductSheet(currentProductId, { intent: "buy", variantId: currentVariantByProduct[currentProductId] }); return; }
  if (!renderAddProductPicker(mode)) return;
  openSheet($("#addProductSheet"));
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
          <strong>${item.role === "trial" ? "اختيار عند الاستلام — ادفعيه فقط لو استلمتيه" : item.role === "purchase" ? `${money(additionalPairPrice(item))} بعد الخصم` : money(product.price)}</strong>
        </div>
      `;
    }).join("");
  }
  const totals = calcTotals(checkoutState.items);
  const finalWhatsappText = $(".checkout-cta-wrap .whatsapp b");
  if (finalWhatsappText) finalWhatsappText.textContent = `إتمام الطلب — ${money(totals.total)}`;
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

function ensureV17UI() {
  const oldUpsell = $("#cartUpsell");
  if (!$("#cartAddMore")) {
    const block = document.createElement("section");
    block.className = "cart-add-more";
    block.id = "cartAddMore";
    block.hidden = true;
    block.setAttribute("aria-labelledby", "cartAddMoreTitle");
    block.innerHTML = `
      <div class="cart-add-more-head">
        <span aria-hidden="true">＋</span>
        <div><b id="cartAddMoreTitle">عايزة تضيفي حاجة تانية؟</b><small>ضيفي زوج تاني بخصم واضح، أو اختيار إضافي تشوفيه مع المندوب وتستلمي اللي يعجبك.</small></div>
      </div>
      <div class="cart-add-actions">
        <button type="button" data-add-product-mode="purchase"><b>＋ ضيفي زوج تاني</b><small>السعر القديم + الجديد + نسبة الخصم</small></button>
        <button type="button" data-add-product-mode="trial"><b>◇ اختاري موديل تاني</b><small>اللي يعجبك استلميه • من غير التزام</small></button>
      </div>
      <p class="cart-trial-limit" id="cartTrialLimit" hidden>عندك اختيار إضافي بالفعل. تقدري تعدليه أو تضيفي زوج شراء جديد.</p>`;
    if (oldUpsell) oldUpsell.replaceWith(block);
    else $("#cartSummary")?.before(block);
  } else if (oldUpsell) {
    oldUpsell.remove();
  }

  if (!$("#addProductSheet")) {
    const sheet = document.createElement("section");
    sheet.className = "sheet add-product-sheet";
    sheet.id = "addProductSheet";
    sheet.setAttribute("aria-hidden", "true");
    sheet.setAttribute("aria-labelledby", "addProductTitle");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.innerHTML = `
      <div class="sheet-handle" aria-hidden="true"></div>
      <header class="sheet-head"><div><small id="addProductKicker">كمّلي طلبك بسهولة</small><h2 id="addProductTitle">اختاري الموديل الإضافي</h2></div><button type="button" class="sheet-close" data-back-to-cart aria-label="الرجوع للسلة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg></button></header>
      <div class="sheet-scroll"><div class="add-product-note" id="addProductNote"></div><div class="add-product-grid" id="addProductGrid"></div></div>
      <div class="sheet-actions single-action"><button class="btn secondary" type="button" data-back-to-cart>الرجوع للسلة</button></div>`;
    $("#checkoutSheet")?.before(sheet);
  }

  const cartActions = $("#cartSheet .sheet-actions");
  if (cartActions && !$("#cartAddDiscounted")) {
    cartActions.classList.remove("single-action");
    const addButton = document.createElement("button");
    addButton.className = "btn secondary cart-add-discounted";
    addButton.type = "button";
    addButton.id = "cartAddDiscounted";
    addButton.innerHTML = `<span><small>محتاجين حاجة تانية؟</small><b>＋ منتج تاني بخصم</b></span>`;
    const checkout = $("#cartCheckout");
    if (checkout) cartActions.insertBefore(addButton, checkout);
    else cartActions.appendChild(addButton);
  }

  const form = $("#checkoutForm");
  if (form && !form.querySelector('[name="inquiry"]')) {
    const notes = form.querySelector('[name="notes"]')?.closest("label");
    const field = document.createElement("label");
    field.className = "inquiry-field";
    field.innerHTML = `<span>عندك استفسار؟ (اختياري)</span><textarea name="inquiry" rows="2" placeholder="اكتبي سؤالك عن المقاس، الموديل، المعاينة أو أي حاجة محتاجة تعرفيها..."></textarea><small>هنشوف الاستفسار مع تفاصيل الطلب على واتساب.</small>`;
    if (notes) notes.before(field);
    else form.appendChild(field);
  }
}

ensureV17UI();

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
  toast(item.role === "trial" ? "اتضاف كاختيار عند الاستلام ✓ خدي اللي يعجبك" : "تم حفظ اختيارك للسلة ✓");
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

function handleZoomableProductImage(event) {
  const image = event.target?.closest?.("[data-product-zoom-image]");
  if (!image) return false;
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  openImageLightbox(image.currentSrc || image.src, image.dataset.zoomCaption || image.alt || "تفاصيل المنتج");
  return true;
}
document.addEventListener("click", handleZoomableProductImage, true);
document.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const image = event.target?.closest?.("[data-product-zoom-image]");
  if (!image) return;
  event.preventDefault();
  openImageLightbox(image.currentSrc || image.src, image.dataset.zoomCaption || image.alt || "تفاصيل المنتج");
});

const productLightboxClose = $("#productLightboxClose");
if (productLightboxClose) productLightboxClose.addEventListener("click", closeProductLightbox);
const productLightbox = $("#productLightbox");
if (productLightbox) productLightbox.addEventListener("click", event => { if (event.target === productLightbox) closeProductLightbox(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && productLightbox && !productLightbox.hidden) closeProductLightbox(); });


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

$$('[data-add-product-mode]').forEach(button => button.addEventListener("click", () => openAddProductPicker(button.dataset.addProductMode)));
$$('[data-back-to-cart]').forEach(button => button.addEventListener("click", () => { closeAllSheets(false, false); openCart(); }));

const cartAddDiscounted = $("#cartAddDiscounted");
if (cartAddDiscounted) cartAddDiscounted.addEventListener("click", () => {
  if (cart.length) openAddProductPicker("purchase");
  else openProductSheet(currentProductId, { intent: "buy", variantId: currentVariantByProduct[currentProductId] });
});

const cartCheckout = $("#cartCheckout");
if (cartCheckout) cartCheckout.addEventListener("click", () => { if (cart.length) openCheckout(cart); });

$$('[data-close-and-shop]').forEach(button => button.addEventListener("click", () => {
  closeAllSheets();
  setTimeout(() => $("#catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 180);
}));

$$('[data-scroll-catalog]').forEach(button => button.addEventListener("click", () => {
  $("#catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}));

function makeOrderReference() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  return `SS-${date}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
}

function buildOrderPayload(data, items) {
  const totals = calcTotals(items);
  return { orderId: makeOrderReference(), createdAt: new Date().toISOString(), source: "select-shop-web",
    customer: { name:data.name.trim(), phone:normalizePhone(data.phone), governorate:data.governorate.trim(), area:data.area.trim(), address:data.address.trim(), inquiry:data.inquiry?.trim()||"", courierNotes:data.notes?.trim()||"" },
    items: items.map(item => { const product=getProduct(item.productId), variant=getVariant(item.productId,item.variantId); return { role:item.role === "trial" ? "optional_choice" : item.role, productId:item.productId, productName:product.name, variantId:item.variantId, sku:variant.code, variantName:variant.name, sizes:[...item.sizes], chooseAtDelivery:item.role === "trial", tryTwoSizes:Boolean(item.tryTwo), listPrice:product.price, payablePrice:item.role==="trial"?0:item.role==="purchase"?additionalPairPrice(item):product.price };  }), totals };
}

async function submitOrderToProf(payload) {
  if (!CONFIG.PROF_BRIDGE_URL) return { sent:false, reason:"not-configured" };
  try {
    const response = await fetch(CONFIG.PROF_BRIDGE_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Prof bridge HTTP ${response.status}`);
    return { sent:true };
  } catch (error) { console.warn("Prof bridge unavailable; using WhatsApp fallback.", error); return { sent:false, reason:"bridge-error" }; }
}

/* WhatsApp Checkout Submission */
const checkoutForm = $("#checkoutForm");
const checkoutValidationLiveFix = event => {
  const field = event.target.closest?.("input, select, textarea");
  if (!field || !field.closest("#checkoutForm")) return;
  field.classList.remove("field-invalid");
  field.removeAttribute("aria-invalid");
  const err = $("#formError");
  if (err && !err.hidden) {
    err.textContent = "راجعي البيانات المحددة بالأحمر، وبعدها اضغطي إتمام الطلب مرة تانية.";
  }
};
if (checkoutForm) {
  checkoutForm.addEventListener("input", checkoutValidationLiveFix);
  checkoutForm.addEventListener("change", checkoutValidationLiveFix);
  checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const err = $("#formError");

    $("input, select, textarea", form).forEach(field => {
      field.classList.remove("field-invalid");
      field.removeAttribute("aria-invalid");
    });
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }

    const validationErrors = [];
    if (!data.name?.trim()) validationErrors.push({ field: form.elements.name, label: "الاسم بالكامل" });
    if (!validPhone(data.phone)) validationErrors.push({ field: form.elements.phone, label: "رقم موبايل صحيح يبدأ بـ 01" });
    if (!data.governorate?.trim()) validationErrors.push({ field: form.elements.governorate, label: "المحافظة" });
    if (!data.area?.trim()) validationErrors.push({ field: form.elements.area, label: "المنطقة / الحي" });
    if (!data.address?.trim()) validationErrors.push({ field: form.elements.address, label: "العنوان بالتفصيل" });

    if (validationErrors.length) {
      validationErrors.forEach(({ field }) => {
        field?.classList.add("field-invalid");
        field?.setAttribute("aria-invalid", "true");
      });

      if (err) {
        err.textContent = `من فضلك كمّلي البيانات دي قبل إتمام الطلب: ${validationErrors.map(item => item.label).join("، ")}.`;
        err.hidden = false;
      }

      const firstInvalid = validationErrors[0]?.field;
      if (firstInvalid) {
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
      return;
    }

    const totals = calcTotals(checkoutState.items);
    const purchased = checkoutState.items.filter(i => i.role !== "trial");
    const trials = checkoutState.items.filter(i => i.role === "trial");
    const orderPayload = buildOrderPayload(data, checkoutState.items);

    let message = `🛍️ طلب جديد — SELECT SHOP\n`;
    message += `رقم الطلب: ${orderPayload.orderId}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `👟 المنتجات المؤكدة (${totals.pairCount} زوج):\n`;
    purchased.forEach((item, index) => {
      const prod = getProduct(item.productId);
      const vr = getVariant(item.productId, item.variantId);
      const tag = item.role === "primary" ? "الموديل الأساسي" : "شراء إضافي مؤكد";
      message += `${index + 1}) ${prod.name} [${tag}]\n`;
      message += `   • كود اللون: ${vr.code} (${vr.name})\n`;
      if (item.sizes.length === 2) {
        message += `   • المقاس: اختيار بين مقاسين (${item.sizes.join(" و ")}) — العميلة تستلم المقاس الأنسب فقط\n`;
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
      message += `👀 اختيارات إضافية عند الاستلام — العميلة تستلم اللي يعجبها فقط:\n`;
      trials.forEach((item, index) => {
        const prod = getProduct(item.productId);
        const vr = getVariant(item.productId, item.variantId);
        message += `${index + 1}) ${prod.name} [اختيار إضافي عند الاستلام]\n`;
        message += `   • كود اللون: ${vr.code} (${vr.name})\n`;
        if (item.sizes.length === 2) {
          message += `   • المقاس: اختيار بين مقاسين (${item.sizes.join(" و ")})\n`;
        } else {
          message += `   • المقاس: ${item.sizes[0]}\n`;
        }
        message += `   • معاينة الاختيار مع المندوب بدون التزام\n`;
        message += `   • لو العميلة استلمته كزوج إضافي: ${money(Math.max(0, prod.price - CONFIG.SHIPPING_FEE))} بعد ${extraPairDiscountLabel(item.productId)} (بدل ${money(prod.price)})\n`;
        message += `   (لو مش مناسب، يفضل مع المندوب ولا تدفع العميلة ثمنه)\n\n`;
      });
    }

    message += `💳 ملخص الحساب:\n`;
    message += `• عدد الأزواج للشراء: ${totals.pairCount}\n`;
    if (totals.trialCount > 0) {
      message += `• اختيارات إضافية عند الاستلام: ${totals.trialCount} (الدفع فقط لما يتم استلامها)\n`;
    }
    message += `• شحن الطلب الأساسي: مشمول في السعر\n`;
    if (totals.trialCount > 0) {
      message += `• الاختيارات الإضافية: بدون تكلفة إضافية لمجرد المعاينة\n`;
    }
    message += `• الإجمالي قبل الخصم: ${money(totals.subtotal)}\n`;
    message += `• قيمة الخصم: ${money(totals.discount)}\n`;
    message += `• الإجمالي بعد الخصم: ${money(totals.total)}\n`;
    if (trials.length) {
      const allSelectedTotals = calcTotals(checkoutState.items.map(item => item.role === "trial" ? { ...item, role: "purchase" } : item));
      message += `• لو العميلة استلمت كل الاختيارات: قبل الخصم ${money(allSelectedTotals.subtotal)} — بعد الخصم ${money(allSelectedTotals.total)}\n`;
    }
    message += `• الدفع النهائي حسب الأزواج اللي العميلة قررت تستلمها فعلاً.\n\n`;

    message += `👤 بيانات العميل والاستلام:\n`;
    message += `• الاسم: ${data.name.trim()}\n`;
    message += `• رقم الموبايل: ${normalizePhone(data.phone)}\n`;
    message += `• المحافظة: ${data.governorate.trim()}\n`;
    message += `• المنطقة: ${data.area.trim()}\n`;
    message += `• العنوان بالتفصيل: ${data.address.trim()}\n`;
    if (data.inquiry?.trim()) { message += `• استفسار العميل: ${data.inquiry.trim()}\n`; }
    if (data.notes?.trim()) { message += `• ملاحظات للمندوب: ${data.notes.trim()}\n`; }
    message += `\n✨ تم إنشاء الطلب عبر موقع SELECT SHOP`;

    const profResult = await submitOrderToProf(orderPayload);
    try { localStorage.setItem("selectShopLastOrder", JSON.stringify({ ...orderPayload, prof:profResult })); } catch {}
    track("whatsapp_click", { value: totals.total, currency: "EGP", items: totals.pairCount, order_id:orderPayload.orderId });
    toast(profResult.sent ? "تم إرسال الطلب وجاري فتح واتساب للتأكيد ✓" : "سيتم تحويلك لواتساب SELECT SHOP لتأكيد الطلب 💬");

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

initTheme();
renderCatalog();
const skipLink = document.querySelector('.skip-link');
if (skipLink) skipLink.href = `${location.pathname}${location.search}#main`;
renderHero({ announce: false });
updateCartUI();
bootAnalytics();
trackProductView(getProduct(currentProductId), "page_load");
syncViewport();
syncProgress();
setupDockVisibility();
setupPremiumMotion();
requestAnimationFrame(() => document.body.classList.add("loaded"));
