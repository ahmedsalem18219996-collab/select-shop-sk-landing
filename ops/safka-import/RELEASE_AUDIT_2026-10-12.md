# SELECT SHOP temporary storefront — source-of-truth audit 2026-10-12

Scope: `selectshopeg.com` temporary storefront and Supabase `zznqdwrohrycsjfpvkhc` ONLY. **Never modify SELECT-SHOP-CLEAN.**

## ACTIVE AS OF 2026-10-13 — shipping-inclusive Safka pricing v110 (supersedes +90 policy)

**Temporary SELECT SHOP only** — do not touch SELECT-SHOP-CLEAN. All future workers must follow this section rather than the historical +90 values below.

- Live source count after authenticated OIDC refresh: **469** Safka products and **512 raw option objects**. **511** variant price-draft rows exist, the one not present belongs to a blocked manual-review product. **397** supplier-note retail prices verified, **68** manual-review prices, **4** supplier-option pricing conflicts; **72** blocked and displayed with no price. **0** owner-approved products and **0** supplier auto-order activations.
- Current active Safka shipping feed has **26 regions** (27 rows total) at **85–110 EGP**. All provisional customer site quotes for the verified 397 are now **one unique parse of supplier note "سعر البيع المقترح" + 110 EGP**, the maximum current active-region shipping charge. This buffers each item against the *current* published max-region shipping, not against future changes, extra supplier fees, returns or advertising.
- Current database and public RPC independently verified **397/397** product prices equal note retail +110, **433/433** verified option price drafts match the current parent quote, **72/72** held items have null public customer quotes, zero numeric leakage, and `can_purchase=false` remains for supplier auto-fulfillment.
- Both importers (`safka-github-sync`, `safka-stage-import`) now apply +110; fresh GitHub Actions OIDC sync [Oct 13 run](https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38392404470) succeeded. Both guest order capture services and owner price approval enforce +110; order services additionally deny checkout if a selected region's synced shipping charge exceeds 110 or is invalid. `ss_safka_save_price_draft_atomic` now enforces +110. The live DB adjustment was deployed as migration `temp_safka_max_region_shipping_inclusive_110_v1`. No orders were placed.
- Examples: steam cleaner: note 1700 -> public quote **1810 EGP**; UV toothbrush sterilizer: note 700 -> **810 EGP**. Original four shoes and separate special offers were NOT repriced; any legacy advertisement of the same Safka product with an older manual price must be reconciled.
- **Stock semantics:** latest source records say 469 product availability flags and 512 variant option flags were true in supplier snapshots; **34 variants have numeric `supplier_value=0` despite `is_available=true`**. `value` / `min` are not proven physical on-hand inventory; never promise a quantity. Fresh supplier product-and-property `is_available` plus pricing is fetched before accepting each review-only order. The database marks 78 held-price options unavailable *commercially*, regardless of source availability.
- Reference-price economics only: upstream JSON `sale_price` is NOT verified all-in purchase cost or seller commission. **34** verified products have supplier reference spread under 90 EGP; **139** under 150 EGP before ads/returns/other fees. No guaranteed profit claim and no automated paid-campaign launch.
- [Latest price-aligned live storefront QA](https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38391828388): **passed on attempt 2** after database migration; first attempt failed transiently during the price cutover. Customer experience walkthrough also passed on Oct 13. Neither test certifies actual production fulfillment or each private Drive video.
- Pricing owner dashboard updated with +110 maximum regional shipping explanation, private CSV shipping scenarios, source-stock availability disclaimer, and theoretical reference spread (explicitly not net profit).
- Watch required: if supplier shipping exceeds 110, update the policy, importer, server validators and drafts atomically again. Never silently assume new regions are covered by the previous flat-included price.

## 2026-10-13 Evening operator handover — live merchant safe mode

