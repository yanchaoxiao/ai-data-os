'use client'

import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import type { ChatSession } from './types'

interface Props {
  sessions: ChatSession[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export default function ChatSidebar({ sessions, currentId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="w-56 h-full bg-gray-900 flex flex-col text-white shrink-0">
      <div className="p-3 border-b border-gray-700">
        <div className="text-xs text-gray-500 px-1 mb-2 font-medium tracking-wide">AI DATA OS</div>
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors text-sm font-medium text-gray-200"
        >
          <Plus size={14} />
          新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-500 px-3 py-6 text-center">暂无对话记录</p>
        ) : (
          sessions.map(s => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                s.id === currentId ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-300'
              }`}
              onClick={() => onSelect(s.id)}
            >
              <MessageSquare size={13} className="text-gray-500 shrink-0" />
              <span className="flex-1 text-sm truncate">{s.title}</span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
