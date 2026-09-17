'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

const PUBLIC_PATHS = ['/login']

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    if (!ready) return
    if (!user && !isPublic) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`)
    }
    if (user && isPublic) {
      router.replace('/')
    }
  }, [ready, user, isPublic, pathname, router])

  if (!ready) return null
  if (!user && !isPublic) return null
  if (user && isPublic) return null

  return <>{children}</>
}
