# 🐾 Nanny — Pet Care Platform

A full-stack web application that connects pet owners with verified pet sitters
in Almaty, Kazakhstan. Built as part of the Lab 1–4 series (user research,
requirements, statistical analysis, model evaluation).

Stack: **Next.js + React + TailwindCSS** (frontend) · **Node.js + Express + PostgreSQL + Socket.io** (backend) · **JWT + bcrypt** (auth).

---

## 📁 Project structure

```
nanny/
├── backend/
│   ├── db/
│   │   ├── schema.sql              # PostgreSQL schema (all tables, FKs, indexes)
│   │   └── seed.sql                # Sample users, sitters, pets, bookings, products
│   ├── src/
│   │   ├── config/db.js            # pg connection pool
│   │   ├── middleware/auth.js      # JWT verify + role guard
│   │   ├── utils/jwt.js            # Token signing
│   │   ├── controllers/            # auth, user, pet, sitter, booking, message,
│   │   │                           # review, product, order, admin
│   │   ├── routes/                 # Express routers matching each controller
│   │   ├── sockets/chat.js         # Socket.io chat handlers (JWT-authenticated)
│   │   └── server.js               # Express + Socket.io entry point
│   ├── .env.example
│   ├── .env.docker.example
│   └── package.json
├── frontend/
│   ├── components/                 # Navbar, Sidebar, DashboardLayout, Footer
│   ├── lib/api.js                  # fetch wrapper + JWT session helpers
│   ├── pages/
│   │   ├── index.js                # Public landing page (hero, how it works, FAQ)
│   │   ├── login.js · register.js
│   │   ├── dashboard.js            # User profile & quick stats
│   │   ├── pets/index.js           # CRUD for pets
│   │   ├── sitters/index.js        # Search with filters
│   │   ├── sitters/[id].js         # Sitter profile + booking form + reviews
│   │   ├── bookings/index.js       # My bookings (as owner / as sitter)
│   │   ├── chat.js                 # Real-time chat via Socket.io
│   │   ├── calendar.js             # Monthly schedule of bookings
│   │   ├── shop/index.js · cart.js · orders.js
│   │   └── admin/index.js          # Admin: stats, users, verification, bookings
│   ├── styles/globals.css          # Tailwind + theme tokens
│   ├── tailwind.config.js · postcss.config.js · next.config.js
│   ├── .env.local.example
│   └── package.json
├── docker-compose.yml              # Docker Compose for db + backend + frontend
├── .gitignore
└── README.md
```

## 👥 User roles

| Role        | Permissions |
|-------------|-------------|
| **Guest**   | Browse landing, sitter list & sitter profiles |
| **Owner**   | Register pets, search sitters, book, chat, shop |
| **Sitter**  | Own sitter profile, set services & price, manage bookings |
| **Admin**   | Verify sitters, block users, moderate reviews, manage shop |

## 🗃 Database tables (PostgreSQL)

`users`, `pets`, `sitters`, `sitter_services`, `bookings`, `messages`, `reviews`,
`products`, `orders`, `order_items` — with proper foreign keys and indexes.
See `backend/db/schema.sql`.

---

## 🚀 Run locally

### 1. Prerequisites

- **Node.js** ≥ 18
- **Docker Desktop / Docker App** or **PostgreSQL** ≥ 13 running locally
- **npm** (bundled with Node)

### 2. Choose how you want to run it

#### Option A. Entire project in Docker (recommended for demos)

This runs **PostgreSQL + backend + frontend** together:

```bash
docker compose up --build
```

Open:
- frontend: **http://localhost:3000**
- backend API: **http://localhost:4000**
- database: **localhost:55432**
- pgAdmin: **http://localhost:5050**

If you already have local `npm run dev` processes open on ports `3000` or `4000`,
stop them first, otherwise Docker will not be able to bind those ports.

Useful commands:
