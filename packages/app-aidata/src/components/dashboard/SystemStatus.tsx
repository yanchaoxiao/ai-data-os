'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface ServiceStatus {
  name: string
  url: string
  healthy: boolean
}

export default function SystemStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Gateway', url: '/api/v1/health', healthy: false },
  ])

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_AIDATA_URL || 'http://localhost:3005'
    const check = async () => {
      const updated = await Promise.all(
        services.map(async s => {
          try {
            const resp = await fetch(`${base}${s.url}`)
            return { ...s, healthy: resp.ok }
          } catch {
            return { ...s, healthy: false }
          }
        })
      )
      setServices(updated)
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">服务状态</h3>
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{s.name}</span>
            <div className="flex items-center gap-1.5">
              {s.healthy ? (
                <>
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-xs text-green-600">Healthy</span>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-red-400" />
                  <span className="text-xs text-red-500">Down</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
