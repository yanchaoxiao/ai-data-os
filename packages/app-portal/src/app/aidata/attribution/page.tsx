'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function AttributionPage() {
  return (
    <ModuleShell name="归因分析" icon="🔍" color="from-amber-500 to-orange-600">
      <RemoteApp remoteName="aidata" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载归因分析...</div>} />
    </ModuleShell>
  )
}
