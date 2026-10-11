-- SELECT SHOP temporary website ONLY (zznqdwrohrycsjfpvkhc).
-- Enables common search and original-category filters for Safka cards placed in
-- the same storefront collection as existing items. Read only; no order changes.
CREATE OR REPLACE FUNCTION public.ss_safka_public_catalog_v2(
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 24,
  p_category text DEFAULT NULL,
  p_search text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_page integer := LEAST(GREATEST(COALESCE(p_page,1),1),10000);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit,24),1),48);
  v_search text := LEFT(TRIM(COALESCE(p_search,'')),80);
  v_total integer := 0;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF p_category IS NOT NULL AND length(p_category)>250 THEN
    RAISE EXCEPTION 'invalid_category' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_total
  FROM public.ss_safka_import_products p
  WHERE p.is_available=true AND p.review_state<>'rejected'
    AND (p_category IS NULL OR p_category='' OR p.category_key=p_category)
    AND (v_search='' OR position(lower(v_search) IN lower(p.name))>0
      OR position(lower(v_search) IN lower(p.barcode))>0
      OR position(lower(v_search) IN lower(p.supplier_product_id))>0);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',x.supplier_product_id,'barcode',x.barcode,'name',x.name,
    'category_key',x.category_key,'category_name',x.category_name,
    'images',x.images,'videos',x.videos,
    'variants',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
       'id',v.value->>'provider_id','name',v.value->>'name',
       'available',(v.value->>'is_available')='true'
    )),'[]'::jsonb) FROM jsonb_array_elements(x.variants) v),
    'final_price_egp', CASE WHEN x.review_state='approved' AND x.owner_verified
       THEN x.final_price_egp ELSE NULL END,
    'can_purchase',false,'source','safka'
  ) ORDER BY x.name COLLATE "C",x.supplier_product_id),'[]'::jsonb) INTO v_rows
  FROM (SELECT p.* FROM public.ss_safka_import_products p
    WHERE p.is_available=true AND p.review_state<>'rejected'
      AND (p_category IS NULL OR p_category='' OR p.category_key=p_category)
      AND (v_search='' OR position(lower(v_search) IN lower(p.name))>0
        OR position(lower(v_search) IN lower(p.barcode))>0
        OR position(lower(v_search) IN lower(p.supplier_product_id))>0)
    ORDER BY p.name COLLATE "C",p.supplier_product_id
    LIMIT v_limit OFFSET (v_page-1)*v_limit) x;
  RETURN jsonb_build_object('items',v_rows,'total',v_total,
    'page',v_page,'page_size',v_limit,'currency','EGP',
    'drafts_buyable',false);
END; $$;
REVOKE ALL ON FUNCTION public.ss_safka_public_catalog_v2(integer,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_public_catalog_v2(integer,integer,text,text) TO anon,authenticated;
