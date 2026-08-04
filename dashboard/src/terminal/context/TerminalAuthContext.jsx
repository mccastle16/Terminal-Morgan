import { createContext, useContext, useState, useEffect } from 'react'
import { getRoleConfig, hasPermission } from '../config/roles'
import { getTenant, DEFAULT_TENANT } from '../config/tenant'
import { apiJson, setToken, getToken } from '../lib/api'

const TerminalAuthContext = createContext(null)

// Shape the server's user record into what the app consumes (adds roleConfig +
// tenantId). The server is the source of truth for role and businessId.
function decorate(user, tenantId) {
  if (!user) return null
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    title: user.title,
    businessId: user.businessId || null,
    roleConfig: getRoleConfig(user.role),
    tenantId,
  }
}

export function TerminalAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT)

  const tenant = getTenant(tenantId)

  // Bootstrap: if we hold a token, ask the server who we are. This validates the
  // JWT server-side instead of trusting a cached user blob in localStorage.
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!getToken()) { setLoading(false); return }
      try {
        const { user: u } = await apiJson('/api/me')
        if (!cancelled) setUser(decorate(u, tenantId))
      } catch {
        setToken(null)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    bootstrap()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A 401 anywhere (expired token) clears the session app-wide.
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('terminal:unauthorized', onUnauthorized)
    return () => window.removeEventListener('terminal:unauthorized', onUnauthorized)
  }, [])

  const login = async (email, password) => {
    const { token, user: u } = await apiJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(token)
    const decorated = decorate(u, tenantId)
    setUser(decorated)
    return decorated
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const can = (permission) => {
    if (!user) return false
    return hasPermission(user.role, permission)
  }

  return (
    <TerminalAuthContext.Provider value={{
      user, loading, login, logout, can,
      tenant, tenantId, setTenantId,
      isAuthenticated: !!user,
      role: user?.role || null,
    }}>
      {children}
    </TerminalAuthContext.Provider>
  )
}

export function useTerminalAuth() {
  const ctx = useContext(TerminalAuthContext)
  if (!ctx) throw new Error('useTerminalAuth must be used within TerminalAuthProvider')
  return ctx
}
