'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Save, Send } from 'lucide-react'
import {
  getKBCategories,
  getKBArticle,
  createKBArticle,
  updateKBArticle,
  type KBCategory,
} from '../../../lib/api'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

function getEditorParams(): { editId: number | null; prefill: string | null } {
  if (typeof window === 'undefined') return { editId: null, prefill: null }
  const params = new URLSearchParams(window.location.search)
  const idStr = params.get('id')
  const prefillStr = params.get('prefill')
  return {
    editId: idStr ? Number(idStr) : null,
    prefill: prefillStr,
  }
}

function getListPath(): string {
  const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/aidata') ? '/aidata' : ''
  return base + '/knowledge'
}

export default function EditorPage() {
  const [categories, setCategories] = useState<KBCategory[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const { editId: eid, prefill } = getEditorParams()
    setEditId(eid)

    getKBCategories().then(setCategories).catch(() => {})

    if (eid) {
      getKBArticle(eid)
        .then(a => {
          setTitle(a.title)
          setContent(a.content ?? '')
          if (a.category_id) setCategoryId(a.category_id)
        })
        .catch(() => {})
        .finally(() => setLoaded(true))
    } else {
      if (prefill) {
        try {
          setContent(decodeURIComponent(escape(atob(prefill))))
        } catch { /* ignore */ }
      }
      setLoaded(true)
    }
  }, [])

  async function handleSave() {
    if (saving || !title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        content,
        category_id: categoryId !== '' ? (categoryId as number) : null,
        source_type: 'markdown',
      }
      if (editId) {
        await updateKBArticle(editId, payload)
      } else {
        const created = await createKBArticle(payload)
        setEditId(created.id)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (submitting || !title.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        content,
        category_id: categoryId !== '' ? (categoryId as number) : null,
        source_type: 'markdown',
        status: 'pending',
      }
      if (editId) {
        await updateKBArticle(editId, payload)
      } else {
        await createKBArticle(payload)
      }
      window.location.href = getListPath()
    } finally {
      setSubmitting(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-3 flex items-center gap-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="文章标题..."
          className="flex-1 text-lg font-semibold text-gray-900 placeholder-gray-300 focus:outline-none"
        />
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="">无分类</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={v => setContent(v ?? '')}
          height="100%"
          preview="live"
          style={{ height: '100%', borderRadius: 0, border: 'none' }}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-end gap-3 bg-white">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <Save size={14} />
          {saving ? '保存中...' : '保存草稿'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
        >
          <Send size={14} />
          {submitting ? '提交中...' : '提交审核'}
        </button>
      </div>
    </div>
  )
}
