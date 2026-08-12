import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from './api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'kasir'
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('kaya_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('kaya_token', data.data.token)
    localStorage.setItem('kaya_user', JSON.stringify(data.data.user))
    setUser(data.data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('kaya_token')
    localStorage.removeItem('kaya_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
