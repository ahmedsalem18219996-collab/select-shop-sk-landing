-- SELECT SHOP TEMP ONLY: repair restricted service-role grants on Safqa private staging.
-- Supabase project: select-shop-orders (zznqdwrohrycsjfpvkhc).
-- Root cause: tables created without service_role grants; PostgREST upserts fail.
-- Do not run against SELECT-SHOP-CLEAN or SELECT-SHOP-CLEAN-DEV.
-- Only the server-side Safqa importer has service-role credentials.
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.ss_safka_import_products,
  public.ss_safka_import_categories,
  public.ss_safka_import_shipping
TO service_role;
GRANT INSERT ON TABLE public.ss_safka_sync_log TO service_role;
GRANT USAGE ON SEQUENCE public.ss_safka_sync_log_id_seq TO service_role;

-- Deliberately do not grant anon or authenticated INSERT/UPDATE on these tables.
-- Owner's SELECT stays governed by existing admin-only RLS policies.
