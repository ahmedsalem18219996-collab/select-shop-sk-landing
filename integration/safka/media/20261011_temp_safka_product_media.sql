-- SELECT SHOP TEMPORARY WEBSITE ONLY: select-shop-orders / zznqdwrohrycsjfpvkhc
-- NEVER execute in SELECT-SHOP-CLEAN. No public product publication or order writes.
CREATE TABLE public.ss_safka_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id text NOT NULL CHECK (supplier_product_id ~ '^[0-9a-fA-F]{24}$'),
  asset_type text NOT NULL CHECK (asset_type IN ('image','video')),
  source_type text NOT NULL CHECK (source_type IN ('direct','youtube','drive','upload')),
  media_url text NOT NULL CHECK (length(media_url) BETWEEN 10 AND 2000 AND media_url ~ '^https://'),
  label text NOT NULL DEFAULT '' CHECK (length(label) <= 100),
  storage_path text CHECK (storage_path IS NULL OR length(storage_path) < 240),
  sort_order integer NOT NULL DEFAULT 50 CHECK (sort_order BETWEEN 0 AND 1000),
  approved_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ss_safka_asset_url_uniq UNIQUE(supplier_product_id,media_url),
  CONSTRAINT ss_safka_storage_source CHECK (
    (source_type = 'upload' AND storage_path IS NOT NULL)
    OR (source_type <> 'upload' AND storage_path IS NULL)
  )
);
COMMENT ON TABLE public.ss_safka_media_assets IS 'Only temporary SELECT SHOP Safqa product preview. Owner-uploaded videos/images with explicit public approval. Never auto-publish or dispatch orders.';
CREATE INDEX ss_safka_media_by_product ON public.ss_safka_media_assets(supplier_product_id,sort_order,created_at);
ALTER TABLE public.ss_safka_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_safka_media_assets FROM anon,public;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ss_safka_media_assets TO authenticated;
CREATE POLICY ss_safka_media_owner_read ON public.ss_safka_media_assets
  FOR SELECT TO authenticated USING ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_safka_media_owner_add ON public.ss_safka_media_assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_safka_media_owner_change ON public.ss_safka_media_assets
  FOR UPDATE TO authenticated USING ((SELECT private.ss_is_order_admin()))
  WITH CHECK ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_safka_media_owner_remove ON public.ss_safka_media_assets
  FOR DELETE TO authenticated USING ((SELECT private.ss_is_order_admin()));
-- Public bucket contains PROMOTIONAL media only, never customer files/identity info.
-- Public files are accessible by unguessable URLs even before storefront publication.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('select-shop-safka-media','select-shop-safka-media',true,26214400,
 ARRAY['video/mp4','video/webm','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY ss_safka_media_storage_owner_add ON storage.objects
 FOR INSERT TO authenticated WITH CHECK (
  bucket_id='select-shop-safka-media'
  AND (select private.ss_is_order_admin())
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{24}$'
 );
CREATE POLICY ss_safka_media_storage_owner_remove ON storage.objects
 FOR DELETE TO authenticated USING (
  bucket_id='select-shop-safka-media'
  AND (select private.ss_is_order_admin())
 );
CREATE POLICY ss_safka_media_storage_owner_select ON storage.objects
 FOR SELECT TO authenticated USING (
  bucket_id='select-shop-safka-media'
  AND (select private.ss_is_order_admin())
 );
