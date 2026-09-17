'use client'

import { useState } from 'react'
import { GenerateForm } from '../components/GenerateForm'
import { ScoreBadge } from '../components/ScoreBadge'
import { ResultGrid } from '../components/ResultGrid'
import { BatchPanel } from '../components/BatchPanel'
import type { Industry, ContentType, Platform, PlatformResult } from '@ai-xyc/growth'

type Mode = 'single' | 'batch'

interface GenerateResult {
  original: string
  platforms: Partial<Record<Platform, PlatformResult>>
  score: { total: number; dimensions: Record<string, number> }
  model: string
  latency_ms: number
}

interface BatchItemResult {
  original?: string
  platforms?: Partial<Record<Platform, PlatformResult>>
  score?: { total: number; dimensions: Record<string, number> }
  model?: string
  error?: string
}

const BASE = process.env.NEXT_PUBLIC_REMOTE_GROWTH ?? ''

export default function GrowthPage() {
  const [mode, setMode] = useState<Mode>('single')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [batchResults, setBatchResults] = useState<BatchItemResult[]>([])

  const [lastOptions, setLastOptions] = useState<{
    industry: Industry
    contentType: ContentType
    platforms: Platform[]
  }>({ industry: 'generic', contentType: 'copywriting', platforms: ['wecom'] })

  async function handleGenerate(data: {
    prompt: string
    industry: Industry
    contentType: ContentType
    platforms: Platform[]
  }) {
    setLoading(true)
    setError(null)
    setLastOptions({ industry: data.industry, contentType: data.contentType, platforms: data.platforms })

    try {
      const res = await fetch(`${BASE}/api/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.reason ?? json.error ?? `HTTP ${res.status}`)
        return
      }
      setResult(json as GenerateResult)
    } catch {
      setError('网络请求失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleBatch(prompts: string[]) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${BASE}/api/content/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts, ...lastOptions }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`)
        return
      }
      setBatchResults(json.results as BatchItemResult[])
    } catch {
      setError('批量请求失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-lg font-bold text-gray-800">📈 Growth</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['single', 'batch'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                mode === m
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'single' ? '单条' : '批量'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 flex flex-col gap-4">
        {mode === 'single' ? (
          <>
            <GenerateForm onSubmit={handleGenerate} loading={loading} />
            {error && (
              <div className="text-xs text-red-500 bg-red-50 rounded-lg p-3 border border-red-200">
                ⚠ {error}
              </div>
            )}
            {result && (
              <>
                <ScoreBadge total={result.score.total} dimensions={result.score.dimensions} />
                <ResultGrid platforms={result.platforms} model={result.model} latency_ms={result.latency_ms} />
              </>
            )}
          </>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              批量模式使用上次单条生成的行业/类型/平台设置。请先在单条模式选择好参数。
            </div>
            {error && (
              <div className="text-xs text-red-500 bg-red-50 rounded-lg p-3 border border-red-200">
                ⚠ {error}
              </div>
            )}
            <BatchPanel onSubmit={handleBatch} loading={loading} results={batchResults} />
          </>
        )}
      </div>
    </div>
  )
}
