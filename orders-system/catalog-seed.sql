-- Product snapshots copied from the current unified preview catalog.
-- Apply ONLY in the new separate select-shop-orders Supabase project.
-- Before going live, reconcile product prices and stock availability with the store owner.
-- Fulfillment group IDs are private server-only references; not shown to shoppers.
insert into public.ss_order_catalog
 (product_id,title,category,price_egp,fulfillment_group,additional_item_shipping_saving,available_variants,allows_size_try_on,active)
values
 ('sk','SK Sneakers','shoes',680,'prof',80,'{"sk1":[37,38,39,40,41],"sk2":[37,38,39,40,41]}'::jsonb,true,true),
 ('alex','ALEX Premium','shoes',540,'prof',80,'{"alex01":[37,38,39,40,41,42,43,44,45,46],"alex02":[37,38,39,40,41,42,43,44,45,46],"alex03":[37,38,39,40,41,42,43,44,45,46],"alex04":[42,43,44,45,46],"alex05":[37,38,39,40,41,42,43,44,45,46]}'::jsonb,true,true),
 ('eqwal','EQWAL Street','shoes',580,'prof',80,'{"eqwal03":[37,38,39,40,41],"eqwal04":[41,42,43,44,45],"eqwal05":[41,42,43,44,45],"eqwal07":[41,42,43,44,45]}'::jsonb,true,true),
 ('wk','WK Retro','shoes',630,'prof',80,'{"wk1":[37,38,39,40,41],"wk2":[37,38,39,40,41],"wk3":[37,38,39,40,41],"wk4":[37,38,39,40,41],"wk5":[37,38,39,40,41],"wk6":[37,38,39,40,41],"wk7":[37,38,39,40,41],"wk8":[37,38,39,40,41]}'::jsonb,true,true),
 ('carwash48','مسدس غسيل سيارات لاسلكي ببطاريتين','car-care',999,'safqa',85,'{"cw48":[0]}'::jsonb,false,true)
on conflict (product_id) do update
 set title=excluded.title, category=excluded.category,price_egp=excluded.price_egp,
     fulfillment_group=excluded.fulfillment_group,
     additional_item_shipping_saving=excluded.additional_item_shipping_saving,
     available_variants=excluded.available_variants,
     allows_size_try_on=excluded.allows_size_try_on,active=excluded.active,
     updated_at=now();
