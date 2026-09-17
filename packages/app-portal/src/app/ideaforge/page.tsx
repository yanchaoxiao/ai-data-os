'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function IdeaForgePage() {
  return (
    <ModuleShell name="IdeaForge" icon="⚡" color="from-amber-500 to-orange-600">
      <RemoteApp remoteName="ideaforge" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载 IdeaForge...</div>} />
    </ModuleShell>
  )
}
