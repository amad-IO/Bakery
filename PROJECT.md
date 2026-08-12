# Project: KAYA Bakery System

## Architecture
- Backend: Go 1.22+ with Gin web framework, GORM ORM, PostgreSQL database (`backend/`).
- Dashboard SPA: React 18+ with Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v6, React Hook Form + Zod, Recharts, jsbarcode, html5-qrcode (`dashboard/`).
- Public Landing Page: Static HTML5, Tailwind CSS (CDN), GSAP 3 + ScrollTrigger, Lenis smooth scroll, jsbarcode Code128 (`web/`).
- DevOps: Docker Compose (`docker-compose.yml`) for Go backend + PostgreSQL 15, `.env.example` configurations.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Schema & GORM Models | 9 tables (`users`, `categories`, `products`, `orders`, `order_items`, `payments`, `stock_movements`, `activity_logs`, `store_settings`) with GORM tags, UUID PKs, indexes | M1 | ERD.md |
| 2 | Backend App Setup & DB Conn | Go Gin server initialization, PostgreSQL connection with GORM, CORS middleware, env config | M1 | ARCHITECTURE.md §3 |
| 3 | Admin & Cashier Auth | JWT generation, password hashing (bcrypt), `POST /auth/login`, `GET /auth/me`, auth middleware | M2 | API.md, ROLES.md |
| 4 | Role Guard Middleware & Audit Logging | Admin vs Cashier role check middleware (`RequireRole`), automatic `activity_logs` insertion on mutating endpoints | M2 | ROLES.md, API.md |
| 5 | Admin Seed CLI Script | Seed script/command creating initial admin account `owner@kaya.id` | M2 | R1, README.md |
| 6 | Category & Product CRUD API | `GET /categories`, `GET /products`, `GET /products/:slug`, Admin CRUD (`POST`, `PUT`, `DELETE /admin/categories`, `POST`, `PUT`, `DELETE /admin/products`), image upload mock | M3 | API.md |
| 7 | Public Pre-Order API & Order Code | `POST /orders`, `GET /orders/:order_code`, server-side `KYA-YYYYMMDD-XXXX` generator, master price snapshot | M3 | API.md, R2 |
| 8 | Mock Payment & Stock Deduction API | `POST /orders/:id/pay_mock`, transition to `paid`, stock deduction (`stock_qty`), `stock_movements` (`type: out`), barcode payload | M3 | API.md, R2 |
| 9 | POS Cashier API | `POST /pos/orders`, `GET /pos/orders/scan/:order_code`, `PATCH /pos/orders/:id/status`, `POST /pos/orders/:id/payments`, `POST /pos/products`, `PATCH /pos/products/:id/stock` | M3 | API.md, R2 |
| 10 | Admin Stats, Logs & Settings API | `GET /admin/dashboard/stats`, `GET /admin/logs`, `GET/PATCH /admin/settings` | M3 | API.md |
| 11 | Dashboard Infrastructure & Auth | React + Vite + TS SPA setup in `dashboard/`, Tailwind configuration with design tokens (`#241610`, `#e8a33d`, `#faf7f2`, Geist/Inter), Auth Context, React Router v6 role-protected routes (`/admin/*`, `/kasir/*`) | M4 | R3, DESIGN.md |
| 12 | Admin Dashboard SPA Pages | `DashboardHome` (stats cards + Recharts), `Products` (CRUD table, zero-stock "Habis" badge), `Orders` (filtering), `Cashiers` (list, create, toggle `is_active`), `ActivityLogs` (paginated table), `Settings` (form) | M4 | R3, USER-FLOWS.md |
| 13 | Cashier POS SPA Pages | `POS` (touch grid, sticky cart, payment modal, receipt + Code128 barcode display, auto-reset cart), `ScanOrder` (`html5-qrcode` camera scan, order lookup, confirm payment), `AddProduct` (product entry, initial stock 0, quick restock) | M4 | R3, USER-FLOWS.md |
| 14 | Public Landing Page Catalog & Pre-order | `web/index.html` static HTML/Tailwind CDN, dark brown canvas `#241610`, amber `#e8a33d`, glassmorphism cards, GSAP/Lenis animations, live API product fetch, out-of-stock overlay, customer info modal, mock payment screen, `jsbarcode` Code128 rendering, "Simpan Barcode" PNG download button, `prefers-reduced-motion` compliance | M5 | R4, DESIGN.md |
| 15 | Public Order Status Lookup Page | `web/order-status.html` for looking up `order_code` via `GET /orders/:order_code` and displaying live status | M5 | R4 |
| 16 | Docker Compose & Setup Docs | `docker-compose.yml` starting Go backend API + PostgreSQL 15, `.env.example` for backend & dashboard, updated `README.md` with setup & run instructions | M6 | R5 |
| 17 | E2E Testing Suite & Infrastructure | Independent requirement-driven E2E test suite executing Tiers 1-4 (Feature Coverage, Corner Cases, Cross-Feature Combinations, Real-World Scenarios) -> publishes `TEST_READY.md` | M-TEST | Dual Track E2E |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Foundation & DB Schema | Setup `backend/` Go module, GORM models (9 tables), DB connection, migrations | none | DONE |
| M2 | Auth, Middleware & Seed CLI | JWT auth, role middleware, activity logging service, admin seed script | M1 | PLANNED |
| M3 | Core API Endpoints & Business Logic | Product CRUD, Pre-orders (`KYA-YYYYMMDD-XXXX`), Mock Payment & Stock Deduction (`pay_mock`), POS endpoints, Admin Stats/Logs/Settings | M1, M2 | PLANNED |
| M4 | Dashboard SPA Frontend | React/Vite/TS SPA in `dashboard/`, Auth routing, Admin screens, Cashier POS (`jsbarcode`, `html5-qrcode`) | M3 | PLANNED |
| M5 | Public Landing Page & Order Status | Static HTML/Tailwind/GSAP in `web/`, live catalog, pre-order modal, mock payment, Code128 barcode download, order status lookup | M3 | PLANNED |
| M6 | Docker Compose & Developer Setup | `docker-compose.yml`, `.env.example` templates, updated setup documentation in `README.md` | M1, M2, M3, M4, M5 | PLANNED |
| M-TEST | E2E Testing Track | Independent requirement-driven test suite (Tiers 1-4) published via `TEST_READY.md` | none (runs in parallel) | DONE |