- **Scope:** ONLY temporary SELECT SHOP `selectshopeg.com` GitHub Pages and Supabase `zznqdwrohrycsjfpvkhc`. No SELECT-SHOP-CLEAN modifications, no advertisements purchased, no supplier orders generated.
- New OIDC daily importer **`mode:finalize`** reconciles a **completed** supplier catalog only after all source pages succeed. It requires recent timestamp, expected row count, a fresh product count within a narrow tolerance, and no severe catalog-size collapse. Former items not in the full current source snapshot are hidden from public listings and their option availability is disabled; historic records are retained for eventual reappearance and audit. Failed/partial runs never perform stale hiding.
- First production verification [GHA run 38451186799, attempt 2](https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38451186799) **succeeded**: sourceRows **468**, freshProducts **468**, staleProductsHidden **1**. Delisted Safqa ID `68a9cd54189d18298d488fbe`, **حلة قلي بصفاية زيت**. Database retains **469 historical** products but public catalog shows **468** currently available.
- Current public SKU price states: **396** source-note verified at retail note + **110 EGP all-in shipping buffer**, **72** review-held with no public numeric price. **0** owner-approved and **0** actual persisted orders. Public videos currently **410 products / 2,675 link records** (the delisted SKU had three links); **58 currently visible products** have no connected video. Do NOT conflate historical media totals of 411/2,678 with current live-catalog media.
- Safqa's numeric `supplier_value` has inconsistent semantics with `is_available`; no physical stock amounts are claimed. Guest order validation continues to GET current supplier product/options and price immediately before review-only order capture. Source shipping rate exceeding **110 EGP** now fails the signed daily sync with an explicit alarm; order endpoints also reject unsupported higher cost regions.
- Importer owner-approval preservation hardened: an already approved quote can be preserved only when its source suggested retail, upstream supplier reference, physical listing availability flag and all option IDs/quotes/availability remain unchanged. If any changes, old approval is revoked and the new price becomes an unapproved draft. This protection is implemented in both GitHub OIDC and admin/manual importers. **Never assume it has been live-tested with real previously approved orders; current approved count is zero.**
- Admin `ops/safka-import/` now distinguishes **historical count** from **currently available count**, and shows an **owner-only marketing shortlist** with user-input ad cost per confirmed order, cancellation/returns loss, extra fees; shows a theoretical upstream-reference spread, source-video link presence and preserved earlier supplier-category tag. Owner may export CSV. This tool does **not** assert real product cost, actual ad profitability, guaranteed video playback or paid ads.
- Competitor spot-check is recorded in `ops/safka-import/EGYPT_MARKET_SPOTCHECK_2026-10-13.md`: examples of steamer 1500W/3bar, Camel 2-cylinder compressor, and UV toothbrush wall holder had visibly cheaper Egyptian listing alternatives. They are **not certified identical SKUs**, thus no automatic price override or paid advertising.
- CI browser QA catalog media assertions were updated from immutable 469-SKU historical counts to percentage checks against the currently available supplier catalog; require additional browser/checkout pass evidence for this new source state. Owner dashboard JavaScript parsing is tested by GitHub Actions. The old original-shoe/WhatsApp flow remains separate.

## Audit outcome and business risk

**Not yet eligible for a zero-unresolved-issue release.** Zero-defect guarantees cannot be made for changing upstream inventory, externally hosted videos, user browsers, or supplier responses. Treat every unverified source value as unavailable for accepting orders.

| Dimension | Independent database/source finding | Current decision |
|---|---|---|
| Distinct supplier products | 464 imported; previous full supplier listing audit read 465 upstream records / 464 unique IDs | Do not claim 490 imported; reconcile the 26-account-view discrepancy |
| Supplier option IDs | 507 stored | Distinguish option availability from physical warehouse stock |
| Reference retail-price rule | **393/464** note-retail values uniquely verifiable; quote = retailer note recommended price + 90 EGP | These 393 expose indicative (not owner-approved) customer prices |
| Missing/ambiguous reference price | **71/464** (67 manual note review; 4 variant-price conflicts) | Product price NULL; no public price or customer order until reviewed |
| Unsafe option entries | 78 options belonged to these 71 price-unverified products | Set `supplier_available=false` defensively; upstream state may still say available, but checkout must block |
| Confirmed category labels | 152/464 marked with historic source confirmation, 312 unclassified | Cannot claim platform-exact department coverage; do not invent supplier taxonomy |
| Image presence | 464/464 have at least one image URL | URL presence != every image displays on every device |
| Video links | 411 SKUs with 2,678 Drive links; 53 lack links | A link is not evidence it can be embedded/streamed for every customer |
| Shipping | 27 imported regional rows, 26 active; active cost 85–110 EGP | +90 is requested fixed markup; it is NOT actual flat provincial freight cost |
| Customer orders | 0 | No successful real customer fulfillment end-to-end proven |
| Supplier fulfillment | Review-only; never automatic | Do not imply automatic supplier order placement |
| Approval status | 0 owner-approved supplier SKUs | Indicative retail-note quotes pending business certification |

