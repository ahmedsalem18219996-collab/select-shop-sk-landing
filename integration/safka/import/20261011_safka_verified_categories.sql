-- SELECT SHOP temporary project select-shop-orders ONLY, ref zznqdwrohrycsjfpvkhc.
-- Exact category labels and IDs observed in signed-in Safka catalog 2026-10-11.
-- 24 specific Cars products were matched by provider Product ID in original Cars filter.
-- Avoid inferring categories for other imported products. No price, order, media or checkout change.
INSERT INTO public.ss_safka_import_categories(category_key,category_name,parent_category_key,verified_by_source,synced_at)
VALUES
  ('69e4c524e7a7da4c930e6be4','سيارات',NULL,TRUE,now()),
  ('69610910356433dea14cd65c','متنوعة',NULL,TRUE,now()),
  ('669253af10520799a9863cd8','الأطفال',NULL,TRUE,now()),
  ('6555f8a8b740d62654235d00','أدوات منزلية',NULL,TRUE,now()),
  ('6555ef13b740d62654233cd5','هدايا واكسسورات',NULL,TRUE,now()),
  ('6555eef6b740d62654233cbd','موضة وتجميل',NULL,TRUE,now()),
  ('6555eed7b740d62654233c42','منتجات طبية ورياضية',NULL,TRUE,now()),
  ('6555eec3b740d62654233bd8','اكسسورات والكرتونيات',NULL,TRUE,now())
ON CONFLICT(category_key) DO UPDATE SET category_name=EXCLUDED.category_name,verified_by_source=TRUE,synced_at=now();
UPDATE public.ss_safka_import_products SET
 category_key='69e4c524e7a7da4c930e6be4',category_name='سيارات',
 category_parent_key=NULL,source_category_confirmed=TRUE
WHERE category_key='uncategorized' AND source_category_confirmed=FALSE
 AND supplier_product_id IN ('6aaa5a0dca38d5013c7eda9f','6a8253cedd189c992344d917','694e747fdbe98faafe7dd717','681e11093a87ea85f4c08793','69a23f092a87779b4a7849b1','693333f7635aba1b6bf60669','68109c9c3a87ea85f46b01e9','67c9f72af55a506a866b5c92','6886882c8d9f44a8a150de3d','675ed32ff471e30205f0f46f','68ab59bf189d18298dad918b','6a675a2da4ea3856510cb38b','692fa223635aba1b6b022b3b','67447b1b1548cec72d31c73e','673741c81548cec72d727f2d','6a71f70b4d956cf608604baa','6954f208ddc488a5049b9df2','6a2aa749f6c8815f8d4b17fb','66567bf50e468fed787e6c04','6a693afd3f6ed554e30893bc','648783fc6c2eea6c3ea97d70','6a953fda820dc94cb0be93d8','6a29f09bf6c8815f8d0500df','67c8709cf55a506a864ec70f');
