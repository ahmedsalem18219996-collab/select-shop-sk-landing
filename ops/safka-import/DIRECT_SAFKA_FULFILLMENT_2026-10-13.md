# SELECT SHOP TEMP — Safka direct order fulfillment (13 October 2026)

Scope: **temporary site only**, Supabase project `zznqdwrohrycsjfpvkhc`, not SELECT-SHOP-CLEAN.

Official supplier API: `POST https://api.safka-eg.com/api/v1/public/orders`.
Public API docs: https://public-api-docs.safka-eg.com/api/create-order .

## Production order flow

1. Customer checks out through single-item or multi-item Safka form.
2. Both capture Edge Functions perform origin checks, anti-spam work proof, IP limits, live product/variant reference comparison, verified retailer note and governorate freight checks. `validateOnly:true` exits before saving or dispatching.
3. Accepted order is **committed locally first** in `ss_safka_checkout_requests` plus cart-line table if appropriate. The unique `request_id` and request hash prevent duplicates and conflicting retries.
4. The checkout calls `safka-dispatch-order` internally using server-only `SUPABASE_SERVICE_ROLE_KEY`; public callers get 403. Neither upstream key nor order customer data enters the repository or advertising pixels.
5. Gateway rechecks persisted totals, supplier reference prices, city/region, only the 20 selected product IDs, price source and available options; conservatively computes merchant commission as `total COD − summed supplier reference prices − actual freight rate`. Minimum modeled commission EGP 100. This is **not** profit after advertising, returns and fees.
6. SQL `ss_safka_claim_supplier_dispatch_v1` atomically locks a single order before sending. Requires local `review`, supplier `not_sent`, numeric supplier city, selected product(s), no same-phone auto-dispatch in 90 min, operator enabled and no more than **20 attempts in trailing 24 hours**.
7. The gateway performs **one upstream POST** with supplier product/property IDs, client shipping details, governorate pricing document ID, city code, COD total and commission.
8. On Safka 200/201 + validated unique ID and serial, `supplier_status=sent`, `supplier_order_ref` and `supplier_serial` persist. Customer sees supplier acknowledged but still not yet shipped; Safka handles customer confirmation.
9. Definite supplier 400/401/403/404/422 means `blocked`; unknown response, timeout, failure after claiming, or 5xx means `needs_reconciliation` or `dispatching` until verified. **Never automatically retry uncertain sends**: first reconcile the local order code against Safka's orders.
10. Local order remains in authenticated admin inbox. Customer does not see supplier procurement costs or secret keys.

## Owner controls

https://selectshopeg.com/ops/safka-import/ — authentication required.
- Displays count of successful supplier transfers and supplier order serial.
- Shows blocked, in-progress and unknown submissions for owner action.
- **One-click pause** updates `ss_safka_dispatch_control.enabled` via admin RLS. Pausing prevents future claims; cannot retract an already accepted supplier order. Limit cap is enforced server side at 20.
- A Safka order status **webhook is not currently connected** to the existing provider API key; subsequent shipping/collection updates must be checked with Safka until a verified webhook subscription is configured.

## Boundaries and verification

- Zero genuine Safka orders existed at rollout; **do not use a fake customer order to test provider creation**.
- Tests validate supplier GET, browser/DB read-only order quotes, no-write multi-cart, unauthorized gateway denial, service-only SQL claim/finalize with nonexistent order code, desktop/mobile UX.
- Source retail-note + 110 EGP is a price quote. Actual payout/commission mechanics and rejection fees need verification on first legitimate transaction.
- Only selected 20 Safka items are auto-forwardable; archived shoes and other hidden products are **not** automatically sent to Safka.
- Never place an automatic second order after an ambiguous supplier reply.
