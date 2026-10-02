-- VieZobo shop schema, RLS policies, seed data and transactional order function.
-- Run this entire file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 2 and 500),
  size text not null check (char_length(size) between 1 and 50),
  price integer not null check (price > 0),
  image_url text not null check (char_length(image_url) between 1 and 1000),
  stock_status boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique check (order_reference ~ '^VZ-[A-Z0-9]{8}$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) between 7 and 30),
  delivery_address text not null check (char_length(delivery_address) between 8 and 300),
  delivery_area text not null check (char_length(delivery_area) between 2 and 100),
  payment_method text not null default 'Bank Transfer' check (payment_method = 'Bank Transfer'),
  notes text check (notes is null or char_length(notes) <= 500),
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  total integer not null check (total = subtotal + delivery_fee),
  status text not null default 'received' check (status in ('received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 50),
  unit_price integer not null check (unit_price > 0),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists orders_user_id_created_at_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Customers can read their own orders" on public.orders;
create policy "Customers can read their own orders"
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Customers can read their own order items" on public.order_items;
create policy "Customers can read their own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = (select auth.uid())
    )
  );

grant select on public.products to anon, authenticated;
grant select on public.orders, public.order_items to authenticated;

insert into public.products (id, name, description, size, price, image_url, stock_status)
values
  (
    'a9a84059-8927-4a66-aafe-58dc49589f01',
    'Classic Zobo',
    'Our signature hibiscus blend with pineapple and ginger.',
    '500ml',
    1800,
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=85',
    true
  ),
  (
    'a9a84059-8927-4a66-aafe-58dc49589f02',
    'Pineapple Zobo',
    'A bright, tropical hibiscus blend with pineapple.',
    '500ml',
    2000,
    'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=900&q=85',
    true
  ),
  (
    'a9a84059-8927-4a66-aafe-58dc49589f03',
    'Ginger Zobo',
    'A warming hibiscus and ginger blend with a lively kick.',
    '500ml',
    1800,
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=85',
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  size = excluded.size,
  price = excluded.price,
  image_url = excluded.image_url,
  stock_status = excluded.stock_status;

-- Keep this value aligned with the business's actual delivery fee.
create or replace function public.get_delivery_fee()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 1500;
$$;

revoke all on function public.get_delivery_fee() from public;
grant execute on function public.get_delivery_fee() to authenticated;

create or replace function public.create_shop_order(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_delivery_address text,
  p_delivery_area text,
  p_payment_method text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_reference text;
  v_subtotal integer := 0;
  v_delivery_fee integer := public.get_delivery_fee();
  v_total integer;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_seen_ids uuid[] := array[]::uuid[];
  v_result_items jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if char_length(trim(p_customer_name)) not between 2 and 100
    or char_length(trim(p_email)) < 3
    or position('@' in p_email) = 0
    or char_length(trim(p_phone)) not between 7 and 30
    or char_length(trim(p_delivery_address)) not between 8 and 300
    or char_length(trim(p_delivery_area)) not between 2 and 100
    or p_payment_method <> 'Bank Transfer'
    or (p_notes is not null and char_length(trim(p_notes)) > 500) then
    raise exception 'Invalid checkout details.';
  end if;

  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 20 then
    raise exception 'The order must contain between 1 and 20 items.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity not between 1 and 50 then
      raise exception 'Invalid item quantity.';
    end if;
    if v_product_id = any(v_seen_ids) then
      raise exception 'Duplicate products are not allowed.';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_product_id);

    select * into v_product
    from public.products
    where id = v_product_id and stock_status = true;

    if not found then
      raise exception 'A selected product is unavailable.';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    v_result_items := v_result_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'name', v_product.name,
        'quantity', v_quantity,
        'unit_price', v_product.price
      )
    );
  end loop;

  v_total := v_subtotal + v_delivery_fee;
  loop
    v_reference := 'VZ-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    exit when not exists (select 1 from public.orders where order_reference = v_reference);
  end loop;

  insert into public.orders (
    order_reference, user_id, customer_name, email, phone,
    delivery_address, delivery_area, payment_method, notes,
    subtotal, delivery_fee, total
  ) values (
    v_reference, v_user_id, trim(p_customer_name), lower(trim(p_email)), trim(p_phone),
    trim(p_delivery_address), trim(p_delivery_area), p_payment_method, nullif(trim(p_notes), ''),
    v_subtotal, v_delivery_fee, v_total
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(v_result_items)
  loop
    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (
      v_order_id,
      (v_item ->> 'product_id')::uuid,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::integer
    );
  end loop;

  return jsonb_build_object(
    'reference', v_reference,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'items', v_result_items
  );
end;
$$;

revoke all on function public.create_shop_order(text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.create_shop_order(text, text, text, text, text, text, text, jsonb) to authenticated;
