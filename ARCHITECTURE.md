# ARCHITECTURE.md — KAYA Bakery

## 1. Overview Sistem

Sistem terdiri dari **3 aplikasi terpisah** yang berkomunikasi lewat satu REST API:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   /web (public)      │     │   /dashboard (React)  │     │   /backend (Go)      │
│   Landing + katalog   │     │   Admin + Kasir SPA   │     │   REST API           │
│   HTML/Tailwind/GSAP  │────▶│   React + Vite        │────▶│   Gin + GORM         │
└─────────────────────┘     └──────────────────────┘     └─────────┬───────────┘
                                                                       │
                                                              ┌────────▼────────┐
                                                              │   PostgreSQL     │
                                                              └──────────────────┘
```

- **`/web`** — landing page publik, statis/ringan, animasi tinggi (GSAP, Lenis, WebGL
  opsional). Fetch data produk & submit pre-order lewat API publik (tanpa auth).
- **`/dashboard`** — satu React SPA dengan **role-based routing**: `/admin/*` dan
  `/kasir/*`. Setelah login, redirect otomatis sesuai role user.
- **`/backend`** — satu Go service yang melayani seluruh endpoint (publik, kasir, admin),
  dibedakan lewat middleware auth & role guard.

---

## 2. Tech Stack Detail

### Backend
| Komponen | Pilihan | Catatan |
|---|---|---|
| Bahasa | Go 1.22+ | |
| Web framework | Gin (`gin-gonic/gin`) | Fiber juga oke kalau agent lebih familiar |
| ORM | GORM (`gorm.io/gorm`) | + driver `gorm.io/driver/postgres` |
| Auth | JWT (`golang-jwt/jwt/v5`) | Access token, expiry 24 jam untuk kasir/admin |
| Password hashing | `bcrypt` (`golang.org/x/crypto/bcrypt`) | |
| Validasi input | `go-playground/validator/v10` | |
| Migration | GORM AutoMigrate (v1) atau `golang-migrate` (kalau mau lebih rapi) | |
| Env config | `joho/godotenv` | |

### Database
- **PostgreSQL 15+**
- UUID sebagai primary key semua tabel (`gen_random_uuid()` via ekstensi `pgcrypto`,
  atau generate UUID di aplikasi)

### Dashboard (Admin + Kasir)
| Komponen | Pilihan |
|---|---|
| Framework | React 18 + Vite |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v6 (role-protected routes) |
| State/data fetching | TanStack Query (React Query) |
| Chart statistik | Recharts |
| Form | React Hook Form + Zod |
| Barcode render | `jsbarcode` (Code128) atau `qrcode.react` (kalau pakai QR) |
| Barcode scan (kamera) | `html5-qrcode` |

### Landing Page Publik
| Komponen | Pilihan |
|---|---|
| Base | HTML + Tailwind CSS (CDN) |
| Animasi scroll/reveal | GSAP 3 + ScrollTrigger |
| Smooth scroll | Lenis |
| Icon | Iconify (`iconify-icon` web component) |
| Data produk | Fetch ke `GET /api/v1/products` (publik, tanpa auth) |

---

## 3. Struktur Folder

### `/backend`
```
backend/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/          # load env, koneksi DB
│   ├── models/          # struct GORM: User, Product, Order, dst (lihat ERD.md)
│   ├── handlers/         # controller per resource
│   │   ├── auth_handler.go
│   │   ├── product_handler.go
│   │   ├── category_handler.go
│   │   ├── order_handler.go
│   │   ├── payment_handler.go
│   │   ├── stock_handler.go
│   │   ├── user_handler.go       # kelola akun kasir (admin only)
│   │   ├── dashboard_handler.go  # statistik
│   │   └── settings_handler.go
│   ├── middleware/
│   │   ├── auth.go        # verifikasi JWT
│   │   └── role_guard.go  # cek role (admin/kasir)
│   ├── repository/        # query database per resource
│   ├── services/          # business logic (generate order_code, hitung stok, dll)
│   └── routes/
│       └── routes.go
├── migrations/            # kalau pakai golang-migrate
├── .env.example
├── go.mod
└── go.sum
```

### `/dashboard`
```
frontend/
├── src/
│   ├── pages/
│   │   ├── auth/Login.tsx
│   │   ├── admin/
│   │   │   ├── DashboardHome.tsx     # statistik
│   │   │   ├── Products.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── Cashiers.tsx          # kelola akun kasir
│   │   │   ├── Settings.tsx
│   │   │   └── ActivityLogs.tsx
│   │   └── kasir/
│   │       ├── POS.tsx               # layar transaksi utama
│   │       ├── ScanOrder.tsx         # scan barcode pesanan
│   │       └── AddProduct.tsx        # input roti baru
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── ui/               # glass-card, stat-card, data-table (lihat DESIGN.md)
│   │   └── pos/
│   │       ├── ProductGrid.tsx
│   │       ├── Cart.tsx
│   │       └── BarcodeDisplay.tsx
│   ├── lib/
│   │   ├── api.ts            # axios/fetch client + interceptor JWT
│   │   └── auth.ts           # simpan token, context role
│   ├── routes/
│   │   └── AppRouter.tsx     # role-protected routes
│   └── App.tsx
├── tailwind.config.js
└── vite.config.ts
```

### `/web`
```
web/
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── main.js       # GSAP init, Lenis init
│       └── api.js        # fetch produk & submit pre-order
└── order-status.html     # halaman cek status pesanan via kode
```

---

## 4. Environment Variables

### Backend (`.env`)
```
PORT=8080
DATABASE_URL=postgres://user:password@localhost:5432/kaya_bakery?sslmode=disable
JWT_SECRET=<random-strong-secret>
JWT_EXPIRY_HOURS=24
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Dashboard (`.env`)
```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

---

## 5. Auth Flow Ringkas

1. Admin/Kasir login via `POST /api/v1/auth/login` → dapat JWT.
2. Token disimpan di `localStorage` (atau `httpOnly` cookie kalau mau lebih aman —
   disarankan cookie untuk production).
3. Setiap request ke endpoint terproteksi menyertakan header
   `Authorization: Bearer <token>`.
4. Middleware `auth.go` verifikasi token → inject `user_id` & `role` ke context.
5. Middleware `role_guard.go` cek apakah role user sesuai requirement endpoint.
6. Publik **tidak** melalui flow ini sama sekali — endpoint publik tidak butuh token.

Detail endpoint ada di `API.md`, detail permission per role ada di `ROLES.md`.

---

## 6. Deployment (Ringkas)

- **Backend**: build binary Go (`go build`), jalankan di VPS/container, di belakang
  reverse proxy (Nginx/Caddy) untuk HTTPS.
- **Database**: PostgreSQL terkelola (misal: Supabase, Neon, atau self-hosted).
- **Dashboard**: build static (`vite build`) → hosting statis (Vercel/Netlify) atau
  disajikan lewat Nginx yang sama dengan backend.
- **Landing (`/web`)**: static hosting juga (Vercel/Netlify/GitHub Pages cukup).
- Disarankan pakai **Docker Compose** untuk local dev (backend + Postgres) — agent
  boleh membuatkan `docker-compose.yml` di root project saat setup.
