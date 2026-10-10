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
