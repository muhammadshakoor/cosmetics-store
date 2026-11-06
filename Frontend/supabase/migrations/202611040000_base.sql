-- Safe for an empty Supabase project or an existing store. Never seeds demo data.
begin;
create table if not exists public."User" (
  id text primary key, name text not null, email text not null unique, password text not null,
  "isAdmin" boolean not null default false,
  "createdAt" timestamp(3) not null default current_timestamp, "updatedAt" timestamp(3) not null default current_timestamp
);
create table if not exists public."Product" (
  id text primary key, name text not null, image text not null, brand text not null,
  category text not null, description text not null, price double precision not null,
  "countInStock" integer not null default 0, rating double precision not null default 0,
  "numReviews" integer not null default 0, "userId" text not null references public."User"(id),
  "createdAt" timestamp(3) not null default current_timestamp, "updatedAt" timestamp(3) not null default current_timestamp
);
create table if not exists public."Order" (
  id text primary key, "userId" text not null references public."User"(id),
  address text not null, city text not null, "postalCode" text not null, country text not null,
  "paymentMethod" text not null, "itemsPrice" double precision not null,
  "taxPrice" double precision not null default 0, "shippingPrice" double precision not null,
  "totalPrice" double precision not null, "isPaid" boolean not null default false, "paidAt" timestamp(3),
  "isDelivered" boolean not null default false, "deliveredAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp, "updatedAt" timestamp(3) not null default current_timestamp
);
create table if not exists public."OrderItem" (
  id text primary key, "orderId" text not null references public."Order"(id),
  "productId" text not null references public."Product"(id), name text not null,
  qty integer not null, image text not null, price double precision not null
);
create table if not exists public."Review" (
  id text primary key, "userId" text not null references public."User"(id),
  "productId" text not null references public."Product"(id), "orderId" text not null references public."Order"(id),
  name text not null, rating double precision not null check(rating between 1 and 5),
  comment text not null, "createdAt" timestamp(3) not null default current_timestamp,
  unique("userId", "productId")
);
create table if not exists public."Wishlist" (
  id text primary key, "userId" text not null references public."User"(id) on delete cascade,
  "productId" text not null references public."Product"(id) on delete cascade,
  "createdAt" timestamptz not null default now(), unique("userId", "productId")
);
alter table public."Review" enable row level security;
alter table public."Wishlist" enable row level security;
revoke all on public."Review", public."Wishlist" from public, anon, authenticated;
grant select, insert, update, delete on public."Review", public."Wishlist" to service_role;
create index if not exists order_user_created on public."Order"("userId", "createdAt");
create index if not exists order_item_order on public."OrderItem"("orderId");
create index if not exists review_product_created on public."Review"("productId", "createdAt");
create unique index if not exists wishlist_user_product on public."Wishlist"("userId", "productId");
create unique index if not exists review_user_product on public."Review"("userId", "productId");
commit;
