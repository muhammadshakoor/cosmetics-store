# Lumina — Cosmetics E-Commerce Store

A full-stack cosmetics e-commerce store built with **Next.js**, **Express**, and **MongoDB**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)

---

## Features

- **Home page** — Hero banner, category grid, featured products
- **Product listing** — Search, filter by category, responsive grid
- **Product detail** — Images, ratings, add to cart
- **Shopping cart** — Quantity controls, price summary, free shipping threshold
- **3-step checkout** — Shipping address → Payment method → Order review
- **Order confirmation** — Full order summary with status tracking
- **User auth** — Register, Login, JWT-based sessions
- **User profile** — View order history
- **Admin panel** — Add, edit, delete products (admin-only)
- **Fully responsive** — Works on mobile, tablet, and desktop

---

## Project Structure

```
cosmetics-store/
├── Backend/          # Express + TypeScript REST API
│   ├── src/
│   │   ├── config/       # MongoDB connection
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # JWT auth + admin guard
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Token helpers
│   │   ├── seeder.ts     # Sample data seeder
│   │   └── server.ts     # Express app entry point
│   └── package.json
│
└── Frontend/         # Next.js 16 + TypeScript + Tailwind CSS
    ├── app/
    │   ├── page.tsx          # Home
    │   ├── products/         # Product listing + detail
    │   ├── cart/             # Shopping cart
    │   ├── checkout/         # 3-step checkout
    │   ├── order/[id]/       # Order confirmation
    │   ├── login/            # Login
    │   ├── register/         # Register
    │   ├── profile/          # User profile + orders
    │   └── admin/            # Admin panel
    ├── components/       # Navbar, Footer, ProductCard
    ├── context/          # Auth + Cart React context
    └── lib/              # API fetch helper
```

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 16, React 19, TypeScript  |
| Styling    | Tailwind CSS 4                    |
| Backend    | Express.js, TypeScript, Node.js   |
| Database   | MongoDB with Mongoose             |
| Auth       | JWT (JSON Web Tokens)             |
| Icons      | Lucide React                      |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) (local) **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

---

### 1. Clone the repository

```bash
git clone https://github.com/muhammadshakoor/cosmetics-store.git
cd cosmetics-store
```

---

### 2. Set up the Backend

```bash
cd Backend
npm install
```

Create a `.env` file inside `Backend/`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/cosmetics-store
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:3000
```

Seed the database with sample products and users:

```bash
npm run seed
```

This creates:
- **Admin account** — `admin@lumina.com` / `admin123`
- **Test account** — `user@lumina.com` / `user123`
- **8 sample products** across skincare, makeup, fragrance, and hair care

Start the backend server:

```bash
npm run dev
```

Backend runs at **http://localhost:5000**

---

### 3. Set up the Frontend

```bash
cd ../Frontend
npm install
```

Create a `.env.local` file inside `Frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## API Endpoints

### Users
| Method | Endpoint              | Access  | Description        |
|--------|-----------------------|---------|--------------------|
| POST   | `/api/users`          | Public  | Register           |
| POST   | `/api/users/login`    | Public  | Login              |
| GET    | `/api/users/profile`  | Private | Get profile        |

### Products
| Method | Endpoint              | Access       | Description        |
|--------|-----------------------|--------------|--------------------|
| GET    | `/api/products`       | Public       | Get all products   |
| GET    | `/api/products/:id`   | Public       | Get single product |
| POST   | `/api/products`       | Admin only   | Create product     |
| PUT    | `/api/products/:id`   | Admin only   | Update product     |
| DELETE | `/api/products/:id`   | Admin only   | Delete product     |

### Orders
| Method | Endpoint              | Access  | Description        |
|--------|-----------------------|---------|--------------------|
| POST   | `/api/orders`         | Private | Place order        |
| GET    | `/api/orders/myorders`| Private | My orders          |
| GET    | `/api/orders/:id`     | Private | Order detail       |

---

## Database — Which to Choose?

> **Recommendation: MongoDB Atlas (free tier) — already set up, zero migration needed.**

| Database        | Free Tier     | Best For                        | Notes                          |
|----------------|---------------|---------------------------------|--------------------------------|
| **MongoDB Atlas** | ✅ 512 MB free | Flexible product catalogs       | Already used in this project   |
| **Supabase** (PostgreSQL) | ✅ 500 MB free | Relational data, SQL queries    | Requires full backend rewrite  |
| **PlanetScale** (MySQL) | ❌ Paid only  | High-traffic relational data    | No free tier anymore           |

**For starting out with minimum cost: use MongoDB Atlas free tier.** It supports hundreds of products and thousands of orders at zero cost. Upgrade only when you outgrow 512 MB.

---

## Deployment (Free)

| Service           | What it hosts        | Free tier |
|-------------------|----------------------|-----------|
| **Vercel**        | Frontend (Next.js)   | ✅ Yes    |
| **Render**        | Backend (Node.js)    | ✅ Yes    |
| **MongoDB Atlas** | Database             | ✅ Yes    |

### Steps:
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) → copy the connection URI → set it as `MONGO_URI` in your backend env
2. Deploy `Backend/` to [Render](https://render.com) → set all env variables → copy the live URL (e.g. `https://lumina-api.onrender.com`)
3. Deploy `Frontend/` to [Vercel](https://vercel.com) → set `NEXT_PUBLIC_API_URL` to your Render URL

---

## License

MIT
