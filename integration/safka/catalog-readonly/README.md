# Safqa — read-only catalog and shipping (DRAFT)

**Scope:** SELECT SHOP temporary storefront only. Supabase **select-shop-orders**
(project `zznqdwrohrycsjfpvkhc`). Never deploy to **SELECT-SHOP-CLEAN-DEV**.

Status: **Prepared for review, not deployed. No Safqa key, external fetch,
database write, customer-order creation, or storefront change performed.**

## Owner action — create and secure the key

1. In the logged-in Safqa account, open the Public API key creation screen.
2. Name: `select-shop-orders`.
3. Leave **Product Hook**, **Order Hook** and **Callback API** EMPTY
   for read-only products/shipping integration.
4. After Safqa confirms creation, copy the API key using the provider's
   one-time display. Never paste it into GitHub, messages, Claude or ChatGPT.
5. In Supabase project **select-shop-orders** ONLY, navigate to **Edge Functions →
   Secrets**, add a secret named `SAFKA_API_KEY` and paste the key there.
   Save; tell the assistant only **"تم حفظ السر"**, without disclosing its value.
6. Do NOT choose `SELECT-SHOP-CLEAN-DEV`.

## Proposed read-only Edge Function

Code: `index.ts`; helper: `response-projection.mjs`.

Deploy only after owner reviews and authorizes:
- Name: `safka-catalog-readonly`.
- Supabase project: `zznqdwrohrycsjfpvkhc`.
- Entrypoint `index.ts`, include `response-projection.mjs` as sibling dependency.
- `verify_jwt=true` mandatory.
- Invoke with authenticated **store admin** Supabase session and request `Origin:
  https://selectshopeg.com`.
- `POST` to the internal Edge Function with body `{"mode":"products","page":1,"size":10}`
  to produce Safqa **GET** `/api/v1/public/products?page=1&size=10`.
- `POST` to the internal Edge Function with `{"mode":"price-list"}` to produce
  Safqa **GET** `/api/v1/public/price-list`.
- No `POST /api/v1/public/orders` functionality, no import or catalog writes.
- Only bounded whitelisted metadata from provider response is returned to admin.
- On unexpected provider schema, return shape summary, don't invent entries.
- Safqa key lives only in the server-side secret and is sent only in
  `api-safka-key` to official host; no redirects allowed.

## Why we can't auto-price yet

Provider's `sale_price` is a suggestion, not final delivered sale price.
Our final SELECT SHOP price needs supplier cost, shipping price by governorate,
and target profit; confirm the remote fields and exact shipping `_id` before
calculating or publishing. Price includes actual shipping; no separate checkout
shipping surcharge. Retired CarWash48 must remain unavailable until explicitly approved.

## Safety checkpoints

- Read-only endpoints verified in Safqa public API documentation:
  https://public-api-docs.safka-eg.com/
- Auth header: `api-safka-key`; base: `/api/v1/public`.
- No server key in public code; Supabase publishable/anon key may be used for
  admin auth only, never service-role.
- GitHub repo unit tests use **synthetic provider responses**, no real calls.
- `SELECT-SHOP-CLEAN` untouched.
- Product import and auto-order dispatch are separate future stages.
