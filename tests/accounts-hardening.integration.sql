-- Disposable loopback checkout_test only. Every fixture is rolled back.
DO $$ BEGIN
  IF current_database() <> 'checkout_test'
    OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet
    OR inet_server_port() = 5432 THEN
    RAISE EXCEPTION 'Account hardening tests require a disposable loopback checkout_test database on a non-default port';
  END IF;
END $$;

BEGIN;

DO $$
DECLARE
  result jsonb;
  account public."User"%ROWTYPE;
  absent_product text;
  saved_product text;
  count_before integer;
  signature text;
BEGIN
  INSERT INTO public."User"(id, name, email, password, "emailVerified", "isAdmin", "authVersion",
    "verifyToken", "verifyTokenExpiry", "resetPasswordTokenHash", "resetPasswordTokenExpiry")
  VALUES ('hardening-unverified', 'Untrusted registration', 'hardening-owner@example.test', 'attacker-chosen-password-hash', false, false, 3,
    'untrusted-verification-token', now() + interval '1 hour', 'untrusted-reset-token', now() + interval '1 hour');

  result := public.oauth_sign_in(' HARDENING-OWNER@EXAMPLE.TEST ', 'Real email owner', 'https://example.test/owner.jpg');
  SELECT * INTO STRICT account FROM public."User" WHERE id = 'hardening-unverified';
  IF result->>'id' <> account.id OR account.password <> '' OR NOT account."emailVerified"
    OR account."authVersion" <> 4 OR (result->>'authVersion')::integer <> 4
    OR account.name <> 'Real email owner' OR account."isAdmin"
    OR account."verifyToken" IS NOT NULL OR account."verifyTokenExpiry" IS NOT NULL
    OR account."resetPasswordTokenHash" IS NOT NULL OR account."resetPasswordTokenExpiry" IS NOT NULL THEN
    RAISE EXCEPTION 'OAuth activated untrusted registration credentials or failed to revoke its sessions/tokens';
  END IF;
  IF result ? 'password' OR result ? 'verifyToken' OR result ? 'resetPasswordTokenHash' THEN
    RAISE EXCEPTION 'OAuth returned private account credentials';
  END IF;
  result := public.oauth_sign_in('hardening-owner@example.test', 'Repeated OAuth', null);
  IF result->>'id' <> account.id OR (result->>'authVersion')::integer <> 4 THEN
    RAISE EXCEPTION 'Repeated OAuth changed account identity or revoked its current session unnecessarily';
  END IF;

  INSERT INTO public."User"(id, name, email, password, "emailVerified", "isAdmin", "authVersion")
  VALUES ('hardening-verified', 'Verified account name', 'hardening-verified@example.test', 'verified-owner-password-hash', true, true, 8);
  result := public.oauth_sign_in('hardening-verified@example.test', 'Provider name', 'https://example.test/new-picture.jpg');
  SELECT * INTO STRICT account FROM public."User" WHERE id = 'hardening-verified';
  IF account.password <> 'verified-owner-password-hash' OR account."authVersion" <> 8
    OR NOT account."isAdmin" OR account.name <> 'Verified account name' OR NOT account."emailVerified"
    OR account.picture <> 'https://example.test/new-picture.jpg' THEN
    RAISE EXCEPTION 'OAuth overwrote an already verified account password, role, name or session version';
  END IF;

  result := public.oauth_sign_in('hardening-new-owner@example.test', null, null);
  SELECT * INTO STRICT account FROM public."User" WHERE id = result->>'id';
  IF account.password <> '' OR NOT account."emailVerified" OR account."isAdmin" OR account."authVersion" <> 0
    OR account.name <> 'hardening-new-owner' THEN
    RAISE EXCEPTION 'A new social account inherited a password or administrator privileges';
  END IF;

  INSERT INTO public."User"(id, name, email, password, "emailVerified")
  VALUES ('hardening-wishlist', 'Wishlist owner', 'hardening-wishlist@example.test', '', true);
  INSERT INTO public."Product"(id, name, image, brand, category, description, price, "countInStock", "userId")
  SELECT 'hardening-product-' || n, 'Wishlist product ' || n, '/test.jpg', 'Test', 'soaps', 'Wishlist fixture', 100, 1, 'hardening-wishlist'
  FROM generate_series(1, 201) AS n;

  result := public.merge_account_wishlist('hardening-wishlist', ARRAY(SELECT 'hardening-product-' || n FROM generate_series(1, 199) AS n));
  IF jsonb_array_length(result->'savedIds') <> 199 OR (result->>'full')::boolean
    OR jsonb_array_length(result->'unavailableIds') <> 0 THEN
    RAISE EXCEPTION 'Initial bulk wishlist merge did not save its available products';
  END IF;
  result := public.merge_account_wishlist('hardening-wishlist', ARRAY['hardening-product-1', 'hardening-product-1', 'hardening-product-missing']);
  IF jsonb_array_length(result->'savedIds') <> 1 OR result->'unavailableIds' <> '["hardening-product-missing"]'::jsonb
    OR (SELECT count(*) FROM public."Wishlist" WHERE "userId" = 'hardening-wishlist') <> 199 THEN
    RAISE EXCEPTION 'Wishlist retry duplicated entries or failed to identify a missing product';
  END IF;

  result := public.merge_account_wishlist('hardening-wishlist', ARRAY['hardening-product-200', 'hardening-product-201']);
  IF jsonb_array_length(result->'savedIds') <> 1 OR NOT (result->>'full')::boolean
    OR (SELECT count(*) FROM public."Wishlist" WHERE "userId" = 'hardening-wishlist') <> 200 THEN
    RAISE EXCEPTION 'Bulk wishlist merge exceeded the account capacity';
  END IF;
  SELECT id INTO STRICT absent_product FROM public."Product" p WHERE p.id IN ('hardening-product-200', 'hardening-product-201')
    AND NOT EXISTS(SELECT 1 FROM public."Wishlist" w WHERE w."productId" = p.id AND w."userId" = 'hardening-wishlist');
  SELECT "productId" INTO saved_product FROM public."Wishlist" WHERE "userId" = 'hardening-wishlist' LIMIT 1;
  result := public.set_account_wishlist('hardening-wishlist', saved_product, true);
  IF result->'wishlisted' <> 'true'::jsonb THEN RAISE EXCEPTION 'An idempotent wishlist save failed at capacity'; END IF;
  BEGIN
    PERFORM public.set_account_wishlist('hardening-wishlist', absent_product, true);
    RAISE EXCEPTION 'Expected WISHLIST_FULL';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'WISHLIST_FULL' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.set_account_wishlist('hardening-wishlist', 'hardening-product-missing', true);
    RAISE EXCEPTION 'Expected WISHLIST_PRODUCT';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'WISHLIST_PRODUCT' THEN RAISE; END IF;
  END;

  result := public.set_account_wishlist('hardening-wishlist', saved_product, false);
  PERFORM public.set_account_wishlist('hardening-wishlist', saved_product, false);
  IF result->'wishlisted' <> 'false'::jsonb OR (SELECT count(*) FROM public."Wishlist" WHERE "userId" = 'hardening-wishlist') <> 199 THEN
    RAISE EXCEPTION 'Idempotent wishlist removal changed another entry';
  END IF;
  result := public.set_account_wishlist('hardening-wishlist', saved_product, null);
  IF result->'wishlisted' <> 'true'::jsonb THEN RAISE EXCEPTION 'Wishlist toggle failed to add'; END IF;
  result := public.set_account_wishlist('hardening-wishlist', saved_product, null);
  IF result->'wishlisted' <> 'false'::jsonb THEN RAISE EXCEPTION 'Wishlist toggle failed to remove'; END IF;

  SELECT count(*) INTO count_before FROM public."Wishlist" WHERE "userId" = 'hardening-wishlist';
  BEGIN
    PERFORM public.merge_account_wishlist('hardening-wishlist', ARRAY(SELECT 'hardening-product-' || n FROM generate_series(1, 201) AS n));
    RAISE EXCEPTION 'Expected bulk wishlist input limit';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Too many wishlist products' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public."Wishlist" WHERE "userId" = 'hardening-wishlist') <> count_before THEN
    RAISE EXCEPTION 'Rejected wishlist input changed saved products';
  END IF;

  FOREACH signature IN ARRAY ARRAY['public.oauth_sign_in(text,text,text)', 'public.merge_account_wishlist(text,text[])', 'public.set_account_wishlist(text,text,boolean)'] LOOP
    IF has_function_privilege('anon', signature, 'EXECUTE') OR has_function_privilege('authenticated', signature, 'EXECUTE')
      OR NOT has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Account RPC privileges are incorrect: %', signature;
    END IF;
  END LOOP;
END;
$$;

ROLLBACK;
