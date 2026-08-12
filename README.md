# KAYA Bakery — Monorepo

> Sistem manajemen toko roti full-stack: Landing Page Publik · Dashboard Admin & Kasir · REST API

[![CI · Backend](https://github.com/amad-IO/Bakery/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/amad-IO/Bakery/actions/workflows/ci-backend.yml)
[![CI · Dashboard](https://github.com/amad-IO/Bakery/actions/workflows/ci-dashboard.yml/badge.svg)](https://github.com/amad-IO/Bakery/actions/workflows/ci-dashboard.yml)

---

## 📦 Struktur Monorepo

```
kaya-bakery/
├── backend/          # Go + Gin REST API
├── dashboard/        # React + Vite + TypeScript SPA (Admin & Kasir)
├── web/              # Landing page publik (HTML + Tailwind + GSAP)
├── docker-compose.yml
├── .github/
│   ├── workflows/
│   │   ├── ci-backend.yml      # CI Go — test & build
│   │   ├── ci-dashboard.yml    # CI React — type-check & build
│   │   ├── ci-web.yml          # CI Web — validasi HTML
│   │   └── cd-deploy.yml       # CD — deploy ke production
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── API.md            # Spesifikasi REST API
├── ARCHITECTURE.md   # Arsitektur & tech stack
├── DESIGN.md         # Design system
├── ERD.md            # Skema database
├── ROLES.md          # Matriks hak akses
└── USER-FLOWS.md     # Alur penggunaan
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/amad-IO/Bakery.git
cd kaya-bakery

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env sesuai kebutuhan (JWT_SECRET wajib diisi)

# Dashboard env
cp dashboard/.env.example dashboard/.env
```

### 2. Jalankan Database & Backend (Docker)

```bash
docker-compose up -d postgres

# Seed akun admin pertama
cd backend
go run ./cmd/seed

# Jalankan backend
go run ./cmd/api
# → API berjalan di http://localhost:8080
```

Atau jalankan keduanya sekaligus:

```bash
docker-compose up -d
```

### 3. Jalankan Dashboard (Dev Server)

```bash
cd dashboard
npm install
npm run dev
# → Dashboard berjalan di http://localhost:5173
```

### 4. Buka Landing Page

```bash
# Cukup buka di browser langsung (static HTML)
# → Buka web/index.html di browser
# → Atau pakai live server: npx serve web
npx serve web
# → Landing page di http://localhost:3000
```

### Default Credentials (Setelah Seed)

| Role  | Email             | Password     |
|-------|-------------------|--------------|
| Admin | admin@kaya.id     | admin123     |

> ⚠️ **Ganti password admin segera setelah login pertama di production!**

---

## 🌿 Git Branching Strategy

```
main          ← production-ready, protected
develop       ← integration branch
feature/*     ← fitur baru (branch dari develop)
fix/*         ← bug fix (branch dari develop atau main)
release/*     ← persiapan release
```

**Branch protection rules** yang disarankan untuk `main`:
- Require PR before merging
- Require status checks: `CI · Backend`, `CI · Dashboard`
- Restrict who can push directly

---

## ⚙️ GitHub Actions CI/CD

| Workflow | Trigger | Apa yang dilakukan |
|---|---|---|
| `ci-backend.yml` | Push/PR ke `main`/`develop` saat `backend/` berubah | Build Go + run tests dengan PostgreSQL |
| `ci-dashboard.yml` | Push/PR ke `main`/`develop` saat `dashboard/` berubah | TypeScript check + Vite build |
| `ci-web.yml` | Push/PR ke `main`/`develop` saat `web/` berubah | Validasi HTML files |
| `cd-deploy.yml` | Push ke `main` | Deploy backend ke VPS, dashboard & web ke Vercel |

### Secrets yang Dibutuhkan untuk CD

Tambahkan di **Settings → Secrets and variables → Actions**:

| Secret | Keterangan |
|---|---|
| `VPS_HOST` | IP / hostname VPS backend |
| `VPS_USER` | Username SSH |
| `VPS_SSH_KEY` | Private key SSH (PEM format) |
| `VERCEL_TOKEN` | Token Vercel |
| `VERCEL_ORG_ID` | ID organisasi Vercel |
| `VERCEL_DASHBOARD_PROJECT_ID` | ID project dashboard di Vercel |
| `VERCEL_WEB_PROJECT_ID` | ID project landing page di Vercel |
| `VITE_API_BASE_URL` | URL API production, misal `https://api.kayabakery.id/api/v1` |

---

## 📖 Dokumentasi

| File | Isi |
|---|---|
| [`API.md`](./API.md) | Semua endpoint REST API |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Tech stack & struktur folder |
| [`ERD.md`](./ERD.md) | Skema database & diagram relasi |
| [`ROLES.md`](./ROLES.md) | Matriks hak akses per role |
| [`USER-FLOWS.md`](./USER-FLOWS.md) | Alur penggunaan tiap role |
| [`DESIGN.md`](./DESIGN.md) | Design system (warna, tipografi, komponen) |

---

## 🤝 Contributing

1. Fork repo ini
2. Buat branch dari `develop`: `git checkout -b feature/nama-fitur`
3. Commit perubahan: `git commit -m "feat: tambah fitur X"`
4. Push ke branch: `git push origin feature/nama-fitur`
5. Buka Pull Request ke `develop`

Gunakan format commit [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` fitur baru
- `fix:` perbaikan bug
- `docs:` perubahan dokumentasi
- `refactor:` refactor tanpa mengubah perilaku
- `test:` menambah/mengubah test

---

## 📄 License

MIT © KAYA Bakery
