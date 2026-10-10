# TEMPORARY SELECT SHOP V2 — direct orders staging

**Only** `ahmedsalem18219996-collab/select-shop-sk-landing` → `feature/temp-v2-direct-orders-staging`.

Never change, merge into, or deploy to `SELECT-SHOP-CLEAN`.

## Staged

- The current root storefront uses `storefront-v2-live.js` and `catalog-v2-live.js` (not the old preview frontend).
- `direct-order-v2-config.js` is explicitly `enabled:false`; Turnstile public site key is empty.
- `direct-order-v2.js` stages Turnstile + server-side order submission, stable retry idempotency, server-receipted confirmation, and inquiry-only WhatsApp link when enabled.
- `storefront-v2-live.js` preserves the current WhatsApp flow whenever feature is OFF and preserves the owner test mode. It uses the direct flow only when enabled, after validation.
- The direct flow clears cart and stores **only** order receipt metadata after positive server persistence acknowledgement. No customer name, phone or address is written to browser storage or GitHub by the new flow.
- Customer amounts are authoritative only on the Supabase server.
- The existing Supabase backend `select-shop-orders` (project `zznqdwrohrycsjfpvkhc`) and private authenticated admin page `/preview/select-unified-v1/orders-admin/` remain independent of CLEAN.
- These additions exist only on a development branch; no public site or database was changed.

## Verified after setting up administrator (2026-10-11)

- [x] Separate Supabase `select-shop-orders` has exactly one confirmed Auth account.
- [x] Account authorized in `public.ss_order_admins` (exactly one authorized administrator).
- [x] Verified order count remains 0 and catalog has 5 products.
- [ ] Owner must test admin dashboard login with their own password; this login cannot be tested by the assistant.
- [ ] Cloudflare Turnstile, private function secrets, E2E test and explicit go-live approval remain mandatory.

## Affiliate fulfillment: Safqa / Prof — manual first (11 October 2026)

**Operational reality:** A storefront order is a *lead to be reviewed*, not an order that the supplier automatically receives. SELECT SHOP receives customer info and manually enters the matching products in the affiliate platforms.

- [x] The isolated `select-shop-orders` Supabase database has `public.ss_affiliate_tracking` (one record per storefront order × supplier platform).
- [x] Authorized admins only (RLS via `private.ss_is_order_admin`, no anonymous table privileges).
- [x] Independent statuses and supplier reference IDs; zero supplier tracking rows and zero customer orders at migration time.
- [x] Product routing reads the private catalog: SK/ALEX/EQWAL/WK → Prof; carwash48 → Safqa. Unknown product mapping **blocks copy**.
- [x] Admin-only order detail cards for each platform: copy the required data, enter supplier order reference, save state. Copy is user-initiated, never automatic.
- [x] Works with split/mixed orders from both platforms; no merging supplier handoff statuses with storefront delivery statuses.
- [x] Offline tests passed 20/20 in GitHub Actions (10 direct checkout + 10 affiliate workflow).
- [ ] Real admin browser test of manual tracking UI, with a clearly synthetic controlled test order (no supplier submission).
- [ ] Activate admin UI in the live temporary-store dashboard only after review.
- [ ] No supplier API credentials; no auto-placement to suppliers.

**Future automation path only if sales volume warrants it:** determine if Safqa and Prof have approved APIs, CSV imports or permitted automation interfaces; implement n8n per supplier only after verifying permissions and secure credentials, idempotency, supplier order reference receipt, and rollback/error handling. Never infer successful vendor submission from copying a message or clicking a button. Manual review for trial sizes, shipping quotes and mixed-platform orders remains required until the platforms' capabilities are verified.

## Required before ANY live enablement

1. ✅ Created dedicated administrator in isolated `select-shop-orders` Supabase Authentication and verified email confirmation (one account).
2. ✅ Authorized that exact account in `public.ss_order_admins` (one admin), with RLS enabled and no anonymous direct order access.
3. Configure free Cloudflare Turnstile for `selectshopeg.com` and `www.selectshopeg.com`. Public site key goes in the client config; secret stays in Edge Function secrets.
4. Configure `ORDER_HASH_SECRET` server-side. Do not store in public GitHub or client JS.
5. Check current product IDs, variant sizes and prices against `public.ss_order_catalog`, including car-care's no-size server representation `[0]`, second-pair discounts and shipping reviews.
6. Test actual login, API order save, idempotent re-submit, status updates, unauthorized reads denied, failure scenarios, and mobile/in-app browsers.
7. Obtain explicit go-live approval, then merge/rebase with the latest moving `main` **after rechecking changes**. Do not toggle `enabled:true` prematurely.

## Commands

`node --test orders-system/tests/direct-order-v2-safety.test.cjs`

Tests are mocked and use no actual Supabase orders or network requests; they are not a substitute for real end-to-end tests. Github Actions runs only these tests on branch and PR updates.
