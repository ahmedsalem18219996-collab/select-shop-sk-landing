# SELECT SHOP V20 — Master Plan & Release Contract
Last reviewed: 2026-10-10. Branch: design/select-shop-v20.
Status: APPROVED FOR PREPARATION; NOT APPROVED FOR PRODUCTION DEPLOYMENT.

## 0. Non-negotiable safeguards
- Current live site \`main\` stays unchanged until acceptance review + explicit user approval.
- Work only under this branch. No TinyFish. Use connected GitHub tools and, where possible, local browser tests (Chrome/Playwright).
- Temporary GitHub Pages storefront is independent from SELECT-SHOP-CLEAN/master platform. Never change that platform to carry out this redesign.
- Never alter original merchant photographs by generative reconstruction; no shoe color/shape changes. Use originals, crop-safe framing, and optionally *approved*, artifact-reviewed background cutouts.
- No fake testimonials, counters, reviews, product claims, or supply/availability. Don't imply a WhatsApp click = confirmed sale.
- Keep stable /product/{variant}/ and /product/{family}/ URLs, existing canonical/OG tags and UTM/Fbclid routing.
- No new paid infrastructure is required for V20. Do not ship optional direct checkout before backend security approval.

## 1. Audience + shopping objectives
Main flow: ad click -> exact product landing -> view real photos/variants/sizes and total -> add/select -> review cart -> customer details -> WhatsApp order prepared -> merchant manually logs with supplier.
Secondary: homepage visitors discover categories and related products.
Priority KPI: *qualified* WhatsApp orders, not raw clicks or pageviews. Measure product view, variant selection, AddToCart, InitiateCheckout, WhatsApp handoff, confirmed purchases distinctly.

## 2. Existing baseline (grounded in repository)
- Site: https://selectshopeg.com, GitHub Pages static HTML/CSS/JS.
- 4 sneaker families in shared catalog: SK (2 variants), ALEX (5), EQWAL (4), WK (8); 19 variants and 4 family aliases = 23 static product routes.
- Additional car-wash landing at /product/carwash48/.
- Shared commerce engine: script-v17-safe.js. Event initializer: meta-pixel.js. Current test flag: SELECT_SHOP_TEST_MODE.
- Order handoff: checkout form -> prepared WhatsApp text; an isolated Supabase-based guest orders backend exists but is disabled pending CAPTCHA, private admin, live verification.
- Existing experimental black/lime preview lives at /preview/offcanon-lime-v1/. It is NOT production.
- Assets: images in assets/, mostly JPG with pale/light photo backdrops. Some have embedded text at the bottom; simple CSS cannot remove those letters reliably without cropping into the shoe.

## 3. Experience map
Home: announcement -> slim wordmark/nav/cart -> editorial product hero (real product) -> three service guarantees -> categories -> in-stock catalog -> offer explanation -> questions -> policies/footer.
Sneaker category: clear model cards, all true variant thumbnails, variant/sizes, product CTA, no tiny/hidden models, editorial but readable.
Product route: authentic photo gallery, product code, available sizes only, color-synced image, price incl. shipping, plain shipping/inspection claim, prominent order CTA, related products; intact deep link.
Car care: one clear gallery, category-appropriate copy/choice and cart compatibility; no shoe-only promises.
Checkout: size(s)/try-on versus purchased pair is distinct; no duplicate-shipping or false discount; governorate, address validation, merchant WhatsApp payload.
Admin: private order management later, only after secure auth/RLS/CAPTCHA/end-to-end tests.

## 4. Design system
Core: graphite-black #090B09; contrast text #F1F1E9; muted #AEB5AA; lime #DFFF00 only for primary CTA/state; subtle warm off-white matte for real product photos.
Radii: editorial 4-12px, controls >= 44px tap height, no random neon gradients / glow on every card. Arabic IBM Plex Sans Arabic or Alexandria; Latin Manrope. Native fallbacks and reduced-motion support.
Hero: a single true hero item, SELECT typography behind, short Arabic promise, one primary shop CTA and distinct secondary discover; mobile puts product and CTA above the fold on common 390px width when feasible.
Visual authenticity: never stretch, never position product behind huge text, never crop toe/heel/outsole; ensure natural whites and blacks retain texture.
Photography treatment:
1) Inventory every asset (pixel size / color backdrop / embedded words / image category).
2) For photos already on light backgrounds, display inside an intentional light studio matte with matching edge treatment; do NOT blindly use \`object-fit:cover\` or feather the actual shoe.
3) Create optional transparent cutouts only from *source image*, review toe/heel/laces pixel-by-pixel; if edge quality is bad, keep matte photo. Never replace the exact SKU photo with AI-invented shoe.
4) Preprocess master images offline; deliver WebP/AVIF and JPG fallback; keep source originals unchanged. Avoid indiscriminate upscaling.
5) Set width/height/aspect ratio, lazy-load below-fold and preload only the real hero image. Add descriptive alt and lightbox.
Acceptance: no printed photo borders peeking, no clipped shoe, no bad color halo or brand/text fragments, no distorted products in cards/mobile.

## 5. Commerce invariants
- Single canonical PRODUCTS family data; every price, size, discount, color/image derived from it. Do not hardcode in independent templates.
- Test true SKU availability before release, since source is supplier/affiliate and stock changes.
- Try-on two sizes = 1 purchased item (if one retained); same-shipment shipping does not become two delivery fees. Discount on extra purchased pair must be mathematically valid for that supplier and address, not cosmetically invented.
- Orders saved in local preview state only; the published site remains WhatsApp-based unless direct backend separately passes security gate.
- Keep tracked events exactly once for their meaningful actions; "Purchase" ONLY on verified order receipt, never on WhatsApp opening.
- Owner \`shop_test=1\` suppresses Meta/GA, not just visible QA badge; preview hard-disables all production analytics and order sends.
- Do not put phone numbers/watermarks inside photos or video creatives; the merchant support link remains an explicit working action where appropriate.

## 6. Performance, SEO and privacy
- Image and JS budgets to set after baseline mobile Lighthouse/CrUX measurement (not fabricated).
- At least 320, 360, 375, 390, 414, 768, 1024, 1440px: no horizontal overflow, no fixed dock hidden by iPhone Safari chrome.
- Core Web Vitals goal at p75: LCP <= 2.5s, CLS <= .1, INP <= 200ms where realistically measurable; don't claim these values before measurement.
- Semantic headings, alt, keyboard focus, modal focus trap, form labels and error messages, contrast.
- Per-product canonical/OG metadata; sitemap, robots/indexability of production, preview noindex; clean path aliases and ad UTMs.
- Privacy policy, returns/inspection, shipping coverage/timeline and contact — verify supplier policies before publishing.

## 7. Implementation phases & explicit gates
M0 Safety: branch, baseline, image inventory, regression checklist, baseline production untouched. EXIT: backups and inventory verified.
M1 Image quality: identify background types, create QA-approved hero gallery/media treatment for all 19 variants + car care. EXIT: visual QA on mobile/desktop with true photos; no clipped toes/heels.
M2 Layout: unified header, hero, catalog cards, mobile-safe layout; real data; one design token set. EXIT: hero/category/cards responsive and accessible.
M3 Product: all 23 routes + car care; gallery, selection, size, price, related items, true deep links. EXIT: each SKU route loads correct image, variant, price, and action.
M4 Checkout: cart, size try-on, second-pair discount, city shipping, WhatsApp handoff. EXIT: scenarios exercised with real examples; no duplicate shipping, no false Purchase.
M5 Tracking + trust: Pixel/GA quality and source breakdown, shipping/returns pages, OG/canonical. EXIT: consent/privacy reviewed, actual event mapping verified.
M6 Quality: automated regressions, 320-1440 viewport visual screenshots, actual Safari/Chrome checks, low-speed image loading, manual end-to-end; compare to live.
M7 Release: *explicit user approval*, protected backup, limited launch, monitor analytics and customer issues, fast rollback.

## 8. Critical acceptance tests
- All 19 sneaker variants and all 23 stable product routes work; car wash and categories too.
- Switching selected color changes active thumbnail, main image, SKU, deep-link and checkout payload together.
- Only variant-valid sizes appear; two-size try-on is one item/one shipping charge.
- Cart survives navigation without carrying preview cart into live; WhatsApp text includes correct line items/sizes/address/total.
- Product videos never play unexpectedly or block the CTA. Links and menus respond to taps as expected.
- 320/360/390/414px and desktop tested, especially iPhone safe area/sticky buttons.
- No leakage of tests into live analytics, no duplicate Purchase/Lead; PageView vs ViewContent clearly separated.
- Image audit, no visible printed photo codes inside prominent hero when avoidable, no stretched/cropped merchandise.
- Source-of-goods information not exposed to customers; all shopper claims defensible.
- Lighthouse / CWV are *measured*, not guessed.
- QA report includes PASS/FAIL, screenshot evidence, date/commit, unresolved defects. No production publish without sign-off.

## 9. Working method & scope control
Each PR/commit: one cohesive feature, preserve stable data and checkout, include regression notes. Avoid endless CSS override stacking. Write new scoped components, isolate preview JS/cart/analytics; migrate only tested feature groups. GitHub Pages does not automatically publish feature branches to selectshopeg.com; use preview path on main only after tests and permission to expose it there.