## Safety checks completed

- Pricing refactor uses Safqa `note` / `notes` **"سعر البيع المقترح"**, not raw API `sale_price` as customer suggested retail. Compare a unique parsed note value against source quote, reject invalid/ambiguous values. Examples: steam cleaner 1700+90=1790; toothbrush UV sanitizer 700+90=790; magnetic work light 700+90=790.
- All 393 verifiable SKU prices match note suggested retail +90; unverified SKUs do not expose numeric display prices in the public catalog.
- Database update blocked 78 legacy choice rows under unverified parent products by setting `supplier_available=false`. Client UI, public catalog, and order edge function additionally fail-closed for these SKUs.
- Public catalog product `can_purchase=false` means no automatic supplier checkout; review-only customer order intake is separate.
- Order Edge Functions inspect live product, variant, price, supplier note prior to accepting each order; reject mismatch rather than substituting stale supplier quote.
- Sensitive tables (order headers/lines and private pricing reviews) have RLS enabled, and anonymous users have no direct SELECT/INSERT privileges. This is not a pen-test.
- Live catalog automated Chrome/Android/iPhone QA rerun requested in GitHub Actions; check run completion before claiming pass.

## Open blockers (DO NOT SILENTLY MARK DONE)

1. **71 prices** must be independently resolved (unique supplier suggested-retail note, variant-specific retail suggestion where applicable). No guessed prices.
2. **312 categories** lack verifiable source taxonomy. Public API returns no native category fields in current listing; need an owner-visible platform/category mapping or trusted supplier export to substantiate exact parity.
3. **490 vs 464**: 26 products appearing to user in Safqa UI are not in API account's distinct import set. Need matching account/access state, active filters, and IDs to reconcile; never make up the missing rows.
4. Shipping rates vary: validate whether +90 absorbed difference is acceptable; never display invented courier cost or hide unexpected collection fees.
5. **53 products with no verified video** and 2,678 external Drive links not guaranteed accessible. Test each media URL before ad promotion.
6. Zero owner-approved SKUs and no actual production order completed. Validate approved business pricing, conversion tracking, dispatch and return workflow before paid campaigns.

Audit remains OPEN. The importer is programmed to fail closed on unverified price notes on future synchronizations. This is a safety stop, not a guarantee of perfect data.

The original four shoe SKUs and SELECT-SHOP-CLEAN are outside this import scope.

## Pricing exposure / marketing triage (12 October follow-up)

- A fresh read-only Postgres audit confirms **393/393** verified-note product drafts equal Safka note-retail + 90 EGP, with **0** price mismatches and **0** unsafe non-null final drafts among the 71 held SKUs. All 507 stored option rows were inspected: 0 inconsistent verified options and 0 available options for held-price SKUs.
- The public RPC was independently paginated and returned **464** unique storefront products: **393 indicative prices**, **71 hidden/null prices**, **0 leaked held quotes**, **0 owner-approved items**, **0 supplier-purchase-enabled flags**. Indicative customer pricing is not an owner profitability approval.
- Supplier upstream `sale_price` **is not independently certified as SELECT SHOP's all-in acquisition/commission cost**. Use it only for *theoretical reference-price spread*, not net profit.
- **34/393** note-verified products have a reference spread below EGP 90 (recommended note retail minus upstream sale_price); **138/393** below EGP 150. At supplier shipping EGP 110, one SKU shows a hypothetical EGP -5 balance before ads/returns/fees: automatic metal card wallet, supplier ref EGP 85 / note retail EGP 100 / site quote EGP 190. This is a risk flag, **not** evidence of an actual realized loss.
- Latest verified shipping schedule: **26 active regions, EGP 85–110**, 12 above the EGP 90 price buffer. Never call the EGP 90 add-on actual province shipping or a guaranteed margin.
- Fixed private `ops/safka-import/` owner dashboard: removed misleading ad-readiness classification (previously all 393 price-verified rows); added 34-item low-spread risk metric and priority risk queue; owner-only CSV now carries both 85 and 110 shipping scenarios and risk notes. **No product-price edits, advertising status changes, supplier orders, or SELECT-SHOP-CLEAN modifications** were made in this follow-up.
- To resolve 67 `manual_review` and 4 `variant_review` products, use independently verified recommended retail **from current supplier note per specific product/option** or authorized merchant export. Do not reclassify `sale_price` or variant supplier quotes as consumer retail.
