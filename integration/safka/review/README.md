# SELECT SHOP temporary site — Safqa integration review (2026-10-11)

**Review-only. Nothing in this folder has been deployed or executed against live orders.**
GitHub Pages storefront: selectshopeg.com. Backend scope: **Supabase `select-shop-orders`** (`zznqdwrohrycsjfpvkhc`).
**NEVER modify `SELECT-SHOP-CLEAN` or `SELECT-SHOP-CLEAN-DEV`.**

## Evidence and limitations

1. Current DB structure was read directly from temporary Supabase, no customer rows read or written.
2. Safqa public introduction confirms API key header `api-safka-key` and base `/api/v1/public`. API-specific fields below were transcribed from the owner's Claude browser investigation, **not** from an authenticated test request. No Safqa API key exists in this repo.
3. Actual `orderHook` JSON example, official signature, guaranteed retries, rate limits, and source IP ranges are **not verified**. The event adapter's `data.order_id`, `data.status`, `data.updated_at` property names are hypothetical, not guaranteed.
4. Public site `Product Hook` appears to export products to third-party systems; do **not** confuse it with `GET /products` or order dispatch.
5. Existing Easy Orders shop `selectshop.myeasyorders.com` is **not** our GitHub Pages store; don't send or copy any products there.
6. CarWash48 was retired from the temporary shop and set inactive in `ss_order_catalog`; do not reimport or activate it without owner approval.

## Safqa product -> `ss_supplier_catalog_map` field map

| Safqa field (from browser report) | Existing SELECT SHOP storage | Decision |
| --- | --- | --- |
| `product._id` | `supplier_product_id` | Exact provider product ID as text, never local `product_id` |
| `product.barcode` | `supplier_barcode` | Optional identifier, never unique or primary identity without validation |
| `properties[]._id` | `supplier_variant_id` | Exact provider property / size ID. NOT local variant ID |
| `properties[].key` | No typed field in mapping table | Stage as display name after authenticated sample; don't infer from local SKU |
| `properties[].is_available` | `active` | Imported availability is only one condition. Owner approval required before true |
| `properties[].value` (supplier cost, as reported) | **No current field** | Requires private cost staging. Must not overwrite storefront price |
| `properties[].min` | **No current field** | Semantics to verify; do not presume minimum purchasable qty |
| `properties[].sale_price` | No field in mapping table | Recommended price only; not our published all-in price |
| `product.sale_price` | `ss_order_catalog.price_egp` is a **different value** | Never copy directly: shop price must cover delivery + profit |
| `product.images`, `description`, `note`, `faqs` | Not stored by mapping table | Pending product content import staging; retain original attribution and media |
| `product._id` linked to our `product_id` | `product_id` references `ss_order_catalog` | Admin must explicitly map or create a local catalog product |
| local color/size ID (e.g. `sk1`) | `variant_id` | Keep local canonical variant unchanged. Match to supplier property deliberately |
| `shipping_governorate` from `GET /public/price-list` | `ss_orders.governorate` currently holds Arabic name | **Missing mapping**: require separate governorate _id / price table before order dispatch |
| supplier order ID from create response | `ss_affiliate_tracking.supplier_order_ref` | Save only after confirmed create response or manual entry. Idempotency required |

**Identity rule:** unique tuple `(platform, product_id, variant_id)`; never assume `barcode` or textual property name uniquely identifies a variant. All newly imported supplier mappings remain `active=false` until reviewed.

**Shipping-included sale price:** No additional shipping fee at checkout. Validate shipping rates from real `GET /public/price-list`, supplier property cost, any delivery/return costs and a positive profit margin **before** proposing a displayed price. If the owner wants one price valid nationwide, it must cover the worst supported region's delivery cost; alternatively publish a region-specific *final* all-in price before confirmation. Do not infer prices from `sale_price` alone, and do not re-enable CarWash48.

**Suggested subsequent data models (not migrated):** admin-only `ss_safka_import_staging` with remote product, variant, cost and availability snapshot, review status and timestamps; `ss_safka_shipping_regions` with Safqa governorate `_id`, Arabic label, exact charge, cities, last verification time. No public read or automatic publish.

## Order-hook design

### Current DB facts
- `ss_orders.status` CHECK supports `new, review, confirmed, packing, shipped, delivered, cancelled, shipping_quote`. It does **not** support all Safqa states.
- `ss_affiliate_tracking` stores supplier order reference and `handoff_status`, including `pending, submitted, accepted, shipped, delivered, returned, cancelled`.
- `ss_order_status_events` is internal order-status audit and should not receive unverified supplier state transitions.

