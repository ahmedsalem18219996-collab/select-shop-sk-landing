# Direct orders (TEMPORARY storefront only) — staging checklist

**Repository**: `ahmedsalem18219996-collab/select-shop-sk-landing`  
**Development branch**: `feature/temporary-orders-direct-checkout`  
**Do not edit, merge into or deploy anything in SELECT-SHOP-CLEAN.**

## Architecture

- Public storefront: GitHub Pages (the current temporary store).
- Order database: isolated Supabase `select-shop-orders`, project `zznqdwrohrycsjfpvkhc`.
- Authenticated admin dashboard: `/preview/select-unified-v1/orders-admin/`.
- Order endpoint: isolated Supabase Edge Function `submit-order`.
- Optional n8n: operational automations **after** an order is persisted; do not treat local n8n as the order's source of truth. If the laptop is off, Supabase must still accept orders.

## Safety status observed October 10, 2026

- [x] Dedicated orders database exists; basic tables and policies exist.
- [x] `submit-order` Edge Function is deployed to the isolated orders project.
- [x] Existing protected frontend adapter for direct orders (not active).
- [x] Catalog has five product snapshots.
- [x] Stage-only UX copy updated to describe direct registration, not WhatsApp.
- [x] Published homepage (`/`, `index.html`) still uses `script-v17-safe.js` and WhatsApp checkout. The direct-order adapter exists only inside `/preview/select-unified-v1/` until an explicit rollout.
- [ ] Dedicated admin Supabase Auth user created and granted `ss_order_admins` membership (**0 users, 0 admins** at inspection).
- [ ] Cloudflare Turnstile configured for `selectshopeg.com` and `www.selectshopeg.com`.
- [ ] Server-only secrets `TURNSTILE_SECRET_KEY` and `ORDER_HASH_SECRET` configured and checked.
- [ ] Reconcile variant availability and product prices with current storefront.
- [ ] Real end-to-end order **test** (server-receipted persisted order, duplicate idempotency, status update).
- [ ] Verify unauthorized users cannot read orders and no private credentials are in public JS.
- [ ] Test Chrome Android, iOS Safari and Meta in-app browser.
- [ ] Explicit authorization to enable live direct checkout.

Until all gates pass: `window.SELECT_SHOP_GUEST_ORDERS.enabled` MUST remain `false`. Do not replace the existing WhatsApp ordering flow in the published site.

## Local, no-network static and mocked checks

```sh
node --test orders-system/tests/direct-checkout-safety.test.cjs
```

These tests confirm the **default fail-closed wiring**, not real external connectivity.

## Before allowing actual customer orders

1. Create a dedicated administrator account in the separate **select-shop-orders** Supabase Auth project. Never put its password in chat or GitHub.
2. Authorize exactly that user to access orders. Keep signups and anonymous order reads disabled.
3. Create Cloudflare Turnstile keys for both production hostnames. Public site key can be in client config; private secret goes only to Edge Function environment.
4. Add a strong `ORDER_HASH_SECRET` in the Edge Function secret store. Never commit secrets.
5. Verify the published catalog against `ss_order_catalog` including shipping/second-pair discounts and size availability.
6. Test submitting an order on a controlled preview with the same protections; confirm response code and persisted DB record, including repeated submission returning the original receipt.
7. Review 2026 pricing, checkout UX, accessibility, and privacy notice.
8. Only after successful tests and specific launch approval, enable direct ordering in the temporary storefront. Leave WhatsApp for inquiries.

## Important

- There are **no genuine orders** in the isolated orders database at inspection. Do not invent order records or claim live customer orders are being received.
- Public GitHub Pages isn't a private storage solution for customer names, phone numbers, or addresses.
- No credentials are to be stored in source control; n8n integrations must use n8n's local Credentials storage, protected with least privilege.
- This branch is for staging changes only. GitHub Pages `main` is left unchanged until approval.
