import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  pending_payment: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function Orders() {
  const [filters, setFilters] = useState({ status: '', order_type: '', date_from: '', date_to: '', page: 1 })

  const queryParams = Object.entries(filters)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => api.get(`/admin/orders?${queryParams}`).then(r => r.data),
  })

  const orders = data?.data || []
  const meta = data?.meta || {}

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-canvas-alt">Pesanan</h1>
        <p className="text-canvas-alt/50 text-sm">Total {meta.total ?? 0} pesanan</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl p-4 border border-black/[0.06]">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} className="input-field w-40">
          <option value="">Semua Status</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.order_type} onChange={e => setFilters(f => ({ ...f, order_type: e.target.value, page: 1 }))} className="input-field w-40">
          <option value="">Semua Tipe</option>
          <option value="pos">POS</option>
          <option value="preorder">Pre-order</option>
        </select>
        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="input-field w-40" />
        <span className="self-center text-canvas-alt/40 text-sm">s/d</span>
        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="input-field w-40" />
        {(filters.status || filters.order_type || filters.date_from) && (
          <button onClick={() => setFilters({ status: '', order_type: '', date_from: '', date_to: '', page: 1 })}
            className="text-sm text-canvas-alt/50 hover:text-danger transition-colors">
            Reset
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl2 border border-black/[0.06] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-canvas-alt/40">Tidak ada pesanan ditemukan</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Kode Pesanan</th>
                <th className="table-header">Pelanggan</th>
                <th className="table-header">Tipe</th>
                <th className="table-header">Status</th>
                <th className="table-header">Total</th>
                <th className="table-header">Kasir</th>
                <th className="table-header">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="table-cell">
                    <span className="font-mono text-sm font-semibold text-canvas-alt">{o.order_code}</span>
                  </td>
                  <td className="table-cell">
                    <p className="font-medium text-canvas-alt text-sm">{o.customer_name}</p>
                    <p className="text-xs text-canvas-alt/40">{o.customer_phone}</p>
                  </td>
                  <td className="table-cell">
                    <span className={`badge-status ${o.order_type === 'pos' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {o.order_type === 'pos' ? 'POS' : 'Pre-order'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge-status ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="table-cell font-semibold text-canvas-alt">{formatRp(o.total)}</td>
                  <td className="table-cell text-canvas-alt/60 text-sm">{o.cashier?.name || '—'}</td>
                  <td className="table-cell text-canvas-alt/50 text-xs">
                    {new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.total > meta.limit && (
        <div className="flex justify-center gap-2">
          <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="btn-outline text-canvas-alt disabled:opacity-30">← Prev</button>
          <span className="flex items-center text-sm text-canvas-alt/60">Hal {filters.page}</span>
          <button disabled={filters.page * meta.limit >= meta.total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="btn-outline text-canvas-alt disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  )
}
