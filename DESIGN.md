---
version: 1.0.0
name: KAYA Bakery Design System
description: Sistem desain modern & minimalis untuk toko roti — warm, premium, dan hangat, memakai kedalaman glassmorphism di atas latar coklat gelap. Diadaptasi dari struktur visual referensi "CoinCompass" dengan palet & konten yang diganti total.
colors:
  primary: "#e8a33d"
  primary-dark: "#c9821f"
  bg-main: "#f3ede3"
  bg-canvas: "#241610"
  bg-canvas-alt: "#3a2415"
  text-primary: "#ffffff"
  text-secondary: "rgba(255,255,255,0.6)"
  text-accent: "#3a2415"
  border-light: "rgba(255,255,255,0.14)"
  glass-fill: "rgba(255,255,255,0.09)"
  accent-glow: "rgba(232,163,61,0.18)"
  success: "#7fbf6a"
  danger: "#e0654f"
typography:
  headings:
    family: "Geist, sans-serif"
    weight: "600"
    tracking: "-0.03em"
  body:
    family: "Inter, sans-serif"
    weight: "400"
    lineHeight: "1.6"
  ui:
    family: "Geist, sans-serif"
    weight: "500"
    size: "12px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "24px"
  lg: "40px"
  xl: "80px"
rounded:
  sm: "8px"
  md: "16px"
  lg: "28px"
  full: "999px"
components:
  glass-card:
    bg: "rgba(255,255,255,0.09)"
    blur: "12px"
    border: "1px solid rgba(255,255,255,0.14)"
  action-button:
    bg: "#e8a33d"
    color: "#3a2415"
    rounded: "999px"
  tag-badge:
    bg: "rgba(232,163,61,0.08)"
    border: "1px solid rgba(232,163,61,0.35)"
  nav-pill:
    bg: "rgba(255,255,255,0.18)"
    blur: "4px"
motion:
  hover-lift: "translateY(-6px)"
  transition-main: "400ms cubic-bezier(0.4, 0, 0.2, 1)"
  magnetic-strength: "0.35"
---

## 0. Catatan Penting Sebelum Mulai

Dokumen ini dipecah jadi dua konteks pemakaian:

- **§1–§7**: berlaku untuk **landing page publik** (`/web`) — boleh pakai animasi
  berat (GSAP, Lenis, WebGL/canvas).
- **§8**: berlaku untuk **dashboard Admin & Kasir** (`/dashboard`) — pakai token
  warna & komponen yang sama, tapi **motion minim** (dashboard harus terasa cepat &
  fungsional, bukan atraksi visual). Kasir yang lagi antre transaksi tidak butuh
  animasi 800ms di setiap klik.

---

## 1. Overview

KAYA Bakery memakai nuansa **"warm & premium"** — coklat panggang tua sebagai kanvas
utama, dengan aksen amber/karamel (`#e8a33d`) untuk memandu mata ke aksi utama (CTA,
harga, status positif). Struktur ini meniru kedalaman & glassmorphism dari referensi
desain sebelumnya, tapi dengan palet yang terasa seperti "roti baru keluar oven",
bukan crypto/fintech.

## 2. Warna

- **Primary (`#e8a33d`)** — dipakai eksklusif untuk tombol utama, harga, badge promo,
  dan ikon status positif (mis. "Tersedia", "Stok Aman").
- **Background luar (`#f3ede3`)** — bone/cream hangat, membingkai kanvas gelap.
- **Kanvas utama** — gradasi coklat panggang: `#241610` → `#3a2415`.
- Gunakan white pada opacity 9%–18% untuk membuat lapisan glassmorphic.
- **Jangan** pakai hitam pekat (`#000000`) — untuk shadow/gelap, pakai `#241610`.

## 3. Tipografi

- **Geist** — untuk heading, label UI, dan data teknis (harga, kode pesanan).
- **Inter** — untuk body copy & deskripsi panjang.
- Label kecil (12px) pakai uppercase + letter-spacing 0.1em untuk section header
  (contoh: "MENU TERLARIS", "DIPERCAYA PELANGGAN KAMI").

## 4. Spacing & Rounded

Pakai grid 8pt konsisten. Radius:
- `sm` 8px — elemen kecil (badge, input)
- `md` 16px — card standar (produk, testimoni)
- `lg` 28px — container besar & CTA block (**jangan dibulatkan approx, pakai persis 28px**)
- `full` 999px — tombol & pill nav

## 5. Layer Stack (Landing Page)

1. **Base** — `<main>` relative, `overflow-hidden`, gradient coklat.
2. **Layer 1 (Background)** — opsional WebGL canvas efek "aurora oven" (cahaya hangat
   bergerak lembut, warna amber/oranye redup) — opacity ~0.6, lebih subtil dari
   referensi asli supaya tidak mengganggu keterbacaan produk.
3. **Layer 2 (Overlay)** — diagonal hatch tipis (`repeating-linear-gradient` 115deg,
   opacity sangat rendah) sebagai tekstur "kertas roti".
4. **Layer 3 (Nav)** — fixed header, `z-index 10`.
5. **Layer 4 (Content)** — section-section, `z-index 10`.
6. **Layer 5 (Floating elements)** — kartu mengambang di hero dengan `backdrop-blur-md`.

## 6. Komponen Landing Page

| Komponen | Style |
|---|---|
| `glass-card` | `bg: rgba(255,255,255,0.09)`, `blur: 12px`, border tipis putih 14% |
| `action-button` (CTA utama) | bg `#e8a33d`, text `#3a2415`, pill shape |
| `tag-badge` | bg amber 8%, border amber 35% — dipakai untuk label "Baru", "Promo" |
| `nav-pill` | link nav berbentuk pill, border putih 18%, `hover:scale-104` |

