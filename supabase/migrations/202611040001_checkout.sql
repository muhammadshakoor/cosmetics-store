-- Apply after the base User/Product/Order/OrderItem tables (see README).
-- All checkout writes run in one PostgreSQL transaction through these RPCs.
BEGIN;

ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" text,
  ADD COLUMN IF NOT EXISTS "requestHash" text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS "couponCode" text,
  ADD COLUMN IF NOT EXISTS "discountAmount" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isCancelled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp(3),
  ADD COLUMN IF NOT EXISTS "cancelReason" text,
  ADD COLUMN IF NOT EXISTS "trackingNumber" text,
  ADD COLUMN IF NOT EXISTS "courierService" text;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_user_idempotency_key"
  ON public."Order" ("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."Coupon" (
  id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'percent',
  value double precision NOT NULL,
  "minOrder" double precision NOT NULL DEFAULT 0,
  "usageLimit" integer NOT NULL DEFAULT 100,
  "usedCount" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "expiresAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reconcile historical flags; status becomes the source of truth going forward.
UPDATE public."Order" SET status = 'cancelled' WHERE "isCancelled" = true;
UPDATE public."Order" SET status = 'delivered' WHERE "isDelivered" = true AND status <> 'cancelled';
UPDATE public."Order" SET "isCancelled" = (status = 'cancelled'), "isDelivered" = (status = 'delivered');

CREATE OR REPLACE FUNCTION public.checkout_quote(p_items jsonb, p_coupon_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  item record;
  product public."Product"%ROWTYPE;
  coupon public."Coupon"%ROWTYPE;
  items_total numeric := 0;
  shipping_total numeric;
  discount_total numeric := 0;
  rows jsonb := '[]'::jsonb;
  normalized_code text := nullif(upper(trim(p_coupon_code)), '');
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'CHECKOUT_INPUT'; END IF;
  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 100 THEN RAISE EXCEPTION 'CHECKOUT_INPUT'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) entry
    WHERE jsonb_typeof(entry) <> 'object'
      OR coalesce(entry->>'productId', '') = '' OR length(entry->>'productId') > 128
      OR jsonb_typeof(entry->'qty') IS DISTINCT FROM 'number'
      OR coalesce(entry->>'qty', '') !~ '^[0-9]{1,3}$'
      OR coalesce((entry->>'qty')::numeric, 0) < 1
  ) THEN RAISE EXCEPTION 'CHECKOUT_INPUT'; END IF;

  FOR item IN SELECT entry->>'productId' AS id, sum((entry->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) entry GROUP BY entry->>'productId' ORDER BY entry->>'productId'
  LOOP
    IF item.qty > 999 THEN RAISE EXCEPTION 'CHECKOUT_INPUT'; END IF;
    SELECT * INTO product FROM public."Product" WHERE id = item.id;
    IF NOT FOUND OR product.price IS NULL OR product.price <= 0 OR product.price > 1000000000 THEN RAISE EXCEPTION 'CHECKOUT_PRODUCT'; END IF;
    IF product."countInStock" IS NULL OR product."countInStock" < item.qty THEN RAISE EXCEPTION 'CHECKOUT_STOCK'; END IF;
    items_total := items_total + round(product.price::numeric, 2) * item.qty;
    rows := rows || jsonb_build_array(jsonb_build_object('productId', product.id, 'name', product.name, 'image', product.image, 'price', round(product.price::numeric, 2), 'qty', item.qty));
  END LOOP;

  IF normalized_code IS NOT NULL THEN
    SELECT * INTO coupon FROM public."Coupon" WHERE code = normalized_code;
    IF NOT FOUND OR coupon."isActive" IS DISTINCT FROM true
      OR (coupon."expiresAt" IS NOT NULL AND coupon."expiresAt" <= now())
      OR coupon."usedCount" IS NULL OR coupon."usageLimit" IS NULL OR coupon."minOrder" IS NULL
      OR coupon."usedCount" >= coupon."usageLimit" OR items_total < coupon."minOrder"
      OR coupon.value IS NULL OR coupon.value <= 0 OR coupon.value > 1000000000
      OR coupon.type IS NULL OR coupon.type NOT IN ('percent', 'flat')
      OR (coupon.type = 'percent' AND coupon.value > 100)
    THEN RAISE EXCEPTION 'CHECKOUT_COUPON'; END IF;
    discount_total := least(items_total, round(CASE WHEN coupon.type = 'percent' THEN items_total * coupon.value::numeric / 100 ELSE coupon.value::numeric END, 2));
  END IF;
  -- Prices are PKR; free shipping is based on the merchandise subtotal.
  shipping_total := CASE WHEN items_total >= 2000 THEN 0 ELSE 200 END;
  RETURN jsonb_build_object('orderItems', rows, 'itemsPrice', items_total, 'taxPrice', 0,
    'shippingPrice', shipping_total, 'discountAmount', discount_total,
    'totalPrice', items_total + shipping_total - discount_total,
    'couponCode', normalized_code, 'couponType', coupon.type, 'couponValue', coupon.value);
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_create_order(
  p_user_id text, p_items jsonb, p_address jsonb, p_phone text,
  p_payment_method text, p_coupon_code text, p_idempotency_key text,
  p_expected_total numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  saved public."Order"%ROWTYPE;
  quote jsonb;
  item jsonb;
  fingerprint text;
  new_id text := gen_random_uuid()::text;
  normalized_code text := nullif(upper(trim(p_coupon_code)), '');
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public."User" WHERE id = p_user_id AND "isAdmin" = false) THEN RAISE EXCEPTION 'ORDER_FORBIDDEN'; END IF;
  IF p_payment_method IS DISTINCT FROM 'Cash on Delivery (COD)' THEN RAISE EXCEPTION 'CHECKOUT_PAYMENT'; END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[a-zA-Z0-9_-]{16,128}$'
    OR p_address IS NULL OR jsonb_typeof(p_address) <> 'object'
    OR coalesce(length(trim(p_address->>'address')), 0) NOT BETWEEN 5 AND 300
    OR coalesce(length(trim(p_address->>'city')), 0) NOT BETWEEN 2 AND 100
    OR coalesce(p_address->>'postalCode', '') !~ '^[0-9]{5}$'
    OR p_address->>'country' IS DISTINCT FROM 'Pakistan'
    OR p_phone IS NULL OR p_phone !~ '^(\+?92|0)3[0-9]{9}$'
  THEN RAISE EXCEPTION 'CHECKOUT_INPUT'; END IF;
  fingerprint := md5(jsonb_build_object('items', p_items, 'address', p_address, 'phone', p_phone, 'payment', p_payment_method, 'coupon', normalized_code)::text);
  -- Serialize concurrent retries before checking or decrementing anything.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id || '/' || p_idempotency_key, 0));
  SELECT * INTO saved FROM public."Order" WHERE "userId" = p_user_id AND "idempotencyKey" = p_idempotency_key;
  IF FOUND THEN
    IF saved."requestHash" IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'CHECKOUT_IDEMPOTENCY'; END IF;
    RETURN jsonb_build_object('replayed', true, 'order', to_jsonb(saved) || jsonb_build_object('orderItems', (SELECT coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) FROM public."OrderItem" oi WHERE oi."orderId" = saved.id)));
  END IF;

  -- A deterministic lock order prevents two checkouts from overselling or deadlocking.
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'CHECKOUT_INPUT'; END IF;
  PERFORM id FROM public."Product" WHERE id IN (SELECT entry->>'productId' FROM jsonb_array_elements(p_items) entry) ORDER BY id FOR UPDATE;
  IF normalized_code IS NOT NULL THEN PERFORM id FROM public."Coupon" WHERE code = normalized_code FOR UPDATE; END IF;
  quote := public.checkout_quote(p_items, normalized_code);
  IF p_expected_total IS NOT NULL AND round(p_expected_total, 2) <> (quote->>'totalPrice')::numeric THEN RAISE EXCEPTION 'CHECKOUT_PRICE_CHANGED'; END IF;

  INSERT INTO public."Order" (id, "userId", address, city, "postalCode", country, phone, "paymentMethod",
    "itemsPrice", "taxPrice", "shippingPrice", "totalPrice", "discountAmount", "couponCode",
    "isPaid", "isDelivered", "isCancelled", status, "idempotencyKey", "requestHash", "createdAt", "updatedAt")
  VALUES (new_id, p_user_id, trim(p_address->>'address'), trim(p_address->>'city'), p_address->>'postalCode', 'Pakistan', p_phone, p_payment_method,
    (quote->>'itemsPrice')::numeric, 0, (quote->>'shippingPrice')::numeric, (quote->>'totalPrice')::numeric,
    (quote->>'discountAmount')::numeric, normalized_code, false, false, false, 'confirmed', p_idempotency_key, fingerprint, now(), now()) RETURNING * INTO saved;
  FOR item IN SELECT value FROM jsonb_array_elements(quote->'orderItems') LOOP
    INSERT INTO public."OrderItem" (id, "orderId", "productId", name, qty, image, price)
      VALUES (gen_random_uuid()::text, new_id, item->>'productId', item->>'name', (item->>'qty')::integer, item->>'image', (item->>'price')::numeric);
    UPDATE public."Product" SET "countInStock" = "countInStock" - (item->>'qty')::integer, "updatedAt" = now()
      WHERE id = item->>'productId' AND "countInStock" >= (item->>'qty')::integer;
    IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_STOCK'; END IF;
  END LOOP;
  IF normalized_code IS NOT NULL THEN UPDATE public."Coupon" SET "usedCount" = "usedCount" + 1 WHERE code = normalized_code; END IF;
  RETURN jsonb_build_object('replayed', false, 'order', to_jsonb(saved) || jsonb_build_object('orderItems', (SELECT coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) FROM public."OrderItem" oi WHERE oi."orderId" = new_id)));
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_transition_order(
  p_order_id text, p_actor_id text, p_status text,
  p_reason text DEFAULT NULL, p_tracking_number text DEFAULT NULL, p_courier_service text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  saved public."Order"%ROWTYPE;
  actor_admin boolean;
  item record;
BEGIN
  SELECT "isAdmin" INTO actor_admin FROM public."User" WHERE id = p_actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_FORBIDDEN'; END IF;
  actor_admin := coalesce(actor_admin, false);
  SELECT * INTO saved FROM public."Order" WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT actor_admin AND (saved."userId" <> p_actor_id OR p_status <> 'cancelled') THEN RAISE EXCEPTION 'ORDER_FORBIDDEN'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('confirmed', 'picked_up', 'on_the_way', 'delivered', 'cancelled') THEN RAISE EXCEPTION 'ORDER_TRANSITION'; END IF;
  -- Repeating the same transition is a no-op for stock/payment flags.
  IF saved.status IS DISTINCT FROM p_status THEN
    IF NOT (
      (saved.status = 'placed' AND p_status IN ('confirmed', 'cancelled')) OR
      (saved.status = 'confirmed' AND p_status IN ('picked_up', 'cancelled')) OR
      (saved.status = 'picked_up' AND p_status = 'on_the_way') OR
      (saved.status = 'on_the_way' AND p_status = 'delivered')
    ) THEN RAISE EXCEPTION 'ORDER_TRANSITION'; END IF;
    IF p_status = 'cancelled' THEN
      FOR item IN SELECT "productId", sum(qty)::integer AS qty FROM public."OrderItem" WHERE "orderId" = p_order_id GROUP BY "productId" ORDER BY "productId" LOOP
        UPDATE public."Product" SET "countInStock" = "countInStock" + item.qty, "updatedAt" = now() WHERE id = item."productId";
      END LOOP;
    END IF;
  END IF;
  UPDATE public."Order" SET status = p_status,
    "isCancelled" = (p_status = 'cancelled'),
    "cancelledAt" = CASE WHEN p_status = 'cancelled' THEN coalesce("cancelledAt", now()) ELSE NULL END,
    "cancelReason" = CASE WHEN p_status = 'cancelled' THEN left(coalesce(p_reason, "cancelReason", 'Cancelled by customer'), 500) ELSE "cancelReason" END,
    "isDelivered" = (p_status = 'delivered'),
    "deliveredAt" = CASE WHEN p_status = 'delivered' THEN coalesce("deliveredAt", now()) ELSE NULL END,
    "isPaid" = CASE WHEN p_status = 'delivered' AND "paymentMethod" = 'Cash on Delivery (COD)' THEN true ELSE "isPaid" END,
    "paidAt" = CASE WHEN p_status = 'delivered' AND "paymentMethod" = 'Cash on Delivery (COD)' THEN coalesce("paidAt", now()) ELSE "paidAt" END,
    "trackingNumber" = coalesce(nullif(trim(p_tracking_number), ''), "trackingNumber"),
    "courierService" = coalesce(nullif(trim(p_courier_service), ''), "courierService"), "updatedAt" = now()
    WHERE id = p_order_id RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END;
$$;

-- These functions trust the authenticated actor supplied by the server, never a browser.
REVOKE ALL ON FUNCTION public.checkout_quote(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_create_order(text, jsonb, jsonb, text, text, text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_transition_order(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_quote(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkout_create_order(text, jsonb, jsonb, text, text, text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkout_transition_order(text, text, text, text, text, text) TO service_role;
ALTER TABLE public."Coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Coupon", public."Product", public."Order", public."OrderItem" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Coupon", public."Product", public."Order", public."OrderItem" TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
