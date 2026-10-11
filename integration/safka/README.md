# SELECT SHOP (temporary) — Safqa/Prof handoff status
Date: 2026-10-11

## Scope
- Public website: selectshopeg.com (GitHub Pages); **main storefront, checkout and ad URLs untouched**.
- Backend only: Supabase project **select-shop-orders**.
- **Never use/select/change SELECT-SHOP-CLEAN-DEV**.
- Order admin: https://selectshopeg.com/ops/orders/ (auth-only; Supabase RLS).

## Completed, confirmed
- Existing order storage: `ss_orders` and `ss_affiliate_tracking`, both RLS-protected.
- Existing `submit-order` Edge Function uses Turnstile, rate limit, idempotency, and service-only customer writes. NOT yet called from production storefront.
- Added supplier variant mapping: `ss_supplier_catalog_map` (currently empty, active false by default, RLS admin-only).
- Added owner-only `/ops/orders/`: login, order review, click-to-copy supplier details, and manually record real supplier order references after submission.
- Added `safka-preflight` Edge Function with `verify_jwt=true`, read-only check: confirmed status, shipping quote, supplier SKU mappings, trial sizes, duplicate Safqa handoff. It NEVER calls Safqa or inserts an order.
- No supplier keys in GitHub or browser. Only public Supabase publishable key is in the public admin JS.

## Not completed yet
- Customer order capture into Supabase from the live checkout (still WhatsApp-only).
- Actual Safqa API order creation or product import. Requires account approval/credential and exact endpoint contract from the Safqa dashboard/docs.
- Mapping each site product variant to the correct Safqa/Prof supplier product SKU.
- Enabling order dispatch, tracking server acknowledgements, webhooks and reconciliation.

## Important provider notes
Safqa public docs: https://public-api-docs.safka-eg.com/
Base public path: `/api/v1/public`, authentication header `api-safka-key`.
Do not mistake the public Product Hook UI (product export) for automatic order delivery.
Never submit `ss_orders` trial items or unconfirmed / shipping-quote orders automatically.
No supplier API key or customer PII should be committed to the repository.
Do not fire a Meta Purchase conversion merely because an order was stored or submitted.

## QA
- GitHub Pages admin page has strict CSP, noindex, no referrer, login and RLS-backed admin check.
- Supabase temporary project's mapping table is RLS-enabled; anonymous has no table read grant.
- Dry-run preflight deployed with JWT verification. Exact supplier write path not implemented.
- No real customer order or provider request has been made.
- Live end-to-end user login and Safari UI still require owner browser verification.
