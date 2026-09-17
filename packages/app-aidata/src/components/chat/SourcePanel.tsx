'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'

interface Props {
  metadata: Record<string, unknown>
}

export default function SourcePanel({ metadata }: Props) {
  const [open, setOpen] = useState(false)

  const entries = Object.entries(metadata).filter(
    ([k, v]) => v !== null && v !== undefined && k !== 'sql'
  )

  if (entries.length === 0) return null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <Info size={14} />
        <span>调试信息</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="border-t p-3 text-xs text-gray-600 space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-gray-500 min-w-[80px]">{key}:</span>
              <span className="break-all">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
