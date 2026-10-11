-- SELECT SHOP TEMPORARY STORE ONLY / Supabase select-shop-orders
-- Stage every Safqa SKU, categories and shipping without touching public checkout.
-- Imported prices are suggested Safqa prices, NEVER our all-in checkout prices.
CREATE TABLE IF NOT EXISTS public.ss_safka_import_products (
  supplier_product_id text PRIMARY KEY CHECK (supplier_product_id ~ '^[0-9a-fA-F]{24}$'),
  barcode text NOT NULL DEFAULT '' CHECK (length(barcode)<=150),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 350),
  category_key text NOT NULL DEFAULT 'uncategorized' CHECK (length(category_key)<=250),
  category_name text NOT NULL DEFAULT 'غير مصنف من صفقة' CHECK (length(category_name)<=250),
  category_parent_key text CHECK (category_parent_key IS NULL OR length(category_parent_key)<=250),
  description text NOT NULL DEFAULT '' CHECK (length(description)<=12000),
  suggested_sale_price_egp numeric(12,2) CHECK (suggested_sale_price_egp IS NULL OR suggested_sale_price_egp>=0),
  variants jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(variants)='array'),
  images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images)='array'),
  videos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(videos)='array'),
  source_category_confirmed boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  review_state text NOT NULL DEFAULT 'imported' CHECK (review_state IN ('imported','approved','rejected')),
  final_price_egp integer CHECK (final_price_egp IS NULL OR final_price_egp>0),
  owner_verified boolean NOT NULL DEFAULT false,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safka_approved_price_guard CHECK (
    review_state <> 'approved' OR (owner_verified AND final_price_egp IS NOT NULL)
  )
);
COMMENT ON TABLE public.ss_safka_import_products IS
'Imported Safqa catalog for temporary SELECT SHOP only. Admin-only staging; supplier suggested prices not public sale prices.';
CREATE INDEX IF NOT EXISTS ss_safka_import_category_idx ON public.ss_safka_import_products(category_key);
CREATE INDEX IF NOT EXISTS ss_safka_import_review_idx ON public.ss_safka_import_products(review_state,synced_at DESC);
CREATE TABLE IF NOT EXISTS public.ss_safka_import_categories (
  category_key text PRIMARY KEY CHECK (length(category_key) BETWEEN 1 AND 250),
  category_name text NOT NULL CHECK (length(category_name) BETWEEN 1 AND 250),
  parent_category_key text CHECK (parent_category_key IS NULL OR length(parent_category_key)<=250),
  verified_by_source boolean NOT NULL DEFAULT false,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ss_safka_import_shipping (
  governorate_id text PRIMARY KEY CHECK (length(governorate_id) BETWEEN 1 AND 120),
  name_ar text NOT NULL CHECK (length(name_ar) BETWEEN 1 AND 150),
  shipping_egp numeric(10,2) NOT NULL CHECK (shipping_egp>=0),
  is_active boolean NOT NULL DEFAULT true,
  cities jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cities)='array'),
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ss_safka_sync_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_type text NOT NULL CHECK (run_type IN ('products','shipping')),
  page_num integer,
  received_count integer NOT NULL DEFAULT 0,
  saved_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('ok','empty','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ss_safka_import_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_safka_import_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_safka_import_shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_safka_sync_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_safka_import_products,public.ss_safka_import_categories,
 public.ss_safka_import_shipping,public.ss_safka_sync_log FROM anon,public,authenticated;
GRANT SELECT ON public.ss_safka_import_products,public.ss_safka_import_categories,
 public.ss_safka_import_shipping,public.ss_safka_sync_log TO authenticated;
CREATE POLICY ss_safka_import_products_admin_read ON public.ss_safka_import_products
 FOR SELECT TO authenticated USING ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_safka_import_categories_admin_read ON public.ss_safka_import_categories
 FOR SELECT TO authenticated USING ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_safka_import_shipping_admin_read ON public.ss_safka_import_shipping
 FOR SELECT TO authenticated USING ((SELECT private.ss_is_order_admin()));
CREATE POLICY ss_safka_sync_log_admin_read ON public.ss_safka_sync_log
 FOR SELECT TO authenticated USING ((SELECT private.ss_is_order_admin()));
-- Only server-side service_role imports/stages. Public storefront not connected.
