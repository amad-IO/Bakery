import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../../lib/api'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password min 6 karakter'),
})
type FormData = z.infer<typeof schema>

export default function Cashiers() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: cashiers = [], isLoading } = useQuery({
    queryKey: ['cashiers'],
    queryFn: () => api.get('/admin/users?role=kasir').then(r => r.data.data || []),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/admin/users', { ...data, role: 'kasir' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cashiers'] }); setShowModal(false); reset() },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/admin/users/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cashiers'] }),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-canvas-alt">Kasir</h1>
          <p className="text-canvas-alt/50 text-sm">{cashiers.length} akun kasir</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <iconify-icon icon="ri:user-add-line" width="16" />
          Tambah Kasir
        </button>
      </div>

      <div className="bg-white rounded-xl2 border border-black/[0.06] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Nama</th>
                <th className="table-header">Email</th>
                <th className="table-header">No. HP</th>
                <th className="table-header">Status</th>
                <th className="table-header">Bergabung</th>
                <th className="table-header">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.map((u: any) => (
                <tr key={u.id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{u.name[0]?.toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-canvas-alt text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-canvas-alt/70 text-sm">{u.email}</td>
                  <td className="table-cell text-canvas-alt/60 text-sm">{u.phone || '—'}</td>
                  <td className="table-cell">
                    {u.is_active
                      ? <span className="badge-status bg-success/10 text-success">Aktif</span>
                      : <span className="badge-status bg-black/10 text-canvas-alt/50">Nonaktif</span>
                    }
                  </td>
                  <td className="table-cell text-canvas-alt/50 text-xs">
                    {new Date(u.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                        u.is_active
                          ? 'bg-danger/10 text-danger hover:bg-danger/20'
                          : 'bg-success/10 text-success hover:bg-success/20'
                      }`}
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl2 w-full max-w-md p-6 shadow-2xl">
            <h2 className="font-heading font-bold text-xl text-canvas-alt mb-5">Tambah Kasir Baru</h2>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Nama Lengkap</label>
                <input {...register('name')} className="input-field" placeholder="Budi Santoso" />
                {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input-field" placeholder="budi@kayabakery.id" />
                {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">No. HP</label>
                <input {...register('phone')} className="input-field" placeholder="08123456789" />
              </div>
              <div>
                <label className="label">Password</label>
                <input {...register('password')} type="password" className="input-field" placeholder="Min. 6 karakter" />
                {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 text-canvas-alt">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending ? 'Menyimpan...' : 'Tambah Kasir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