### Proposed remote states
Reported Safqa states include `pending`, `preparing`, `printing`, `shipped`, `available`, `collected`, `skip`, `holding`, `returned1`, `returned2`, `declined1`, `declined2` and additional exchange/refund cases. Store exact external state in a **separate event inbox** before mapping to our internal statuses.
Provisional high-level mapping (informational only): `shipped` -> shipped; `available/collected` -> delivered; `returned*` -> returned; `declined*` -> cancelled. **NOT activated** until Safqa confirms semantics and the owner approves reconciliation. Never equate `collected` with a marketing Purchase event automatically.

### Files for review
- `order-hook-contract.mjs`: parser with intentionally strict provisional envelope, status allowlist, safe replay material and zero customer PII.
- `order-hook/index.ts`: proposed Deno Supabase Edge Function. `verify_jwt:false` would be needed only because Safqa is an external server, and must *always* be paired with the high-entropy callback secret. Function currently NOT deployed; no operator route exists.
- `20261011_safka_webhook_inbox_DRAFT.sql`: proposed RLS-only inbox; **not applied**, no anonymous/authenticated write policies. Service role stores only remote order reference/status/fingerprint/time/linkage; no raw payload.
- `order-hook-contract.test.mjs`: Node test suite of **synthetic** events. No network calls, no real customer data.

### Webhook security facts
**A secret in a URL is a bearer capability, NOT a cryptographic signature.** Without Safqa producing an HMAC signature header, we cannot independently prove the sender; anyone possessing this secret URL could impersonate a webhook. Draft uses a long random query parameter and compares its SHA-256 digest with `SAFKA_HOOK_TOKEN_SHA256` stored only in Supabase secrets. The secret query can still leak via provider/infrastructure URL logs; treat it like a password, never paste in chat, rotate upon suspicion. If Safqa can configure a secret header or provide HMAC verification, **prefer that**. Rejects oversize bodies, unknown states and unknown event types, avoids logging URL/body/PII, stores no customer PII, and detects duplicate snapshots.

**Required admin-gated environment values if reviewed for later deployment:**
- `SAFKA_HOOK_TOKEN_SHA256` (hash of 32+ random bytes encoded as base64url; do not commit token).
- `SAFKA_WEBHOOK_SCHEMA_VERIFIED=true` **only** after reviewing actual redacted Safqa hook request field names.
- `SAFKA_WEBHOOK_WRITE_ENABLED=true` **only** after inbox migration, tests, owner approval and monitoring.
- Standard server-only Supabase URL and service-role key, never accessible from browser.
The actual endpoint must not be provided to Safqa until authentication, payload shape, and dedup are validated.

### Failure/retry behavior
If replay input matches, the inbox primary key handles duplicate events. Repeated status with no supplier timestamp is collapsed even if it describes a distinct future transition, a known limitation that needs actual event ID/time validation. Events with unknown supplier reference are quarantined as `unmatched`; ambiguous supplier references do not attach to any order. The first iteration must not mutate `ss_orders.status` or place supplier orders. Error codes/retry strategy must be checked with Safqa support before enabling.

## Owner/Claude browser follow-up (read-only)
1. Inspect an actual **redacted sample** `orderHook` request envelope from Safqa docs/account: event name, supplier order reference field, status field, event ID and timestamp, request headers. Strip personal/address/phone data; do not share keys.
2. Confirm whether Safqa signs hooks, sends custom headers, what retries look like, and whether a callback secret in the URL is permitted. Distinguish integration key-delivery `callbackAPI` from `orderHook` event endpoint.
3. Obtain authoritative sample JSON for `GET /api/v1/public/price-list` and `GET /api/v1/public/product/:id` without credentials in reports; document governorate ID/price and property ID/cost.
4. Confirm whether `productHook` is a push of product details or user-triggered export, and how it differs from the public products API.
5. Verify the existing order-admin login yourself; no password should be sent to an assistant.
6. Do not create real Safqa orders or enable automatic status mutation.

## Deployment status
- No Safqa API key entered or generated.
- No external requests created from an integration function.
- No migrations applied to Supabase in this change set.
- Nothing in SELECT-SHOP-CLEAN touched.
- **Main branch and all live storefront URLs unaffected by this draft.**
