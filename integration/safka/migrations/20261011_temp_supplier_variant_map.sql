-- Applied to Supabase project "select-shop-orders" ONLY (2026-10-11).
-- NEVER run in SELECT-SHOP-CLEAN-DEV.
-- Supplier mappings are EMPTY by design. No provider request is enabled.
CREATE TABLE IF NOT EXISTS public.ss_supplier_catalog_map (
  platform text NOT NULL CHECK (platform IN ('safqa','prof')),
  product_id text NOT NULL REFERENCES public.ss_order_catalog(product_id) ON DELETE RESTRICT,
  variant_id text NOT NULL CHECK (variant_id ~ '^[a-zA-Z0-9_-]{1,70}$'),
  supplier_product_id text NOT NULL CHECK (length(supplier_product_id) BETWEEN 1 AND 150),
  supplier_variant_id text CHECK (supplier_variant_id IS NULL OR length(supplier_variant_id) BETWEEN 1 AND 150),
  supplier_barcode text CHECK (supplier_barcode IS NULL OR length(supplier_barcode) BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform,product_id,variant_id)
);
COMMENT ON TABLE public.ss_supplier_catalog_map IS 'Temporary SELECT SHOP only: supplier SKU mapping; never dispatch without review and API authorization';
ALTER TABLE public.ss_supplier_catalog_map ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_supplier_catalog_map FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.ss_supplier_catalog_map TO authenticated;
-- Policies below assume private.ss_is_order_admin() already exists.
-- Not re-applied automatically after the initial Supabase migration.
CREATE POLICY ss_supplier_map_admin_read ON public.ss_supplier_catalog_map FOR SELECT TO authenticated USING ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_supplier_map_admin_insert ON public.ss_supplier_catalog_map FOR INSERT TO authenticated WITH CHECK ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_supplier_map_admin_update ON public.ss_supplier_catalog_map FOR UPDATE TO authenticated USING ((SELECT private.ss_is_order_admin())) WITH CHECK ((SELECT private.ss_is_order_admin()));
CREATE INDEX IF NOT EXISTS ss_supplier_map_active ON public.ss_supplier_catalog_map(platform,active) WHERE active=true;
