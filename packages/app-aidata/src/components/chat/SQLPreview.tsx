'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Code } from 'lucide-react'

interface Props {
  sql: string
}

export default function SQLPreview({ sql }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <Code size={14} />
        <span>SQL 查询</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="border-t">
          <pre className="text-xs text-gray-700 p-3 overflow-x-auto bg-gray-50">
            <code>{sql}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
