# PROMPT.md — Build Brief untuk KAYA Bakery

> **Baca `README.md` dulu sebelum ini** untuk peta dokumen & daftar asumsi.
> Dokumen ini adalah brief eksekusi utama — rujuk ke `ARCHITECTURE.md`, `ERD.md`,
> `API.md`, `ROLES.md`, `USER-FLOWS.md`, dan `DESIGN.md` sesuai tahap yang sedang
> dikerjakan.

## Ringkasan Tugas

Bangun **sistem toko roti full-stack** bernama **"KAYA Bakery"** (ganti nama ini
dengan nama brand asli kalau sudah ditentukan), terdiri dari:

1. **Backend REST API** (Go) — sumber kebenaran data untuk semua sisi.
2. **Dashboard Admin & Kasir** (React SPA, role-protected) — alat kerja internal.
3. **Landing page publik** (HTML/Tailwind/GSAP) — etalase toko + pre-order tanpa akun.

Tiga role: **Admin** (owner, kontrol penuh), **Kasir** (transaksi & input produk,
dibuat oleh admin), **Publik** (tanpa akun, identifikasi via nama + kode pesanan/barcode).

---

## Urutan Kerja (wajib diikuti berurutan)

### Fase 1 — Backend Foundation
1. Setup project Go sesuai struktur folder di `ARCHITECTURE.md` §3.
2. Buat model & migration database sesuai `ERD.md` (semua 9 tabel + relasi + index).
3. Implement auth: `POST /auth/login`, JWT middleware, bcrypt password hashing
   (lihat `API.md` §1 dan `ROLES.md` §3).
4. Seed satu akun admin awal lewat script/CLI (bukan lewat endpoint publik) supaya
   ada entry point pertama untuk login.

### Fase 2 — Backend Business Logic
5. Implement seluruh endpoint di `API.md` §2–§8, dikelompokkan per role guard sesuai
   `ROLES.md` §2 (matriks permission).
6. Pastikan logic berikut benar (jangan diserahkan ke frontend):
   - Generate `order_code` unik format `KYA-YYYYMMDD-XXXX`.
   - Hitung `subtotal`/`total` dari harga master produk saat transaksi, bukan dari input client.
   - Stok berkurang otomatis saat status order jadi `paid` (lihat `USER-FLOWS.md` §7).
   - Setiap create/update/delete oleh admin/kasir insert baris ke `activity_logs`.
7. Tulis integration test minimal untuk: login, buat pesanan publik, transaksi POS,
   scan barcode, dan permission check (kasir mencoba akses endpoint admin harus 403).

### Fase 3 — Dashboard Admin & Kasir (React)
8. Setup React + Vite + Tailwind sesuai struktur di `ARCHITECTURE.md`.
9. Halaman login → redirect otomatis berdasarkan role (`ROLES.md` §4).
10. Bangun dashboard Admin: statistik (`DashboardHome`), kelola produk, kelola kasir,
    semua pesanan, log aktivitas, pengaturan toko. Ikuti flow di `USER-FLOWS.md` §4–§6.
11. Bangun dashboard Kasir: layar POS (`USER-FLOWS.md` §2), scan pesanan (§1), input
    roti baru (§3). Prioritaskan kecepatan sesuai `DESIGN.md` §8.4.
12. Styling pakai token & komponen di `DESIGN.md` §8 (versi terang, motion minim).

### Fase 4 — Landing Page Publik
13. Bangun landing page statis di `/web` mengikuti struktur section `DESIGN.md` §7.
14. Fetch data produk asli dari `GET /products` — jangan hardcode data dummy di HTML.
15. Implement form pre-order → `POST /orders` → tampilkan `order_code` sebagai
    barcode/QR (pakai `jsbarcode` atau `qrcode`) di halaman konfirmasi.
16. Implement halaman cek status pesanan (`order-status.html`) → `GET /orders/:code`.
17. Terapkan gaya visual di `DESIGN.md` §1–§7: warna, tipografi, layer stack, animasi
    GSAP/Lenis sesuai konteks landing page (motion boleh lebih ekspresif di sini).

### Fase 5 — QA & Polish
18. Jalankan seluruh skenario di `USER-FLOWS.md` end-to-end secara manual.
19. Cek permission: pastikan publik tidak bisa akses endpoint kasir/admin sama sekali,
    dan kasir tidak bisa akses endpoint khusus admin (edit harga, hapus produk, dll).
20. Cek responsive di ukuran tablet (layar POS sering dipakai di tablet kasir).
21. Cek `prefers-reduced-motion` di landing page.

---

## Prinsip Desain Visual (Ringkas — detail lengkap di `DESIGN.md`)

- Warna utama: kanvas coklat panggang gelap (`#241610` → `#3a2415`) dibingkai
  background krem (`#f3ede3`), aksen amber `#e8a33d`.
- Radius container besar & CTA: **persis 28px**, jangan dibulatkan approksimasi.
- Font: **Geist** untuk heading/UI, **Inter** untuk body copy.
- Landing page pakai glassmorphism (`backdrop-blur-md`) untuk kartu mengambang di hero.
- Dashboard **tidak** memakai animasi berat — beda konteks dari landing page.

## Aset

- **Jangan** pakai foto/nama orang dari referensi desain awal (CoinCompass) — itu
  cuma referensi struktur visual, bukan aset final.
- Kalau belum ada foto produk/toko asli, pakai placeholder image generik dan tandai
  jelas di kode dengan komentar `// TODO: ganti dengan foto asli toko` supaya mudah
  ditemukan nanti.
- Logo: cukup wordmark teks "KAYA" (atau nama brand asli) dengan aksen warna primary
  di huruf/ikon kecil — tidak perlu logo custom kompleks di v1.

## Definition of Done

- [ ] Semua endpoint di `API.md` berfungsi & sudah diuji manual/otomatis.
- [ ] Permission matrix di `ROLES.md` diberlakukan konsisten di backend (bukan cuma UI).
- [ ] Publik bisa pre-order tanpa akun dan dapat kode barcode yang valid.
- [ ] Kasir bisa transaksi POS, scan barcode, dan input produk baru.
- [ ] Admin bisa lihat statistik, kelola kasir, kelola produk penuh, dan lihat log aktivitas.
- [ ] Landing page menampilkan data produk **live** dari API, bukan data statis.
- [ ] Desain visual konsisten dengan `DESIGN.md` di ketiga aplikasi.
- [ ] Tidak ada kredensial/API key hardcoded — semua lewat environment variables.
