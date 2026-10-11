-- SELECT SHOP TEMPORARY ONLY (zznqdwrohrycsjfpvkhc)
-- Portable Safka catalog v1. NO prices, costs, orders, customer details, API keys.
-- Authenticated owner access only. Future SELECT-SHOP-CLEAN imports this contract
-- via a dedicated adapter; never copy its temporary database tables directly.
CREATE OR REPLACE FUNCTION public.ss_safka_portable_export_v1(
    p_offset integer DEFAULT 0,
    p_limit integer DEFAULT 40
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_items jsonb;
 v_categories jsonb;
 v_total integer;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.ss_order_admins WHERE user_id=auth.uid()
 ) THEN RAISE EXCEPTION 'owner_required' USING ERRCODE='42501'; END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_offset>100000
    OR p_limit IS NULL OR p_limit<1 OR p_limit>50
 THEN RAISE EXCEPTION 'bad_export_pagination' USING ERRCODE='22023'; END IF;

 SELECT count(*) INTO v_total FROM public.ss_safka_import_products;

 SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'supplier','safka',
    'external_product_id',x.supplier_product_id,
    'barcode',x.barcode,
    'name',x.name,
    'description_text',LEFT(
       replace(replace(
         regexp_replace(COALESCE(x.description,''),'<[^>]*>',' ','g'),
         '&nbsp;',' '),'&amp;','&'),6000),
    'supplier_category_id',CASE WHEN x.source_category_confirmed THEN x.category_key ELSE NULL END,
    'supplier_category_name',CASE WHEN x.source_category_confirmed THEN x.category_name ELSE NULL END,
    'category_verified',x.source_category_confirmed,
    'supplier_available',x.is_available,
    'images',CASE WHEN jsonb_typeof(x.images)='array' THEN x.images ELSE '[]'::jsonb END,
    'source_videos',COALESCE(x.verified_videos,'[]'::jsonb),
    'media_state',COALESCE(x.media_status,'pending'),
    'source_media_folder',x.source_folder_url,
    'variants',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'external_variant_id',variant.value->>'provider_id',
        'label',variant.value->>'name',
        'supplier_available',LOWER(COALESCE(variant.value->>'is_available','false')) IN ('true','1')
      ) ORDER BY variant.ordinality)
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(x.variants)='array' THEN x.variants ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS variant(value,ordinality)
    ),'[]'::jsonb),
    'purchase_enabled',FALSE
 ) ORDER BY x.supplier_product_id),'[]'::jsonb) INTO v_items
 FROM (
   SELECT p.*,m.videos AS verified_videos,i.status AS media_status,
      i.source_folder_url
   FROM public.ss_safka_import_products p
   LEFT JOIN public.ss_safka_verified_media m USING(supplier_product_id)
   LEFT JOIN public.ss_safka_media_inventory i USING(supplier_product_id)
   ORDER BY p.supplier_product_id
   LIMIT p_limit OFFSET p_offset
 ) x;

 SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'supplier_category_id',c.category_key,
    'name',c.category_name,
    'parent_supplier_category_id',c.parent_category_key,
    'verified',c.verified_by_source
 ) ORDER BY c.category_name COLLATE "C"),'[]'::jsonb)
 INTO v_categories
 FROM public.ss_safka_import_categories c
 WHERE c.verified_by_source=TRUE;

 RETURN jsonb_build_object(
    'format','select-shop.supplier-catalog',
    'schema_version',1,
    'source','safka',
    'total',v_total,'offset',p_offset,'limit',p_limit,
    'categories',v_categories,'items',v_items
 );
END;
$$;
REVOKE ALL ON FUNCTION public.ss_safka_portable_export_v1(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ss_safka_portable_export_v1(integer,integer) TO authenticated;