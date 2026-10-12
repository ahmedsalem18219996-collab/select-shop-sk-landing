-- REVIEW DRAFT ONLY. Do not run until the webhook payload + auth model are approved.
-- Target: Supabase select-shop-orders ONLY. NEVER SELECT-SHOP-CLEAN.
-- No supplier API key, no customer PII, no full webhook body stored.
create table if not exists public.ss_safka_webhook_events (
  event_hash text primary key check (event_hash ~ '^[0-9a-f]{64}$'),
  supplier_order_ref text not null
    check (supplier_order_ref ~ '^[A-Za-z0-9_-]{1,160}$'),
  event_type text not null default 'order.status.updated'
    check (event_type='order.status.updated'),
  supplier_status text not null
    check (supplier_status in (
      'pending','preparing','printing','shipped','available','collected',
      'skip','holding','returned1','returned2','declined1','declined2')),
  occurred_at timestamptz,
  linked_order_id uuid references public.ss_orders(id) on delete set null,
  resolution text not null check (resolution in ('linked','unmatched','ignored')),
  received_at timestamptz not null default now()
);
comment on table public.ss_safka_webhook_events is
  'SELECT SHOP temporary Safqa webhook inbox; status history pending manual reconciliation, no customer PII.';
create index if not exists ss_safka_hook_supplier_lookup
  on public.ss_safka_webhook_events(supplier_order_ref,received_at desc);
create index if not exists ss_safka_hook_unmatched_lookup
  on public.ss_safka_webhook_events(received_at desc) where resolution='unmatched';

alter table public.ss_safka_webhook_events enable row level security;
revoke all on public.ss_safka_webhook_events from public,anon,authenticated;
grant select on public.ss_safka_webhook_events to authenticated;
create policy ss_safka_webhook_admin_read
  on public.ss_safka_webhook_events for select to authenticated
  using ((select private.ss_is_order_admin()));

-- Service-role code is the ONLY writer. No public/authenticated insert/update policies.
-- It only queues safe state snapshots; it does NOT update ss_orders.status automatically.
