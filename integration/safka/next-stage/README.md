# SELECT SHOP temporary — Safqa product-detail and all-in-price preview

**Review branch only. No deployment, no prices published, no database change, no supplier order placed.**
Supabase scope: `select-shop-orders` (`zznqdwrohrycsjfpvkhc`) only.
Never touch `SELECT-SHOP-CLEAN`.

## Confirmed by owner screenshot (2026-10-11)
- Safqa GET products test worked and displayed 5 product rows on page 1. Their displayed amounts are **Safqa recommended sale prices**; they are **not verified acquisition costs**.
- Shipping GET worked and displayed 27 governorates with `_id`, `price`, `is_active`, Arabic `governorateNameAr` and `cities`.
- Several visible shipping costs were 85 and 95 EGP. Do **not** assume every governorate has one of these values from the partial screenshot.
- A technical table, not a public product import, was shown. Never automatically publish items at these prices.

## Next API read
- Public API docs expose `GET /api/v1/public/product/:id`.
- Draft `product-detail-readonly.ts`: admin-only Edge Function with only a fixed supplier GET, `api-safka-key` read server-side, strict 24-hex-character product ID validation, no writes, no order POST. **Not deployed**.
- Parse `properties[]` variants and candidate cost field `value`, but **verify supplier cost semantics** before using it.
- Do not infer barcode/quantity/availability, and do not reintroduce retired CarWash48.

## Pricing and checkout constraints
**Proposed single-region final price:**
`verified_supplier_cost + verified_governorate_shipping + owner_explicit_other_costs + owner_explicit_target_net_profit`.
Round **up**, never down.
For one price nationwide, require `expectedActiveRegions` complete, valid, active unique governorate IDs; choose maximum shipping charge for all those regions.
All examples in tests are synthetic and not recommended product prices.
Check COD fees, returns and product fulfillment conditions separately; never assume them zero before publishing.
No extra surprise fee at checkout. No catalog publication without owner approval.

## Pending to implement after approval
1. Deploy read-only product detail endpoint to `select-shop-orders` (verify_jwt=true); add admin-only lookup UI.
2. Read authentic Safqa responses, verify cost fields and product availability.
3. Build import staging table with product/provider variant IDs and image references, admin preview and explicit approve/reject.
4. Calculate shipping-inclusive sell prices with chosen profit target, confirm coverage for all 27 active governorates.
5. After owner approval, publish products via the temporary storefront canonical catalog only; NEVER write to SELECT-SHOP-CLEAN.
