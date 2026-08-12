import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Login from '../pages/auth/Login'
import DashboardLayout from '../components/layout/DashboardLayout'
import DashboardHome from '../pages/admin/DashboardHome'
import Products from '../pages/admin/Products'
import Orders from '../pages/admin/Orders'
import Cashiers from '../pages/admin/Cashiers'
import ActivityLogs from '../pages/admin/ActivityLogs'
import Settings from '../pages/admin/Settings'
import POS from '../pages/kasir/POS'
import ScanOrder from '../pages/kasir/ScanOrder'
import AddProduct from '../pages/kasir/AddProduct'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user!.role)) return <Navigate to={user!.role === 'admin' ? '/admin' : '/kasir'} replace />
  return <>{children}</>
}

export default function AppRouter() {
  const { user, isAuthenticated } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isAuthenticated
            ? <Navigate to={user?.role === 'admin' ? '/admin' : '/kasir'} replace />
            : <Login />
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="cashiers" element={<Cashiers />} />
          <Route path="logs" element={<ActivityLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Kasir Routes */}
        <Route path="/kasir" element={
          <ProtectedRoute allowedRoles={['kasir', 'admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<POS />} />
          <Route path="scan" element={<ScanOrder />} />
          <Route path="add-product" element={<AddProduct />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={
          isAuthenticated
            ? <Navigate to={user?.role === 'admin' ? '/admin' : '/kasir'} replace />
            : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
