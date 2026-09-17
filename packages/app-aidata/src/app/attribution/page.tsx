'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, TrendingUp, Share2, BookOpen, RefreshCw, Code2 } from 'lucide-react'
import MetricPicker from '../../components/shared/MetricPicker'
import DateRangePicker from '../../components/shared/DateRangePicker'
import DAGNodeCard, { type DAGNode } from '../../components/attribution/DAGNodeCard'
import SqlHighlight from '../../components/shared/SqlHighlight'
import QuickCheckPanel from '../../components/attribution/QuickCheckPanel'
import MarkdownRenderer from '../../components/shared/MarkdownRenderer'
import {
  runAttribution, quickCheck, refineAttribution,
  type AttributionResult, type QuickCheckResult,
} from '../../lib/api'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function getSearchParam(key: string): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get(key) ?? ''
}

const STORAGE_KEY = 'aidata_attribution_last'

type Mode = 'idle' | 'loading' | 'quick' | 'full' | 'error'

function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-600"
      >
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-indigo-500" />
          <span className="font-medium">指标 SQL</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '\u25B2 收起' : '\u25BC 展开'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <SqlHighlight sql={sql} />
        </div>
      )}
    </div>
  )
}

export default function AttributionPage() {
  const [metric, setMetric] = useState('')
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(daysAgo(1))
  const [mode, setMode] = useState<Mode>('idle')
  const [error, setError] = useState('')
  const [quickResult, setQuickResult] = useState<QuickCheckResult | null>(null)
  const [fullResult, setFullResult] = useState<AttributionResult | null>(null)
  const [refineOpen, setRefineOpen] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [refineLoading, setRefineLoading] = useState(false)
  const [refinedSummary, setRefinedSummary] = useState('')
  const [initialized, setInitialized] = useState(false)

  const handleFull = useCallback(async (m: string, f: string, t: string) => {
    if (!m) return
    setMode('loading'); setError(''); setQuickResult(null); setFullResult(null)
    try {
      const r = await runAttribution(m, { start: f, end: t, granularity: 'day' })
      setFullResult(r); setMode('full')
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ metric: m, from: f, to: t, mode: 'full', fullResult: r }))
      } catch { /* quota exceeded */ }
    } catch (e: unknown) {
      setError((e as Error).message ?? '归因分析失败'); setMode('error')
    }
  }, [])

  useEffect(() => {
    const m = getSearchParam('metric')
    const f = getSearchParam('from')
    const t = getSearchParam('to')
    if (m) {
      setMetric(m)
      if (f) setFrom(f)
      if (t) setTo(t)
      setInitialized(true)
      handleFull(m, f || daysAgo(30), t || daysAgo(1))
      return
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.metric) setMetric(parsed.metric)
        if (parsed.from) setFrom(parsed.from)
        if (parsed.to) setTo(parsed.to)
        if (parsed.fullResult) { setFullResult(parsed.fullResult); setMode('full') }
        else if (parsed.quickResult) { setQuickResult(parsed.quickResult); setMode('quick') }
      }
    } catch { /* ignore */ }
    setInitialized(true)
  }, [handleFull])

  const handleQuick = async () => {
    if (!metric) return
    setMode('loading'); setError(''); setQuickResult(null); setFullResult(null)
    try {
      const r = await quickCheck(metric, { start: from, end: to })
      setQuickResult(r); setMode('quick')
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ metric, from, to, mode: 'quick', quickResult: r }))
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError((e as Error).message ?? '快速检测失败'); setMode('error')
    }
  }

  const handleFullClick = () => handleFull(metric, from, to)

  const handleRefine = async () => {
    if (!fullResult?.state || !refineText.trim()) return
    setRefineLoading(true)
    try {
      const r = await refineAttribution(fullResult.state, refineText)
      setRefinedSummary(r.summary)
    } catch { /* ignore */ }
    setRefineLoading(false)
  }

  const handleWriteback = () => {
    const report = refinedSummary || fullResult?.conclusion || ''
    const encoded = btoa(unescape(encodeURIComponent(report)))
    const base = window.location.pathname.startsWith('/aidata') ? '/aidata' : ''
    window.location.href = `${base}/knowledge/editor?prefill=${encoded}`
  }

  const handleShare = () => {
    const origin = window.location.origin
    const base = window.location.pathname.startsWith('/aidata') ? '/aidata' : ''
    const url = `${origin}${base}/attribution?metric=${metric}&from=${from}&to=${to}`
    navigator.clipboard.writeText(url)
  }

  const nodes: DAGNode[] = (fullResult?.nodes ?? []) as DAGNode[]
  const summaryNode = nodes.find(n => n.node === 'summarizer')
  const displaySummary = refinedSummary || (summaryNode?.data?.summary as string) || fullResult?.conclusion || ''
  const analysisStart = fullResult?.analysis_start || from

  if (!initialized) return null

  return (
    <div className="flex flex-col h-full">
      {/* Control bar */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">归因分析</h2>
          <p className="text-sm text-gray-400 mt-0.5">数据波动溯源，DAG 根因定位</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MetricPicker value={metric} onChange={setMetric} />
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
          <button
            onClick={handleQuick}
            disabled={!metric || mode === 'loading'}
            className="flex items-center gap-1.5 px-4 py-2 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-40 transition-colors"
          >
            <Zap size={14} />
            快速检测
          </button>
          <button
            onClick={handleFullClick}
            disabled={!metric || mode === 'loading'}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <TrendingUp size={14} />
            {mode === 'loading' ? '分析中...' : '完整归因'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {mode === 'idle' && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <TrendingUp size={40} className="mb-3 opacity-30" />
            <p className="text-sm">选择指标后发起归因分析</p>
          </div>
        )}

        {mode === 'loading' && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-full max-w-md bg-gray-200 rounded-full h-1 mb-4">
              <div className="bg-indigo-500 h-1 rounded-full animate-pulse w-2/3" />
            </div>
            <p className="text-sm">分析中，请稍候...</p>
          </div>
        )}

        {mode === 'error' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            {'\u26A0'} {error}
          </div>
        )}

        {mode === 'quick' && quickResult && (
          <QuickCheckPanel result={quickResult} />
        )}

        {mode === 'full' && fullResult && (
          <div className="max-w-2xl space-y-3">
            {nodes.filter(n => n.node !== 'summarizer').map((n, i) => {
              let displayNode = n
              if (n.node === 'trend' && analysisStart && Array.isArray(n.data?.trend)) {
                displayNode = {
                  ...n,
                  data: {
                    ...n.data,
                    trend: (n.data!.trend as Array<{ dt: string }>).filter(r => r.dt >= analysisStart),
                  },
                }
              }
              return <DAGNodeCard key={`${displayNode.node}-${i}`} node={displayNode} defaultOpen={i === 0} />
            })}

            {displaySummary && (
              <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">✓</span>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">归因报告</p>
                </div>
                <MarkdownRenderer content={displaySummary} />
              </div>
            )}

            {fullResult.sql && <SqlBlock sql={fullResult.sql} />}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRefineOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw size={13} />
                细化分析
              </button>
              <button
                onClick={handleWriteback}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-50"
              >
                <BookOpen size={13} />
                写回知识库
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <Share2 size={13} />
                分享
              </button>
            </div>

            {refineOpen && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs text-gray-500">补充业务线索，重新生成报告</p>
                <textarea
                  value={refineText}
                  onChange={e => setRefineText(e.target.value)}
                  rows={3}
                  placeholder="例如：本周有大促活动，渠道 A 出现系统故障..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  onClick={handleRefine}
                  disabled={refineLoading || !refineText.trim()}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                >
                  {refineLoading ? '重新分析中...' : '确认细化'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
