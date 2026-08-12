# KAYA Bakery 🥖

Full-stack bakery management and ordering system — Go REST API backend, React + TypeScript admin/cashier dashboard, and a public HTML landing page with pre-order flow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go 1.22 · Gin · GORM · PostgreSQL |
| **Dashboard** | React 18 · Vite · TypeScript · Tailwind CSS 3 |
| **Landing Page** | HTML · Tailwind CDN · GSAP · Lenis |
| **Auth** | JWT (RS256-compatible, HS256 default) |
| **Barcode** | JsBarcode (Code128) |
| **Infrastructure** | Docker Compose |

---

## Monorepo Structure

```
shoop/
├── backend/           # Go REST API
│   ├── cmd/api/       # Server entrypoint
│   ├── cmd/seed/      # Admin seed CLI
│   └── internal/
│       ├── config/
│       ├── db/
│       ├── handlers/
│       ├── middleware/
│       ├── models/
│       ├── response/
│       ├── routes/
│       ├── services/
│       └── utils/
├── dashboard/         # React SPA (admin + kasir)
│   └── src/
│       ├── lib/       # API client, Auth context
│       ├── pages/
│       │   ├── admin/ # Dashboard, Products, Orders, Cashiers, Logs, Settings
│       │   ├── auth/  # Login
│       │   └── kasir/ # POS, ScanOrder, AddProduct
│       └── routes/
├── web/               # Static landing page
│   ├── index.html
│   ├── order-status.html
│   └── assets/
│       ├── css/style.css
│       └── js/
│           ├── api.js   # Cart, API calls, barcode
│           └── main.js  # GSAP + Lenis animations
└── docker-compose.yml
```

---

## Prerequisites

- **Go** 1.22+ (or use bundled `go_sdk/`)
- **Node.js** 18+ and npm
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (via Docker or local)

---

## 1. Backend Setup

### Copy environment file

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=kaya_user
DB_PASSWORD=kaya_pass
DB_NAME=kaya_bakery
JWT_SECRET=change-me-in-production
SERVER_PORT=8080
```

### Start database with Docker

```bash
# From repo root
docker-compose up -d db
```

### Run database migration + seed admin

```bash
cd backend

# Go binary (Windows, bundled SDK)
$env:PATH = "e:\work\shoop\go_sdk\go\bin;$env:PATH"
$env:GOPATH = "e:\work\shoop\go"
$env:GOMODCACHE = "e:\work\shoop\go\pkg\mod"

go run ./cmd/seed
```

This creates the admin account:
- **Email:** `admin@kayabakery.id`
- **Password:** `admin123`

### Start backend server

```bash
go run ./cmd/api
# Server runs on http://localhost:8080
```

### Or run everything with Docker Compose

```bash
docker-compose up --build
```

---

## 2. Dashboard Setup

```bash
cd dashboard

# Copy env
cp .env.example .env
# Edit VITE_API_BASE_URL=http://localhost:8080/api/v1

# Install deps
npm install

# Dev server
npm run dev
# Opens at http://localhost:5173
```

### Login

Navigate to `http://localhost:5173/login`

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@kayabakery.id` | `admin123` |
| Kasir | (dibuat melalui Admin > Kasir) | (diset saat buat akun) |

### Dashboard Features

**Admin (`/admin/*`)**
- Dashboard overview dengan revenue charts dan statistik real-time
- Manajemen Produk (CRUD, soft-delete, stok badge)
- Daftar Pesanan dengan filter status/tipe/tanggal
- Manajemen Kasir (buat, aktifkan/nonaktifkan)
- Log Aktivitas (semua mutasi tercatat)
- Pengaturan Toko (nama, jam, alamat, WhatsApp)

**Kasir (`/kasir/*`)**
- **POS** — product grid tap-to-add, cart panel, proses bayar, barcode receipt
- **Scan Pesanan** — cari pre-order by kode, konfirmasi bayar
- **Tambah Produk** — form 2-step: buat produk → set stok awal

---

## 3. Landing Page

Tidak perlu build step — buka langsung di browser:

```
web/index.html
```

Pastikan backend berjalan di `localhost:8080`. Landing page akan:
- Load produk live dari API
- Menampilkan produk habis dengan overlay "Stok Habis"
- Mengizinkan pre-order dengan flow: pilih produk → isi nama/HP → mock payment → tampilkan barcode Code128

### Cek status pesanan

Buka `web/order-status.html` atau klik link di halaman utama.

---

## 4. API Overview

Base URL: `http://localhost:8080/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | — | Login, returns JWT |
| `GET` | `/products` | — | List produk publik |
| `GET` | `/categories` | — | List kategori |
| `POST` | `/orders` | — | Buat pre-order |
| `POST` | `/orders/:id/pay_mock` | — | Simulasi bayar |
| `GET` | `/orders/:code` | — | Cek status pesanan |
| `POST` | `/pos/orders` | kasir/admin | POS walk-in order |
| `PATCH` | `/pos/products/:id/stock` | kasir/admin | Update stok |
| `GET` | `/admin/dashboard/stats` | admin | Statistik dashboard |
| `GET` | `/admin/orders` | admin | Semua pesanan |
| `GET` | `/admin/logs` | admin | Log aktivitas |
| `PATCH` | `/admin/settings` | admin | Update pengaturan |

Lihat `API.md` untuk dokumentasi endpoint lengkap.

---

## 5. Business Rules

- **Order code** format: `KYA-YYYYMMDD-XXXX`
- **Harga** selalu diambil dari database, bukan dari client input
- **Deduct stok** hanya terjadi saat status berubah ke `paid`
- **Stock movements** dicatat setiap ada perubahan stok (type: `in` / `out`)
- **Activity logs** dibuat untuk setiap mutasi yang dilakukan admin/kasir
- Produk tidak bisa dihapus permanen — hanya di-deactivate (soft delete)

---

## 6. Development Commands

```bash
# Backend: build binary
go build -o api.exe ./cmd/api

# Dashboard: production build
npm run build

# Run tests (jika ada)
go test ./...

# Docker: rebuild + restart
docker-compose up --build -d
```

---

## License

MIT — KAYA Bakery © 2026
