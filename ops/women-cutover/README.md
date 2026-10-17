# SELECT SHOP WOMEN — isolated cutover to temporary SELECT SHOP storefront

Status: **PREPARATION ONLY — NOT DEPLOYED** (17 October 2026).
Decision: WOMEN becomes the temporary website homepage **only after successful production-like testing**. Do not change DNS, `CNAME`, domain, SELECT-SHOP-CLEAN, or old databases.

## Separation, recorded and verified

| Asset | Source of truth | Allowed changes |
| --- | --- | --- |
| Historical Safqa storefront (code, images, CSS, JS) | `select-shop-sk-landing` commit `e032f8fc5fadeed4e4bfd36d5912bb478837f7b5`; immutable archive branch `archive/safqa-store-before-women-20261017` | None during staging |
| Safqa product, fulfillment and order state | Existing Safqa / `select-shop-orders` system | None |
| WOMEN full-stack application | Private `select-shop-women-staging` repository, `main`; experimental Cloudflare branch remains separate | Only approved WOMEN changes |
| WOMEN product/admin/orders | Independent Supabase project `byluoipdunralsurwebt` (Frankfurt) | WOMEN-only, test-first |
| Live temporary homepage and DNS | `select-shop-sk-landing/main` and `selectshopeg.com` | Must stay unchanged until gates below |

## Technical constraint (NO fake static deployment)

The temporary website uses GitHub Pages, which cannot run the server components, private Supabase service credentials or Next.js 16 dynamic handlers in WOMEN. A plain HTML copy, iframe or client-side service-role key is NOT a replacement.

Before changing the live homepage, deploy WOMEN on a separately named **full-stack HTTPS** origin (for example Cloudflare Workers, or another tested Next.js-capable server), with runtime secrets kept server-side. GitHub Pages could later present the WOMEN entrypoint, but must not break same-origin cookies, checkout, pricing, admin APIs or deep-link routing. A simple browser redirect to Egypt-inaccessible Netlify is explicitly blocked.

This is a stop condition, not permission to merge two databases or expose server tokens.

## Gate sequence — all mandatory

1. Verify archive and main still point to the recorded same original commit (or confirm subsequent legitimate Safqa main changes and create a newer archive before cutover).
2. Deploy isolated WOMEN Next.js server with its own secure secrets; never route orders to Safqa or suppliers by default.
3. Run `node ops/women-cutover/verify-staging.mjs https://<actual-women-origin>/` on this branch. The script only makes public GET requests and never deploys.
4. Verify Owner authentication, cookies, authorization and product-photo upload privately on WOMEN (no credentials in GitHub/PR/chat).
5. Create one *explicitly marked* test product in WOMEN Supabase (with permission), verify image/variants/prices, public product and delete/hide test record according to agreed data policy. Existing WOMEN product count was 0 at review; an empty storefront is not launch-ready.
6. Verify checkout shipping and payment totals; write only controlled test orders, do not forward to Safqa or other suppliers.
7. Test real Egyptian mobile-ISP access with owner and document result. Remote automated GET success is insufficient.
8. Prepare a separate, tested, durable Safqa access route or restore method, without touching its independent data. The archive is a source-code backup, not by itself a live URL.
9. Create a separate PR containing only the final homepage switch. No automatic merge; obtain explicit authorization for any live routing/switch side effects. `CNAME` remains unchanged; no DNS changes.

## Rollback

The historical Safqa storefront is recoverable from `archive/safqa-store-before-women-20261017`, SHA `e032f8fc5fadeed4e4bfd36d5912bb478837f7b5`. Before cutover, take a fresh immutable snapshot of the then-current live main SHA; rollback must change only storefront files and never migrate or truncate either database.

Current branch `experiment/women-temp-site-cutover` is documentation and safety tooling only; GitHub Pages continues to publish `main`. **No woman shopper/admin site has been published by this branch.**
