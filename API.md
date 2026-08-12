# API.md — Spesifikasi REST API KAYA Bakery

Base URL: `/api/v1`

Auth: `Authorization: Bearer <jwt>` — hanya diperlukan untuk endpoint bertanda 🔒.
Endpoint tanpa tanda kunci **bebas diakses publik** (guest, tanpa login).

Format response standar:
```json
// Sukses
{ "success": true, "data": { ... } }

// Sukses dengan pagination
{ "success": true, "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 57 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

---

## 1. Auth

### `POST /auth/login`
Login untuk **Admin & Kasir saja**. Publik tidak punya endpoint login.

Request:
```json
{ "email": "owner@kaya.id", "password": "rahasia123" }
```
Response `200`:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "name": "Budi", "role": "admin" }
  }
}
```
Error `401` kalau kredensial salah, `403` kalau `is_active = false`.

### `GET /auth/me` 🔒
Ambil data user yang sedang login (dipakai frontend untuk cek role saat load app).

---

## 2. Produk & Kategori (Publik — Read Only)

### `GET /products`
Query param opsional: `?category=<slug>&search=<keyword>&available=true`
Dipakai landing page untuk menampilkan katalog.

### `GET /products/:slug`
Detail satu produk.

### `GET /categories`
Daftar kategori untuk navigasi/filter katalog.

---

## 3. Pesanan Publik (Guest Pre-order — tanpa auth)

### `POST /orders`
Publik membuat pesanan (preorder). Tidak butuh login.

Request:
```json
{
  "customer_name": "Siti Aminah",
  "customer_phone": "081234567890",
  "items": [
    { "product_id": "uuid-roti-coklat", "qty": 2 },
    { "product_id": "uuid-roti-keju", "qty": 1 }
  ]
}
```
Response `201`:
```json
{
  "success": true,
  "data": {
    "order_code": "KYA-20260812-0417",
    "status": "pending",
    "total": 45000,
    "items": [ ... ]
  }
}
```
> Backend yang menghitung `subtotal`/`total` dari harga master produk saat ini —
> jangan percaya harga dari client.

### `GET /orders/:order_code`
Cek status pesanan publik (dipakai halaman "cek status pesanan" di landing page).
Tidak mengembalikan data sensitif lain selain milik order tsb.

---

## 4. POS — Kasir 🔒 (role: `kasir`, `admin`)

### `POST /pos/orders`
Kasir membuat transaksi langsung di toko (walk-in). Mirip `POST /orders` publik,
tapi `order_type` otomatis `"pos"` dan `cashier_id` diisi dari token JWT.

### `GET /pos/orders/scan/:order_code`
Scan/cari pesanan berdasarkan kode (dipakai saat pembeli datang mengambil preorder).
Response berisi detail pesanan + item, untuk ditampilkan sebelum kasir konfirmasi.

### `PATCH /pos/orders/:id/status`
Update status pesanan, misal dari `ready` → `completed` setelah pembeli ambil & bayar.
```json
{ "status": "completed" }
```

### `POST /pos/orders/:id/payments`
Catat pembayaran untuk sebuah pesanan.
```json
{ "method": "qris", "amount": 45000, "reference_no": "QR123456" }
```

### `POST /pos/products` 🔒 (role: `kasir`, `admin`)
Kasir input roti baru (sesuai requirement). Field wajib: `name`, `category_id`, `price`.
`stock_qty` default `0`, `created_by` otomatis dari token.

### `PATCH /pos/products/:id/stock`
Kasir/admin menambah stok (restock cepat) — otomatis insert `stock_movements` type `in`.
```json
{ "qty": 20, "note": "Restock pagi" }
```

---

## 5. Admin — Produk & Kategori 🔒 (role: `admin`)

### `POST /admin/categories` / `PATCH /admin/categories/:id` / `DELETE /admin/categories/:id`

### `PATCH /admin/products/:id`
Full edit produk (termasuk harga) — **hanya admin**.

### `DELETE /admin/products/:id`
Soft delete disarankan (set `is_available = false` + kolom `deleted_at` kalau mau
pakai GORM soft delete), bukan hard delete, supaya riwayat `order_items` tetap valid.

---

## 6. Admin — Kelola Akun Kasir 🔒 (role: `admin`)

### `GET /admin/users?role=kasir`
Daftar semua akun kasir.

### `POST /admin/users`
Admin membuat akun kasir baru.
```json
{ "name": "Rina", "email": "rina@kaya.id", "phone": "0812...", "password": "...", "role": "kasir" }
```

### `PATCH /admin/users/:id`
Edit data kasir, termasuk `is_active` untuk nonaktifkan akun.

### `DELETE /admin/users/:id`
Sebaiknya diarahkan ke `PATCH is_active=false` daripada hard delete (jaga integritas
riwayat `orders.cashier_id`).

---

## 7. Admin — Pesanan & Monitoring 🔒 (role: `admin`)

### `GET /admin/orders`
Semua pesanan dengan filter: `?status=&order_type=&cashier_id=&date_from=&date_to=`

### `GET /admin/logs`
Ambil `activity_logs`, filter `?user_id=&action=&date_from=&date_to=` — untuk
memonitor aktivitas kasir sesuai requirement "admin untuk memonitor".

### `GET /admin/dashboard/stats`
Statistik ringkasan untuk halaman utama dashboard admin.
```json
{
  "success": true,
  "data": {
    "revenue_today": 1250000,
    "revenue_this_month": 28500000,
    "orders_today": 34,
    "top_products": [ { "name": "Roti Coklat", "sold_qty": 120 } ],
    "low_stock_products": [ { "name": "Roti Keju", "stock_qty": 3 } ]
  }
}
```

---

## 8. Admin — Pengaturan Toko 🔒 (role: `admin`)

### `GET /admin/settings`
### `PATCH /admin/settings`
```json
{ "store_name": "KAYA Bakery", "store_open_time": "07:00", "store_close_time": "20:00" }
```
Disimpan/dibaca dari tabel key-value `store_settings`.

---

## 9. Konvensi Umum

- **Pagination**: query `?page=1&limit=20`, default `limit=20`, max `100`.
- **Error codes**: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
  `NOT_FOUND` (404), `CONFLICT` (409 — misal slug/SKU duplikat), `SERVER_ERROR` (500).
- **Semua endpoint yang mengubah data** (`POST`/`PATCH`/`DELETE`) di sisi admin/kasir
  otomatis insert baris ke `activity_logs` di backend (bukan tanggung jawab frontend).
- **CORS**: hanya izinkan origin dari `/dashboard` dan `/web` sesuai
  `CORS_ALLOWED_ORIGINS` di `ARCHITECTURE.md`.
