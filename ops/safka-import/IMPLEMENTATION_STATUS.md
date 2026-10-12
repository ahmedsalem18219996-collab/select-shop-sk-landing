# SELECT SHOP TEMP — Safqa pricing and fulfillment handover
Updated 2026-10-12 (Africa/Cairo). Scope: `selectshopeg.com` temporary site only.

## Verified state
- 462 supplier products, 462 preliminary final-price drafts in `ss_safka_import_products.final_price_egp`.
- Zero prices owner-approved for public display; supplier purchase flag still false.
- 411 products with supplier-linked videos (2,678 Drive preview URLs); not all files were playback-tested. Supplier media remains linked by original product ID.
- 310 product categories not confirmed by the Safqa API.
- Five products with differing **available** variant reference prices; publication approval intentionally blocks these pending variant-level pricing (seven if unavailable variants are also counted).
- 27 shipping regions and 418 Safqa city IDs. Previous importer stored blank city names due to `cities[].city_name_ar` not being mapped. **Fix deployed** to `safka-stage-import` v3; admin must click "تحديث شحن المحافظات والمدن فقط" and verify the 418 names before delivery routing.
- Zero live customer orders, zero Safqa orders, zero active supplier mappings.

## Source code and dashboard
- `ops/safka-import/index.html`: private admin interface.
- `ops/safka-import/app.js`: pricing audit, per-product editable draft, shipping/advertising/returns scenario preview, reviewed-price approval, Safqa read-only connectivity check, media gallery and CSV export.
- `ops/safka-import/style.css`: mobile-friendly admin.
- Customer Safqa catalog: `v2-live/safka-imported-store.js`.
- Server-side Supabase project: `zznqdwrohrycsjfpvkhc` ONLY. Never change or deploy to SELECT-SHOP-CLEAN.

## Server functions
- `safka-price-draft` (JWT + admin): persist private price and reset approval.
- `safka-approve-price` (JWT + admin + per-product cost/shipping acknowledgment): publish the selected price for display ONLY. Does not enable checkout.
- `safka-connection-check` (JWT + admin): Safqa price-list GET, never POST supplier order.
- `safka-stage-import` (JWT + admin): owner-initiated read/import, v3 fixes `city_name_ar`.
- `safka-preflight` checks mapped confirmed `ss_orders` read-only; it never sends Safqa orders.

## Safqa staged checkout (IMPLEMENTED BUT DISABLED BY DEFAULT)
- New private order table `ss_safka_checkout_requests`, RLS enabled and only owner-readable; this is SEPARATE from the established shoes `ss_orders` table.
- Guest `safka-capture-order` Edge Function: recomputes prices on the server from **approved** Safqa entries, validates supplier property IDs, governorate ID, optional city ID, quantity (1–3), phone/address, Turnstile, signed-IP rate limit, and idempotency. It records a request for review and explicitly does **not** transmit to Safqa.
- `safka-checkout-config`: returns only safe public configuration and Turnstile site key **when** both security secrets are configured and `SAFKA_ORDER_CAPTURE_ENABLED=true`. Otherwise checkout is blocked.
- Site product detail and checkout code `v2-live/safka-imported-store.js`, `v2-live/safka-checkout.js`, `v2-live/safka-checkout.css`. The supplier-owned `can_purchase` flag remains authoritative; the current public catalog deliberately returns false for all Safqa products, so no public purchase button is activated merely by approving prices.
- Private admin Safqa order inbox inside `ops/safka-import/`, with `safka-review-order` to confirm/cancel **internally only**. Does not submit to Safqa.
- `ss_safka_checkout_regions()` exposes public name+ID list of active governorates, not supplier shipping costs or credentials.
- Edge Functions deployed under temporary Supabase project `zznqdwrohrycsjfpvkhc` only.
- **Launch blockers**: owner price review/approval, complete shipping-city names import, Cloudflare Turnstile site key and secret, independent check of supplier commissions, server-owned catalog `can_purchase` activation, and explicit `SAFKA_ORDER_CAPTURE_ENABLED=true`. Secrets must never be committed in GitHub or entered into frontend code.
- No confirmed end-to-end authenticated browser test; TinyFish browser wallet was insufficient. Static JavaScript syntax and deployment checks passed.

## Future Safqa supplier handoff (NOT IMPLEMENTED)
1. Refresh and validate city IDs/names and the real product/variant IDs.
2. Validate the economic meanings of Safqa's sale_price, required commission, and shipping policy, including ads/returns/fees; margin preview is not net profit.
3. Complete supervised end-to-end verification of staged guest checkout. Its PII is in a restricted database table, not encrypted at the application-field level; follow the database backup, access and retention policy before any production PII is collected.
4. Map each selected supplier variant code to Safqa's `items[].property`, not the visible color/size text. Map each governorate to `shipping_governorate` (pricing document ID), city to its provider code.
5. Backend POST `/api/v1/public/orders` using `api-safka-key` from server secret ONLY. Save receipt with supplier order ID and serial number. Do NOT expose secrets in frontend.
6. Reconcile failures/ambiguous timeouts without blind retries (avoid duplicate real supplier orders), and secure the `orderHook` receiver against forged webhooks.
7. Test non-live preflight plus manual supervised supplier trial before switching any customer checkout on.

