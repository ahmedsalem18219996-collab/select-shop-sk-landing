# SELECT SHOP temporary storefront — source-of-truth audit 2026-10-12

Scope: `selectshopeg.com` temporary storefront and Supabase `zznqdwrohrycsjfpvkhc` ONLY. **Never modify SELECT-SHOP-CLEAN.**

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
