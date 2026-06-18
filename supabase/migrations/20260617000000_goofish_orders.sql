alter table public.orders
  add column if not exists xianyu_order_no text,
  add column if not exists xianyu_status integer,
  add column if not exists refund_status integer,
  add column if not exists buyer_nick text,
  add column if not exists seller_name text,
  add column if not exists product_id text,
  add column if not exists item_id text,
  add column if not exists raw_data jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_xianyu_order_no_key'
      and conrelid = 'public.orders'::regclass
  ) then
    execute 'drop index if exists public.orders_xianyu_order_no_key';
    alter table public.orders
      add constraint orders_xianyu_order_no_key unique (xianyu_order_no);
  end if;
end $$;

create index if not exists orders_xianyu_status_idx
  on public.orders (xianyu_status);

create index if not exists orders_refund_status_idx
  on public.orders (refund_status);