## Interface Contracts
### Public API ↔ Frontend (Dashboard & Landing Page)
- Base URL: `http://localhost:8080/api/v1`
- Content-Type: `application/json`
- Auth Header: `Authorization: Bearer <jwt_token>` (for Admin & Cashier protected routes)
- `order_code` Format: `KYA-YYYYMMDD-XXXX` (e.g. `KYA-20260812-0417`)
- Products Response: `stock_qty` integer, `is_available` boolean. Frontend renders disabled overlay when `stock_qty === 0`.
- Mock Payment Response: `POST /orders/:id/pay_mock` -> `{ status: "success", data: { order_code: "KYA-20260812-0417", barcode_data: "KYA-20260812-0417", total_amount: 150000, items: [...] } }`.

## Code Layout
```
e:\work\shoop\
├── backend/                  # Go REST API Backend (R1, R2)
│   ├── cmd/
│   │   ├── api/main.go       # API Entrypoint
│   │   └── seed/main.go      # Admin Seed CLI Script
│   ├── internal/
│   │   ├── config/           # Env & Database Config
│   │   ├── handlers/         # Auth, Product, Order, POS, Admin Handlers
│   │   ├── middleware/       # JWT Auth, Role Guard, Activity Logger
│   │   ├── models/           # GORM Data Models (9 tables)
│   │   ├── repository/       # Database queries
│   │   ├── routes/           # Gin Route Definitions
│   │   └── services/         # Business Logic (Order code gen, Stock deduction)
│   ├── .env.example
│   └── go.mod
├── dashboard/                # React + Vite + TS SPA (R3)
│   ├── src/
│   │   ├── components/       # UI Components (Sidebar, Header, Cards, Barcode, Scanner)
│   │   ├── context/          # Auth Context & Provider
│   │   ├── pages/            # Admin & Cashier Pages
│   │   ├── services/         # API Service Calls (Axios / Fetch + TanStack Query)
│   │   ├── types/            # TypeScript interfaces
│   │   ├── AppRouter.tsx     # Role-guarded React Router v6
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── web/                      # Public Landing Page (R4)
│   ├── index.html            # Main Landing Page with Catalog & Pre-order modal
│   ├── order-status.html     # Order Status Lookup Page
│   └── assets/
│       ├── css/style.css     # Custom Tailwind & Glassmorphism styles
│       └── js/app.js         # GSAP, Lenis, JSBarcode, API integration logic
├── e2e_tests/                # Requirement-Driven E2E Test Suite
│   ├── runner.js             # Test runner script
│   └── suites/               # Tier 1, Tier 2, Tier 3, Tier 4 test cases
├── docker-compose.yml        # Docker setup (Go API + PostgreSQL 15)
└── README.md                 # Project README with setup & run instructions
```
