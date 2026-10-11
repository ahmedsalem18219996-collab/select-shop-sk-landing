# Safka catalog → future SELECT-SHOP-CLEAN

**Status:** TEMP exporter implemented and tested. **No CLEAN import has been run.**

## Use this when CLEAN is ready

1. On the TEMP website only, sign in as owner at `https://selectshopeg.com/ops/safka-import/`.
2. Click **تنزيل نسخة كتالوج صفقة للنقل (JSON)**. This fetches all pages at that moment, checks 24-character unique supplier Product IDs and totals, and downloads `select-shop-safka-portable-v1-*.json`.
3. Keep the JSON privately. Do not commit a data snapshot to a public repository and do not upload it to an unrelated host. It contains supplier-linked product/source media data (no orders/PII/keys/prices).
4. Optional **read-only dry run** after downloading: `node integration/safka/portable-v1/validate-and-plan.mjs select-shop-safka-portable-v1-*.json`. It writes `safka-import-plan-v1.json` locally and does NOT connect to any database.
5. **Only after inspecting CLEAN's latest canonical schema and permissions**, develop and test a CLEAN-side importer mapping this versioned contract to its own products/categories/variants/media tables. Treat all imported products as unpublished drafts until price, availability, shipping, warranty, order dispatch and owner review are complete. Test on a disposable schema/branch first. Do NOT restore TEMP SQL dumps into CLEAN.
6. Before CLEAN launch, export a **fresh** snapshot so later supplier videos and verified categories are included. Import idempotently on compound key `(supplier='safka', external_product_id)`. Never match solely by mutable name, SKU label, old TEMP surrogate key or image URL.
7. Verify counts, samples, categories and media URL access from mobile Safari/Chrome. Drive `/preview` is an embedded preview link, not a durable downloadable or self-hosted MP4. Rehosting/transcoding, permission and redistribution rights may require separate handling.

## Version 1 payload

```json
{
  "format": "select-shop.supplier-catalog",
  "schema_version": 1,
  "exported_at": "ISO-8601",
  "origin": {
    "source": "safka",
    "environment": "select-shop-temporary",
    "website": "https://selectshopeg.com"
  },
  "requires_import_review": true,
  "excludes": ["prices","supplier_costs","orders","customers","credentials","checkout"],
  "categories": [
    {"supplier_category_id": "24hex", "name": "...",
     "parent_supplier_category_id": null, "verified": true}
  ],
  "products": [
    {"supplier": "safka", "external_product_id": "24hex",
     "barcode": "...", "name": "...", "description_text": "...",
     "supplier_category_id": null, "supplier_category_name": null,
     "category_verified": false, "supplier_available": true,
     "images": ["https://..."], "source_videos": ["https://drive.google.com/file/d/.../preview"],
     "media_state": "pending", "source_media_folder": "https://drive.google.com/drive/folders/...",
     "variants": [{"external_variant_id": "24hex", "label": "...",
                   "supplier_available": true}],
     "purchase_enabled": false}
  ],
  "summary": {"product_count": 462, "verified_category_products": 152,
              "supplier_video_products": 94, "supplier_video_urls": 553,
              "products_requiring_category_review": 310}
}
```

The numeric example is a **point-in-time illustration** only. New downloads reflect current database counts. Unknown categories remain `null` rather than guessed. `source_videos` includes only supplier-video file links confirmed by our product-ID → supplier Drive folder → file-ID mapping. `media_state` distinguishes pending/no-video/reviewed.

## UI portability

These TEMP sources implement the user-approved direction, but **must be ported as isolated components, not pasted as a whole page or imported global CSS**:

| TEMP source | CLEAN component to create later | Dependencies to replace |
|---|---|---|
| `v2-live/safka-imported-store.js` | SupplierProductCard / SupplierMediaGallery | TEMP RPC, global selectors, cached document state |
| `v2-live/safka-imported-store.css` | Scoped product/card/gallery design tokens | TEMP hard-coded selectors and class cascade |
| `v2-live/safka-mobile-gallery-fix-v7.css` | Responsive 390px mobile layout | Existing TEMP main toolbar selectors |
| `storefront-v2-live.js` | Category browsing state | TEMP shoe hard-coded data & old cart bindings |
| `v2-live/brand-interactions.js` | Header category navigation | TEMP DOM event model |

Components should consume CLEAN's **canonical public catalog**, not a second supplier-specific shadow catalog. Supplier IDs/media provenance belong in CLEAN's integrations layer; storefront cards and product-detail routes use canonical product IDs, with stable per-product advertising URLs and analytics.

### Safety & data-layer boundaries

- **Never copy:** TEMP Supabase project IDs or anon/publishable keys into CLEAN, admin accounts/RLS, order tables, shipping tables, staging credentials, customer data, supplier API credentials, provider-auth sessions, TEMP migration history or TEMP checkout.
- **Do copy through the versioned export:** supplier Product IDs, variant IDs, taxonomy (verified only), source description as untrusted text, images, verified media URLs and their source/provenance/status.
- **Not in v1:** actual media file bytes, cost/base/final prices, margin, order automation, customer PII, affiliate account authorization, product landing page slugs, analytics events, stock guarantees. These need dedicated adapters and QA in CLEAN.
- **No blind overwrites:** do not reset CLEAN-owner-reviewed descriptions/categories/prices, generated slugs, or published status when a later supplier sync runs. Treat source availability as observational, not proof of inventory. Use explicit ownership/provenance fields and conflict rules.
- **Private files:** Store generated exports outside the public GitHub Pages web root. Serve this export function only to authenticated owner accounts.

## Verification performed for TEMP exporter

Executed an owner-scoped SQL dry-run against `public.ss_safka_portable_export_v1`: **462 rows**, **462 unique Product IDs**, **8 source categories**, **152 source-confirmed product-category assignments**, **94 products with 553 supplier-video links**, **zero price-field leaks**, and all `purchase_enabled=false`. An anonymous role has no EXECUTE grant; database function itself checks owner role. This validates the TEMP export, *not* CLEAN import compatibility or iPhone video playback.

## Continue scanning

Existing hourly video scan automation updates the TEMP private verified media tables. Download a new portable file after each significant scan milestone; no need to retype or copy-paste clips or category IDs. See `integration/safka/import/MEDIA_COVERAGE_RUNBOOK.md` for the source-verified scanning procedure.
