# SELECT SHOP TEMPORARY — source integrity audit (2026-10-12)

**Scope:** `selectshopeg.com` temporary store, Supabase project `zznqdwrohrycsjfpvkhc`.
**Out of scope:** `SELECT-SHOP-CLEAN`; original four canonical shoe products, unrelated accounts. No supplier order generated.
**Audit intent:** fail closed. Not a certification of zero defects or a green light for ads.

## Live supplier vs imported counts
- Safka public API returned 465 paginated records across 16 pages (one repeated identifier); **464 distinct products** were retained using exact Safka IDs. The owner reports 490 in the supplier portal; the **26-product discrepancy remains unresolved**. Do not invent missing products or claim full portal parity.
- 507 supplier options attached to 464 products. All rows reported an availability boolean but **not independently certified physical stock quantity**.
- Latest sync: 2026-10-12 10:39 UTC. Secure GitHub Actions OIDC workflow refreshes data daily and on supported code changes.

## Definitive pricing correction
- The historic field `suggested_sale_price_egp` is Safka API JSON **`sale_price`**, and is **NOT** the recommended *retail* price the owner requested.
- The recommended retail price appears in the product's free-text `note` as `سعر البيع المقترح`. User-approved pricing rule: **verified note recommended retail + EGP 90** of average delivery allowance.
- Price provenance now stored separately as `retail_note_suggested_egp`, `retail_price_verification`, `retail_note_checked_at`. Only one unambiguous supplier-note suggestion with no variant-price differences is accepted; no inferred values.
- **393 / 464** products passed the rule, matching `final_price_egp=retail_note_suggested_egp+90`. Their **429 options** have matching supplier-quote provenance and current customer draft price.
- **71 / 464** blocked from the public price and ordering: 67 without an unambiguous retail-note price, four with differing supplier variant prices. Another one of the 465 upstream records is a duplicate. **78 options** belong to blocked products. Public RPC emits `display_price_egp=null`, `price_status=needs_review`, and null option prices for held items.
- Single-item and multi-product server receipt endpoints both verify live upstream ID, availability, variant quote and *current* recommended retail text at submission. They fail closed when the source price or variant data changed. Service-role-only atomic edit now enforces the exact retail-note +90 rule.
- Automated syncing and manual importer use the **same parser and guards**; the old `sale_price+90` rule is no longer used for customer price. Public RPC and schema have versioned SQL copies.
- Owner CSV and private dashboard visibly distinguish supplier `sale_price` from retail note and leave held customer prices blank; approval blocked until reliable current category evidence.

## Department integrity
- **0 / 464** category values came with the latest Safka public list API responses.
- Source-detail API category probe retrieved **eight real products** (verified historic-category and pending examples); **0 / 8** provided category fields either. No public documented category endpoint was found.
- **152** products have preserved legacy/source-ever category tags. **312** lack confirmed category tags. **Do not say these are currently identical to the Safka portal taxonomy.** Full exact mapping requires a category export from the supplier portal or another authorized API with categories.

## Shipping, media, fulfillment
- Safka shipping: **27 region entries, 26 active**, price **EGP 85–110**, active-region mean **EGP 91.35**; **12 active regions above EGP 90**. The EGP 90 inclusion is a *commercial average* (not exact delivery cost, margin, or a promise of profitability).
- All 464 products contain at least one imported photo URL and at least one option; **1,819 supplier photo URLs**. This is structural link coverage, not evidence each URL is publicly accessible.
- Independent vetted Drive media links: **411 products with 2,678 video URLs**, **53 without known videos**. Browser tests validate gallery behavior but not reliable playback of all Drive files at every viewer's account.
- Customers can request a review-only checkout; **0 persisted production customer orders** and **0 supplier posts** during audit. Original shoes retain their separate fulfillment/discount flow.

## QA and release criteria
- [Full catalog + read-only quote + Chrome/WebKit QA](https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38237356367): success after corrected note-retail pricing, including all products and blocked price leakage.
- [Desktop, Android-size Chrome, iPhone WebKit customer journey](https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38236530064): success (14 checks each device; no real orders).
- [Supplier live category-detail probe + secure catalog refresh](https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38237594487): success.
- **Not yet certified:** full portal-vs-API product parity, 71 held prices, current exact Safka departments, per-governorate profit, physical stock, all remote media playback, real production supplier fulfillment. No honest 100%/zero-error claim is possible until these are resolved.

## Next source evidence required
1. Safka portal product export (IDs/barcodes/category paths) for 490 rows and the actual source taxonomy.
2. Retail quote evidence for the 67 ambiguous-note items.
3. Supplier-confirmed recommended retail per size/color for four variant-price mismatches.
4. Verified supplier fees and delivery/failure costs for accurate profit modeling and bundle shipping.
5. Media access audit / permissions for 53 missing-video products and restricted Drive previews.
