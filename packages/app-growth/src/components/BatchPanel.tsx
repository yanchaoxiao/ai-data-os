'use client'

import { useState } from 'react'
import type { Platform, PlatformResult } from '@ai-xyc/growth'
import { ScoreBadge } from './ScoreBadge'
import { ResultGrid } from './ResultGrid'

const MAX_BATCH = 20

interface BatchResult {
  original?: string
  platforms?: Partial<Record<Platform, PlatformResult>>
  score?: { total: number; dimensions: Record<string, number> }
  model?: string
  error?: string
}

interface BatchPanelProps {
  onSubmit: (prompts: string[]) => void
  loading: boolean
  results: BatchResult[]
}

export function BatchPanel({ onSubmit, loading, results }: BatchPanelProps) {
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const overLimit = lines.length > MAX_BATCH

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lines.length || overLimit || loading) return
    onSubmit(lines)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">每行一条需求，最多 {MAX_BATCH} 条</label>
          <span className={`text-xs font-medium ${overLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {lines.length}/{MAX_BATCH}
          </span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`推广儿童编程课，强调 AI 时代\n双十一大促，主推家电折扣\n本地咖啡馆，新品季节限定`}
          rows={6}
          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-emerald-400 placeholder-gray-400 font-mono"
        />
        {overLimit && (
          <p className="text-xs text-red-500">超出 {MAX_BATCH} 条限制，请减少需求数量</p>
        )}
        <button
          type="submit"
          disabled={loading || lines.length === 0 || overLimit}
          className="w-full py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? `批量生成中 (${results.length}/${lines.length})…` : `✨ 批量生成 ${lines.length > 0 ? `(${lines.length} 条)` : ''}`}
        </button>
      </form>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className="text-xs font-medium text-gray-700">
                  {r.error ? '❌' : '✓'} 条目 {i + 1}
                  {r.score && <span className="ml-2 text-gray-400">质量分 {r.score.total}</span>}
                </span>
                <span className="text-gray-400 text-xs">{expanded === i ? '▲' : '▼'}</span>
              </button>
              {expanded === i && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-50">
                  {r.error ? (
                    <p className="text-xs text-red-500 pt-3">⚠ {r.error}</p>
                  ) : (
                    <>
                      {r.score && <ScoreBadge total={r.score.total} dimensions={r.score.dimensions} />}
                      {r.platforms && <ResultGrid platforms={r.platforms} model={r.model} />}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
