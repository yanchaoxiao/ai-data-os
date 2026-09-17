'use client'

import { Folder, FolderOpen, Settings, BookOpen } from 'lucide-react'
import type { KBCategory } from '../../lib/api'

interface CategorySidebarProps {
  categories: KBCategory[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onManage?: () => void
}

function Item({
  cat,
  depth,
  selected,
  subs,
  onSelect,
}: {
  cat: KBCategory
  depth: number
  selected: boolean
  subs: KBCategory[]
  onSelect: (id: number) => void
}) {
  return (
    <>
      <button
        onClick={() => onSelect(cat.id)}
        className={`w-full text-left flex items-center gap-2 py-1.5 rounded-lg text-sm transition-all ${
          selected
            ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm ring-1 ring-teal-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: '12px' }}
      >
        <span className={selected ? 'text-teal-500' : 'text-gray-400'}>
          {subs.length > 0 ? <FolderOpen size={14} className="shrink-0" /> : <Folder size={14} className="shrink-0" />}
        </span>
        <span className="truncate">{cat.name}</span>
      </button>
      {subs.map(sub => (
        <Item key={sub.id} cat={sub} depth={depth + 1} selected={false} subs={[]} onSelect={onSelect} />
      ))}
    </>
  )
}

export default function CategorySidebar({
  categories,
  selectedId,
  onSelect,
  onManage,
}: CategorySidebarProps) {
  const roots = categories
    .filter(c => c.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  const childrenOf = (parentId: number) =>
    categories
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="w-56 shrink-0 flex flex-col gap-0.5 bg-white rounded-xl border border-gray-100 p-3 h-fit">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">分类</div>
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          selectedId === null
            ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm ring-1 ring-teal-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
        }`}
      >
        <BookOpen size={14} className={selectedId === null ? 'text-teal-500' : 'text-gray-400'} />
        全部文章
      </button>
      {roots.map(cat => (
        <Item
          key={cat.id}
          cat={cat}
          depth={0}
          selected={selectedId === cat.id}
          subs={childrenOf(cat.id)}
          onSelect={onSelect}
        />
      ))}
      {onManage && (
        <button
          onClick={onManage}
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings size={12} />
          管理分类
        </button>
      )}
    </div>
  )
}
