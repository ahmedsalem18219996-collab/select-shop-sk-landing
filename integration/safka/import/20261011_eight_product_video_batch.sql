-- SELECT SHOP TEMP only. Eight source-folder checks, 7 with real MP4, 1 image-only.
-- Exact supplier detail link and Drive child mime_types verified 2026-10-11.
-- Independent of repeated Safka catalog product import.
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('648783fc6c2eea6c3ea97b32','["https://drive.google.com/file/d/1O4X4VncfeuklY5hDWP2n3tbLeyaPKHKx/preview","https://drive.google.com/file/d/1O0LP551h2dcS2J4mDTKrfd3WWnV0AEPs/preview","https://drive.google.com/file/d/1Ov_u0yEr-SxH1AXV6x9K44P5P5CrZuGM/preview","https://drive.google.com/file/d/1fCri4jR95NsUVZmf3PCvDGdtTouk-aS-/preview","https://drive.google.com/file/d/113Hqo4AH1avt_GjxIFzJGNl8Zn8BpKsq/preview"]'::jsonb,'https://drive.google.com/drive/folders/1ChtZDnvuiqt01Pzuenf4y-E8g9oQyXu0')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('648783fc6c2eea6c3ea97bed','["https://drive.google.com/file/d/1wixfH6tLZYh8wRjsFBRWvEWZDtmCKn3Q/preview","https://drive.google.com/file/d/1ucqZuGfQfo_G_PpvvQZnRF4izIVXEJbi/preview","https://drive.google.com/file/d/1_6UUrGh9a42fu4ifODGjkkfRnlt6D6x9/preview","https://drive.google.com/file/d/1hKfC9hTutJ7gwebVc3jxuqGqFuosLoZa/preview","https://drive.google.com/file/d/1Y6yJsZ3FmqoPzZxI9a4sBeMnG0b-DPnA/preview"]'::jsonb,'https://drive.google.com/drive/folders/1jLFvx1ExLXlVZNLKT1E9L7uSNgD-ll5G')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('648783fc6c2eea6c3ea97bf0','["https://drive.google.com/file/d/1Ly6mPww06ajnLSuOaREC2AJgTJ_wdst6/preview","https://drive.google.com/file/d/1vyGcP55BsPOkq9Sn6jqvJ-FS-_FNJpX5/preview","https://drive.google.com/file/d/1MDNkowDtmmMdXaHo91_RAmFgH4m1RrxN/preview","https://drive.google.com/file/d/1ZapclTvMsuLtrqPNFcNuflkEXG0-81RB/preview","https://drive.google.com/file/d/1ADgdyovoPKWDMsn7QsTBrrAcO6gMKK01/preview","https://drive.google.com/file/d/1M2RiyfOx7KKJ4f_nuBIgH4t6z-SaT3VC/preview","https://drive.google.com/file/d/1-UIhFIkZCD06DPLIu64aUMLQ67shkF9t/preview","https://drive.google.com/file/d/1KTqNqgKvp1750JyHKKji5lr6h5qkZJV6/preview","https://drive.google.com/file/d/1VHff25B5JZLr0jiyOlQw7_X5G7LLKMEe/preview","https://drive.google.com/file/d/16JVx-yf3hxJRTFtEcrrtfrJ9GzO3OfJV/preview","https://drive.google.com/file/d/1PdDkFdMaJwb7prP34kuw3y_OoK-Wh0Al/preview","https://drive.google.com/file/d/1m9eTV4Y2TrxbPP75boSQ0-WFArZKs1ib/preview"]'::jsonb,'https://drive.google.com/drive/folders/1DgNPVFefm_Do4RhLWZv06iHb-4uskwX9')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('648783fc6c2eea6c3ea97bf3','["https://drive.google.com/file/d/1jtya3wHa-cVZo4hhsEEuUsHaDU_EM8jP/preview","https://drive.google.com/file/d/1js5uyGVtrchfuTDINsLPrqy7sIJpERjI/preview"]'::jsonb,'https://drive.google.com/drive/folders/1jQtQZn-pVfoOG6MS1yBNiXJMIyhh1oZu')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('648783fc6c2eea6c3ea97cab','["https://drive.google.com/file/d/1qsZyfWqSH-tyxtXISG3Z-_uoqsvGJns1/preview","https://drive.google.com/file/d/1iYspFGZLsokN5TrYhhdnC9wb924ToW-5/preview"]'::jsonb,'https://drive.google.com/drive/folders/1iGbxBXmZN7RmLlS5VoLWLTd8vU5HRde1')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('648783fc6c2eea6c3ea97d70','["https://drive.google.com/file/d/19NtpeIavLy8P5u7Gy8DN12BUc9soSJV3/preview"]'::jsonb,'https://drive.google.com/drive/folders/12T8kUVv4Cbm5whjhVFeATGku8unEgKAX')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('6626f1ec0e468fed78c7015d','["https://drive.google.com/file/d/1c_3JcqP2RNH2RUkfvdhEu9GgqF1D7ZSV/preview","https://drive.google.com/file/d/1LnYyveT-aEjZAnwofuwOF4OCjugh_lPQ/preview","https://drive.google.com/file/d/14N-4kNsfNjBUqsAcPlSkEMPXjxbU52WU/preview","https://drive.google.com/file/d/1EBwu7pwjmLVpI-0576W6lMcnyqrb6AN1/preview","https://drive.google.com/file/d/1YzMnqQD2QXWqySGwpT3zDQV5eg-Elisp/preview","https://drive.google.com/file/d/1ZfZR_SLB-LOSSMmA9dzonahDqPtWpDVs/preview"]'::jsonb,'https://drive.google.com/drive/folders/15-MMuhCR0dvDZUOHAJ1AxMV4g3Ad8Npo')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=EXCLUDED.videos,
source_folder_url=EXCLUDED.source_folder_url,verified_at=now();
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1ChtZDnvuiqt01Pzuenf4y-E8g9oQyXu0',
 status='video_found',video_count=5,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='648783fc6c2eea6c3ea97b32';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1jLFvx1ExLXlVZNLKT1E9L7uSNgD-ll5G',
 status='video_found',video_count=5,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='648783fc6c2eea6c3ea97bed';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1DgNPVFefm_Do4RhLWZv06iHb-4uskwX9',
 status='video_found',video_count=12,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='648783fc6c2eea6c3ea97bf0';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1jQtQZn-pVfoOG6MS1yBNiXJMIyhh1oZu',
 status='video_found',video_count=2,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='648783fc6c2eea6c3ea97bf3';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1iGbxBXmZN7RmLlS5VoLWLTd8vU5HRde1',
 status='video_found',video_count=2,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='648783fc6c2eea6c3ea97cab';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/12T8kUVv4Cbm5whjhVFeATGku8unEgKAX',
 status='video_found',video_count=1,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='648783fc6c2eea6c3ea97d70';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/15-MMuhCR0dvDZUOHAJ1AxMV4g3Ad8Npo',
 status='video_found',video_count=6,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='6626f1ec0e468fed78c7015d';
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1QwmB9vVi7UppW__kJgB6__iaRyZQhsKe',
 status='no_video',video_count=0,checked_at=now(),
 notes='Source affiliate page and supplier Drive folder checked'
WHERE supplier_product_id='65c374bc0e468fed78cf8381';