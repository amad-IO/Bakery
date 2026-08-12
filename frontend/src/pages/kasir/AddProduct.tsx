import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../../lib/api'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  category_id: z.string().uuid('Pilih kategori'),
  price: z.number().positive('Harga harus > 0'),
  description: z.string().optional(),
  image_url: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function AddProduct() {
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [stockQty, setStockQty] = useState(0)
  const [stockNote, setStockNote] = useState('')
  const [stockDone, setStockDone] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data || []),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/pos/products', data).then(r => r.data.data),
    onSuccess: (product) => setCreatedId(product.id),
  })

  const stockMutation = useMutation({
    mutationFn: () => api.patch(`/pos/products/${createdId}/stock`, { qty: stockQty, note: stockNote }),
    onSuccess: () => { setStockDone(true) },
  })

  if (stockDone) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <iconify-icon icon="ri:checkbox-circle-fill" width="36" className="text-success" />
        </div>
        <h2 className="font-heading font-bold text-2xl text-canvas-alt mb-2">Produk Ditambahkan!</h2>
        <p className="text-canvas-alt/50 mb-6">Produk berhasil dibuat dengan stok {stockQty} unit.</p>
        <button onClick={() => { reset(); setCreatedId(null); setStockDone(false); setStockQty(0) }}
          className="btn-primary">Tambah Produk Lain</button>
      </div>
    )
  }

  if (createdId) {
    return (
      <div className="space-y-5 max-w-md">
        <div>
          <h1 className="text-2xl font-heading font-bold text-canvas-alt">Tambah Stok Awal</h1>
          <p className="text-canvas-alt/50 text-sm">Produk berhasil dibuat. Berapa stok awalnya?</p>
        </div>
        <div className="bg-white rounded-xl2 border border-black/[0.06] p-6 space-y-4">
          <div>
            <label className="label">Jumlah Stok</label>
            <input type="number" min="0" value={stockQty} onChange={e => setStockQty(parseInt(e.target.value) || 0)}
              className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="label">Catatan (opsional)</label>
            <input value={stockNote} onChange={e => setStockNote(e.target.value)}
              className="input-field" placeholder="Stok awal masuk gudang" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStockDone(true)} className="btn-outline flex-1 text-canvas-alt text-sm">
              Lewati (Stok 0)
            </button>
            <button onClick={() => stockMutation.mutate()} disabled={stockQty <= 0 || stockMutation.isPending}
              className="btn-primary flex-1 justify-center">
              {stockMutation.isPending ? 'Menyimpan...' : 'Simpan Stok'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h1 className="text-2xl font-heading font-bold text-canvas-alt">Tambah Produk Baru</h1>
        <p className="text-canvas-alt/50 text-sm">Isi detail produk baru di bawah ini</p>
      </div>

      <div className="bg-white rounded-xl2 border border-black/[0.06] p-6">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nama Produk</label>
            <input {...register('name')} className="input-field" placeholder="Roti Tawar Spesial" />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Kategori</label>
            <select {...register('category_id')} className="input-field">
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-danger text-xs mt-1">{errors.category_id.message}</p>}
          </div>
          <div>
            <label className="label">Harga (Rp)</label>
            <input {...register('price', { valueAsNumber: true })} type="number" className="input-field" placeholder="25000" />
            {errors.price && <p className="text-danger text-xs mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea {...register('description')} rows={3} className="input-field resize-none" placeholder="Deskripsi singkat produk..." />
          </div>
          <div>
            <label className="label">URL Gambar</label>
            <input {...register('image_url')} className="input-field" placeholder="https://..." />
          </div>

          {createMutation.isError && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">
              Gagal menyimpan produk. Coba lagi.
            </div>
          )}

          <button type="submit" disabled={createMutation.isPending} className="w-full btn-primary justify-center py-3">
            {createMutation.isPending ? 'Menyimpan...' : 'Buat Produk →'}
          </button>
        </form>
      </div>
    </div>
  )
}
