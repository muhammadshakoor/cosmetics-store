-- Isolated disposable checkout_test database only; all fixtures are rolled back.
begin isolation level repeatable read;
do $$
begin
  if current_database() <> 'checkout_test' or inet_server_addr() is null
    or inet_server_addr() not in ('127.0.0.1'::inet, '::1'::inet) or inet_server_port() = 5432
  then raise exception 'Commerce regressions require the disposable loopback checkout_test database on a non-default port'; end if;
end;
$$;
create function public.test_commerce_reject_summary() returns trigger language plpgsql as $$
begin
  if current_setting('lumina.reject_review_summary', true) = 'on' then
    raise exception 'fixture rejects review summary' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger test_commerce_reject_summary before update of "numReviews" on public."Product"
for each row execute function public.test_commerce_reject_summary();
do $$
declare
  tag text := gen_random_uuid()::text;
  administrator text := 'commerce-admin-' || tag;
  customer text := 'commerce-customer-' || tag;
  product text := 'commerce-product-' || tag;
  bulk_prefix text := 'commerce-bulk-' || tag || '-';
  saved_review jsonb;
  before_stats jsonb;
  after_stats jsonb;
  page jsonb;
  affected integer;
  version integer;
begin
  insert into public."User" (id, name, email, password, "isAdmin") values
    (administrator, 'Commerce admin', administrator || '@example.test', 'unused', true),
    (customer, 'Commerce customer', customer || '@example.test', 'unused', false);
  insert into public."Product" (id, name, image, brand, category, description, price, "countInStock", "userId")
    values (product, 'Regression soap', '/products/test.jpg', 'Test', tag, 'Regression soap fixture', 1000, 10, administrator);

  -- Simulate a checkout stock decrement after an administrator loaded version 0.
  update public."Product" set "countInStock" = 9 where id = product;
  select "inventoryVersion" into version from public."Product" where id = product;
  if version <> 1 then raise exception 'checkout stock change did not advance version'; end if;
  update public."Product" set description = 'Stale edit', "countInStock" = 10 where id = product and "inventoryVersion" = 0;
  get diagnostics affected = row_count;
  if affected <> 0 or (select "countInStock" from public."Product" where id = product) <> 9
    then raise exception 'stale edit recreated sold stock'; end if;
  update public."Product" set description = 'Fresh edit' where id = product and "inventoryVersion" = 1;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'fresh edit was rejected'; end if;

  insert into public."Order" (id, "userId", address, city, "postalCode", country, "paymentMethod", "itemsPrice", "taxPrice", "shippingPrice", "totalPrice", status, "isDelivered", "isPaid")
    values ('review-order-' || tag, customer, '123 Test Road', 'Lahore', '54000', 'Pakistan', 'Cash on Delivery (COD)', 1000, 0, 200, 1200, 'delivered', true, true);
  insert into public."OrderItem" (id, "orderId", "productId", name, qty, image, price)
    values ('review-item-' || tag, 'review-order-' || tag, product, 'Regression soap', 1, '/products/test.jpg', 1000);
  begin
    perform public.commerce_create_review(administrator, product, 'review-order-' || tag, 5, 'Not my purchase');
    raise exception 'another customer purchase was accepted';
  exception when raise_exception then if sqlerrm <> 'REVIEW_FORBIDDEN' then raise; end if; end;
  begin
    perform public.commerce_create_review(customer, product, 'review-order-' || tag, 1.5, 'Invalid fractional score');
    raise exception 'fractional review accepted';
  exception when raise_exception then if sqlerrm <> 'REVIEW_INPUT' then raise; end if; end;
  begin
    perform public.commerce_create_review(customer, product, 'review-order-' || tag, 5, repeat('x', 501));
    raise exception 'oversized review accepted';
  exception when raise_exception then if sqlerrm <> 'REVIEW_INPUT' then raise; end if; end;
  perform set_config('lumina.reject_review_summary', 'on', true);
  begin
    perform public.commerce_create_review(customer, product, 'review-order-' || tag, 5, 'Summary should fail');
    raise exception 'summary failure was ignored';
  exception when check_violation then null; end;
  if exists (select 1 from public."Review" where "productId" = product)
    or (select "numReviews" from public."Product" where id = product) <> 0
    then raise exception 'summary failure partially committed the review'; end if;
  perform set_config('lumina.reject_review_summary', 'off', true);
  saved_review := public.commerce_create_review(customer, product, 'review-order-' || tag, 5, 'Excellent fixture soap');
  if saved_review->>'id' is null or (select "numReviews" from public."Product" where id = product) <> 1
    or (select rating from public."Product" where id = product) <> 5 then raise exception 'review aggregate was not saved atomically'; end if;
  begin
    perform public.commerce_create_review(customer, product, 'review-order-' || tag, 1, 'Another review');
    raise exception 'duplicate review accepted';
  exception when raise_exception then if sqlerrm <> 'REVIEW_DUPLICATE' then raise; end if; end;

  before_stats := public.commerce_admin_stats(administrator);
  insert into public."Order" (id, "userId", address, city, "postalCode", country, "paymentMethod", "itemsPrice", "taxPrice", "shippingPrice", "totalPrice", status, "isDelivered", "isPaid", "createdAt")
    select bulk_prefix || n, customer, '123 Test Road', 'Batch city', '54000', 'Pakistan', 'Cash on Delivery (COD)', 1000, 0, 0, 1000, 'delivered', true, true,
      timestamp '2026-10-01 00:00:00' + n * interval '1 second' from generate_series(1, 1005) n;
  insert into public."OrderItem" (id, "orderId", "productId", name, qty, image, price)
    select 'bulk-item-' || tag || '-' || n, bulk_prefix || n, product, 'Regression soap', 1, '/products/test.jpg', 1000 from generate_series(1, 1005) n;
  after_stats := public.commerce_admin_stats(administrator);
  if (after_stats->>'totalOrders')::integer - (before_stats->>'totalOrders')::integer <> 1005
    or (after_stats->>'totalRevenue')::numeric - (before_stats->>'totalRevenue')::numeric <> 1005000
    or (after_stats->'categoryRevenue'->>tag)::numeric - (before_stats->'categoryRevenue'->>tag)::numeric <> 1005000
    then raise exception 'report aggregates truncated more than 1000 orders/items'; end if;
  page := public.commerce_admin_orders(administrator, 11, 100, 'delivered', bulk_prefix);
  if (page->>'total')::integer <> 1005 or jsonb_array_length(page->'orders') <> 5
    then raise exception 'last order page missing orders beyond row cap'; end if;
  if jsonb_array_length(page->'orders'->0->'orderItems') <> 1 then raise exception 'order items missing'; end if;
  begin
    perform public.commerce_admin_stats(customer);
    raise exception 'customer accessed admin reports';
  exception when raise_exception then if sqlerrm <> 'ORDER_FORBIDDEN' then raise; end if; end;
  if has_function_privilege('anon', 'public.commerce_admin_orders(text,integer,integer,text,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.commerce_create_review(text,text,text,numeric,text)', 'EXECUTE')
    then raise exception 'commerce RPCs exposed to browser roles'; end if;
end;
$$;
rollback;