## Notes
- The first 462 preliminary prices were calculated from supplier reference price + an assumed shipping/ads/returns buffer; not individual competitor research and not verified supplier margin.
- NEVER bulk-approve prices without explicit review of supplier cost and product choice.
- The owner-only CSV includes prices. Portable JSON catalog export intentionally excludes prices, orders, customer PII and keys.
- TinyFish paid browser automation couldn't run due to insufficient wallet credits; code checks and public HTML fetch were completed, but mobile end-to-end test remains pending.


## 2026-10-12 pricing V2 update — DONE
- Re-priced **all 462 Safqa products** in temporary Supabase only; **all 462 prices decreased** versus the original formula (old mean 620 EGP, new mean 590 EGP, current range 289–2239 EGP). No user orders were created, and all 462 remain unapproved for direct checkout.
- Added `ss_safka_price_review_v2` with one historical snapshot per product (old price, proposed price, supplier reference, shipping allowance 110 EGP, modeled advertising 80 EGP, modeled returns 35 EGP, conservative projected *contribution*, segment, notes). Those numbers are assumptions, **not confirmed net profits** or individually checked competitor prices.
- Added `ss_safka_variant_price_drafts` with 505 supplier-ID keyed option prices. Five products show different available supplier variant price quotations, flagged for manual review. Null or zero supplier option quotations fall back to product-level supplier quote; do not interpret `supplier_value` as a price, since it's supplier stock.
- New pricing strategy: supplier reference plus tiered shipping/ads/return/profit cushion (225–375 EGP according to supplier reference), psychological `...9` ending, with individually spot-checked overrides for steam cleaner (1599), Camel compressor (1299), and shoe dryer (549).
- 49 products categorized as candidates for limited paid ad TESTING (not profit guaranteed), 408 as organic/bundle-first or pending taxonomy, and 5 require manual variant review. The minimum projected remaining amount in the set is only 4 EGP; NOT ALL SKUs make sense for individual paid ads.
- The public RPC `ss_safka_public_catalog_v2` now returns clearly **indicative** `display_price_egp`, `price_status='indicative'`, and per-option `display_price_egp`. When option prices differ, the card displays starting price from cheapest available option; the chosen option's draft price is displayed in the product detail. **`final_price_egp` remains hidden until owner-approved. `can_purchase` remains false.**
- Customer-facing Safqa cards and landing modal are explicitly labeled `سعر مبدئي شامل التوصيل — البيع بعد التأكيد`. The product request service remains behind server gate. This is price display for a preview, NOT a commitment to supply.
- Owner panel shows prior vs current price, projected contribution, all available supplier variant quotes and corresponding draft prices, and exports both 462 product rows and 505 variant rows to separate CSV files.
- `safka-price-draft` v2 uses `ss_safka_save_price_draft_atomic` to synchronize future owner edits of uncomplicated products with ALL option prices and update pricing notes in one database transaction. Different-priced supplier variants cannot be edited as a single price; this preserves quote integrity.
- Spot-check comparisons: Camel compressor around 990–1550 EGP at Egyptian merchants; shoe dryer 399–662 EGP among differing offers; steam cleaners have substantial specification/quality differences. Comparables do not prove product equivalence. More price research needed before purchasing traffic.
- As always, SELECT-SHOP-CLEAN untouched; only `zznqdwrohrycsjfpvkhc` and `select-shop-sk-landing` changed.


## 2026-10-12 correction — user-approved exact price and Drive playback
- **Current ACTIVE pricing overrides previous V2 proposals:** The product selling price shown provisionally is exactly `ss_safka_import_products.suggested_sale_price_egp + 90 EGP` (Safqa platform suggested retail selling price, NOT supplier wholesale cost). 462/462 products validated. Current range 150–1950 EGP, mean approx 400 EGP. No other cost, ads, returns, margin, or psychological 9-ending added.
- All 505 supplier properties have `ss_safka_variant_price_drafts.draft_price_egp = corresponding positive supplier option suggested_price + 90 EGP`, otherwise fallback to product suggested selling price + 90 EGP. Verified 505/505.
- Public product cards show quoted from-price for varied options; product detail shows every option's approximate price; no checkout available and no prices owner-approved.
- `safka-price-draft` atomic edit guard changed from +110 to +90. `safka-approve-price` and disabled `safka-capture-order` guard changed to +90; supplier handoff remains unimplemented and no live orders created.
- Owner CSV, explanation and audit now explicitly say platform suggested selling price + 90 average shipping, not imagined profit. Older historical pricing V2 notes above are **superseded** by this section.
- Videos are **supplier Google Drive file preview links**, NOT uploaded copies on SELECT SHOP. Official Google Drive support acknowledges third-party-cookie restrictions, viewer limits and file-permission failures. Embedded iframe was unreliable for some users. Product detail now has a prominent direct **شاهد فيديو المنتج** link opening `/file/d/{id}/view`, and tapping a video thumbnail presents a primary direct Drive watch link plus optional iframe. We do not claim direct Drive can bypass nonpublic permissions or provider playback limits; for guaranteed embedded playback later host licensed MP4 files via an appropriate public video hosting/CDN service with documented authorization, storage and bandwidth.
- 411 products contain verified-linked video URLs; those URLs do **not** constitute an end-to-end per-device playback guarantee. No automatic media downloading or supplier rights modification attempted.