## 7. Struktur Section Landing Page

Adaptasi dari struktur referensi, isi diganti total:

1. **Navigasi** — Logo "KAYA" kiri, menu (Beranda, Menu, Tentang, Kisah Kami) tengah,
   CTA "Pesan Sekarang" kanan.
2. **Hero** — Headline ("Roti Segar, Dipanggang Setiap Pagi" — contoh, boleh diubah),
   kartu mengambang di kanan berisi: **Stok Hari Ini**, **Menu Terlaris**,
   **Rating & Ulasan**, **Promo Aktif**, **Cek Status Pesanan** (input kode barcode).
3. **Strip kategori** — daftar ikon kategori roti (Tawar, Manis, Pastry, Kue) opacity rendah.
4. **Dipercaya pelanggan** (opsional, ganti "Trusted by" korporat → testimoni singkat
   berjejer atau angka "500+ pelanggan tiap minggu").
5. **Fitur/keunggulan** — 3 kolom: "Selalu Segar", "Bisa Pre-order", "Bayar di Tempat".
6. **Kisah toko** — foto toko/owner + narasi singkat + angka (tahun berdiri, jumlah
   varian roti, pelanggan tetap).
7. **Tim** — foto owner/baker (opsional, kalau toko kecil bisa 1–2 orang saja).
8. **Testimoni** — grid ulasan pelanggan.
9. **CTA & Footer** — ajakan pesan + footer info toko, jam buka, kontak WA, sosmed.

## 8. Dashboard (Admin & Kasir)

### 8.1 Prinsip
- **Kecepatan > estetika animasi.** Transisi maksimal 150–200ms, tanpa GSAP/Lenis.
- Layout standar: **sidebar kiri (fixed)** + **topbar** + **konten**.
- Tetap pakai token warna yang sama (`primary`, `bg-canvas`, dll) supaya terasa satu
  keluarga brand dengan landing page, tapi versi terang/netral lebih dominan untuk
  keterbacaan data lama (tabel, angka).

### 8.2 Palet Dashboard (turunan dari token utama)
- Background halaman: putih atau `#faf7f2` (netral terang, bukan gradient gelap —
  dashboard kerja butuh kontras tinggi & tidak melelahkan mata).
- Sidebar: `bg-canvas` (`#241610`) dengan teks putih — satu-satunya area gelap,
  jadi anchor visual brand.
- Aksen tombol & status aktif: tetap `#e8a33d`.
- Tabel: garis pemisah tipis `rgba(0,0,0,0.08)`, hover row `rgba(232,163,61,0.06)`.

### 8.3 Komponen Dashboard
| Komponen | Kegunaan |
|---|---|
| `stat-card` | Kartu angka ringkas di dashboard admin (revenue, jumlah order) — versi terang dari `glass-card`, bg putih + border tipis, bukan blur gelap |
| `data-table` | Tabel produk/pesanan/kasir — sticky header, sortable, pagination |
| `sidebar-nav-item` | Menu sidebar, state aktif pakai left-border 3px warna primary |
| `pos-product-tile` | Grid produk di layar kasir — gambar, nama, harga, tap-to-add |
| `cart-panel` | Panel keranjang di sisi kanan layar POS, sticky, total selalu terlihat |
| `barcode-display` | Menampilkan barcode/QR `order_code` besar & jelas, dengan tombol "scan ulang" |
| `role-badge` | Badge kecil menunjukkan role user login (Admin/Kasir) di topbar |

### 8.4 Layout POS (Kasir) — Catatan Khusus
Layar kasir harus dioptimalkan untuk **kecepatan input saat antrean**:
- Grid produk di kiri/tengah (tap langsung tambah ke keranjang, tanpa modal konfirmasi).
- Keranjang + total selalu terlihat di kanan (sticky), tidak perlu scroll.
- Tombol "Bayar" besar, warna primary, mudah dijangkau ibu jari di tablet.
- Setelah bayar, tampilkan `barcode-display` / struk singkat, lalu otomatis kembali
  ke grid kosong untuk transaksi berikutnya (jangan ada langkah manual "reset").

---

## 9. Do's and Don'ts

- **Do:** pakai amber (`#e8a33d`) hanya untuk aksi utama & status positif — jangan
  dipakai berlebihan supaya tetap terasa premium, bukan norak.
- **Do:** pertahankan radius 28px di container besar landing page, konsisten dengan
  referensi asli.
- **Don't:** bawa animasi GSAP/WebGL berat ke dashboard — beda konteks pemakaian.
- **Don't:** pakai foto asli yang dipakai referensi CoinCompass (foto model finance/
  crypto) — ganti dengan foto roti/toko/owner asli, atau placeholder yang jelas
  ditandai `[GANTI DENGAN FOTO ASLI]` kalau belum ada asetnya.

## 10. Aksesibilitas

- Kontras warna primary di atas `bg-canvas` gelap harus tetap memenuhi WCAG AA minimum.
- Semua landmark HTML semantik (`<header>`, `<main>`, `<nav>`, `<section>`).
- Dashboard: pastikan `data-table` bisa dinavigasi keyboard (penting untuk input
  cepat kasir tanpa mouse).
- Hormati `prefers-reduced-motion` — matikan floating card animation & parallax
  kalau user mengaktifkan setting ini di OS/browser.
