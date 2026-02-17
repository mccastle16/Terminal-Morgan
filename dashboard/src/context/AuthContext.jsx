import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Demo users for the dashboard
const DEMO_USERS = {
  'admin@cgcc.org': { password: 'cgcc2024', name: 'Admin User', role: 'admin' },
  'member@cgcc.org': { password: 'member2024', name: 'Chamber Member', role: 'member' },
  'demo@cgcc.org': { password: 'demo', name: 'Demo User', role: 'viewer' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('cgcc_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('cgcc_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const userRecord = DEMO_USERS[email.toLowerCase()]
    if (!userRecord || userRecord.password !== password) {
      throw new Error('Invalid email or password')
    }

    const userData = {
      email: email.toLowerCase(),
      name: userRecord.name,
      role: userRecord.role,
      loginTime: new Date().toISOString(),
    }

    setUser(userData)
    localStorage.setItem('cgcc_user', JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('cgcc_user')
  }

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
