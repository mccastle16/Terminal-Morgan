import { createContext, useContext, useState, useEffect } from 'react'
import { TERMINAL_USERS, getRoleConfig, hasPermission } from '../config/roles'
import { getTenant, DEFAULT_TENANT } from '../config/tenant'

const TerminalAuthContext = createContext(null)

export function TerminalAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT)

  const tenant = getTenant(tenantId)

  useEffect(() => {
    const saved = localStorage.getItem('terminal_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { localStorage.removeItem('terminal_user') }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    await new Promise(r => setTimeout(r, 600))
    const record = TERMINAL_USERS[email.toLowerCase()]
    if (!record || record.password !== password) throw new Error('Invalid credentials')

    const userData = {
      email: email.toLowerCase(),
      name: record.name,
      role: record.role,
      title: record.title,
      businessId: record.businessId || null,
      roleConfig: getRoleConfig(record.role),
      tenantId,
      loginTime: new Date().toISOString(),
    }
    setUser(userData)
    localStorage.setItem('terminal_user', JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('terminal_user')
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
