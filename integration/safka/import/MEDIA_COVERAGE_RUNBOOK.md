# Safka media coverage — SELECT SHOP temporary storefront

**Scope:** temporary site `selectshopeg.com` / Supabase `select-shop-orders` (`zznqdwrohrycsjfpvkhc`). **Never run in `SELECT-SHOP-CLEAN`.**

## End goal

Each supplier Product ID has an explicit record. `video_found` means *a source supplier MP4 or supported clip was matched to this exact ID*. `no_video` means the supplier's matched folder (and its relevant video/natural-media subfolders) was checked and contained no clip. Neither `pending`, `folder_verified` nor `needs_review` implies a video exists.

For products without original videos, a separate **AI creative production** queue can be created after source rights/claims review. Generated clips must not be represented as actual footage of the supplier item.

## Source-of-truth objects

- `ss_safka_import_products`: all 462 supplier products and original Product IDs.
- `ss_safka_verified_media`: independently verified original video URLs keyed by Product ID, protected against subsequent product-list upserts.
- `ss_safka_media_inventory`: durable statuses, source folder, clip count and last verification.
- `ss_safka_media_coverage_summary()`: RLS-gated owner metrics.
- `ss_safka_media_work_queue(limit,offset)`: owner-only pending queue.
- `ss_safka_media_ingest_batch(entries)`: owner-only, validates and saves up to 25 verified entries per transaction. This does **not** browse the supplier itself.
- `safka-media-discover`: owner-only API probe. If Safka public product details don't expose a known verified Drive folder, it stops without writing anything. Do not claim full supplier API support without passing the probe.

## Repeatable batch workflow

1. Choose 8–25 `pending` product IDs from the work queue. Do not repeat already verified entries.
2. Open **exact** `https://aff.safka-eg.com/products/available_products/<Product ID>` in the signed-in supplier browser.
3. Copy the product's actual `رابط الوسائط` Google Drive folder link; validate product name/ID first. If absent, mark for manual review, **not** `no_video`.
4. Read exact folder contents via connected Google Drive. Check direct files and child folders named `فيديو` / `صور وفيديو ع الطبيعه` for `video/mp4`, `video/webm` and `video/quicktime`. Check whether folders are paginated/truncated. Avoid marking `no_video` if a folder cannot be fully inspected or access is denied.
5. Use canonical Drive links: `https://drive.google.com/drive/folders/<folder-id>` and `https://drive.google.com/file/d/<file-id>/preview`. No guesswork from filenames or product names.
6. Build a UTF-8 JSON file with this shape:

```json
{
  "entries": [
    {
      "id": "6661c38f6bb2679227b82a14",
      "folder": "https://drive.google.com/drive/folders/15Aq-BPK-NlG5UEv7-RkOb6u3YZr4Yve6",
      "status": "video_found",
      "videos": [
        "https://drive.google.com/file/d/1UhPQcdUeUVndqmYF3MHCT30mJUcH1T8Z/preview"
      ]
    }
  ]
}
```

7. Save through the authenticated owner page `/ops/safka-import/` → **استيراد بيانات الفيديوهات المؤكدة** (automatically chunks 25), or submit exact privileged migrations with an audit trail. Do **not** use arbitrary public URL ingestion.
8. Verify DB inventory count equals supplier product count, checked status and video totals match verified media, and public catalog RPC displays only the same product's original clips. Test iPhone iframe playback separately; a verified Drive ID does not prove Safari can play it.
9. If supplier rate-limits, Drive returns permission denied, or external browser becomes unauthenticated: pause, retain checkpoint, retry later. Do not flood sites or silently relabel failures as `no_video`.

## Cost and safety

Use source MP4s first; they do not require paid video generation. A universal video requirement cannot be met with supplier sources alone: some folders are confirmed image-only. Production of short non-misleading AI animations from supplied photos is a **separate later phase** with explicit model, rights and cost decisions.

Never modify storefront prices, shipping, carts, real orders, customer records, supplier order APIs, or `SELECT-SHOP-CLEAN`.
