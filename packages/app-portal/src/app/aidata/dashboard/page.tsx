'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function DashboardPage() {
  return (
    <ModuleShell name="系统仪表盘" icon="📉" color="from-violet-500 to-purple-600">
      <RemoteApp remoteName="aidata" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载系统仪表盘...</div>} />
    </ModuleShell>
  )
}
