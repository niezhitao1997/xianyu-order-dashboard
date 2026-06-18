alter table public.orders
  add column if not exists category text default 'uncategorized';

update public.orders
set category = 'uncategorized'
where category is null or category = '';

create index if not exists orders_category_idx
  on public.orders (category);

