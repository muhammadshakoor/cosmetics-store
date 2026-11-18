-- Minimal schema for a disposable local test cluster. Not a production migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE TABLE public."User" (
  id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, password text NOT NULL,
  "isAdmin" boolean NOT NULL DEFAULT false, "createdAt" timestamp(3) NOT NULL DEFAULT now(), "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);
CREATE TABLE public."Product" (
  id text PRIMARY KEY, name text NOT NULL, image text NOT NULL, brand text NOT NULL, category text NOT NULL, description text NOT NULL,
  price double precision NOT NULL, "countInStock" integer NOT NULL DEFAULT 0, rating double precision NOT NULL DEFAULT 0,
  "numReviews" integer NOT NULL DEFAULT 0, "userId" text NOT NULL REFERENCES public."User"(id),
  "createdAt" timestamp(3) NOT NULL DEFAULT now(), "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);
CREATE TABLE public."Order" (
  id text PRIMARY KEY, "userId" text NOT NULL REFERENCES public."User"(id), address text NOT NULL, city text NOT NULL,
  "postalCode" text NOT NULL, country text NOT NULL, "paymentMethod" text NOT NULL, "itemsPrice" double precision NOT NULL,
  "taxPrice" double precision NOT NULL, "shippingPrice" double precision NOT NULL, "totalPrice" double precision NOT NULL,
  "isPaid" boolean NOT NULL DEFAULT false, "paidAt" timestamp(3), "isDelivered" boolean NOT NULL DEFAULT false,
  "deliveredAt" timestamp(3), "createdAt" timestamp(3) NOT NULL DEFAULT now(), "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);
CREATE TABLE public."OrderItem" (
  id text PRIMARY KEY, "orderId" text NOT NULL REFERENCES public."Order"(id), "productId" text NOT NULL REFERENCES public."Product"(id),
  name text NOT NULL, qty integer NOT NULL, image text NOT NULL, price double precision NOT NULL
);
