'use client'

const API_BASE = process.env.NEXT_PUBLIC_AIDATA_URL || 'http://localhost:3005'
const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export interface AuthUser {
  id: string
  username: string
  role: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

function decodeToken(token: string): (AuthUser & { exp?: number }) | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      id: String(json.sub ?? ''),
      username: json.username ?? json.sub ?? '',
      role: json.role ?? 'user',
      exp: json.exp,
    }
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getCurrentUser(): AuthUser | null {
  if (AUTH_BYPASS && typeof window !== 'undefined') {
    return { id: 'bypass', username: 'admin', role: 'admin' }
  }
  const token = getToken()
  if (!token) return null
  const decoded = decodeToken(token)
  if (!decoded) return null
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    clearAuth()
    return null
  }
  return { id: decoded.id, username: decoded.username, role: decoded.role }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export async function loginRequest(username: string, password: string): Promise<AuthUser> {
  if (AUTH_BYPASS) {
    return { id: 'bypass', username: 'admin', role: 'admin' }
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let detail = '用户不存在或密码错误'
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  const data = (await res.json()) as TokenResponse
  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(REFRESH_KEY, data.refresh_token)

  const user = getCurrentUser()
  if (!user) throw new Error('登录令牌无效')
  return user
}
