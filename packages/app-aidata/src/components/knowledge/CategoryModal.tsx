'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createKBCategory, deleteKBCategory, type KBCategory } from '../../lib/api'

interface CategoryModalProps {
  categories: KBCategory[]
  onClose: () => void
  onRefresh: () => void
}

export default function CategoryModal({ categories, onClose, onRefresh }: CategoryModalProps) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleCreate() {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      await createKBCategory(name)
      setNewName('')
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (deletingId !== null) return
    setDeletingId(id)
    try {
      await deleteKBCategory(id)
      onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">管理分类</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-1 max-h-72 overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">暂无分类</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-1.5 px-1">
              <span className="text-sm text-gray-700">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="p-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="新分类名称"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 flex items-center gap-1 transition-colors"
          >
            <Plus size={14} />
            添加
          </button>
        </div>
      </div>
    </div>
  )
}
