# Lumina Cosmetics Store — Project Context

## Overview
Full-stack e-commerce app for a cosmetics brand called **Lumina**. Customers can browse products, add to cart/wishlist, checkout, track orders, and submit complaints. Admins manage products, orders, coupons, and view a sales dashboard.

## Tech Stack

### Frontend (`/Frontend`)
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 — uses `@import "tailwindcss"` in globals.css, no `tailwind.config.js`
- **Icons**: lucide-react
- **Toasts**: react-hot-toast
- **Database client**: @supabase/supabase-js
- **Auth**: JWT (jsonwebtoken + bcryptjs) handled in Next.js API routes
- **Font**: Inter (Google Fonts)

### Backend (`/Backend`)
- **Runtime**: Node.js + Express + TypeScript (compiled to `/Backend/dist`)
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT tokens, bcryptjs password hashing

> The app's primary data layer is through **Next.js API routes** (`/Frontend/app/api/`), not the Express backend. The Express backend (`/Backend`) is a legacy layer; most features use Next.js routes directly.

---

## Architecture

### Authentication Flow
1. Email/password → `POST /api/users/login` → returns `{ _id, name, email, isAdmin, picture?, token }`
2. Google OAuth → `/api/auth/google` → callback → `/api/auth/google/callback` → redirect to `/auth/callback?token=...` → fetches `/api/users/profile` → `login()` in AuthContext
3. Facebook OAuth → same pattern via `/api/auth/facebook/callback`
4. Token stored in `localStorage` (remember me) or `sessionStorage` (session only), key: `userInfo`
5. `useAuth()` hook from `AuthContext` provides `{ user, login, logout }`

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

### Key Frontend Files
```
Frontend/
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
    ├── auth.ts                 # signToken(), getAuthUser(), toClient()
    ├── supabase.ts             # Supabase client (server-side)
    ├── api.ts                  # Client-side fetch helpers
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
- Desktop nav links: Home, Shop, Skincare, Makeup, Jewellery
- Desktop search bar (expandable input with Search icon)
- **Mobile search**: Search icon in navbar → expands full-width search bar below header row; auto-focuses input; closes on route change or X button
- Theme toggle (sun/moon)
- Wishlist icon with badge count
- Cart icon with badge count
- User avatar button:
  - **With picture**: shows `<img>` (Google/Facebook photo), `referrerPolicy="no-referrer"`
  - **Without picture**: colored gradient initials circle (gradient chosen by `name.charCodeAt(0)`)
  - Dropdown shows: profile header (avatar + full name + email), My Profile, Admin links (if admin), My Complaints / Submit Complaint (if customer), Sign out
- Mobile hamburger → drawer with all nav links + user profile section
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
useEffect(() => {
  if (!user) { router.replace('/login'); return; }
  if (!user.isAdmin) { router.replace('/'); return; }
}, [user, router]);
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
| Checkout (3-step: address → payment → review) | ✅ |
| Order tracking with courier timeline | ✅ |
| User auth (register, login, logout) | ✅ |
| Email verification (Resend emails) | ✅ |
| Forgot password | ✅ |
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
| Zanderio AI chat widget (loaded via `next/script` in `layout.tsx`) | ✅ |
| Newsletter signup | ✅ |
| Jewelry category | ✅ |
| Mobile search in navbar | ✅ |
| User avatar (gradient initials + profile photo) | ✅ |

---

## Environment Variables

### Frontend (`.env.local`)
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
NEXT_PUBLIC_WHATSAPP_NUMBER=...
```

### Backend (`.env`)
```
MONGO_URI=... (or Supabase connection string)
JWT_SECRET=...
PORT=5000
```

---

## Dev Notes
- All pages use `'use client'` directive (client components only — no RSC data fetching)
- `mounted` state guards are used where needed to prevent hydration mismatches (e.g., cart count, user menu)
- Supabase auto-generated TypeScript types may not include custom columns (like `picture`) until the schema is refreshed — TS6133 hints on these are false positives at build time
- The `@variant dark` in globals.css is Tailwind v4 syntax — do NOT use `darkMode: 'class'` in a config file
- Gradient classes must be written as complete strings (not dynamically constructed) for Tailwind JIT to include them
