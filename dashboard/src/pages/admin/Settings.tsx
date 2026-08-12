import { useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'

export default function Settings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data.data || {}),
  })

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (settings) reset(settings)
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/settings', data),
    onSuccess: () => alert('Pengaturan disimpan!'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-canvas-alt">Pengaturan Toko</h1>
        <p className="text-canvas-alt/50 text-sm">Konfigurasi informasi toko Anda</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div className="bg-white rounded-xl2 border border-black/[0.06] p-6 space-y-4">
          <h3 className="font-heading font-semibold text-canvas-alt text-base">Informasi Toko</h3>
          <div>
            <label className="label">Nama Toko</label>
            <input {...register('store_name')} className="input-field" placeholder="KAYA Bakery" />
          </div>
          <div>
            <label className="label">Alamat</label>
            <textarea {...register('store_address')} rows={2} className="input-field resize-none" placeholder="Jl. Contoh No. 1, Jakarta" />
          </div>
          <div>
            <label className="label">Nomor WhatsApp</label>
            <input {...register('whatsapp_number')} className="input-field" placeholder="628123456789" />
          </div>
        </div>

        <div className="bg-white rounded-xl2 border border-black/[0.06] p-6 space-y-4">
          <h3 className="font-heading font-semibold text-canvas-alt text-base">Jam Operasional</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Jam Buka</label>
              <input {...register('store_open_time')} type="time" className="input-field" />
            </div>
            <div>
              <label className="label">Jam Tutup</label>
              <input {...register('store_close_time')} type="time" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Min. Jam Pre-order (jam sebelum ambil)</label>
            <input {...register('min_preorder_hours')} type="number" min="0" className="input-field" placeholder="2" />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary px-8"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}
