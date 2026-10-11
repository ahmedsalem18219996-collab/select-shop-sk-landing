-- TEMP SELECT SHOP only. Remember supplier child-folder names to scan فيديو first while
-- still eventually visiting every الصور and mixed-media folder for completeness.
ALTER TABLE public.ss_safka_media_scan_folders ADD COLUMN IF NOT EXISTS folder_title text NOT NULL DEFAULT '';