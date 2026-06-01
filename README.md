# Lumina — Cosmetics E-Commerce Store

A complete, production-ready cosmetics e-commerce store built with **Next.js**, **Supabase**, and **Tailwind CSS**. Supports JazzCash, EasyPaisa, and Cash on Delivery — built for Pakistani market.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)

---

## What This Project Does

Lumina is a full-stack cosmetics store where:
- **Customers** can browse products, add to cart, checkout, and track orders
- **Admins** can add, edit, and delete products from a panel
- **Payments** supported: Cash on Delivery, JazzCash, EasyPaisa

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend + Backend | **Next.js 16** (App Router) | One app — no separate backend server needed |
| Language | **TypeScript** | Type safety, fewer bugs |
| Styling | **Tailwind CSS 4** | Fast, responsive UI |
| Database | **Supabase** (PostgreSQL) | Free, connects over HTTPS — no port blocking |
| Auth | **JWT + bcryptjs** | Secure, stateless login |
| Images | **Cloudinary** | Upload real product photos |
| Hosting | **Vercel** (free) | Perfect for Next.js |

---

## Project Structure

```
cosmetics-store/
├── Backend/              # Old Express API (not used — kept for reference)
└── Frontend/             # Main app — Next.js + Supabase
    ├── app/
    │   ├── page.tsx              # Home page
    │   ├── products/             # Product listing + detail
    │   ├── cart/                 # Shopping cart
    │   ├── checkout/             # 3-step checkout
    │   ├── order/[id]/           # Order confirmation
    │   ├── login/                # Login
    │   ├── register/             # Register
    │   ├── profile/              # My orders
    │   ├── admin/                # Admin panel (admin only)
    │   └── api/                  # Backend API routes
    │       ├── users/            # Register, Login, Profile
    │       ├── products/         # CRUD products
    │       ├── orders/           # Create, list, view orders
    │       ├── upload/           # Cloudinary image upload
    │       └── seed/             # One-time database seed
    ├── components/
    │   ├── Navbar.tsx
    │   ├── Footer.tsx
    │   └── ProductCard.tsx
    ├── context/
    │   ├── AuthContext.tsx       # Login state
    │   └── CartContext.tsx       # Cart state (localStorage)
    ├── lib/
    │   ├── api.ts                # Frontend fetch helper
    │   ├── auth.ts               # JWT helpers
    │   └── supabase.ts           # Supabase client
    └── prisma/
        └── schema.prisma         # Database schema reference
```

---

## All Pages

