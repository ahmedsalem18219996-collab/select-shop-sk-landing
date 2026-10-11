-- SELECT SHOP temporary storefront: public navigation mirrors the verified Safka catalog taxonomy.
-- Show all eight source categories in their original order, even when awaiting mapping.
-- Unclassified items stay browseable under a separate honest review label; never pretend they match a source category.
CREATE OR REPLACE FUNCTION public.ss_safka_public_categories()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
WITH counts AS (
  SELECT p.category_key, count(*)::integer AS cnt
  FROM public.ss_safka_import_products p
  WHERE p.is_available=TRUE AND p.review_state<>'rejected'
  GROUP BY p.category_key
), entries AS (
 SELECT c.category_key AS key, c.category_name AS name, coalesce(n.cnt,0) AS cnt,
 CASE c.category_key
 WHEN '69e4c524e7a7da4c930e6be4' THEN 1
 WHEN '69610910356433dea14cd65c' THEN 2
 WHEN '669253af10520799a9863cd8' THEN 3
 WHEN '6555f8a8b740d62654235d00' THEN 4
 WHEN '6555ef13b740d62654233cd5' THEN 5
 WHEN '6555eef6b740d62654233cbd' THEN 6
 WHEN '6555eed7b740d62654233c42' THEN 7
 WHEN '6555eec3b740d62654233bd8' THEN 8
 ELSE 90 END AS sort_order
 FROM public.ss_safka_import_categories c
 LEFT JOIN counts n ON n.category_key=c.category_key
 WHERE c.verified_by_source=TRUE
 UNION ALL
 SELECT 'uncategorized'::text,'بانتظار مطابقة القسم'::text, n.cnt, 99
 FROM counts n WHERE n.category_key='uncategorized' AND n.cnt>0
)
SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'name',name,'count',cnt)
 ORDER BY sort_order,name COLLATE "C"),'[]'::jsonb) FROM entries;
$$;
REVOKE ALL ON FUNCTION public.ss_safka_public_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_public_categories() TO anon,authenticated;