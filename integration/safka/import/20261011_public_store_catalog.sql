-- SELECT SHOP TEMP ONLY: visitor-safe catalog projection. No supplier costs,
-- no draft prices, no customer PII, no order writes or SELECT-SHOP-CLEAN.
CREATE OR REPLACE FUNCTION public.ss_safka_public_catalog(
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 24,
  p_category text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  out_rows jsonb := '[]'::jsonb;
  total_count bigint := 0;
  actual_page integer;
  actual_limit integer;
BEGIN
  actual_page:=LEAST(GREATEST(COALESCE(p_page,1),1),10000);
  actual_limit:=LEAST(GREATEST(COALESCE(p_limit,24),1),48);
  IF p_category IS NOT NULL AND length(p_category)>250 THEN
    RAISE EXCEPTION 'invalid_category' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO total_count
    FROM public.ss_safka_import_products p
   WHERE (p_category IS NULL OR p_category='' OR p.category_key=p_category)
     AND p.is_available=true
     AND p.review_state<>'rejected';
  SELECT COALESCE(jsonb_agg(s.item ORDER BY s.ordinal), '[]'::jsonb)
  INTO out_rows
  FROM (
    SELECT jsonb_build_object(
      'id',p.supplier_product_id,
      'barcode',p.barcode,
      'name',p.name,
      'category_key',p.category_key,
      'category_name',p.category_name,
      'images',p.images,
      'videos',p.videos,
      'variants',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',v.value->>'provider_id',
        'name',v.value->>'name',
        'available',(v.value->>'is_available')='true'
      )), '[]'::jsonb)
       FROM jsonb_array_elements(p.variants) v),
      'final_price_egp',CASE WHEN p.review_state='approved' AND p.owner_verified
                            THEN p.final_price_egp ELSE NULL END,
      'can_purchase',false,
      'source','safka'
     ) AS item,
     row_number() OVER(ORDER BY p.name COLLATE "C",p.supplier_product_id) AS ordinal
     FROM public.ss_safka_import_products p
     WHERE (p_category IS NULL OR p_category='' OR p.category_key=p_category)
       AND p.is_available=true AND p.review_state<>'rejected'
     ORDER BY p.name COLLATE "C",p.supplier_product_id
     LIMIT actual_limit OFFSET (actual_page-1)*actual_limit
  ) s;
  RETURN jsonb_build_object('items',out_rows,'total',total_count,
    'page',actual_page,'page_size',actual_limit,
    'drafts_buyable',false,'currency','EGP');
END;
$$;
COMMENT ON FUNCTION public.ss_safka_public_catalog(integer,integer,text) IS
'Public read-only Safqa items of temporary SELECT SHOP; never discloses supplier value/cost; buying disabled until fulfillment handoff completed.';
REVOKE ALL ON FUNCTION public.ss_safka_public_catalog(integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_public_catalog(integer,integer,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.ss_safka_public_categories()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key',key,'name',name,'count',cnt
  ) ORDER BY name COLLATE "C"),'[]'::jsonb)
  FROM (
    SELECT category_key AS key,category_name AS name,count(*)::integer AS cnt
    FROM public.ss_safka_import_products
    WHERE is_available=true AND review_state<>'rejected'
    GROUP BY category_key,category_name
  ) grouped;
$$;
REVOKE ALL ON FUNCTION public.ss_safka_public_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_public_categories() TO anon,authenticated;
