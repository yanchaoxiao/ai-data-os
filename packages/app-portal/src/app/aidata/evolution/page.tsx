'use client'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'
import { useAuth } from '@/components/AuthProvider'

export default function EvolutionPage() {
  const { user } = useAuth()
  return (
    <ModuleShell name="自进化" icon="🧬" color="from-rose-500 to-pink-600">
      {user?.role === 'admin' ? (
        <RemoteApp remoteName="aidata" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载自进化...</div>} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
          </div>
          <div>
            <p className="text-gray-800 font-semibold">需要管理员权限</p>
            <p className="text-gray-400 text-sm mt-1">自进化看板仅对管理员开放</p>
          </div>
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors">返回首页</Link>
        </div>
      )}
    </ModuleShell>
  )
}
