'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getCurrentUser, loginRequest, clearAuth, type AuthUser } from '../lib/auth'

interface AuthContextValue {
  user: AuthUser | null
  ready: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(getCurrentUser())
    setReady(true)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await loginRequest(username, password)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
