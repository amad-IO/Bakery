import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/api'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  category_id: z.string().uuid('Pilih kategori'),
  price: z.number().positive('Harga harus > 0'),
  description: z.string().optional(),
  image_url: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function Products() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products?limit=100').then(r => r.data.data || []),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data || []),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editProduct,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/pos/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<FormData> }) => api.patch(`/admin/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteId(null) },
  })

  const openCreate = () => { setEditProduct(null); reset({}); setShowModal(true) }
  const openEdit = (p: any) => { setEditProduct(p); reset({ ...p, category_id: p.category_id }); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditProduct(null); reset({}) }

  const onSubmit = (data: FormData) => {
    if (editProduct) updateMutation.mutate({ id: editProduct.id, data })
    else createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-canvas-alt">Produk</h1>
          <p className="text-canvas-alt/50 text-sm">{products.length} produk terdaftar</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <iconify-icon icon="ri:add-line" width="16" />
          Tambah Produk
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl2 border border-black/[0.06] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Produk</th>
                <th className="table-header">Kategori</th>
                <th className="table-header">Harga</th>
                <th className="table-header">Stok</th>
                <th className="table-header">Status</th>
                <th className="table-header">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${p.stock_qty === 0 ? 'opacity-40' : ''}`}
                        style={{ background: p.image_url ? `url(${p.image_url}) center/cover` : 'linear-gradient(135deg, #3a2415 0%, #e8a33d55 100%)' }} />
                      <div>
                        <p className="font-semibold text-canvas-alt text-sm">{p.name}</p>
                        <p className="text-xs text-canvas-alt/40 truncate max-w-40">{p.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-canvas-alt/70">{p.category?.name || '—'}</td>
                  <td className="table-cell font-semibold text-canvas-alt">{formatRp(p.price)}</td>
                  <td className="table-cell">
                    <span className={`font-bold text-sm ${p.stock_qty === 0 ? 'text-danger' : p.stock_qty < 10 ? 'text-yellow-600' : 'text-success'}`}>
                      {p.stock_qty}
                    </span>
                  </td>
                  <td className="table-cell">
                    {p.stock_qty === 0
                      ? <span className="badge-status bg-danger/10 text-danger">Habis</span>
                      : p.is_available
                      ? <span className="badge-status bg-success/10 text-success">Tersedia</span>
                      : <span className="badge-status bg-black/10 text-canvas-alt/50">Nonaktif</span>
                    }
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-canvas-alt/50 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                        <iconify-icon icon="ri:pencil-line" width="16" />
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="text-canvas-alt/50 hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-colors">
                        <iconify-icon icon="ri:delete-bin-6-line" width="16" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-xl2 w-full max-w-md p-6 shadow-2xl">
            <h2 className="font-heading font-bold text-xl text-canvas-alt mb-5">
              {editProduct ? 'Edit Produk' : 'Tambah Produk'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <textarea {...register('description')} rows={2} className="input-field resize-none" placeholder="Deskripsi produk..." />
              </div>
              <div>
                <label className="label">URL Gambar</label>
                <input {...register('image_url')} className="input-field" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-outline flex-1 text-canvas-alt">Batal</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
                  {isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-xl2 p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <iconify-icon icon="ri:delete-bin-6-line" width="24" className="text-danger" />
            </div>
            <h3 className="font-heading font-bold text-center text-canvas-alt mb-2">Hapus Produk?</h3>
            <p className="text-center text-canvas-alt/50 text-sm mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-outline flex-1 text-canvas-alt">Batal</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="btn-danger flex-1">
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
