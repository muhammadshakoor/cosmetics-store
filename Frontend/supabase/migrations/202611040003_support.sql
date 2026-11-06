begin;

create table if not exists public."Complaint" (
  id text primary key, "userId" text references public."User"(id), name text not null,
  email text not null, "orderId" text, category text not null, subject text not null,
  message text not null, status text not null default 'open',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
alter table public."Complaint" enable row level security;

create table if not exists public."NewsletterSubscriber" (
  email text primary key, active boolean not null default true,
  "unsubscribeToken" text not null unique,
  "createdAt" timestamptz not null default now(), "updatedAt" timestamptz not null default now()
);
alter table public."NewsletterSubscriber" enable row level security;

create table if not exists public."RestockSubscription" (
  id text primary key, email text not null, "productId" text not null references public."Product"(id) on delete cascade,
  "unsubscribeToken" text not null unique, active boolean not null default true,
  "notifiedAt" timestamptz, "leaseUntil" timestamptz,
  "createdAt" timestamptz not null default now(), unique(email, "productId")
);
alter table public."RestockSubscription" enable row level security;
create index if not exists restock_pending on public."RestockSubscription"("productId") where active and "notifiedAt" is null;

create table if not exists public."RateLimitBucket" (
  key text primary key, count integer not null, "expiresAt" timestamptz not null
);
alter table public."RateLimitBucket" enable row level security;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare consumed integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into "RateLimitBucket" as bucket(key, count, "expiresAt") values(p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict(key) do update set
    count = case when bucket."expiresAt" <= now() then 1 else bucket.count + 1 end,
    "expiresAt" = case when bucket."expiresAt" <= now() then now() + make_interval(secs => p_window_seconds) else bucket."expiresAt" end
  returning count into consumed;
  return consumed <= p_limit;
end;
$$;

create or replace function public.claim_restock_alerts(p_product_id text, p_limit integer default 5)
returns setof public."RestockSubscription" language sql security definer set search_path = public, pg_temp as $$
  update "RestockSubscription" s set "leaseUntil" = now() + interval '5 minutes'
  where s.id in (
    select pending.id from "RestockSubscription" pending
    join "Product" p on p.id = pending."productId" and p."countInStock" > 0
    where pending."productId" = p_product_id and pending.active and pending."notifiedAt" is null
      and (pending."leaseUntil" is null or pending."leaseUntil" < now())
    order by pending."createdAt" for update of pending skip locked limit greatest(1, least(p_limit, 25))
  ) returning s.*;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_restock_alerts(text, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.claim_restock_alerts(text, integer) to service_role;
grant all on public."Complaint", public."NewsletterSubscriber", public."RestockSubscription", public."RateLimitBucket" to service_role;
revoke all on public."Complaint", public."NewsletterSubscriber", public."RestockSubscription", public."RateLimitBucket" from public, anon, authenticated;

commit;
