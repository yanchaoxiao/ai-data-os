'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function RegistryPage() {
  return (
    <ModuleShell name="指标目录" icon="📊" color="from-emerald-500 to-teal-600">
      <RemoteApp remoteName="aidata" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载指标目录...</div>} />
    </ModuleShell>
  )
}
