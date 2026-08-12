# ROLES.md — Matriks Hak Akses KAYA Bakery

## 1. Definisi Role

| Role | Punya akun? | Cara dibuat | Login? |
|---|---|---|---|
| **Admin** (owner) | Ya | Seed manual saat setup awal (bukan lewat UI publik) | Ya, JWT |
| **Kasir** (penjual) | Ya | Dibuat oleh Admin lewat dashboard | Ya, JWT |
| **Publik** (pembeli) | **Tidak** | — | **Tidak** — identifikasi cukup nama + kode pesanan (barcode) |

> Tidak ada endpoint self-registration untuk role apapun. Akun kasir **hanya** bisa
> dibuat oleh admin (`POST /admin/users`, lihat `API.md` § 6).

---

## 2. Matriks Permission

| Aksi | Admin | Kasir | Publik |
|---|:---:|:---:|:---:|
| Lihat katalog produk | ✅ | ✅ | ✅ |
| Buat pesanan (preorder online) | — | — | ✅ |
| Cek status pesanan sendiri (via kode) | — | — | ✅ |
| Buat transaksi POS (walk-in) | ✅ | ✅ | ❌ |
| **Input produk/roti baru** | ✅ | ✅ | ❌ |
| Edit harga & detail produk | ✅ | ❌ | ❌ |
| Hapus/nonaktifkan produk | ✅ | ❌ | ❌ |
| Tambah stok (restock cepat) | ✅ | ✅ | ❌ |
| Koreksi stok (adjustment) | ✅ | ❌ | ❌ |
| Scan barcode pesanan | ✅ | ✅ | ❌ |
| Update status pesanan | ✅ | ✅ | ❌ |
| Catat pembayaran | ✅ | ✅ | ❌ |
| Lihat semua pesanan (semua kasir) | ✅ | ❌ (hanya miliknya sendiri, opsional) | ❌ |
| Lihat statistik penjualan | ✅ | ❌ | ❌ |
| Kelola akun kasir (buat/nonaktifkan) | ✅ | ❌ | ❌ |
| Lihat log aktivitas (monitoring) | ✅ | ❌ | ❌ |
| Ubah pengaturan toko | ✅ | ❌ | ❌ |
| Kelola kategori produk | ✅ | ❌ | ❌ |

> **Catatan:** baris "Input produk/roti baru" untuk Kasir sengaja diizinkan sesuai
> permintaan awal ("kasir bisa menginput roti baru"), tapi edit harga & hapus tetap
> dikunci ke Admin supaya harga & katalog tidak berubah sembarangan dari lantai toko.
> Kalau ternyata kamu mau kasir juga bisa edit harga, tinggal pindahkan baris itu
> ke kolom ✅ Kasir — tidak mempengaruhi skema database (`ERD.md`).

---

## 3. Implementasi Middleware (Backend)

```go
// middleware/role_guard.go — pseudocode
func RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole := c.GetString("role") // di-set oleh middleware auth sebelumnya
        for _, r := range roles {
            if userRole == r {
                c.Next()
                return
            }
        }
        c.AbortWithStatusJSON(403, gin.H{
            "success": false,
            "error": gin.H{"code": "FORBIDDEN", "message": "Akses ditolak"},
        })
    }
}
```

Contoh pemakaian di routes:
```go
admin := r.Group("/api/v1/admin", authMiddleware, RequireRole("admin"))
pos := r.Group("/api/v1/pos", authMiddleware, RequireRole("kasir", "admin"))
public := r.Group("/api/v1") // tanpa middleware auth sama sekali
```

---

## 4. Implementasi di Frontend (Dashboard React)

- Setelah login, simpan `role` dari response `/auth/me`.
- `AppRouter.tsx` melakukan redirect otomatis:
  - `role === "admin"` → default route `/admin`
  - `role === "kasir"` → default route `/kasir`, dan **tidak bisa** mengakses
    route `/admin/*` sama sekali (redirect balik / tampilkan 403).
- Sidebar menu di-render kondisional berdasarkan role (jangan hanya sembunyikan
  tombol di UI — backend tetap harus menolak request-nya juga, UI hiding saja
  tidak cukup untuk keamanan).
