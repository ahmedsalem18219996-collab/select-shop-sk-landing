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

## Future Safqa direct checkout (NOT IMPLEMENTED)
1. Refresh and validate city IDs/names and the real product/variant IDs.
2. Validate the economic meanings of Safqa's sale_price, required commission, and shipping policy, including ads/returns/fees; margin preview is not net profit.
3. Implement customer guest checkout with server-side verified prices, Turnstile and rate limits, order idempotency, and encrypted/private customer PII.
4. Map each selected supplier variant code to Safqa's `items[].property`, not the visible color/size text. Map each governorate to `shipping_governorate` (pricing document ID), city to its provider code.
5. Backend POST `/api/v1/public/orders` using `api-safka-key` from server secret ONLY. Save receipt with supplier order ID and serial number. Do NOT expose secrets in frontend.
6. Reconcile failures/ambiguous timeouts without blind retries (avoid duplicate real supplier orders), and secure the `orderHook` receiver against forged webhooks.
7. Test non-live preflight plus manual supervised supplier trial before switching any customer checkout on.

## Notes
- The first 462 preliminary prices were calculated from supplier reference price + an assumed shipping/ads/returns buffer; not individual competitor research and not verified supplier margin.
- NEVER bulk-approve prices without explicit review of supplier cost and product choice.
- The owner-only CSV includes prices. Portable JSON catalog export intentionally excludes prices, orders, customer PII and keys.
- TinyFish paid browser automation couldn't run due to insufficient wallet credits; code checks and public HTML fetch were completed, but mobile end-to-end test remains pending.
