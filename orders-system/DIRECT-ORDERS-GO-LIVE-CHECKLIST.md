# SELECT SHOP TEMP — direct orders go-live checklist

**Scope:** Temporary storefront repo `ahmedsalem18219996-collab/select-shop-sk-landing`, isolated `select-shop-orders` Supabase project `zznqdwrohrycsjfpvkhc`.

**Do not modify or connect `SELECT-SHOP-CLEAN` for this work.** Also do not merge the outdated direct-orders PR #5.

## What is verified

- [x] Current V2 commerce controller staged with direct orders behind `enabled:false`.
- [x] Published WhatsApp flow and `shop_test` remain unchanged while feature is OFF.
- [x] Isolated Supabase `submit-order` function is deployed; `verify_jwt:false` for guest checkout, with server-side Turnstile verification, CORS, origin validation, rate limits and catalog pricing.
- [x] Cloud endpoint safe smoke tests: rejects wrong Origin, allows permitted OPTIONS, and fails closed for malformed JSON.
- [x] GitHub Actions mocked frontend tests: 10/10; safe live Edge tests: 3/3 (no real orders created).
- [x] Customer order catalog: 5 products, including car-care mapping from storefront variant `carwash48` to orders variant `cw48` with size code `[0]`.
- [x] Manual order handoff to Prof/Safqa tracked separately by private admin tables.
- [ ] Real end-to-end browser checkout, valid Turnstile, server receipt, duplicate retry and admin appearance.

## Current external blocker

The live Edge Function currently responds with `orders_not_configured` for a malformed POST from a permitted origin, so its required server-only secrets are not both configured. The frontend site key is also empty. **Do not enable direct orders until resolved.**

### Owner-only setup (do NOT share private values in chat or GitHub)

1. Sign in to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile). Create widget named `SELECT SHOP TEMP Orders`, **Managed** mode, hostnames `selectshopeg.com` and `www.selectshopeg.com` (if served).
2. Keep the **site key** public for later `direct-order-v2-config.js`. Do **not** publish/commit the secret key.
3. Go to **Supabase → `select-shop-orders` → Edge Functions → Secrets** at [project page](https://supabase.com/dashboard/project/zznqdwrohrycsjfpvkhc/functions). Create:
   - `TURNSTILE_SECRET_KEY`: the private Cloudflare Turnstile secret.
   - `ORDER_HASH_SECRET`: strong random unique 32+ bytes (e.g. locally generate via Node: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   Supabase built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must remain server-side and must never be copied into storefront JS.
4. Re-run safe live Edge tests: `node --test orders-system/tests/remote-edge-readiness.test.cjs`. Expected invalid-body response should become `invalid_json` (HTTP 400), not `orders_not_configured` (HTTP 503).
5. Add the public **site key** to this branch's `direct-order-v2-config.js`. Still keep `enabled:false`.
6. Test a **controlled** end-to-end order in the preview environment, valid CAPTCHA, confirmation receipt, duplicate retry, Supabase admin visibility and manual supplier handoff. Never create a fake order at actual Prof/Safqa.
7. Audit possible shipping quotation, two-size trial and mixed-vendor orders in the actual browser, mobile and Meta in-app browsers.
8. After evidence and explicit launch decision, rebase current feature on latest active `main`, confirm checkout UI, then enable only the temporary site.

## Important safeguards

- DO NOT merge as-is; this checkout feature is intentionally dormant and kept on a development branch.
- No customer PII in the repository.
- Keep real order data in isolated Supabase, not in GitHub or local n8n.
- An order submitted on the website should be status `new`/`shipping_quote` until reviewed; it is NOT considered submitted to either affiliate supplier.
- Local n8n can automate only after safe supplier integration is established and explicitly approved. No supplier API credentials or autoposting are configured.
