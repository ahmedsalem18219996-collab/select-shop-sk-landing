-- SELECT SHOP TEMP ONLY — independent, verified media overrides for Safka.
-- Origin: affiliate product 6661c38f6bb2679227b82a14 -> supplier's
-- Google Drive media folder 15Aq-BPK-NlG5UEv7-RkOb6u3YZr4Yve6
-- -> فيديو folder 1RkPa4WB-rFR6Ln7Bhuou7796tDRCK8iM (five MP4 files).
-- Keep this mapping separate from supplier list imports, which return empty videos[].
CREATE TABLE IF NOT EXISTS public.ss_safka_verified_media (
  supplier_product_id text PRIMARY KEY,
  videos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(videos)='array'),
  source_folder_url text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ss_safka_verified_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ss_safka_verified_media FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ss_safka_verified_media TO service_role;
INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
VALUES (
  '6661c38f6bb2679227b82a14',
  '["https://drive.google.com/file/d/1UhPQcdUeUVndqmYF3MHCT30mJUcH1T8Z/preview","https://drive.google.com/file/d/1CdQShOvYai0T2xoR61SLUJ4O3DeXvAct/preview","https://drive.google.com/file/d/1KgTgsjvwIIElR4QOWMTFF6soDlD1i1iX/preview","https://drive.google.com/file/d/1aDjyQEy9i7ELkYwPXUoto1PCbmDOk6Sh/preview","https://drive.google.com/file/d/1RqEfX_iONu1Vdr_ff1w2kYOVZce6ezS8/preview"]'::jsonb,
  'https://drive.google.com/drive/folders/15Aq-BPK-NlG5UEv7-RkOb6u3YZr4Yve6'
)
ON CONFLICT(supplier_product_id) DO UPDATE
 SET videos=excluded.videos,source_folder_url=excluded.source_folder_url,verified_at=now();

-- No user costs, profit, order or private fields added to public API.
DO $do$
DECLARE original text; amended text;
BEGIN
 SELECT pg_get_functiondef('public.ss_safka_public_catalog_v2(integer,integer,text,text)'::regprocedure)
 INTO original;
 IF position('public.ss_safka_verified_media' IN original)>0 THEN RETURN; END IF;
 IF position($needle$'images',x.images,'videos',x.videos,$needle$ IN original)=0 THEN
   RAISE EXCEPTION 'Expected catalog media projection absent, aborting safely';
 END IF;
 amended:=replace(original,
 $needle$'images',x.images,'videos',x.videos,$needle$,
 $change$'images',x.images,'videos',COALESCE(
   (SELECT m.videos FROM public.ss_safka_verified_media m
     WHERE m.supplier_product_id=x.supplier_product_id),x.videos),$change$);
 EXECUTE amended;
END $do$;
-- Exact supplier UI product category validated as 'أدوات منزلية' for the brush.
UPDATE public.ss_safka_import_products SET
 category_key='6555f8a8b740d62654235d00',
 category_name='أدوات منزلية',category_parent_key=NULL,
 source_category_confirmed=TRUE
WHERE supplier_product_id='6661c38f6bb2679227b82a14'
AND category_key='uncategorized' AND source_category_confirmed=FALSE;
