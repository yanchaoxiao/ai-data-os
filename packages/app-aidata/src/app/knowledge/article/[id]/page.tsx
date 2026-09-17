'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
import { getKBArticle, publishKBArticle, rejectKBArticle, type KBArticle } from '../../../../lib/api'

const MarkdownPreview = dynamic(
  () =>
    import('@uiw/react-md-editor').then(mod => {
      const MDEditor = mod.default
      return function Preview({ source }: { source: string }) {
        return (
          <MDEditor.Markdown
            source={source}
            style={{ background: 'transparent', color: '#374151' }}
          />
        )
      }
    }),
  { ssr: false }
)

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  ai_reviewed: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  community: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<string, string> = {
  published: '已发布',
  pending: '审核中',
  ai_reviewed: '待审核',
  rejected: '已拒绝',
  community: '社区',
}

function getArticleIdFromPath(): number {
  const parts = window.location.pathname.split('/')
  const idx = parts.findIndex(p => p === 'article')
  return idx !== -1 ? Number(parts[idx + 1]) || 0 : 0
}

function getListPath(): string {
  const base = window.location.pathname.startsWith('/aidata') ? '/aidata' : ''
  return base + '/knowledge'
}

export default function ArticlePage() {
  const [article, setArticle] = useState<KBArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const id = getArticleIdFromPath()
    if (!id) { setLoading(false); return }
    getKBArticle(id)
      .then(setArticle)
      .catch(() => { window.location.href = getListPath() })
      .finally(() => setLoading(false))
  }, [])

  async function handlePublish() {
    if (!article) return
    setActing(true)
    try {
      await publishKBArticle(article.id)
      setArticle(a => a ? { ...a, status: 'published' as const } : a)
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!article) return
    setActing(true)
    try {
      await rejectKBArticle(article.id)
      setArticle(a => a ? { ...a, status: 'rejected' as const } : a)
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        加载中...
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <p className="text-sm">文章不存在</p>
        <button
          onClick={() => { window.location.href = getListPath() }}
          className="text-sm text-teal-600 hover:underline"
        >
          返回知识库
        </button>
      </div>
    )
  }

  const statusCls = STATUS_STYLES[article.status] ?? STATUS_STYLES.community
  const statusLabel = STATUS_LABELS[article.status] ?? article.status
  const canAudit = article.status === 'ai_reviewed' || article.status === 'pending'

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={16} />
        返回
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{article.title}</h1>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="capitalize">{article.source_type}</span>
          <span>{'\u00b7'}</span>
          <span>{new Date(article.updated_at).toLocaleDateString('zh-CN')}</span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 min-h-32" data-color-mode="light">
        <MarkdownPreview source={article.content ?? ''} />
      </div>

      {canAudit && (
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={acting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            发布
          </button>
          <button
            onClick={handleReject}
            disabled={acting}
            className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            拒绝
          </button>
        </div>
      )}
    </div>
  )
}
