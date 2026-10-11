-- SELECT SHOP TEMP ONLY: resumable supplier Drive folder/video scan queue.
-- All entries originate from exact Safka productID->source Drive-folder mappings.
CREATE TABLE IF NOT EXISTS public.ss_safka_media_scan_folders(
 supplier_product_id text NOT NULL REFERENCES public.ss_safka_import_products(supplier_product_id) ON DELETE CASCADE,
 folder_id text NOT NULL,
 depth integer NOT NULL CHECK(depth BETWEEN 0 AND 6),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','scanned','needs_review')),
 checked_at timestamptz,
 note text NOT NULL DEFAULT '',
 PRIMARY KEY(supplier_product_id,folder_id),
 CONSTRAINT safe_folder_id CHECK(folder_id ~ '^[A-Za-z0-9_-]{15,}$')
);
CREATE TABLE IF NOT EXISTS public.ss_safka_media_scan_files(
 supplier_product_id text NOT NULL REFERENCES public.ss_safka_import_products(supplier_product_id) ON DELETE CASCADE,
 file_id text NOT NULL CHECK(file_id ~ '^[A-Za-z0-9_-]{15,}$'),
 PRIMARY KEY(supplier_product_id,file_id)
);
ALTER TABLE public.ss_safka_media_scan_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_safka_media_scan_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_safka_media_scan_folders,public.ss_safka_media_scan_files FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ss_safka_media_scan_folders,public.ss_safka_media_scan_files TO service_role;
INSERT INTO public.ss_safka_media_scan_folders(supplier_product_id,folder_id,depth)
SELECT supplier_product_id,substring(source_folder_url from '^https://drive[.]google[.]com/drive/folders/([A-Za-z0-9_-]{15,})$'),0
FROM public.ss_safka_media_inventory
WHERE status='folder_verified'
AND source_folder_url ~ '^https://drive[.]google[.]com/drive/folders/[A-Za-z0-9_-]{15,}$'
ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS ss_safka_media_scan_folders_pending
 ON public.ss_safka_media_scan_folders(status,depth,supplier_product_id) WHERE status='pending';
