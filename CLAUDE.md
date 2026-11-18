# Lumina Cosmetics Store — Project Context

## Overview
Full-stack e-commerce app for a cosmetics brand called **Lumina**. Customers can browse products, add to cart/wishlist, checkout, track orders, and submit complaints. Admins manage products, orders, coupons, and view a sales dashboard.

## Tech Stack

### App (repository root — the whole application; there is no separate backend)
> Until Nov 2026 the app lived in `/Frontend`; it was moved to the repo root. Vercel **Root Directory** must be empty.
- **Framework**: Next.js 16 (App Router) with TypeScript; server logic lives in `app/api/` route handlers
- **Database**: Supabase (PostgreSQL); atomic business rules are PostgreSQL functions in `supabase/migrations/`
- **Styling**: Tailwind CSS v4 — uses `@import "tailwindcss"` in globals.css, no `tailwind.config.js`
- **Icons**: lucide-react
- **Toasts**: react-hot-toast
- **Database client**: @supabase/supabase-js
- **Auth**: JWT (jsonwebtoken + bcryptjs) handled in Next.js API routes
- **Font**: Inter (Google Fonts)

> The legacy Express `/Backend` folder was removed (Nov 2026); nothing called it. Do not add a separate API server — add Next.js route handlers instead.
> **Server-only modules**: `lib/supabase.ts`, `auth.ts`, `email.ts`, `coupons.ts`, `oauthAccount.ts`, `rateLimit.ts`, `restock.ts` begin with `import 'server-only'`. Any new `lib/` file that reads a secret env var or the service-role Supabase client must do the same. Tests preload `tests/server-only-stub.cjs` (wired into `npm test`).

---

## Architecture

