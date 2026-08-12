import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      const user = JSON.parse(localStorage.getItem('kaya_user') || '{}')
      navigate(user.role === 'admin' ? '/admin' : '/kasir', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(115deg, transparent, transparent 28px, white 28px, white 29px)' }} />

      <div className="w-full max-w-sm relative">
        {/* Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />

        {/* Card */}
        <div className="relative bg-white/[0.07] backdrop-blur border border-white/[0.12] rounded-xl2 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-heading font-bold text-4xl text-white mb-1">
              KA<span className="text-primary">YA</span>
            </h1>
            <p className="text-white/50 text-sm">Bakery Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kayabakery.id"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-canvas-alt font-semibold py-3 rounded-full text-sm transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
            >
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            KAYA Bakery © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
