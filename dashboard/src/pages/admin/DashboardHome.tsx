import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function StatCard({ icon, label, value, color = 'primary' }: { icon: string, label: string, value: string | number, color?: string }) {
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${color === 'danger' ? 'bg-danger/10' : 'bg-primary/10'}`}>
        <iconify-icon icon={icon} width="20" className={color === 'danger' ? 'text-danger' : 'text-primary'} />
      </div>
      <p className="text-2xl font-heading font-bold text-canvas-alt">{value}</p>
      <p className="text-xs text-canvas-alt/50 font-medium">{label}</p>
    </div>
  )
}

export default function DashboardHome() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/admin/dashboard/stats').then(r => r.data.data),
    refetchInterval: 30000,
  })

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  const mockChartData = [
    { day: 'Sen', revenue: 850000 }, { day: 'Sel', revenue: 1200000 },
    { day: 'Rab', revenue: 970000 }, { day: 'Kam', revenue: 1450000 },
    { day: 'Jum', revenue: 1800000 }, { day: 'Sab', revenue: 2100000 },
    { day: 'Min', revenue: 1650000 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-canvas-alt">Dashboard</h1>
        <p className="text-canvas-alt/50 text-sm mt-0.5">Ringkasan performa toko hari ini</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="ri:money-dollar-circle-line" label="Revenue Hari Ini" value={formatRp(data?.revenue_today)} />
        <StatCard icon="ri:bar-chart-line" label="Revenue Bulan Ini" value={formatRp(data?.revenue_this_month)} />
        <StatCard icon="ri:shopping-bag-3-line" label="Pesanan Hari Ini" value={data?.orders_today ?? 0} />
        <StatCard icon="ri:alarm-warning-line" label="Produk Stok Rendah" value={data?.low_stock_products?.length ?? 0} color="danger" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl2 border border-black/[0.06] p-5">
          <h3 className="font-heading font-semibold text-canvas-alt mb-4">Revenue Minggu Ini</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockChartData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v/1000)}rb`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip formatter={(v: unknown) => formatRp(Number(v))} />
              <Bar dataKey="revenue" fill="#e8a33d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl2 border border-black/[0.06] p-5">
          <h3 className="font-heading font-semibold text-canvas-alt mb-4">Produk Terlaris</h3>
          <div className="space-y-3">
            {(data?.top_products || []).length === 0 && (
              <p className="text-sm text-canvas-alt/40 text-center py-4">Belum ada data</p>
            )}
            {(data?.top_products || []).map((p: any, i: number) => (
              <div key={p.product_id} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span className="flex-1 text-sm text-canvas-alt truncate">{p.name}</span>
                <span className="text-xs font-semibold text-primary">{p.sold_qty} terjual</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock */}
      {(data?.low_stock_products || []).length > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl2 p-5">
          <h3 className="font-heading font-semibold text-danger mb-3 flex items-center gap-2">
            <iconify-icon icon="ri:alarm-warning-line" width="18" />
            Stok Hampir Habis
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(data?.low_stock_products || []).map((p: any) => (
              <div key={p.id} className="bg-white rounded-lg p-3 border border-danger/10">
                <p className="font-semibold text-sm text-canvas-alt truncate">{p.name}</p>
                <p className="text-danger font-bold text-lg">{p.stock_qty}</p>
                <p className="text-xs text-canvas-alt/40">tersisa</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
