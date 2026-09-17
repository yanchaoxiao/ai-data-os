'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, PenSquare, Upload, Link as LinkIcon, BookOpen } from 'lucide-react'
import CategorySidebar from '../../components/knowledge/CategorySidebar'
import ArticleCard from '../../components/knowledge/ArticleCard'
import CategoryModal from '../../components/knowledge/CategoryModal'
import {
  getKBCategories,
  getKBArticles,
  uploadKBFile,
  fetchKBUrl,
  createKBArticle,
  type KBCategory,
  type KBArticle,
} from '../../lib/api'

function getBase() {
  if (typeof window === 'undefined') return ''
  return window.location.pathname.startsWith('/aidata') ? '/aidata' : ''
}

function navigate(path: string) {
  window.location.href = getBase() + path
}

export default function KnowledgePage() {
  const [categories, setCategories] = useState<KBCategory[]>([])
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await getKBCategories())
    } catch { /* ignore */ }
  }, [])

  const loadArticles = useCallback(async () => {
    try {
      const arts = await getKBArticles({
        categoryId: selectedCategoryId ?? undefined,
        q: searchQuery.trim() || undefined,
      })
      setArticles(arts)
    } catch { /* ignore */ }
  }, [selectedCategoryId, searchQuery])

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(loadArticles, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [loadArticles])

  const pendingCount = articles.filter(
    a => a.status === 'pending' || a.status === 'ai_reviewed'
  ).length

  const categoryMap = new Map(categories.map(c => [c.id, c.name]))

  const displayedArticles = pendingOnly
    ? articles.filter(a => a.status === 'pending' || a.status === 'ai_reviewed')
    : articles

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadKBFile(file)
      loadArticles()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleFetchUrl() {
    if (!urlInput.trim()) return
    setFetchingUrl(true)
    try {
      const result = await fetchKBUrl(urlInput.trim())
      // Create article from fetched content
      await createKBArticle({
        title: result.title,
        content: result.content,
        source_type: 'url',
        status: 'community',
      })
      setUrlInput('')
      setShowUrlModal(false)
      loadArticles()
    } finally {
      setFetchingUrl(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <div>
              <h2 className="text-base font-bold text-gray-800">知识库</h2>
              <p className="text-xs text-gray-400">业务文档、需求材料、技术方案</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPendingOnly(false) }}
                placeholder="搜索文章..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          {pendingCount > 0 && (
            <button
              onClick={() => setPendingOnly(f => !f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pendingOnly
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              待审核 {pendingCount}
            </button>
          )}
          <button
            onClick={() => setShowUrlModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LinkIcon size={14} />
            抓取URL
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.md,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? '上传中...' : '上传文件'}
          </button>
          <button
            onClick={() => navigate('/knowledge/editor')}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <PenSquare size={14} />
            写文章
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        <CategorySidebar
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={id => {
            setSelectedCategoryId(id)
            setPendingOnly(false)
          }}
          onManage={() => setShowCategoryModal(true)}
        />
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {displayedArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <BookOpen size={40} className="mb-3 opacity-40" />
              <p className="text-sm">暂无文章</p>
              <p className="text-xs mt-1">点击右上角「写文章」开始沉淀知识</p>
            </div>
          ) : (
            displayedArticles.map(a => (
              <ArticleCard
                key={a.id}
                article={a}
                categoryName={a.category_id ? categoryMap.get(a.category_id) : undefined}
                onClick={() => navigate(`/knowledge/article/${a.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* URL Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">抓取网页</h2>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFetchUrl() }}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowUrlModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleFetchUrl}
                disabled={fetchingUrl || !urlInput.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                {fetchingUrl ? '抓取中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onRefresh={loadCategories}
        />
      )}
    </div>
  )
}
