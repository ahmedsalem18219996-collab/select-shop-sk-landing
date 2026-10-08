# SELECT SHOP — Unified Purchase Experience (non-breaking migration)

## Baseline
- Default branch `main` is the live GitHub Pages storefront. Do not edit it before QA.
- Sneakers: `script-v17-safe.js` stores V2 cart data under `selectShopCart:v2`. It already manages shoe variants, trial sizes, discounts and WhatsApp handoff.
- Car wash: `product/carwash48/index.html` has a standalone form, its own WhatsApp redirect and a 999 EGP Cairo/Giza price. It is **not** part of the sneakers cart.
- Existing permanent product URLs, GA4/Meta tracking, WhatsApp phone, legacy ad redirects, product image paths and owner-test mode must remain intact.

## Target architecture
1. A unified product schema: `id`, `category`, `title`, `price`, `shippingPolicy`, `variants`, `fulfillment`, `discountPolicy`.
2. One cart/order state with category-safe policies. Keep existing shoe items/read-write compatibility while upgrading older carts; never silently discard saved carts.
3. A standalone `commerce-policy.js` **pure functions first**: determine eligible items; apply shoe additional-pair discounts only to *kept second and subsequent shoe pairs*, never trial items or car accessories. No discount when one shoe + one car item.
4. A unified checkout experience (consistent name, phone, governorate, address, order review, WhatsApp message). Preserve separate, explicit shipping terms by product and destination. Do not falsely promise free nationwide car shipping.
5. All pages use common navigation, accessibility labels, cart count and mobile dock. The landing page for each product remains directly accessible.
6. Analytics: preserve `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`; avoid duplicate events on redirects; no `Purchase` from merely opening WhatsApp.
7. Feature flag `unifiedCheckout` defaults off until tested. Full rollback is one commit/revert or disabling the flag.

## Acceptance scenarios
- One sneaker: no additional-pair discount.
- Two eligible sneaker pairs kept: correct second-pair discount once.
- Two sizes for try-on, keep one: exactly one paid pair; no second-pair discount.
- One sneaker + one car gun: full car price, no shoe-pair discount.
- Two sneakers + car gun: shoe-only discount; gun 999 EGP unaffected.
- Gun outside Cairo/Giza: no unsupported automatic total/shipping assurance.
- Reload preserves valid carts; stale carts follow existing TTL/migration rules.
- Existing /product/sk1/, /product/wk1/, /product/carwash48/, and homepage routes remain accessible.
- Cart removal/update and return from WhatsApp work on mobile and desktop.
- No regressions in RTL layout, Meta Pixel/GA4 and owner QA exclusion.

## Integration stages
- Stage A: pure pricing/eligibility rules and tests, no production UI changes.
- Stage B: unified basket adapter and migration; category-aware totals.
- Stage C: common checkout components, form and WhatsApp payload; visual consistency.
- Stage D: staging QA across 390px iPhone viewport and desktop, then review and merge.

## Never change without confirmation
- Selling prices or supplier shipping costs.
- Existing sneakers discount amount/eligibility rules.
- Published landing URLs or ad targeting.
- Supplier order workflow: customer WhatsApp order remains manual entry to Prof.

## Important constraints
The car page currently offers a direct WhatsApp form while sneakers use a persistent cart. Styling them identically without a shared checkout would hide, not solve, the purchasing inconsistency. Do not merge cosmetic-only work as a checkout fix.
