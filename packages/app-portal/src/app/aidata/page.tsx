'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function AIDataPage() {
  return (
    <ModuleShell name="AI Data OS" icon="🧠" color="from-indigo-500 to-violet-600">
      <RemoteApp remoteName="aidata" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载 AI Data OS...</div>} />
    </ModuleShell>
  )
}
