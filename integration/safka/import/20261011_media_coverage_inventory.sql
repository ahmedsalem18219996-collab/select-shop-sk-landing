-- SELECT SHOP TEMP ONLY (Supabase project zznqdwrohrycsjfpvkhc)
-- Safka catalog media coverage, durable & independent of provider product upserts.
-- No changes to prices, orders, CLEAN, or public product permissions.
CREATE TABLE IF NOT EXISTS public.ss_safka_media_inventory (
 supplier_product_id text PRIMARY KEY REFERENCES public.ss_safka_import_products(supplier_product_id) ON DELETE CASCADE,
 source_folder_url text,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','folder_verified','video_found','no_video','needs_review','access_denied')),
 video_count integer NOT NULL DEFAULT 0 CHECK (video_count>=0 AND video_count<=100),
 checked_at timestamptz,
 notes text NOT NULL DEFAULT ''
);
ALTER TABLE public.ss_safka_media_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ss_safka_media_inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ss_safka_media_inventory TO service_role;
INSERT INTO public.ss_safka_media_inventory(supplier_product_id)
SELECT supplier_product_id FROM public.ss_safka_import_products
ON CONFLICT(supplier_product_id) DO NOTHING;
-- Include new catalog imports without touching existing inventory statuses.
CREATE OR REPLACE FUNCTION public.ss_safka_media_inventory_new_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 INSERT INTO public.ss_safka_media_inventory(supplier_product_id) VALUES (NEW.supplier_product_id)
 ON CONFLICT(supplier_product_id) DO NOTHING;
 RETURN NEW;
END; $f$;
DROP TRIGGER IF EXISTS ss_safka_media_inventory_new_product_trg ON public.ss_safka_import_products;
CREATE TRIGGER ss_safka_media_inventory_new_product_trg
AFTER INSERT ON public.ss_safka_import_products
FOR EACH ROW EXECUTE FUNCTION public.ss_safka_media_inventory_new_product();
UPDATE public.ss_safka_media_inventory i
SET source_folder_url=m.source_folder_url,status='video_found',
 video_count=jsonb_array_length(m.videos),checked_at=m.verified_at,notes='Verified source MP4 IDs'
FROM public.ss_safka_verified_media m
WHERE i.supplier_product_id=m.supplier_product_id AND jsonb_array_length(m.videos)>0;
-- Only one inspected supplier folder is known to have images and no videos.
UPDATE public.ss_safka_media_inventory SET
 source_folder_url='https://drive.google.com/drive/folders/1tbqwsINr5KILH_QPZXxj24w2mT5Qpdob',
 status='no_video',checked_at=now(),notes='Supplier folder inspected: image assets only'
WHERE supplier_product_id='678e47bd85e034a4c2cbcc6c' AND status='pending';

CREATE OR REPLACE FUNCTION public.ss_safka_media_coverage_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.ss_order_admins WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'owner_required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'total',count(*),
 'video_products',count(*) FILTER(WHERE i.status='video_found'),
 'video_clips',COALESCE(sum(i.video_count),0),
 'pending',count(*) FILTER(WHERE i.status='pending'),
 'no_video',count(*) FILTER(WHERE i.status='no_video'),
 'folder_verified',count(*) FILTER(WHERE i.status='folder_verified'),
 'needs_review',count(*) FILTER(WHERE i.status='needs_review'),
 'access_denied',count(*) FILTER(WHERE i.status='access_denied'),
 'unchecked',count(*) FILTER(WHERE i.checked_at IS NULL),
 'last_checked_at',max(i.checked_at)
 ) INTO result FROM public.ss_safka_import_products p
 LEFT JOIN public.ss_safka_media_inventory i USING(supplier_product_id);
 RETURN result;
END; $f$;
REVOKE ALL ON FUNCTION public.ss_safka_media_coverage_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_media_coverage_summary() TO authenticated;
CREATE OR REPLACE FUNCTION public.ss_safka_media_work_queue(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
DECLARE rows jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.ss_order_admins WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'owner_required' USING ERRCODE='42501'; END IF;
 IF p_limit<1 OR p_limit>50 OR p_offset<0 OR p_offset>10000 THEN
 RAISE EXCEPTION 'bad_pagination' USING ERRCODE='22023'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'id',r.supplier_product_id,'name',r.name,'category',r.category_name,
   'status',r.status,'folder',r.source_folder_url,'checked_at',r.checked_at
 ) ORDER BY r.supplier_product_id),'[]'::jsonb)
 INTO rows FROM (
 SELECT p.supplier_product_id,p.name,p.category_name,i.status,i.source_folder_url,i.checked_at
 FROM public.ss_safka_import_products p
 JOIN public.ss_safka_media_inventory i USING(supplier_product_id)
 WHERE i.status IN ('pending','folder_verified','needs_review','access_denied')
 ORDER BY p.supplier_product_id
 LIMIT p_limit OFFSET p_offset
 ) r;
 RETURN rows;
END; $f$;
REVOKE ALL ON FUNCTION public.ss_safka_media_work_queue(integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_media_work_queue(integer,integer) TO authenticated;
