-- SELECT SHOP TEMPORARY ONLY: note-retail provenance for Safka supplier import.
-- Required before applying the live ss_safka_public_catalog_v2 function.
-- DO NOT apply to SELECT-SHOP-CLEAN; it has an independent architecture.
-- "suggested_sale_price_egp" historically stores Safka JSON sale_price;
-- retail_note_suggested_egp stores the literal free-text "سعر البيع المقترح".
alter table public.ss_safka_import_products
  add column if not exists retail_note_suggested_egp numeric,
  add column if not exists retail_price_verification text not null default 'unverified',
  add column if not exists retail_note_checked_at timestamptz,
  add column if not exists source_category_latest_present boolean not null default false;
do $body$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.ss_safka_import_products'::regclass and conname='ss_safka_retail_note_price_valid') then
    alter table public.ss_safka_import_products add constraint ss_safka_retail_note_price_valid
       check (retail_note_suggested_egp is null or
             (retail_note_suggested_egp>0 and retail_note_suggested_egp<=1000000));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.ss_safka_import_products'::regclass and conname='ss_safka_retail_status_valid') then
    alter table public.ss_safka_import_products add constraint ss_safka_retail_status_valid
       check (retail_price_verification in('unverified','verified_note','manual_review','variant_review'));
  end if;
end;$body$;
create index if not exists ss_safka_retail_status_idx on public.ss_safka_import_products(retail_price_verification);
comment on column public.ss_safka_import_products.suggested_sale_price_egp is
  'Historical name; Safka JSON sale_price only, NOT the documented note suggested retail.';
comment on column public.ss_safka_import_products.retail_note_suggested_egp is
  'Recommended retail selling price explicitly parsed from one Safka note, not inferred from sale_price.';
