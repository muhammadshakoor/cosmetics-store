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
- Social sign-in replaces passwords from unverified registrations atomically; an unverified signup cannot become a backdoor when the email owner signs in with a provider.
- Inventory edits reject stale stock, verified reviews and rating summaries save in one transaction, and admin order lists support server-side search and pagination.
- Browser wishlist entries merge into the signed-in account with safe retries and a 200-product account limit.
- Contact requests saved to the admin complaints inbox; newsletter consent and restock subscriptions stored in Supabase.

## Local setup

Use Node.js 24 or newer for the complete local development and UI-test toolchain. The Next.js runtime itself supports Node 20.9+, but the DOM test dependencies have a higher requirement.

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
5. `202611170001_commerce.sql` - inventory versions, transactional reviews, accurate reporting, and paginated admin orders. Recalculates ratings from actual reviews.
6. `202611170002_accounts.sql` - atomic social sign-in and bounded wishlist merges/mutations.

These migrations do not seed demo data or delete existing customer data. Back up an existing database before schema changes. Existing duplicate wishlist/review entries must be resolved before their unique indexes can be added. These SQL migrations are authoritative; the older Prisma schema/seeder is retained as a legacy reference.

```powershell
npm run dev
```

Open http://localhost:3001. Local sample products can be shown when the development database is unavailable. Checkout and customer submissions require the migrated database; production never substitutes sample products or local JSON writes for a failed database operation.

For local sample accounts/products only, the seeders require `NODE_ENV=development`, `ALLOW_DESTRUCTIVE_SEED=disposable-local-only`, and a loopback database endpoint. Prisma seeding additionally requires a disposable database named `lumina_seed`. The HTTP seeder accepts only POST `/api/seed` with an `x-seed-secret` header matching a configured `SEED_SECRET` of at least 32 characters; GET never changes data. Seeding deletes existing data, so use it only with a disposable local database. Production seeding is disabled. For production, register and verify a real account, then assign its admin role through your trusted database administration process. Do not deploy demo passwords.

## Vercel deployment

Set the project root directory to **Frontend**, use the Next.js preset, and build with `npm run build`. No separate Express server is needed. The legacy Express API permits authenticated order reads and catalog browsing; registration and all commerce mutations are disabled.

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

For database regression checks, create a fresh local PostgreSQL cluster on a non-default port, create `checkout_test`, apply `Frontend/tests/checkout.bootstrap.sql`, then all migrations in filename order. Set `CHECKOUT_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:<test-port>/checkout_test` and `PSQL_PATH` to your psql executable before running `npm test`. These tests include real concurrent checkout, review, OAuth and wishlist operations; fixture changes are rolled back or cleaned up. `tests/accounts.integration.sql` and `tests/support.integration.sql` can also be run with `psql -X -v ON_ERROR_STOP=1 -f <file>` against that same disposable database. Never run regression fixtures on a store database.

The retained legacy backend has its own safety tests: run `npm test` and `npm run build` from `Backend/`.

The backend retains targeted dependency overrides for the patched Express query parser and Nodemon glob matcher until their upstream version ranges include those fixes. Its safety suite checks parser and watcher compatibility.

## UI conventions and checks

Shared theme tokens and `.text-brand`, `.button-primary`, `.button-secondary`, and `.form-input` live in `Frontend/app/globals.css`. Use these for new forms and actions so text, field boundaries, focus indicators, and touch targets remain consistent in both themes. Use `AccessibleDialog` for modal forms; it uses the browser's modal behavior and restores focus when closed. Keep loading, failed requests, and genuinely empty results distinct.

`npm run test:ui` runs the DOM interaction regressions for navigation, complaint inbox identity changes, retries, email/reset feedback, admin dialogs, and order-review state. These tests do not replace browser checks of visual layout, screen-reader output, zoom, or native dialog focus containment. Before launch, verify the main journeys at narrow phone, landscape phone, tablet, and desktop sizes in light and dark themes.
