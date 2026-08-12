import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: 'ri:dashboard-line', end: true },
  { to: '/admin/products', label: 'Produk', icon: 'ri:store-2-line' },
  { to: '/admin/orders', label: 'Pesanan', icon: 'ri:shopping-bag-3-line' },
  { to: '/admin/cashiers', label: 'Kasir', icon: 'ri:user-star-line' },
  { to: '/admin/logs', label: 'Log Aktivitas', icon: 'ri:file-list-3-line' },
  { to: '/admin/settings', label: 'Pengaturan', icon: 'ri:settings-3-line' },
]

const kasirNav = [
  { to: '/kasir', label: 'POS', icon: 'ri:shopping-cart-2-line', end: true },
  { to: '/kasir/scan', label: 'Scan Pesanan', icon: 'ri:barcode-line' },
  { to: '/kasir/add-product', label: 'Tambah Produk', icon: 'ri:add-box-line' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = user?.role === 'admin' ? adminNav : kasirNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-canvas flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <span className="font-heading font-bold text-2xl text-white">
            KA<span className="text-primary">YA</span>
          </span>
          <p className="text-white/40 text-xs mt-0.5">Bakery Management</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <iconify-icon icon={item.icon} width="18" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{user?.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                ${user?.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-300'}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 text-white/50 hover:text-white text-xs py-1.5 transition-colors"
          >
            <iconify-icon icon="ri:logout-box-r-line" width="14" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <main className="p-6 min-h-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
