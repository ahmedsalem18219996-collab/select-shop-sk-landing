-- SELECT SHOP Orders, separate temporary storefront backend.
-- Run ONLY in a newly created independent Supabase project named select-shop-orders.
-- Never run in SELECT-SHOP-CLEAN. Not automatically applied by GitHub Pages.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ss_order_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.ss_is_order_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.ss_order_admins where user_id = (select auth.uid())); $$;
revoke all on function public.ss_is_order_admin() from public;
grant execute on function public.ss_is_order_admin() to authenticated;

create table if not exists public.ss_order_catalog (
  product_id text primary key,
  title text not null,
  category text not null check(category in ('shoes','car-care','general')),
  price_egp integer not null check(price_egp between 1 and 1000000),
  fulfillment_group text not null,
  additional_item_shipping_saving integer not null default 0 check(additional_item_shipping_saving between 0 and 500),
  available_variants jsonb not null check(jsonb_typeof(available_variants) = 'object'),
  allows_size_try_on boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
comment on column public.ss_order_catalog.fulfillment_group is 'PRIVATE routing and discount grouping. Do not expose in customer-facing API payloads.';

create table if not exists public.ss_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  idempotency_key uuid not null unique,
  customer_name text not null check(length(customer_name) between 2 and 120),
  phone text not null check(phone ~ '^01[0125][0-9]{8}$'),
  governorate text not null,
  area text not null,
  address text not null,
  notes text not null default '',
  inquiry text not null default '',
  items jsonb not null check(jsonb_typeof(items) = 'array'),
  subtotal_egp integer not null check(subtotal_egp >= 0),
  discount_egp integer not null check(discount_egp >= 0),
  total_egp integer not null check(total_egp >= 0),
  shipping_review_required boolean not null default false,
  status text not null default 'new'
    check (status in ('new','review','confirmed','packing','shipped','delivered','cancelled','shipping_quote')),
  source text not null default 'selectshopeg.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ss_orders_created_idx on public.ss_orders(created_at desc);
create index if not exists ss_orders_status_idx on public.ss_orders(status, created_at desc);

create table if not exists public.ss_order_status_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.ss_orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  actor_user_id uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create or replace function public.ss_record_order_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.ss_order_status_events(order_id,old_status,new_status,actor_user_id)
    values(new.id,old.status,new.status,auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists ss_orders_status_change on public.ss_orders;
create trigger ss_orders_status_change before update on public.ss_orders
for each row execute function public.ss_record_order_change();

create table if not exists public.ss_order_rate_windows (
  fingerprint text not null,
  window_hour timestamptz not null,
  requests integer not null default 1,
  primary key(fingerprint,window_hour)
);
-- Atomic hourly rate limiting. Hash is generated with a server-only HMAC secret.
create or replace function public.ss_order_rate_allowed(p_fingerprint text, p_hour timestamptz)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare current_requests integer;
begin
  insert into public.ss_order_rate_windows (fingerprint, window_hour, requests)
  values(p_fingerprint, date_trunc('hour',p_hour),1)
  on conflict (fingerprint,window_hour) do update
    set requests = public.ss_order_rate_windows.requests + 1
    where public.ss_order_rate_windows.requests < 5
  returning requests into current_requests;
  return current_requests is not null;
end;
$$;
revoke all on function public.ss_order_rate_allowed(text,timestamptz) from public, anon, authenticated;
grant execute on function public.ss_order_rate_allowed(text,timestamptz) to service_role;

alter table public.ss_order_admins enable row level security;
alter table public.ss_order_catalog enable row level security;
alter table public.ss_orders enable row level security;
alter table public.ss_order_status_events enable row level security;
alter table public.ss_order_rate_windows enable row level security;

drop policy if exists ss_admins_self on public.ss_order_admins;
create policy ss_admins_self on public.ss_order_admins for select to authenticated
using (user_id=(select auth.uid()));

drop policy if exists ss_catalog_admin_read on public.ss_order_catalog;
create policy ss_catalog_admin_read on public.ss_order_catalog for select to authenticated
using ((select public.ss_is_order_admin()));

drop policy if exists ss_orders_admin_read on public.ss_orders;
create policy ss_orders_admin_read on public.ss_orders for select to authenticated
using ((select public.ss_is_order_admin()));

drop policy if exists ss_orders_admin_update on public.ss_orders;
create policy ss_orders_admin_update on public.ss_orders for update to authenticated
using ((select public.ss_is_order_admin()))
with check ((select public.ss_is_order_admin()));

drop policy if exists ss_events_admin_read on public.ss_order_status_events;
create policy ss_events_admin_read on public.ss_order_status_events for select to authenticated
using ((select public.ss_is_order_admin()));

-- Even with RLS, grant only required columns to signed-in admins.
revoke all on public.ss_order_admins,public.ss_order_catalog,public.ss_orders,public.ss_order_status_events,public.ss_order_rate_windows from anon,authenticated;
grant select on public.ss_order_admins,public.ss_order_catalog,public.ss_orders,public.ss_order_status_events to authenticated;
grant update(status) on public.ss_orders to authenticated;
-- service_role bypasses RLS for protected Edge Function operations.
grant select,insert,update,delete on public.ss_order_admins,public.ss_order_catalog,public.ss_orders,public.ss_order_status_events,public.ss_order_rate_windows to service_role;
grant usage,select on sequence public.ss_order_status_events_id_seq to service_role;

-- Realtime for authenticated admins: RLS filters out unauthorised listeners.
do $$
begin
 if not exists (
   select 1 from pg_publication_tables
   where pubname='supabase_realtime' and schemaname='public' and tablename='ss_orders'
 ) then
   alter publication supabase_realtime add table public.ss_orders;
 end if;
end; $$;

-- Cleanup can be run from a scheduled job periodically, not from the public client:
-- delete from public.ss_order_rate_windows where window_hour < now() - interval '48 hours';
