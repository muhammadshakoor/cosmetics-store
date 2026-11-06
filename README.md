# Lumina cosmetics store

Next.js storefront and admin tools for a cosmetics shop in Pakistan. The active app is **Frontend/**. **Backend/** is a legacy Express implementation and is not needed for deployment.

## Shopping and operations

- Catalog search, URL-based filters, sorting, wishlist, and a persisted cart.
- Server-rendered product details with individual metadata and product structured data.
- Skin quiz recommendations drawn from actual available products.
- Cash on Delivery checkout. Online wallet/card payments and installment payments are unavailable until a real provider is integrated.
- Prices, coupons, shipping, and stock checked by the server; transactional order creation and inventory updates.
- Persistent checkout attempt keys allow safe retries after an interrupted response.
- Customer order tracking, verified-purchase reviews, complaints, and admin order management.
- Email verification, Google/Facebook OAuth, and single-use password recovery with session revocation.
- Contact requests saved to the admin complaints inbox; newsletter consent and restock subscriptions stored in Supabase.

## Local setup

Use a Node.js version supported by the installed Next.js release (Node 20.9 or newer).

```powershell
cd Frontend
npm ci
Copy-Item .env.example .env.local
```

Fill in the values described in `Frontend/.env.example`. Never expose the Supabase service-role key through a `NEXT_PUBLIC_` variable.

Apply all SQL migrations in **Frontend/supabase/migrations/** in filename order using the Supabase SQL editor or your database migration workflow:

1. `202611040000_base.sql` — base tables, indexes, wishlist/review access.
2. `202611040001_checkout.sql` — atomic checkout, idempotency, inventory, coupons, and order transitions.
3. `202611040002_accounts.sql` — account fields, password recovery, session revocation, and account table access.
4. `202611040003_support.sql` — support inbox, subscriptions, notification leases, and shared rate limiting.

These migrations do not seed demo data or delete existing customer data. Back up an existing database before schema changes. Existing duplicate wishlist/review entries must be resolved before their unique indexes can be added. These SQL migrations are authoritative; the older Prisma schema/seeder is retained as a legacy reference.

```powershell
npm run dev
```

Open http://localhost:3001. Local sample products can be shown when the development database is unavailable. Checkout and customer submissions require the migrated database; production never substitutes sample products or local JSON writes for a failed database operation.

For local sample accounts/products only, use `/api/seed` in development. It is disabled in production. For production, register and verify a real account, then assign its admin role through your trusted database administration process. Do not deploy demo passwords.

## Vercel deployment

Set the project root directory to **Frontend**, use the Next.js preset, and build with `npm run build`. No separate Express server is needed.

**Apply all database migrations before deploying this version.** Checkout, recovery, rate limits, and support forms fail safely when their database operations are unavailable.

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access |
| `JWT_SECRET` | Strong random session-signing secret |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS production URL, without a trailing slash |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Verification, recovery, order, and restock email; use a verified sender |
| `CRON_SECRET` | Authentication for the scheduled pending-restock job |

Optional configuration:

- `ADMIN_EMAIL` for operational notifications.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SUPPORT_EMAIL` for real customer support channels. Unconfigured channels are hidden.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET` for durable product image uploads. Production uploads fail if storage is unavailable; they never write into the deployment filesystem.
- Google/Facebook client IDs and secrets. Register each exact `/api/auth/google/callback` or `/api/auth/facebook/callback` URL with the provider.

`Frontend/vercel.json` schedules a daily pending-restock batch. Updating a product also attempts a small immediate batch; failures remain pending. For an additional retry, an authenticated admin can POST `/api/notifications`. Restock emails include an unsubscribe link. Newsletter signup saves consent; it does not fabricate a coupon or automatically run marketing campaigns. Cart-recovery email remains explicitly unavailable.

Before accepting orders, check a customer registration/verification, password recovery, COD checkout, order cancellation/fulfilment, image upload, and support request against your configured preview environment. A successful build alone cannot verify provider configuration or your live database.

## Validation

```powershell
npm run lint
npm test
npm run build
```

Tests use Node's built-in runner with the installed TypeScript loader. External email/provider calls are mocked. Database tests skip unless `CHECKOUT_TEST_DATABASE_URL` points to a disposable local `checkout_test` database on a non-default port. Never point tests at a real store database.

The database bootstrap and SQL regression files in `Frontend/tests/` cover transaction rollback, prices, stock, coupons, idempotent retries, concurrent orders, status transitions, reset-token consumption, and database permissions.
