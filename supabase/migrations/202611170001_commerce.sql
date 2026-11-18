-- Apply after the 20261104 migrations. No sample accounts or products are added.
begin;

alter table public."Product" add column if not exists "inventoryVersion" integer not null default 0;

create or replace function public.commerce_inventory_version()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new."countInStock" is distinct from old."countInStock" then
    new."inventoryVersion" := old."inventoryVersion" + 1;
  else
    new."inventoryVersion" := old."inventoryVersion";
  end if;
  return new;
end;
$$;
drop trigger if exists commerce_inventory_version on public."Product";
create trigger commerce_inventory_version before update on public."Product"
for each row execute function public.commerce_inventory_version();

-- NOT VALID preserves legacy rows while enforcing limits for every new write.
alter table public."Review" drop constraint if exists commerce_review_rating;
alter table public."Review" add constraint commerce_review_rating
  check (rating between 1 and 5 and rating = trunc(rating)) not valid;
alter table public."Review" drop constraint if exists commerce_review_comment;
alter table public."Review" add constraint commerce_review_comment
  check (length(trim(comment)) between 3 and 500) not valid;

create or replace function public.commerce_create_review(
  p_actor_id text, p_product_id text, p_order_id text, p_rating numeric, p_comment text
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  saved public."Review"%rowtype;
  actor_name text;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 or p_rating <> trunc(p_rating)
    or coalesce(length(trim(p_comment)), 0) not between 3 and 500
  then raise exception 'REVIEW_INPUT'; end if;
  select name into actor_name from public."User" where id = p_actor_id;
  if not found then raise exception 'REVIEW_FORBIDDEN'; end if;

  -- Serialize reviewers of the same product before inserting or reading ratings.
  -- This shares the product lock with checkout and stock administration.
  perform id from public."Product" where id = p_product_id for update;
  if not found then raise exception 'REVIEW_FORBIDDEN'; end if;
  if not exists (
    select 1 from public."OrderItem" oi join public."Order" o on o.id = oi."orderId"
    where oi."orderId" = p_order_id and oi."productId" = p_product_id
      and o."userId" = p_actor_id and o."isDelivered" and not o."isCancelled"
  ) then raise exception 'REVIEW_FORBIDDEN'; end if;
  if exists (select 1 from public."Review" where "userId" = p_actor_id and "productId" = p_product_id)
  then raise exception 'REVIEW_DUPLICATE'; end if;

  insert into public."Review" (id, "userId", "productId", "orderId", name, rating, comment, "createdAt")
    values (gen_random_uuid()::text, p_actor_id, p_product_id, p_order_id, actor_name, p_rating, trim(p_comment), now()) returning * into saved;
  update public."Product" p set rating = r.average, "numReviews" = r.total
    from (select coalesce(round(avg(rating)::numeric, 1), 0) as average, count(*)::integer as total
      from public."Review" where "productId" = p_product_id) r
    where p.id = p_product_id;
  return to_jsonb(saved);
end;
$$;

-- Replace sample/imported summary counts with statistics from actual reviews.
update public."Product" p set rating = coalesce(r.average, 0), "numReviews" = coalesce(r.total, 0)
from (select p0.id, round(avg(r0.rating)::numeric, 1) as average, count(r0.id)::integer as total
  from public."Product" p0 left join public."Review" r0 on r0."productId" = p0.id group by p0.id) r
where p.id = r.id;

create or replace function public.commerce_admin_stats(p_actor_id text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  result jsonb;
  day_start timestamp := (date_trunc('day', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi') at time zone 'UTC';
  month_start timestamp := (date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi') at time zone 'UTC';
begin
  if not exists (select 1 from public."User" where id = p_actor_id and "isAdmin") then raise exception 'ORDER_FORBIDDEN'; end if;
  with paid as (
    select * from public."Order" where "isPaid" and not "isCancelled" and status <> 'cancelled'
  ), paid_items as (
    select oi.*, p.category, p.image as "currentImage" from public."OrderItem" oi
      join paid o on o.id = oi."orderId" join public."Product" p on p.id = oi."productId"
  ), top_products as (
    select "productId" as id, max(name) as name, max("currentImage") as image,
      sum(price * qty) as revenue, sum(qty) as sold
    from paid_items group by "productId" order by revenue desc, "productId" limit 5
  )
  select jsonb_build_object(
    'totalRevenue', (select coalesce(sum("totalPrice"), 0) from paid),
    'monthRevenue', (select coalesce(sum("totalPrice"), 0) from paid where "createdAt" >= month_start),
    'todayRevenue', (select coalesce(sum("totalPrice"), 0) from paid where "createdAt" >= day_start),
    'totalOrders', (select count(*) from public."Order"),
    'todayOrders', (select count(*) from public."Order" where "createdAt" >= day_start),
    'pendingOrders', (select count(*) from public."Order" where not "isDelivered" and not "isCancelled" and status <> 'cancelled'),
    'totalProducts', (select count(*) from public."Product"),
    'statusCounts', (select coalesce(jsonb_object_agg(status_key, total), '{}'::jsonb)
      from (select case when "isCancelled" then 'cancelled' else status end as status_key, count(*) as total from public."Order" group by 1) counts),
    'monthlyRevenue', (select coalesce(jsonb_object_agg(month_key, revenue), '{}'::jsonb)
      from (select to_char("createdAt" at time zone 'UTC' at time zone 'Asia/Karachi', 'YYYY-MM') as month_key,
        sum("totalPrice") as revenue from paid group by 1) months),
    'topProducts', (select coalesce(jsonb_agg(to_jsonb(t) order by revenue desc, id), '[]'::jsonb) from top_products t),
    'categoryRevenue', (select coalesce(jsonb_object_agg(category, revenue), '{}'::jsonb)
      from (select category, sum(price * qty) as revenue from paid_items group by category) categories)
  ) into result;
  return result;
end;
$$;

create or replace function public.commerce_admin_orders(
  p_actor_id text, p_page integer default 1, p_page_size integer default 25,
  p_status text default 'all', p_search text default ''
)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if not exists (select 1 from public."User" where id = p_actor_id and "isAdmin") then raise exception 'ORDER_FORBIDDEN'; end if;
  if p_page is null or p_page < 1 or p_page > 1000000 or p_page_size is null or p_page_size not between 1 and 100
    or p_status is null or p_status not in ('all', 'placed', 'confirmed', 'picked_up', 'on_the_way', 'delivered', 'cancelled')
    or p_search is null or length(p_search) > 100
  then raise exception 'CHECKOUT_INPUT'; end if;
  with filtered as (
    select o.*, jsonb_build_object('name', u.name, 'email', u.email) as customer
    from public."Order" o join public."User" u on u.id = o."userId"
    where (p_status = 'all' or (case when o."isCancelled" then 'cancelled' else o.status end) = p_status)
      and (trim(p_search) = '' or position(lower(trim(p_search)) in lower(concat_ws(' ', o.id, u.name, u.email, o.city, o.phone))) > 0)
  ), page as (
    select * from filtered order by "createdAt" desc, id desc
      limit p_page_size offset (p_page::bigint - 1) * p_page_size
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered), 'page', p_page, 'pageSize', p_page_size,
    'orders', (select coalesce(jsonb_agg((to_jsonb(o) - 'customer') || jsonb_build_object(
      'user', o.customer, 'orderItems', (select coalesce(jsonb_agg(to_jsonb(oi) order by oi.id), '[]'::jsonb)
        from public."OrderItem" oi where oi."orderId" = o.id)) order by o."createdAt" desc, o.id desc), '[]'::jsonb) from page o)
  ) into result;
  return result;
end;
$$;

revoke all on function public.commerce_inventory_version() from public, anon, authenticated;
revoke all on function public.commerce_create_review(text, text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.commerce_admin_stats(text) from public, anon, authenticated;
revoke all on function public.commerce_admin_orders(text, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.commerce_create_review(text, text, text, numeric, text) to service_role;
grant execute on function public.commerce_admin_stats(text) to service_role;
grant execute on function public.commerce_admin_orders(text, integer, integer, text, text) to service_role;
notify pgrst, 'reload schema';
commit;
