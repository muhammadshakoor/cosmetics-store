-- Run against an isolated PostgreSQL/Supabase TEST database after the migrations:
-- psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/checkout.integration.sql
-- All fixtures and mutations are rolled back. Never use production credentials.
BEGIN;
CREATE FUNCTION public.test_checkout_reject_item() RETURNS trigger LANGUAGE plpgsql AS $test$
BEGIN RAISE EXCEPTION 'fixture rejects order item' USING ERRCODE = '23514'; END;
$test$;
DO $$
DECLARE
  customer text := 'test-checkout-' || gen_random_uuid()::text;
  administrator text := 'test-admin-' || gen_random_uuid()::text;
  product text := 'test-product-' || gen_random_uuid()::text;
  fixture_code text := upper('TEST-' || gen_random_uuid()::text);
  address jsonb := '{"address":"123 Main Street","city":"Lahore","postalCode":"54000","country":"Pakistan"}';
  cart jsonb;
  result jsonb;
  replay jsonb;
  order_id text;
  stock integer;
BEGIN
  INSERT INTO public."User" (id, name, email, password, "isAdmin", "createdAt", "updatedAt") VALUES
    (customer, 'Checkout fixture', customer || '@example.test', 'test-unused-password', false, now(), now()),
    (administrator, 'Checkout admin', administrator || '@example.test', 'test-unused-password', true, now(), now());
  INSERT INTO public."Product" (id, name, image, brand, category, description, price, "countInStock", "userId", "createdAt", "updatedAt")
    VALUES (product, 'Authoritative product', '/fixture.jpg', 'Fixture', 'soaps', 'Test product', 1000, 5, administrator, now(), now());
  INSERT INTO public."Coupon" (id, code, type, value, "minOrder", "usageLimit", "usedCount", "isActive") VALUES (gen_random_uuid()::text, fixture_code, 'percent', 10, 0, 1, 0, true);
  cart := jsonb_build_array(jsonb_build_object('productId', product, 'qty', 2, 'price', 0.01));
  result := public.checkout_quote(cart, fixture_code);
  IF (result->>'itemsPrice')::numeric <> 2000 OR (result->>'shippingPrice')::numeric <> 0 OR (result->>'totalPrice')::numeric <> 1800 THEN RAISE EXCEPTION 'quote calculation failed'; END IF;
  BEGIN
    PERFORM public.checkout_create_order(customer, cart, address, '+923001234567', 'Cash on Delivery (COD)', fixture_code, 'fixture-price-conflict-1', 1);
    RAISE EXCEPTION 'price conflict accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'CHECKOUT_PRICE_CHANGED' THEN RAISE; END IF; END;
  SELECT "countInStock" INTO stock FROM public."Product" WHERE id = product;
  IF stock <> 5 OR EXISTS (SELECT 1 FROM public."Order" WHERE "userId" = customer) THEN RAISE EXCEPTION 'failed checkout partially committed'; END IF;

  -- Simulate failure after the order header INSERT to verify full rollback.
  CREATE TRIGGER test_checkout_reject_item BEFORE INSERT ON public."OrderItem" FOR EACH ROW EXECUTE FUNCTION public.test_checkout_reject_item();
  BEGIN
    PERFORM public.checkout_create_order(customer, cart, address, '+923001234567', 'Cash on Delivery (COD)', fixture_code, 'fixture-item-insert-fail', 1800);
    RAISE EXCEPTION 'failed item insert accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  DROP TRIGGER test_checkout_reject_item ON public."OrderItem";
  SELECT "countInStock" INTO stock FROM public."Product" WHERE id = product;
  IF stock <> 5 OR EXISTS (SELECT 1 FROM public."Order" WHERE "userId" = customer)
    OR (SELECT "usedCount" FROM public."Coupon" WHERE "Coupon".code = fixture_code) <> 0
  THEN RAISE EXCEPTION 'item failure partially committed order/stock/coupon'; END IF;

  result := public.checkout_create_order(customer, cart, address, '+923001234567', 'Cash on Delivery (COD)', fixture_code, 'fixture-valid-attempt-1', 1800);
  order_id := result->'order'->>'id';
  replay := public.checkout_create_order(customer, cart, address, '+923001234567', 'Cash on Delivery (COD)', fixture_code, 'fixture-valid-attempt-1', 1800);
  IF replay->>'replayed' <> 'true' OR replay->'order'->>'id' <> order_id THEN RAISE EXCEPTION 'idempotent retry failed'; END IF;
  SELECT "countInStock" INTO stock FROM public."Product" WHERE id = product;
  IF stock <> 3 OR (SELECT "usedCount" FROM public."Coupon" WHERE "Coupon".code = fixture_code) <> 1 THEN RAISE EXCEPTION 'retry consumed stock/coupon'; END IF;
  BEGIN
    PERFORM public.checkout_create_order(customer, cart, address, '+923001234567', 'Cash on Delivery (COD)', fixture_code, 'fixture-another-attempt', 1800);
    RAISE EXCEPTION 'exhausted coupon accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'CHECKOUT_COUPON' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.checkout_transition_order(order_id, administrator, 'delivered');
    RAISE EXCEPTION 'invalid transition accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'ORDER_TRANSITION' THEN RAISE; END IF; END;

  result := public.checkout_transition_order(order_id, customer, 'cancelled');
  PERFORM public.checkout_transition_order(order_id, customer, 'cancelled');
  SELECT "countInStock" INTO stock FROM public."Product" WHERE id = product;
  IF stock <> 5 OR (result->>'isCancelled')::boolean <> true THEN RAISE EXCEPTION 'cancellation did not restore stock exactly once'; END IF;
  result := public.checkout_create_order(customer, cart, address, '+923001234567', 'Cash on Delivery (COD)', NULL, 'fixture-delivery-attempt', 2000);
  order_id := result->'order'->>'id';
  PERFORM public.checkout_transition_order(order_id, administrator, 'picked_up');
  PERFORM public.checkout_transition_order(order_id, administrator, 'on_the_way');
  result := public.checkout_transition_order(order_id, administrator, 'delivered');
  IF NOT (result->>'isDelivered')::boolean OR NOT (result->>'isPaid')::boolean OR result->>'status' <> 'delivered' THEN RAISE EXCEPTION 'delivery flags are inconsistent'; END IF;
  IF has_function_privilege('anon', 'public.checkout_create_order(text,jsonb,jsonb,text,text,text,text,numeric)', 'EXECUTE') THEN RAISE EXCEPTION 'anonymous checkout RPC permission'; END IF;
END;
$$;
ROLLBACK;
