'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function DealFlowPage() {
  return (
    <ModuleShell name="DealFlow" icon="🛒" color="from-rose-500 to-pink-600">
      <RemoteApp remoteName="dealflow" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载 DealFlow...</div>} />
    </ModuleShell>
  )
}
