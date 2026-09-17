'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { getRegistryMetrics, type MetricDef } from '../../lib/api'

interface MetricPickerProps {
  value: string
  onChange: (name: string) => void
  placeholder?: string
}

export default function MetricPicker({ value, onChange, placeholder = '选择指标...' }: MetricPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [metrics, setMetrics] = useState<MetricDef[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getRegistryMetrics().then(r => setMetrics(r.metrics)).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = metrics.find(m => m.name === value)
  const q = query.toLowerCase()
  const filtered = metrics.filter(
    m => m.name.includes(q) || m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
  )

  return (
    <div ref={ref} className="relative w-64">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索指标..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-4 text-center">未找到匹配指标</p>
            ) : (
              filtered.map(m => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => { onChange(m.name); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${
                    m.name === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-gray-400">{m.name}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
