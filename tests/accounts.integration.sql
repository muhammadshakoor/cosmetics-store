-- Run with psql -v ON_ERROR_STOP=1 after migrations 001-003 on an isolated test DB.
BEGIN;

DO $$
DECLARE
  account_id TEXT := 'account-reset-regression';
  changed BOOLEAN;
  saved public."User"%ROWTYPE;
BEGIN
  INSERT INTO public."User" (id, name, email, password, "isAdmin", "createdAt", "updatedAt")
  VALUES (account_id, 'Reset regression', 'account-reset-regression@example.test', 'old-password-hash', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  UPDATE public."User" SET "resetPasswordTokenHash" = 'expired-token-hash', "resetPasswordTokenExpiry" = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = account_id;
  changed := public.reset_account_password('expired-token-hash', 'new-password-hash');
  IF changed THEN RAISE EXCEPTION 'Expired password-reset token was accepted'; END IF;

  UPDATE public."User" SET "resetPasswordTokenHash" = 'valid-token-hash', "resetPasswordTokenExpiry" = CURRENT_TIMESTAMP + INTERVAL '30 minutes' WHERE id = account_id;
  changed := public.reset_account_password('valid-token-hash', 'new-password-hash');
  IF NOT changed THEN RAISE EXCEPTION 'Valid password-reset token was rejected'; END IF;
  SELECT * INTO saved FROM public."User" WHERE id = account_id;
  IF saved.password <> 'new-password-hash' OR saved."authVersion" <> 1 OR NOT saved."emailVerified"
     OR saved."resetPasswordTokenHash" IS NOT NULL OR saved."resetPasswordTokenExpiry" IS NOT NULL THEN
    RAISE EXCEPTION 'Password reset did not update credentials, revoke sessions and consume the token';
  END IF;
  changed := public.reset_account_password('valid-token-hash', 'replacement-password-hash');
  IF changed THEN RAISE EXCEPTION 'Used password-reset token was accepted again'; END IF;

  IF has_table_privilege('anon', 'public."User"', 'SELECT') OR has_table_privilege('authenticated', 'public."User"', 'SELECT') THEN
    RAISE EXCEPTION 'Public database roles can read account credentials';
  END IF;
  IF has_function_privilege('anon', 'public.reset_account_password(text,text)', 'EXECUTE') OR has_function_privilege('authenticated', 'public.reset_account_password(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public database roles can directly reset passwords';
  END IF;
END;
$$;

ROLLBACK;
