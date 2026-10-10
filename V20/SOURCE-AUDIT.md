# V20 Source Audit — Initial Read-Only Baseline
2026-10-10. Scope: SELECT SHOP temporary GitHub Pages repo (not SELECT-SHOP-CLEAN).

| Area | Found | Consequence |
|---|---|---|
| Main | index.html + styles-v17-safe.css + script-v17-safe.js | Production is static; must not blindly overwrite shared engine |
| Tracking | meta-pixel.js and GA4 in core | Keep owner QA mode off analytics; verify Lead != Purchase |
| Sneakers | SK 2, ALEX 5, EQWAL 4, WK 8 variants | 19 variant photos / 23 direct sneaker URLs |
| Car care | /product/carwash48/ with standalone content | Requires special attention to cart UX and offer logic |
| Existing preview | /preview/offcanon-lime-v1/ | Black/lime proof-of-direction, not QA-certified release |
| Orders backend | orders-system/README.md | Explicitly disabled until CAPTCHA, admin, secret & live checks |
| Automated QA | run_qa.cjs, test-product-routes.cjs, test-variant-selection.cjs | Reuse and expand; some existing tests depend on production paths |
| Image assets | 19 sneaker JPGs + 6 car-care JPG/WebP | Need pixel-level QA and format/dimension audit |

## First known defects / risks
- Current preview hero uses a soft radial mask around the ALEX JPG on a dark stage. On some shoes, feathering may destroy edge details. V20 needs a verified image processing contract, not cosmetic masking alone.
- In preview product cards, object-fit:cover can crop the toe/heel when the stage aspect ratio differs from the 1:1 original. Use contain / designated crop-safe compositions.
- Several photos contain printed model codes within the pixels; CSS cannot erase that text cleanly. Do not promise automatic removal without source retouch and comparison.
- Direct landing generated markup introduces its own styling dynamically after the base CSS; check cascade/specificity and factor styles out during V20 migration.
- Main has legacy ad attribution routing; do not regress SK Facebook deep links when changing homepage.
- Direct payment/guest order backend remains deliberately disabled; don't activate by restyling the checkout.
- Existing low-resolution image files cannot become authentic true 4K details merely by interpolation.
- Before any public rollout, verify current supplier prices, variant size availability, shipping policy, return/trial rules, and whether claims are actually deliverable.

## Image inventory (repo-backed)
Sneakers: assets/sk-1.jpg, sk-2.jpg, alex01.jpg through alex05.jpg, eqwal03.jpg, eqwal04.jpg, eqwal05.jpg, eqwal07.jpg, wk_1.jpg through wk_8.jpg.
Car care: assets/carwash48-nozzle-options.jpg, carwash48-real-battery.webp, carwash48-real-gun.webp, carwash48-real-kit.webp, carwash48-real-product.jpg, carwash48-water-inlet.jpg.

Audit status: list verified; image dimensions/visual cropping and performance checks pending.
