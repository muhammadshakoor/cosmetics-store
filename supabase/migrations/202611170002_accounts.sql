begin;

-- Only the server may call this after validating the provider's email identity.
-- Locking the account makes verification and credential replacement one operation.
create or replace function public.oauth_sign_in(p_email text, p_name text, p_picture text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare account public."User"%rowtype;
begin
  p_email := lower(trim(p_email));
  if p_email is null or length(p_email) > 254 or position('@' in p_email) < 2 then
    raise exception 'Invalid provider email';
  end if;
  p_name := left(coalesce(nullif(trim(p_name), ''), split_part(p_email, '@', 1)), 100);
  insert into public."User"(id, name, email, password, "isAdmin", "emailVerified", "authVersion")
  values(gen_random_uuid()::text, p_name, p_email, '', false, true, 0)
  on conflict(email) do nothing;

  select * into strict account from public."User" where email = p_email for update;
  if not account."emailVerified" then
    -- An unverified password may have been chosen by someone who does not own
    -- this email. Never activate it when the real owner arrives through OAuth.
    update public."User" set password = '', name = p_name, "emailVerified" = true,
      "authVersion" = "authVersion" + 1, "verifyToken" = null, "verifyTokenExpiry" = null,
      "resetPasswordTokenHash" = null, "resetPasswordTokenExpiry" = null,
      picture = p_picture, "updatedAt" = now()
    where id = account.id returning * into account;
  else
    update public."User" set picture = p_picture, "updatedAt" = now()
    where id = account.id returning * into account;
  end if;
  return jsonb_build_object('id', account.id, 'name', account.name, 'email', account.email,
    'isAdmin', account."isAdmin", 'picture', account.picture, 'authVersion', account."authVersion");
end;
$$;
revoke all on function public.oauth_sign_in(text, text, text) from public, anon, authenticated;
grant execute on function public.oauth_sign_in(text, text, text) to service_role;

-- Account writer locks serialize wishlist changes while remaining compatible
-- with checkout/review foreign-key reads (KEY SHARE); retries are idempotent.
create or replace function public.merge_account_wishlist(p_user_id text, p_product_ids text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare product_id text; saved_ids text[] := '{}'; unavailable_ids text[] := '{}';
  saved_count integer; capacity_full boolean := false;
begin
  if coalesce(cardinality(p_product_ids), 0) > 200 then raise exception 'Too many wishlist products'; end if;
  perform id from public."User" where id = p_user_id for no key update;
  if not found then raise exception 'Account not found'; end if;
  select count(*) into saved_count from public."Wishlist" where "userId" = p_user_id;
  -- Match checkout's deterministic product order to avoid cross-product deadlocks.
  for product_id in select distinct unnest(p_product_ids) order by 1 loop
    if exists(select 1 from public."Wishlist" where "userId" = p_user_id and "productId" = product_id) then
      saved_ids := array_append(saved_ids, product_id);
    elsif not exists(select 1 from public."Product" where id = product_id) then
      unavailable_ids := array_append(unavailable_ids, product_id);
    elsif saved_count < 200 then
      -- A concurrent deletion may reject the transaction; the browser retains
      -- its guest entries on any failure so the merge can be retried safely.
      insert into public."Wishlist"(id, "userId", "productId")
      select gen_random_uuid()::text, p_user_id, id from public."Product" where id = product_id
      on conflict("userId", "productId") do nothing;
      if found then
        saved_count := saved_count + 1;
        saved_ids := array_append(saved_ids, product_id);
      else
        unavailable_ids := array_append(unavailable_ids, product_id);
      end if;
    else capacity_full := true;
    end if;
  end loop;
  return jsonb_build_object('savedIds', saved_ids, 'unavailableIds', unavailable_ids, 'full', capacity_full);
end;
$$;
revoke all on function public.merge_account_wishlist(text, text[]) from public, anon, authenticated;
grant execute on function public.merge_account_wishlist(text, text[]) to service_role;

create or replace function public.set_account_wishlist(p_user_id text, p_product_id text, p_wishlisted boolean default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare desired boolean; merged jsonb;
begin
  perform id from public."User" where id = p_user_id for no key update;
  if not found then raise exception 'Account not found'; end if;
  desired := coalesce(p_wishlisted, not exists(select 1 from public."Wishlist" where "userId" = p_user_id and "productId" = p_product_id));
  if desired then
    merged := public.merge_account_wishlist(p_user_id, array[p_product_id]);
    if jsonb_array_length(merged->'unavailableIds') > 0 then raise exception 'WISHLIST_PRODUCT'; end if;
    if jsonb_array_length(merged->'savedIds') = 0 then raise exception 'WISHLIST_FULL'; end if;
  else
    delete from public."Wishlist" where "userId" = p_user_id and "productId" = p_product_id;
  end if;
  return jsonb_build_object('wishlisted', desired);
end;
$$;
revoke all on function public.set_account_wishlist(text, text, boolean) from public, anon, authenticated;
grant execute on function public.set_account_wishlist(text, text, boolean) to service_role;

notify pgrst, 'reload schema';
commit;
