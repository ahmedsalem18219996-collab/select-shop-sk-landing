# Safqa media playback and pricing QA — SELECT SHOP temporary site

**Scope:** `https://selectshopeg.com`, repo `select-shop-sk-landing`, temporary Supabase `zznqdwrohrycsjfpvkhc`. **Never touch SELECT-SHOP-CLEAN.**

## What was verified (2026-10-12)
- Products: 462/462 store drafts obey Safqa platform suggested **selling** price + **90 EGP** average shipping; options: 505/505 separate supplier option quote + 90; 0 unapproved Safqa checkouts allowed.
- Product images: 462/462 have source images and the live public catalog returns them.
- Video links: 2,678 verified-form Google Drive `/file/d/{id}/preview` links covering 411 products. 51 products have **no video found in the source**, not a broken HTML player. 25 URLs are shared between related complementary products, e.g. nail gun and spare nails.
- 2,678 links checked for canonical Drive file URL structure and product association in public catalog. Format/ownership metadata **does not verify anonymous playback**.
- Examples of supplier files are MP4 and accessible for metadata through the connected Google Drive, but current account has `current_user_can_share: false`; public view permission cannot be guaranteed or changed by the store code.
- The old automatic iframe caused blocked cookies, blank embeds, or Drive permission errors, notably in in-app browsers. Cards now display one-click `مشاهدة الفيديو` opening `https://drive.google.com/file/d/{id}/view` with `target=_blank rel=noopener noreferrer`. Modal has prominent `شاهد فيديو المنتج`; gallery thumbnail offers **direct Drive watch first**, optional embed on click. No loading dozens of iframes in the page.
- Automated read-only live-browser GitHub Actions test passed Chrome desktop 1440px + Chrome mobile 390px for the steam cleaner page, expected 1290 EGP, safe Drive viewer link, video gallery and disabled supplier checkout, zero horizontal overflow, no JS exceptions.
- Full-catalog QA passed 462 products, 505 options, 411 with video, 51 without, 2678 links, no missing images. Run: https://github.com/ahmedsalem18219996-collab/select-shop-sk-landing/actions/runs/38192655581
- GitHub Actions is installed under `.github/workflows/select-shop-qa.yml`, tests under `ci/safka-storefront-qa.mjs`. Added iPhone Safari WebKit test for future QA runs.

## What is NOT fixed solely by a website change
- Google Drive files restricted by the SUPPLIER owner; file share permissions and Google playback quotas can't be bypassed by JavaScript.
- Zero proprietary licensed video files are hosted by SELECT SHOP; video CDN streaming and transcoding are **not** deployed. A genuinely reliable all-user embedded playback requires provider authorization and a video-storage/CDN service with budget and upload/encoding workflow.
- Any of the 51 products without source video cannot be truthfully shown as having one. Existing related-product duplicate videos must not be blindly reassigned.
- Automatic Safqa order submission is not enabled. No live supplier orders or test customer orders were placed.
- Full 2,678-video file-by-file anonymous playback testing is not completed or claimed. The QA verifies catalog linking and UI, not Google's actual playback under every device/network/privacy profile.

## Future imports
`safka-stage-import` v6 recalculates any unapproved product quote as `supplier.sale_price + 90`, and upserts `ss_safka_variant_price_drafts` and `ss_safka_price_review_v2` for new and refreshed products. Already owner-approved records are preserved. Source snapshots: `ops/safka-import/edge-functions/safka-stage-import/`.

## Safe production follow-up
Source supplier-authorized video files; store transcoded videos in a dedicated public video host and use direct MP4/HLS player links, retaining Drive as a fallback, after budget/rights review. Avoid bulk hosting media in the GitHub Pages repo. Preview/public prices aren't checkout authorizations.
