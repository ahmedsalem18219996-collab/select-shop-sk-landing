# SELECT SHOP — V2 DESIGN APPROVAL

Status: **Design approved by store owner**
Date: **2026-10-11**
Approved reference: https://selectshopeg.com/preview/select-v2/
Design snapshot branch: `select-v2-design-approved-2026-10-11`
Pre-release production snapshot branch: `select-shop-production-before-v2-2026-10-11`

## Approved visual direction

- Lime Atelier: graphite/dark green + electric lime.
- Editorial typographic hero, **without** orbit/disc.
- One image per product, no duplicate blurred backdrops.
- Mobile visual system, safe-area bottom bar, accessible product dialogs.
- Consistent photo treatment on products, categories, thumbnail galleries.
- Product color options must switch images; visible model and size selector.
- Current reference: `preview/select-v2/index.html`, `mobile-layout-v1.css`, `product-photo-cover.css`.

## Important separation: design approved ≠ transaction deployment

The reviewed V2 preview is **intentionally non-transactional**:
- `preview/select-v2/app.js` produces **sample text only**, doesn't submit orders
  or open WhatsApp, and intentionally doesn't fire live conversions.
- Its cart uses the separate `selectShopReviewV2:cart` localStorage key.
- `preview/select-v2/catalog.js` declares a proposed nationwide free-shipping
  promotion that is **NOT commercially approved**.
- Its internal absolute navigation goes to `/preview/select-v2/`.

Therefore the preview HTML and app.js MUST NOT be copied straight to `/index.html`.
Doing so would silently disable live orders, reduce ad attribution, risk incorrect
shipping promises, and redirect all home/navigation links into the preview.

## Production release acceptance gate

A future production cutover requires verification of:
1. Actual WhatsApp checkout with valid order details; no silent draft-only checkout.
2. Product-specific ad/landing URLs continue working unchanged
   (including `/product/sk1/`, `/product/wk1/`, `/product/carwash48/`).
3. Meta PageView/ViewContent/AddToCart/InitiateCheckout and proper Lead vs Purchase;
   GA4 tracking and internal owner-test exclusion still work.
4. Shipping and discounts match the **real** catalog; car wash shipping outside
   Cairo/Giza must not be represented as nationally free without approval.
5. Responsive smoke tests at 320, 375, 390, 430px and desktop; dialogs, cart,
   color/size switching, mobile bottom bar and no horizontal overflow.
6. Preserve real cart/order code; maintain rollback to the pre-release branch.

**Until these gates pass:** V2 is the approved DESIGN; production root remains
the working storefront. No untested cutover permitted.