### Authentication Flow
1. Email/password → `POST /api/users/login` → returns `{ _id, name, email, isAdmin, picture?, token }`
2. Google OAuth → browser-bound state → provider callback → short HttpOnly handoff cookie → `/auth/callback` exchanges `/api/auth/session` → `login()` in AuthContext. Never put session tokens in URLs.
3. Facebook OAuth → same pattern via `/api/auth/facebook/callback`
4. Token stored in `localStorage` (remember me) or `sessionStorage` (session only), key: `userInfo`
5. `useAuth()` hook from `AuthContext` provides `{ user, authReady, login, logout, signOut }`
   - **Sign-out buttons must call `signOut()`**, never `logout()` + `router.push('/')`. `signOut()` clears storage and does `window.location.replace('/')` without setting `user` to null, so protected pages never run their `/login?redirect=<page>` guard during sign-out (otherwise the next account to sign in lands on the previous user's order/checkout/admin page). `logout()` is for expiry/revocation, where returning to the page after re-login is wanted. Covered by `tests/sign-out-ui.test.cjs`.
6. `user` is `null` on the server **and** on the first client render (stored session is read in a `useEffect`, to avoid hydration mismatches). `authReady` flips to `true` once storage is read — any redirect-on-`!user` guard must wait for it. `useCart()` has the same `cartReady` flag.

### User Object Shape
```ts
interface User {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  token: string;
  picture?: string; // Google/Facebook profile photo URL
}
```

### Dark Mode
- **Method**: class-based (`dark` class on `<html>`)
- **Config**: `@variant dark (&:where(.dark, .dark *))` in `globals.css` (Tailwind v4 syntax)
- **Toggle**: `ThemeToggle` component (sun/moon icon) in Navbar
- **Provider**: `ThemeContext.tsx` — reads/writes `localStorage` key `lumina-theme`, detects system preference
- **Flash prevention**: blocking inline `<script>` in `<head>` (in `layout.tsx`) runs before React hydration
- **`suppressHydrationWarning`** on `<html>` element
- **All pages have dark mode classes** (`dark:bg-*`, `dark:text-*`, `dark:border-*`, etc.)

### Dark Mode Class Patterns
| Light | Dark |
|-------|------|
| `bg-[#FFF8F5]` | `dark:bg-gray-950` |
| `bg-white` (cards) | `dark:bg-gray-800` |
| `bg-gray-50` | `dark:bg-gray-950` |
| `text-[#1A0A0E]` / `text-gray-900` | `dark:text-gray-100` |
| `text-gray-700` | `dark:text-gray-200` or `dark:text-gray-300` |
| `text-gray-600` | `dark:text-gray-300` |
| `text-gray-500` | `dark:text-gray-400` |
| `border-gray-100` | `dark:border-gray-700` |
| `border-gray-200` | `dark:border-gray-600` |
| inputs | `dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500` |
| `hover:bg-gray-50` | `dark:hover:bg-gray-700` |
| `hover:bg-rose-50` | `dark:hover:bg-rose-900/20` |
| table header | `dark:bg-gray-700/50 dark:border-gray-700` |
| table dividers | `dark:divide-gray-700` |
| table hover rows | `dark:hover:bg-gray-700/50` |

### Brand Colors
- **Primary**: `#C2185B` (rose/deep pink) — buttons, badges, accents
- **Hover**: `#A31555`
- **Background (light)**: `#FFF8F5` (warm off-white)
- **Text dark**: `#1A0A0E` (near-black warm)
- **Gradient**: `from-rose-500 to-pink-600` / `from-rose-600 via-pink-600 to-rose-800`

---

## File Structure

### Key Files (repository root)
```
./
├── app/
│   ├── layout.tsx              # Root layout, flash-prevention script, Providers
│   ├── globals.css             # Tailwind v4 imports, @variant dark, CSS variables
│   ├── page.tsx                # Home page (hero, categories, best sellers, testimonials)
│   ├── about/page.tsx
│   ├── faq/page.tsx
│   ├── contact/page.tsx
│   ├── privacy/page.tsx
│   ├── products/
│   │   ├── page.tsx            # Product listing with filters
│   │   └── [id]/page.tsx       # Product detail, reviews, related products
│   ├── cart/page.tsx           # Cart with coupon + order summary
│   ├── checkout/page.tsx       # 3-step checkout (address → payment → review)
│   ├── order/[id]/page.tsx     # Order tracking with timeline
│   ├── wishlist/page.tsx
│   ├── profile/page.tsx        # User profile + order history
│   ├── login/page.tsx          # Email + Google OAuth login
│   ├── register/page.tsx       # Registration + email verification flow
│   ├── forgot-password/page.tsx
│   ├── verify-email/page.tsx
│   ├── auth/callback/page.tsx  # OAuth callback — exchanges token → user session
│   ├── complaints/
│   │   ├── page.tsx            # Customer complaint submission form
│   │   └── my/page.tsx         # My complaints list
│   └── admin/
│       ├── page.tsx            # Product management (CRUD + upload)
│       ├── orders/page.tsx     # All orders, status update, courier tracking
│       ├── dashboard/page.tsx  # Sales stats, charts, top products
│       ├── coupons/page.tsx    # Coupon CRUD
│       └── complaints/page.tsx # Admin view + status update of complaints
│
├── api/                        # Next.js API routes (server-side)
│   ├── users/
│   │   ├── route.ts            # POST register
│   │   ├── login/route.ts      # POST login
│   │   ├── profile/route.ts    # GET profile (used by OAuth callback)
│   │   ├── verify/route.ts     # Email verification
│   │   └── resend-verification/route.ts
│   ├── auth/
│   │   ├── google/route.ts + callback/route.ts
│   │   └── facebook/route.ts + callback/route.ts
│   ├── products/route.ts + [id]/route.ts
│   ├── orders/
│   │   ├── route.ts            # Create order
│   │   ├── myorders/route.ts   # User's orders
│   │   ├── all/route.ts        # Admin: all orders
│   │   ├── [id]/route.ts       # Get order
│   │   ├── [id]/deliver/route.ts
│   │   ├── [id]/cancel/route.ts
│   │   └── [id]/status/route.ts # Courier tracking update
│   ├── reviews/route.ts + [productId]/route.ts
│   ├── coupon/route.ts         # Validate coupon
│   ├── coupon/manage/route.ts  # Admin CRUD coupons
│   ├── wishlist/route.ts       # GET/POST/DELETE wishlist items
│   ├── complaints/route.ts + [id]/route.ts
│   ├── newsletter/route.ts
│   ├── upload/route.ts         # Image upload (Supabase storage)
│   ├── admin/stats/route.ts    # Dashboard analytics
│   └── seed/route.ts           # DB seeder
│
├── components/
│   ├── Navbar.tsx              # Sticky navbar, search, dark toggle, user avatar/menu
│   ├── Footer.tsx
│   ├── ProductCard.tsx         # Product grid card
│   ├── ThemeToggle.tsx         # Sun/Moon button
│   ├── WhatsAppButton.tsx      # Floating WhatsApp CTA
│   └── Providers.tsx           # Wraps app with AuthProvider, CartProvider, WishlistProvider, ThemeProvider
│
├── context/
│   ├── AuthContext.tsx         # user state, login(), logout()
│   ├── CartContext.tsx         # cart items, itemCount
│   ├── WishlistContext.tsx     # wishlist items, count
│   └── ThemeContext.tsx        # theme toggle, localStorage persistence
│
└── lib/
    ├── auth.ts                 # signToken(), getAuthUser(), toClient(), RESET_TOKEN_PREFIX
    ├── supabase.ts             # Supabase client (server-side)
    ├── api.ts                  # Client-side fetch helpers
    ├── site.ts                 # Contact details (WhatsApp/phone/email), shipping constants, safeRedirectPath()
    ├── email.ts                # sendEmail() via Resend + escapeHtml() — escape ALL user input in emails
    ├── coupons.ts              # evaluateCoupon() — server-side source of truth for discounts
    ├── localProducts.ts        # Fallback product catalog (data/products.json) when Supabase is unavailable
    └── theme.ts                # Brand color palette + semantic tokens
```

---

## Supabase Schema (User table)

```sql
CREATE TABLE "User" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,        -- empty string for OAuth users
  isAdmin     BOOLEAN DEFAULT false,
  emailVerified BOOLEAN DEFAULT false,
  picture     TEXT,                  -- profile photo URL (Google/Facebook OAuth)
  verifyToken TEXT,
  verifyTokenExpiry TIMESTAMP,
  createdAt   TIMESTAMP,
  updatedAt   TIMESTAMP
);
```

> If `picture` column doesn't exist yet, run: `ALTER TABLE "User" ADD COLUMN picture TEXT;`

---

## Navbar — Current Features
- Sticky, scrolled state (shadow deepens on scroll)
- Logo → Home
- Desktop nav: Home, **Rituals** (hover/click dropdown: Skincare, Handmade Soaps, Body Care, Hair Care, Fragrance), Shop All, Skin Quiz button
- Active link (Home / Shop All) gets rose text + underline via `navLinkCls()`
- Search: icon toggles a full-width search bar with autocomplete suggestions
- **Mobile search**: Search icon in navbar → expands full-width search bar below header row; auto-focuses input; closes on route change or X button
- Theme toggle (sun/moon)
- Wishlist icon with badge count
- Cart icon with badge count
- User avatar button:
  - **With picture**: shows `<img>` (Google/Facebook photo), `referrerPolicy="no-referrer"`
  - **Without picture**: colored gradient initials circle (gradient chosen by `name.charCodeAt(0)`)
  - Dropdown shows: profile header (avatar + full name + email), My Profile, Admin links (if admin), My Complaints / Submit Complaint (if customer), Sign out
- Mobile hamburger → drawer with all nav links + user profile section (profile, admin or complaints links, Sign out)
- Closing behavior: mobile menu, mobile search, and user dropdown all close on route change

### Avatar Gradient Palette
8 gradients assigned by `name.charCodeAt(0) % 8`:
`rose→pink`, `violet→purple`, `blue→indigo`, `teal→emerald`, `amber→orange`, `fuchsia→rose`, `sky→blue`, `green→teal`

---

## Key Patterns & Conventions

### Input Class (reused in forms)
```ts
const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300';
```

### Admin Guard Pattern
```tsx
const { user, authReady } = useAuth();
useEffect(() => {
  if (!authReady) return; // wait for stored session, or a logged-in user gets bounced to /login
  if (!user) { router.replace('/login'); return; }
  if (!user.isAdmin) { router.replace('/'); return; }
}, [user, authReady, router]);
if (!user?.isAdmin) return null;
```

### API Authorization Header
```ts
headers: { Authorization: `Bearer ${user.token}` }
```

### Tailwind v4 Gradient Syntax
Use `bg-linear-to-br` not `bg-gradient-to-br` (Tailwind v4 canonical)

### toClient() Helper
Maps Supabase `id` → `_id` for frontend consistency:
```ts
export function toClient<T extends { id: string }>(obj: T) {
  const { id, ...rest } = obj;
  return { _id: id, ...rest };
}
```

### Flash Prevention (theme)
Blocking inline script in `<head>` reads `lumina-theme` from localStorage and adds `dark` class to `<html>` before React renders. Prevents white flash on dark mode reload.

---

## Features Implemented

| Feature | Status |
|---------|--------|
| Product listing + filters (category, price, sort) | ✅ |
| Product detail page + image gallery | ✅ |
| Product reviews (star rating, submit) | ✅ |
| Related products | ✅ |
| Cart (add/remove/qty, persisted) | ✅ |
| Coupon system (percent/flat, usage limits, expiry) | ✅ |
| Wishlist (add/remove, badge count) | ✅ |
| Checkout (3-step: address → payment → review); Cash on Delivery only (online wallet/card payments unavailable) | ✅ |
| Order tracking with courier timeline | ✅ |
| User auth (register, login, logout) | ✅ |
| Email verification (Resend emails) | ✅ |
| Forgot / reset password (`/forgot-password` → email → `/reset-password?token=reset_…`) | ✅ |
| Google OAuth | ✅ |
| Facebook OAuth | ✅ |
| Remember me (localStorage vs sessionStorage) | ✅ |
| User profile + order history | ✅ |
| Dark / light mode (full app) | ✅ |
| Admin: product CRUD + image upload | ✅ |
| Admin: orders management + mark delivered | ✅ |
| Admin: courier tracking integration | ✅ |
| Admin: coupon management | ✅ |
| Admin: sales dashboard (revenue charts, top products) | ✅ |
| Admin: complaints management | ✅ |
| Customer complaints form + my complaints | ✅ |
| WhatsApp floating button | ✅ |
| Skin Quiz (recommends real catalog products by skin type + goal) | ✅ |
| Contact form (`/api/contact`, emails CONTACT_EMAIL/ADMIN_EMAIL; WhatsApp fallback) | ✅ |
| Newsletter signup (forwards sign-ups to the store inbox) | ✅ |
| Guest wishlist (localStorage, merged into the account on sign-in) | ✅ |
| User avatar (gradient initials + profile photo) | ✅ |

---

## Environment Variables

### App (`.env.local`)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3001
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...            # optional sender, e.g. "Lumina <orders@yourdomain.pk>"
ADMIN_EMAIL=...                  # receives new-order, complaint, contact and newsletter emails
CONTACT_EMAIL=...                # optional; overrides ADMIN_EMAIL for contact/newsletter
NEXT_PUBLIC_WHATSAPP_NUMBER=923157320217   # defaults to this in lib/site.ts
```

### Migrations only (`.env`, never deployed)
```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
DIRECT_URL=...same Session pooler URI...
```

---

## Security Rules
- **Never trust prices from the client.** `POST /api/orders` accepts only product IDs, quantities, address, phone, payment choice and coupon code; it re-prices from the catalog, checks stock and re-validates the coupon via `evaluateCoupon()`.
- `?redirect=` values must go through `safeRedirectPath()` (prevents open redirects like `//evil.com`).
- Password-reset tokens share `User.verifyToken` but are prefixed `reset_`; `/api/users/verify` rejects them.
- Wrap all user-supplied text in `escapeHtml()` before putting it into an email.
- No fake features: don't show payment options, discounts or loyalty points that the backend doesn't actually implement.

## Dev Notes
- **Database migrations**: `supabase/migrations/` is authoritative. Apply every migration in filename order before deploying.
  - Runner: `npm run db:status` / `npm run db:migrate` (`scripts/migrate.mjs`, uses `pg`). History lives in `lumina_meta.schema_migrations` (outside `public`, so not exposed by the REST API). Each file + its history row runs in one transaction; top-level `begin;`/`commit;` lines in files are neutralised. Never edit an applied migration (checksum drift aborts the run) — add a new later-dated file. No `CREATE INDEX CONCURRENTLY`.
  - Connection order: `MIGRATION_DATABASE_URL` → `DIRECT_URL` → `DATABASE_URL` (from `.env`). Supabase's direct `db.<ref>.supabase.co` host is IPv6-only, so on IPv4 networks use the **Session pooler** URI (`aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.<ref>`).
  - A DB migrated by hand needs a one-time `node scripts/migrate.mjs --baseline <last-applied-file>.sql` (records without executing); the runner refuses to start on a populated DB with empty history.
- **Checkout** writes are transactional RPCs and require the database; never substitute a local order in production.
- **Offline fallback**: sample catalog/local complaints are development-only. Production data mutations fail safely when durable storage is unavailable.
- Product detail pages fetch data on the server for metadata, structured product information, and the initial render; interactive controls remain client components.
- `mounted` state guards are used where needed to prevent hydration mismatches (e.g., cart count, user menu)
- Supabase auto-generated TypeScript types may not include custom columns (like `picture`) until the schema is refreshed — TS6133 hints on these are false positives at build time
- The `@variant dark` in globals.css is Tailwind v4 syntax — do NOT use `darkMode: 'class'` in a config file
- Gradient classes must be written as complete strings (not dynamically constructed) for Tailwind JIT to include them
