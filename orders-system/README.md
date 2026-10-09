# SELECT SHOP Orders — independent temporary store backend

**Status (2026-10-09):** independent project `select-shop-orders` created and healthy; secured database migration applied; 5 products seeded; `submit-order` Edge Function deployed (v1). **Guest checkout remains DISABLED** until CAPTCHA server secrets, a private admin user, live tests and explicit launch approval. No real orders have been received so far.

This project is exclusively for the temporary `selectshopeg.com` GitHub Pages storefront.
**NEVER deploy to or modify the independent SELECT-SHOP-CLEAN master/product platform.**

## Files

- `schema.sql`: independent PostgreSQL tables, admin authorization, Row Level Security (RLS), and real-time updates.
- `catalog-seed.sql`: price and available-size snapshots from the unified preview (SK / ALEX / EQWAL / WK / CW48).
- `supabase/functions/submit-order/index.ts`: server-side validated order API with mandatory Turnstile CAPTCHA, hourly rate limiting, and idempotency.
- `supabase/config.toml`: permits anonymous invocation of the function; its internal CAPTCHA and access controls are **mandatory**.
- `../preview/select-unified-v1/orders-admin/`: private orders dashboard/PWA.
- `../preview/select-unified-v1/orders-config.js`: feature-flagged customer checkout (OFF by default).
- `../preview/select-unified-v1/orders-checkout.js`: guest submission adapter and receipt UI.

## Deployment checklist (completed steps shown explicitly)

1. ✅ Confirmed isolated Supabase project **zznqdwrohrycsjfpvkhc** (`select-shop-orders`, `Select Shop Temp`). Do not assume the account's older/default project is safe.
2. ✅ Secure schema migration applied by prior work; 5 catalog entries and variant sizes seeded. **Order schema differs from historical `schema.sql`** (private schema and required request hash); the deployed Edge Function was adapted to the live schema. **Stock/prices must be rechecked before launch.**
3. Supabase Auth > Users: add a dedicated admin email user with secure credentials. Do not enable public signup. Then run this statement in the **new project** SQL Editor, substituting the approved admin email:
   ```sql
   insert into public.ss_order_admins(user_id)
   select id from auth.users where email = 'APPROVED_ADMIN_EMAIL'
   on conflict (user_id) do nothing;
   ```
   Make sure it adds exactly one authorized user.
4. Create a free Cloudflare Turnstile site for **selectshopeg.com** and **www.selectshopeg.com**. Protect submissions with the Turnstile **site key** (public) and **secret** (server only). These keys are not interchangeable.
5. Create `ORDER_HASH_SECRET` (random, server-only). Configure the Edge Function secrets `TURNSTILE_SECRET_KEY` and `ORDER_HASH_SECRET`; use Supabase's built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, never copy the service role into GitHub.
6. ✅ Deployed `submit-order` (v1, active) to isolated project with JWT disabled for guest checkout **only**. Validation happens server-side using CAPTCHA, allowlisted site origins, server-authoritative catalog, and rate limit. Check the deployment's project ref before pressing Deploy.
7. ✅ Populated the new project's public URL and publishable key in `orders-admin/config.js`. **Admin auth user not yet created; login cannot succeed until an admin exists.** Never use project keys from SELECT-SHOP-CLEAN.
8. ✅ Public URL and publishable key set in `orders-config.js`, `enabled:false`. ⏳ Turnstile site key is still missing.
9. On a test-only preview, enable direct checkout and submit a real test order. Verify that one order reaches `ss_orders`, the order total comes from `ss_order_catalog`, repeat submission returns the **same order**, status changes work, and unauthenticated clients cannot read orders.
10. Verify an SK second pair gets the **eligible 80 EGP shipping saving**; a separate car-care order gets no mixed-source saving; a car-care order outside Cairo/Giza is marked `shipping_quote`.
11. Test on desktop, Android Chrome, iPhone Safari, and the Facebook/Instagram in-app browser. Only **after passing tests**, replace customer WhatsApp-order handoff; WhatsApp remains for inquiries only.

## Important boundaries

- The **GitHub Pages** repository is PUBLIC. Only public URL and publishable/anon key belong in its JavaScript, **never** a Supabase service role, JWT secret, admin password, or Turnstile secret.
- Access to real order information requires Supabase login and membership in `ss_order_admins`. Database RLS denies public reads/writes. The privileged Edge Function is the only entry point for anonymous orders.
- Admin PWA can be added to a mobile Home Screen. During this stage it supports in-page updates and notifications **while open**, not guaranteed offline/background push. True closed-app push requires a further notification service and permissions.
- Do not cache API responses or customer data in the PWA service worker.
- The server determines all amounts; customers cannot set prices or discounts.
- **Shipping outside Cairo/Giza for CW48 requires manual review before confirming the final total.**
- The customer sees brand, product, price, discount, and status; backend logistics references stay private.
- The checkout mode stays OFF until project isolation, CAPTCHA, permissions, and end-to-end delivery have been verified. Never advertise the app as already receiving real orders until a database insert has been observed.

## Next required connection

Supabase connection is now active to **Select Shop Temp ONLY**. Remaining blockers: provision a separate admin auth user, configure Cloudflare Turnstile and protected Edge Function secrets, then test end-to-end guest order submission and management. **Do not activate the guest-order feature until tests pass.**
