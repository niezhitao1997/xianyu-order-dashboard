alter table public.orders
  add column if not exists cost numeric default 0,
  add column if not exists shipping_cost numeric default 0,
  add column if not exists other_cost numeric default 0;

update public.orders
set
  cost = coalesce(cost, 0),
  shipping_cost = coalesce(shipping_cost, 0),
  other_cost = coalesce(other_cost, 0);

create index if not exists orders_cost_idx
  on public.orders (cost);

