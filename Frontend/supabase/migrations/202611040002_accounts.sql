-- Apply after the base User table and checkout migration. No demo accounts are created.
ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "picture" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verifyToken" TEXT,
  ADD COLUMN IF NOT EXISTS "verifyTokenExpiry" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "resetPasswordTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "resetPasswordTokenExpiry" TIMESTAMPTZ;

-- All account access goes through authenticated server routes using the
-- service-role key. Public Supabase clients must never read credential data.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."User" FROM PUBLIC, anon, authenticated;
REVOKE SELECT ("password", "verifyToken", "verifyTokenExpiry", "resetPasswordTokenHash", "resetPasswordTokenExpiry")
  ON TABLE public."User" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."User" TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS "User_resetPasswordTokenHash_key"
  ON public."User" ("resetPasswordTokenHash")
  WHERE "resetPasswordTokenHash" IS NOT NULL;

-- The conditional UPDATE consumes a valid token atomically, even for concurrent requests.
-- Incrementing authVersion revokes all previously issued sessions after a password reset.
CREATE OR REPLACE FUNCTION public.reset_account_password(p_token_hash TEXT, p_password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_rows INTEGER;
BEGIN
  UPDATE public."User"
  SET "password" = p_password_hash,
      "authVersion" = "authVersion" + 1,
      "emailVerified" = true,
      "verifyToken" = NULL,
      "verifyTokenExpiry" = NULL,
      "resetPasswordTokenHash" = NULL,
      "resetPasswordTokenExpiry" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "resetPasswordTokenHash" = p_token_hash
    AND "resetPasswordTokenExpiry" > CURRENT_TIMESTAMP;
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  RETURN changed_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_account_password(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_account_password(TEXT, TEXT) TO service_role;
