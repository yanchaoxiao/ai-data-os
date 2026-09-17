'use client'
import { RemoteApp } from '@/components/RemoteLoader'
import ModuleShell from '@/components/ModuleShell'

export default function KnowledgeArticlePage() {
  return (
    <ModuleShell name="知识库" icon="📚" color="from-teal-500 to-cyan-600">
      <RemoteApp remoteName="aidata" moduleName="./pages/index" fallback={<div className="p-8 text-center text-gray-400">加载文章...</div>} />
    </ModuleShell>
  )
}
