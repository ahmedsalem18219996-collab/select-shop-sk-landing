-- Temporary SELECT SHOP only: TirePro verified via Safka supplier detail media link
-- https://drive.google.com/drive/folders/1-E-5apFcORvcFWIrb3A24-YcQD4_8Jxv
-- and subfolder فيديو https://drive.google.com/drive/folders/1R1c8y4l0ZxoFeNd-LNKoHLR0i5cga64Z
-- Exact Product ID 6a71f70b4d956cf608604baa. Retain independently of future Safka imports.
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES('6a71f70b4d956cf608604baa','["https://drive.google.com/file/d/1-B9rxqGwIvyTUkB6i24lVaPXWPNCiDUR/preview","https://drive.google.com/file/d/1JcoAFaxf2ZbnOa8DNkSR28JdRYpe-NWB/preview","https://drive.google.com/file/d/1PDyy0sJANLtTwmFwnlNQdJvPvaC7pmC4/preview","https://drive.google.com/file/d/1__r711tfjtgDMfNEKo83E96dvI4AS7Up/preview","https://drive.google.com/file/d/1EHkGA0T6G2HC0AxjYgXVIV7xZgc7m7-3/preview"]'::jsonb,'https://drive.google.com/drive/folders/1-E-5apFcORvcFWIrb3A24-YcQD4_8Jxv')
ON CONFLICT(supplier_product_id) DO UPDATE SET videos=excluded.videos,source_folder_url=excluded.source_folder_url,verified_at=now();