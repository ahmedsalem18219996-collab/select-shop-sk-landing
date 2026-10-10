-- SELECT SHOP TEMPORARY storefront only.
-- Apply ONLY to Supabase project select-shop-orders (zznqdwrohrycsjfpvkhc).
-- NEVER run in SELECT-SHOP-CLEAN. Additive: does not change live orders or checkout.
--
-- One manual affiliate-platform tracking record per storefront order and platform.
-- The platform does not receive ANY API request when this row is created/updated.
create table if not exists public.ss_affiliate_tracking (
  order_id uuid not null references public.ss_orders(id) on delete cascade,
  platform text not null check (platform in ('prof','safqa')),
  supplier_order_ref text not null default '' check (length(supplier_order_ref) <= 160),
  handoff_status text not null default 'pending' check (
    handoff_status in ('pending','submitted','accepted','shipped','delivered','returned','cancelled')
  ),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (order_id, platform)
);

create or replace function private.ss_affiliate_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists ss_affiliate_tracking_touch on public.ss_affiliate_tracking;
create trigger ss_affiliate_tracking_touch before update on public.ss_affiliate_tracking
for each row execute function private.ss_affiliate_touch_updated_at();

alter table public.ss_affiliate_tracking enable row level security;
drop policy if exists ss_affiliate_admin_read on public.ss_affiliate_tracking;
create policy ss_affiliate_admin_read on public.ss_affiliate_tracking
for select to authenticated
using ((select private.ss_is_order_admin()));

drop policy if exists ss_affiliate_admin_insert on public.ss_affiliate_tracking;
create policy ss_affiliate_admin_insert on public.ss_affiliate_tracking
for insert to authenticated
with check ((select private.ss_is_order_admin()));

drop policy if exists ss_affiliate_admin_update on public.ss_affiliate_tracking;
create policy ss_affiliate_admin_update on public.ss_affiliate_tracking
for update to authenticated
using ((select private.ss_is_order_admin()))
with check ((select private.ss_is_order_admin()));

revoke all on public.ss_affiliate_tracking from public, anon, authenticated;
grant select on public.ss_affiliate_tracking to authenticated;
grant insert (order_id,platform,supplier_order_ref,handoff_status,submitted_at)
on public.ss_affiliate_tracking to authenticated;
grant update (supplier_order_ref,handoff_status,submitted_at)
on public.ss_affiliate_tracking to authenticated;
grant select,insert,update,delete on public.ss_affiliate_tracking to service_role;

comment on table public.ss_affiliate_tracking is
'Temporary SELECT SHOP storefront: internal manual Safqa/Prof entry and tracking; does not submit to suppliers.';
