# USER-FLOWS.md — Alur Penggunaan KAYA Bakery

## 1. Alur Publik — Pre-order Online & Ambil di Toko

```mermaid
flowchart TD
    A[Buka landing page] --> B[Lihat katalog roti]
    B --> C[Pilih produk, isi nama & no. HP]
    C --> D[Submit pesanan - POST /orders]
    D --> E[Sistem generate order_code unik]
    E --> F[Tampilkan kode + barcode/QR ke pembeli]
    F --> G[Pembeli datang ke toko]
    G --> H[Kasir scan barcode - GET /pos/orders/scan/:code]
    H --> I[Kasir konfirmasi item & terima pembayaran]
    I --> J[PATCH status -> paid, lalu -> completed]
    J --> K[Selesai]
```

**Detail:**
- Kode pesanan (`order_code`) ditampilkan sebagai barcode/QR di halaman konfirmasi
  setelah submit, dan pembeli bisa screenshot atau catat kodenya.
- Pembeli bisa cek status kapan saja lewat halaman `order-status.html` dengan
  memasukkan `order_code` secara manual (`GET /orders/:order_code`).
- Tidak ada login/akun sama sekali di sepanjang flow ini.

---

## 2. Alur Kasir — Transaksi Walk-in (POS)

```mermaid
flowchart TD
    A[Kasir login] --> B[Buka layar POS]
    B --> C[Pilih produk dari grid]
    C --> D[Tambah ke keranjang]
    D --> E{Pembeli mau tambah lagi?}
    E -- Ya --> C
    E -- Tidak --> F[Klik Bayar]
    F --> G[Input nama pembeli - opsional untuk walk-in]
    G --> H[POST /pos/orders]
    H --> I[Pilih metode pembayaran]
    I --> J[POST /pos/orders/:id/payments]
    J --> K[Sistem cetak/tampilkan struk + order_code]
    K --> L[Status otomatis -> completed]
```

**Detail:**
- Untuk transaksi walk-in, nama pembeli **opsional** (bisa diisi "Guest" default)
  karena pembeli langsung bayar di tempat, beda dengan preorder yang butuh nama
  untuk identifikasi saat pengambilan nanti.
- `order_type = "pos"`, `cashier_id` otomatis terisi dari token JWT kasir yang login.

---

## 3. Alur Kasir — Input Roti Baru

```mermaid
flowchart TD
    A[Kasir login] --> B[Buka menu Tambah Produk]
    B --> C[Isi nama, kategori, harga, deskripsi, foto]
    C --> D[POST /pos/products]
    D --> E[Produk masuk katalog dengan stock_qty = 0]
    E --> F[Kasir input stok awal - PATCH /pos/products/:id/stock]
    F --> G[Produk tampil di katalog publik jika is_available = true]
```

**Detail:**
- Produk baru dari kasir langsung masuk database, **tidak perlu approval admin**
  (sesuai requirement awal). Tapi tercatat di `activity_logs` supaya admin tetap
  bisa memonitor siapa yang menambahkan apa.
- Kalau nanti kamu mau ada approval sebelum tampil publik, tinggal tambah field
  `is_approved` di `products` — perubahan kecil, tidak mengubah struktur besar.

---

## 4. Alur Admin — Kelola Akun Kasir

```mermaid
flowchart TD
    A[Admin login] --> B[Buka menu Kasir]
    B --> C[Klik Tambah Kasir Baru]
    C --> D[Isi nama, email, no HP, password sementara]
    D --> E[POST /admin/users]
    E --> F[Kasir baru bisa login dengan kredensial tsb]
    F --> G{Kasir bermasalah/resign?}
    G -- Ya --> H[Admin set is_active = false]
    G -- Tidak --> I[Akun tetap aktif]
```

---

## 5. Alur Admin — Monitoring & Statistik

```mermaid
flowchart TD
    A[Admin login] --> B[Buka Dashboard Home]
    B --> C[Lihat statistik: revenue hari ini, bulan ini, top produk, stok menipis]
    B --> D[Buka halaman Log Aktivitas]
    D --> E[Filter by kasir / tanggal / jenis aksi]
    E --> F[Lihat siapa input produk, siapa proses transaksi apa]
    B --> G[Buka halaman Semua Pesanan]
    G --> H[Filter by status/kasir/tanggal untuk audit transaksi]
```

---

## 6. Alur Admin — Kelola Produk (Full Control)

```mermaid
flowchart TD
    A[Admin login] --> B[Buka menu Produk]
    B --> C{Aksi apa?}
    C -- Tambah --> D[POST /admin/products atau /pos/products]
    C -- Edit harga/detail --> E[PATCH /admin/products/:id]
    C -- Nonaktifkan/Hapus --> F[DELETE /admin/products/:id - soft delete]
    D --> G[Produk tersimpan]
    E --> G
    F --> G
```

---

## 7. Ringkasan Titik Kritis untuk Agent Saat Build

1. **Barcode hanya untuk pesanan**, bukan untuk produk (produk pakai `SKU` biasa jika
   perlu). Jangan tertukar dengan sistem scan barcode ala supermarket per-item.
2. **Guest checkout wajib tanpa friction** — jangan tambahkan requirement password/
   OTP/email verifikasi di flow publik, itu di luar scope v1.
3. **Setiap perubahan data oleh admin/kasir harus tercatat di `activity_logs`** —
   ini requirement inti untuk fitur monitoring admin.
4. **Stok berkurang otomatis saat order berstatus `paid`** (bukan saat `pending`),
   supaya stok tidak "terkunci" oleh pesanan yang belum dibayar.
