# SELECT SHOP — Lime Frost Overlay Hero / Approved Release

Date: 2026-10-11
Owner approval: **Approved** after the DISCOVER / YOUR NEXT. overlay layout was accepted, with a request for a highly visible WhatsApp inquiry button.

## Approved homepage
- Lime Frost graphite-green palette and lime commerce CTA.
- Curved/faceted moving product photography **behind** DISCOVER / YOUR NEXT., not a second stacked photo section.
- Compact desktop/iPhone hero with text contrast and reduced-motion support.
- **Visible WhatsApp inquiry CTA** beside Browse Products, in bright WhatsApp green (#25D366), with a distinct text label and SVG icon.
- Persistent green inquiry action in the iPhone bottom bar, and product-specific inquiry button in product detail.
- Optional product video only when a direct playable product/variant video exists.

## Production dependencies preserved
- Real checkout / WhatsApp order handoff: `storefront-v2-live.js`
- Source prices and regional shipping: `catalog-v2-live.js`
- Meta events: `meta-pixel.js`
- Product landing pages (SK, WK and carwash48): unchanged.
- Updated inquiry click listener uses `document.querySelectorAll` to avoid a JavaScript exception that would block later event handlers.

## Recovery and verification
- Pre-WhatsApp-visibility snapshot: `select-lime-frost-overlay-approved-before-wa-2026-10-11`.
- Main visual files: `index.html`, `v2-live/lime-frost-tilted-hero.css`, `v2-live/tilted-grid-hero.js`.
- Read-only preview: `https://selectshopeg.com/preview/lime-frost-hero/` (owner QA test mode, no live orders/Meta events).
- Static checks verified CSS balance, script parsing, WhatsApp CTA hooks, original commerce/catalog/Pixel integrity, no modifications to existing product landing pages.
- **Not verified:** external production URL load or interactive Safari checkout; live-browser verification should follow when available.
