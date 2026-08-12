import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'bg-gray-100 text-gray-600' },
  pending_payment: { label: 'Menunggu Bayar', cls: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Lunas', cls: 'bg-green-100 text-green-700' },
  preparing: { label: 'Diproses', cls: 'bg-blue-100 text-blue-700' },
  ready: { label: 'Siap Ambil', cls: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-700' },
}

export default function ScanOrder() {
  const [code, setCode] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')
  const [payModal, setPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')

  const lookupMutation = useMutation({
    mutationFn: (c: string) => api.get(`/pos/orders/scan/${c}`).then(r => r.data.data),
    onSuccess: (o) => { setOrder(o); setError('') },
    onError: () => { setError('Pesanan tidak ditemukan'); setOrder(null) },
  })

  const payMutation = useMutation({
    mutationFn: () => api.post(`/pos/orders/${order.id}/payments`, {
      method: payMethod,
      amount: order.total,
      reference_no: `POS-${Date.now()}`,
    }),
    onSuccess: () => {
      setPayModal(false)
      lookupMutation.mutate(code)
    },
  })

  const handleSearch = () => {
    if (!code.trim()) return
    lookupMutation.mutate(code.trim())
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-canvas-alt">Scan Pesanan</h1>
        <p className="text-canvas-alt/50 text-sm">Cari pesanan pre-order berdasarkan kode</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl2 border border-black/[0.06] p-5">
        <label className="label">Kode Pesanan</label>
        <div className="flex gap-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="KYA-20260812-1234"
            className="input-field font-mono flex-1"
          />
          <button
            onClick={handleSearch}
            disabled={lookupMutation.isPending}
            className="btn-primary whitespace-nowrap"
          >
            {lookupMutation.isPending ? 'Mencari...' : 'Cari'}
          </button>
        </div>
        {error && (
          <p className="text-danger text-sm mt-2 flex items-center gap-1.5">
            <iconify-icon icon="ri:error-warning-line" width="16" />
            {error}
          </p>
        )}
        <p className="text-canvas-alt/40 text-xs mt-2">
          💡 Tip: Minta pelanggan menunjukkan barcode, lalu ketik kode atau gunakan scanner eksternal
        </p>
      </div>

      {/* Order Detail */}
      {order && (
        <div className="bg-white rounded-xl2 border border-black/[0.06] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-canvas-alt text-lg">{order.order_code}</p>
              <p className="text-canvas-alt/50 text-sm">{new Date(order.created_at).toLocaleString('id-ID')}</p>
            </div>
            <span className={`badge-status text-sm px-3 py-1 ${STATUS_LABELS[order.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[order.status]?.label || order.status}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-canvas-alt/50 uppercase tracking-wide">Pelanggan</p>
            <p className="font-semibold text-canvas-alt">{order.customer_name}</p>
            {order.customer_phone && <p className="text-canvas-alt/60 text-sm">{order.customer_phone}</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-canvas-alt/50 uppercase tracking-wide mb-2">Item Pesanan</p>
            <div className="space-y-1.5">
              {(order.items || []).map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm bg-page-bg rounded-lg px-3 py-2">
                  <span className="text-canvas-alt">{item.product_name_snapshot} ×{item.qty}</span>
                  <span className="font-semibold text-canvas-alt">{formatRp(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between font-heading font-bold text-canvas-alt pt-2 border-t border-black/[0.06]">
            <span>Total</span>
            <span className="text-primary text-lg">{formatRp(order.total)}</span>
          </div>

          {(order.status === 'pending_payment' || order.status === 'pending') && (
            <button onClick={() => setPayModal(true)} className="w-full btn-primary justify-center py-3 rounded-xl">
              Konfirmasi Pembayaran
            </button>
          )}

          {order.status === 'paid' && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center text-success font-semibold text-sm">
              ✓ Sudah Dibayar
            </div>
          )}
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl2 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-heading font-bold text-xl text-canvas-alt mb-4">Konfirmasi Bayar</h3>
            <p className="text-canvas-alt/50 text-sm mb-4">Pesanan <span className="font-mono font-semibold text-canvas-alt">{order?.order_code}</span></p>
            <div className="mb-4">
              <label className="label">Metode</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="input-field">
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
                <option value="card">Kartu</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayModal(false)} className="btn-outline flex-1 text-canvas-alt">Batal</button>
              <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="btn-primary flex-1 justify-center">
                {payMutation.isPending ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
