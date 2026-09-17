'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function GrowthPage() {
  return (
    <ModuleShell name="Growth" icon="📈" color="from-emerald-500 to-teal-600">
      <RemoteApp remoteName="growth" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载 Growth...</div>} />
    </ModuleShell>
  )
}
