alter table public.orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_select_authenticated'
  ) then
    create policy orders_select_authenticated
      on public.orders
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_insert_authenticated'
  ) then
    create policy orders_insert_authenticated
      on public.orders
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_update_authenticated'
  ) then
    create policy orders_update_authenticated
      on public.orders
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_delete_authenticated'
  ) then
    create policy orders_delete_authenticated
      on public.orders
      for delete
      to authenticated
      using (true);
  end if;
end $$;

