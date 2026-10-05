-- Run AFTER setup.sql. Non-destructive: adds the shared cart without resetting products.
create table if not exists public.carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb check(jsonb_typeof(items) = 'array'),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.cart_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id, operation_id)
);
alter table public.carts enable row level security;
alter table public.cart_operations enable row level security;
drop policy if exists "Read own cart" on public.carts;
create policy "Read own cart" on public.carts for select to authenticated
using (user_id = (select auth.uid()));
grant select on public.carts to authenticated;
revoke insert, update, delete on public.carts from anon, authenticated;
revoke all on public.cart_operations from anon, authenticated;

create or replace function public.mutate_cart(
  p_operation_id uuid,
  p_action text,
  p_product_id uuid default null,
  p_quantity integer default 0,
  p_items jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_items jsonb;
  v_item jsonb;
  v_id uuid;
  v_quantity integer;
  v_existing integer;
begin
  if v_user is null or p_operation_id is null then raise exception 'Sign in required'; end if;
  if p_action is null or p_action not in ('add', 'set', 'remove', 'clear', 'merge') then raise exception 'Invalid action'; end if;
  insert into public.carts(user_id) values(v_user) on conflict do nothing;
  select items into v_items from public.carts where user_id = v_user for update;
  if exists(select 1 from public.cart_operations where user_id=v_user and operation_id=p_operation_id) then
    return v_items;
  end if;
  if p_action = 'clear' then v_items := '[]'::jsonb;
  elsif p_action = 'merge' then
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)>20 then raise exception 'Invalid items'; end if;
    for v_item in select value from jsonb_array_elements(p_items) loop
      v_id := (v_item->>'productId')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
      if v_id is null or v_quantity is null or v_quantity not between 1 and 50 then raise exception 'Invalid item'; end if;
      if not exists(select 1 from public.products where id=v_id and stock_status) then continue; end if;
      select coalesce(sum((value->>'quantity')::integer),0) into v_existing from jsonb_array_elements(v_items) where value->>'productId'=v_id::text;
      select coalesce(jsonb_agg(value),'[]') into v_items from jsonb_array_elements(v_items) where value->>'productId'<>v_id::text;
      v_items := v_items || jsonb_build_array(jsonb_build_object('productId',v_id,'quantity',least(50,v_quantity+v_existing)));
    end loop;
  else
    if p_product_id is null then raise exception 'Product required'; end if;
    select coalesce(sum((value->>'quantity')::integer),0) into v_existing from jsonb_array_elements(v_items) where value->>'productId'=p_product_id::text;
    if p_action='add' then
      if p_quantity is null or p_quantity not between 1 and 50 then raise exception 'Invalid quantity'; end if;
      v_quantity := least(50,v_existing+p_quantity);
    elsif p_action='set' then
      if p_quantity is null or p_quantity not between 0 and 50 then raise exception 'Invalid quantity'; end if;
      v_quantity := p_quantity;
    else v_quantity := 0;
    end if;
    if v_quantity>0 and not exists(select 1 from public.products where id=p_product_id and stock_status) then raise exception 'Product unavailable'; end if;
    select coalesce(jsonb_agg(value),'[]') into v_items from jsonb_array_elements(v_items) where value->>'productId'<>p_product_id::text;
    if v_quantity>0 then v_items := v_items || jsonb_build_array(jsonb_build_object('productId',p_product_id,'quantity',v_quantity)); end if;
  end if;
  if jsonb_array_length(v_items)>20 then raise exception 'Cart limit exceeded'; end if;
  update public.carts set items=v_items, revision=revision+1, updated_at=now() where user_id=v_user;
  insert into public.cart_operations(user_id,operation_id) values(v_user,p_operation_id);
  return v_items;
end $$;
revoke all on function public.mutate_cart(uuid,text,uuid,integer,jsonb) from public;
grant execute on function public.mutate_cart(uuid,text,uuid,integer,jsonb) to authenticated;
-- Keep the cart row when empty: UPDATE events support user filtering reliably.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='carts') then
    alter publication supabase_realtime add table public.carts;
  end if;
end $$;
