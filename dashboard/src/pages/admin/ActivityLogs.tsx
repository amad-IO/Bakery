import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function ActivityLogs() {
  const [filters, setFilters] = useState({ action: '', date_from: '', date_to: '', page: 1 })

  const qp = Object.entries(filters)
    .filter(([, v]) => v !== '' && v !== 1)
    .map(([k, v]) => `${k}=${v}`).join('&')

  const { data, isLoading } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => api.get(`/admin/logs?limit=25&${qp}`).then(r => r.data),
  })

  const logs = data?.data || []
  const meta = data?.meta || {}

  const ACTION_COLORS: Record<string, string> = {
    LOGIN: 'bg-blue-100 text-blue-700',
    created_product: 'bg-green-100 text-green-700',
    updated_product: 'bg-yellow-100 text-yellow-700',
    deleted_product: 'bg-red-100 text-red-700',
    created_pos_order: 'bg-purple-100 text-purple-700',
    updated_stock: 'bg-teal-100 text-teal-700',
    created_user: 'bg-indigo-100 text-indigo-700',
    updated_settings: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-canvas-alt">Log Aktivitas</h1>
        <p className="text-canvas-alt/50 text-sm">Total {meta.total ?? 0} entri log</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl p-4 border border-black/[0.06]">
        <input
          value={filters.action}
          onChange={e => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))}
          placeholder="Filter aksi..."
          className="input-field w-44"
        />
        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="input-field w-40" />
        <span className="self-center text-canvas-alt/40 text-sm">s/d</span>
        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="input-field w-40" />
        {(filters.action || filters.date_from) && (
          <button onClick={() => setFilters({ action: '', date_from: '', date_to: '', page: 1 })}
            className="text-sm text-canvas-alt/50 hover:text-danger transition-colors">Reset</button>
        )}
      </div>

      <div className="bg-white rounded-xl2 border border-black/[0.06] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-canvas-alt/40">Tidak ada log ditemukan</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Pengguna</th>
                <th className="table-header">Aksi</th>
                <th className="table-header">Entitas</th>
                <th className="table-header">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="table-cell">
                    {log.user ? (
                      <div>
                        <p className="font-semibold text-canvas-alt text-sm">{log.user.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${log.user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                          {log.user.role}
                        </span>
                      </div>
                    ) : <span className="text-canvas-alt/30 text-sm">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className={`badge-status ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="table-cell">
                    <p className="text-sm text-canvas-alt/70">{log.entity_type}</p>
                    <p className="text-xs text-canvas-alt/30 font-mono">{log.entity_id?.slice(0, 8)}...</p>
                  </td>
                  <td className="table-cell text-canvas-alt/50 text-xs">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(meta.total || 0) > 25 && (
        <div className="flex justify-center gap-2">
          <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="btn-outline text-canvas-alt disabled:opacity-30 text-sm">← Prev</button>
          <span className="flex items-center text-sm text-canvas-alt/60">Hal {filters.page}</span>
          <button disabled={filters.page * 25 >= (meta.total || 0)} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="btn-outline text-canvas-alt disabled:opacity-30 text-sm">Next →</button>
        </div>
      )}
    </div>
  )
}