| URL | Page | Who can access |
|---|---|---|
| `/` | Home — hero, categories, featured products | Everyone |
| `/products` | All products with search + category filter | Everyone |
| `/products/[id]` | Product detail page | Everyone |
| `/cart` | Shopping cart | Everyone |
| `/checkout` | 3-step checkout (shipping → payment → review) | Logged in users |
| `/order/[id]` | Order confirmation + details | Order owner |
| `/login` | Login | Everyone |
| `/register` | Create account | Everyone |
| `/profile` | My account + order history | Logged in users |
| `/admin` | Admin panel — manage products | Admin only |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A free [Supabase](https://supabase.com) account
- A free [Cloudinary](https://cloudinary.com) account (for image uploads)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/muhammadshakoor/cosmetics-store.git
cd cosmetics-store/Frontend
npm install
```

---

### Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → Create a free project
2. Choose **Southeast Asia (Singapore)** as region
3. Once the project is ready, go to **SQL Editor** in the left sidebar
4. Click **New Query**, paste this SQL, and click **Run**:

```sql
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "countInStock" INTEGER NOT NULL DEFAULT 0,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "numReviews" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "itemsPrice" DOUBLE PRECISION NOT NULL,
  "taxPrice" DOUBLE PRECISION NOT NULL,
  "shippingPrice" DOUBLE PRECISION NOT NULL,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "isDelivered" BOOLEAN NOT NULL DEFAULT false,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "image" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id"),
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
);
```

5. Go to **Project Settings → API**, copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **service_role** key (long secret key)

---

### Step 3 — Configure environment

Create a file `Frontend/.env.local`:

```env
# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (change this to any random string)
JWT_SECRET=your_random_secret_key_here

# Cloudinary (optional — for image upload in admin)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=lumina_unsigned
```

---

### Step 4 — Run the store

```bash
cd Frontend
npm run dev
```

Open **http://localhost:3000**

---

### Step 5 — Seed sample data

Open your browser and visit:
```
http://localhost:3000/api/seed
```

This creates:
- **Admin account:** `admin@lumina.com` / `admin123`
- **Test account:** `user@lumina.com` / `user123`
- **8 sample products** (skincare, makeup, fragrance, hair care)

> ⚠️ Only works in development mode. Blocked in production.

---

## How to Add Products (Admin Guide)

### Method 1 — Admin Panel (recommended)

1. Run the store (`npm run dev`)
2. Open **http://localhost:3000/login**
3. Login with `admin@lumina.com` / `admin123`
4. Click **"Admin"** in the top-right navbar → **"Admin Panel"**
5. Click **"+ Add Product"**
6. Fill in all fields:
   - **Name** — product name (e.g. `Rose Face Wash`)
   - **Brand** — your brand name
   - **Category** — choose from: `skincare`, `makeup`, `fragrance`, `haircare`
   - **Price** — in dollars (e.g. `29.99`)
   - **Stock Qty** — how many items available
   - **Image** — upload from device OR paste an image URL
   - **Description** — product details, ingredients, how to use
7. Click **"Create Product"** — it goes live immediately

### Method 2 — Edit or Delete a product

In the Admin Panel, each product has two buttons:
- **✏️ Edit** — change any product details
- **🗑️ Delete** — permanently remove the product

### Getting product images

- **Upload your own photo** — use the upload button in the admin form
- **Free stock photos** — go to [unsplash.com](https://unsplash.com), find a cosmetics photo, right-click → Copy image address, paste in the Image URL field
- **Google Images** — search for your product, right-click image → Copy image address

---

## How to Check Orders

### As Admin
Currently orders are visible per-user in their profile. To see all orders, go to your Supabase dashboard → **Table Editor → Order** — all orders are listed there.

### As Customer
1. Login to your account
2. Click your name → **"My Profile"**
3. All your orders are listed with status (Processing / Delivered)
4. Click any order to see full details

---

## How Payments Work

The store supports three payment methods at checkout:

| Method | How it works |
|---|---|
| **Cash on Delivery (COD)** | Customer pays when order arrives. No setup needed. |
| **JazzCash** | Customer selects JazzCash — you contact them to collect payment. For automated JazzCash integration, a merchant account from JazzCash is required. |
| **EasyPaisa** | Same as JazzCash — manual collection or merchant API integration. |

For full automated JazzCash/EasyPaisa integration, register at:
- JazzCash: [jazzcash.com.pk/merchants](https://www.jazzcash.com.pk)
- EasyPaisa: [easypaisa.com.pk/merchant](https://www.easypaisa.com.pk)

---

## API Endpoints

All API routes are inside the Next.js app — no separate server.

### Users
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/users` | Public | Register |
| POST | `/api/users/login` | Public | Login |
| GET | `/api/users/profile` | Private | Get profile |

### Products
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | Public | Get all (supports `?keyword=` `?category=` `?limit=`) |
| GET | `/api/products/:id` | Public | Get one product |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |

### Orders
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | Private | Place order |
| GET | `/api/orders/myorders` | Private | My orders |
| GET | `/api/orders/:id` | Private | Order detail |

### Utility
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/seed` | Dev only | Seed sample data |
| POST | `/api/upload` | Admin | Upload image to Cloudinary |

---

## Deployment (Free)

### Deploy to Vercel (frontend + backend in one)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your GitHub repo
3. Set **Root Directory** to `Frontend`
4. Add environment variables (same as `.env.local`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_UPLOAD_PRESET`
5. Click **Deploy** — your store is live!

> No separate backend hosting needed. Vercel handles everything.

---

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@lumina.com` | `admin123` |
| Customer | `user@lumina.com` | `user123` |

---

## Cost Breakdown

| Service | Free Tier | When to upgrade |
|---|---|---|
| Vercel | ✅ Free forever | When you exceed 100GB bandwidth/month |
| Supabase | ✅ Free (500MB DB) | When you exceed 500MB storage |
| Cloudinary | ✅ Free (25GB storage) | When you have 10,000+ product images |

**Total cost to run this store: $0/month**

---

## License

MIT — free to use for personal and commercial projects.
