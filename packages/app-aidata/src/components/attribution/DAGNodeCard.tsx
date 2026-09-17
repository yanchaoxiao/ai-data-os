'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import SqlHighlight from '../shared/SqlHighlight'
import MarkdownRenderer from '../shared/MarkdownRenderer'

export interface DAGNode {
  node: string
  status: 'success' | 'failed' | 'skipped' | 'running'
  latency_ms: number
  error?: string
  data?: Record<string, unknown>
}

interface DAGNodeCardProps {
  node: DAGNode
  defaultOpen?: boolean
}

function StatusIcon({ status }: { status: DAGNode['status'] }) {
  if (status === 'running') return <Loader2 size={16} className="animate-spin text-indigo-500" />
  if (status === 'success') return <CheckCircle size={16} className="text-emerald-500" />
  if (status === 'failed') return <XCircle size={16} className="text-rose-500" />
  return <div className="w-4 h-4 rounded-full bg-gray-200" />
}

const NODE_LABELS: Record<string, string> = {
  trend: '趋势分析',
  anomaly: '异常检测',
  dimension_split: '维度拆解',
  correlation: '关联事件',
  causal_verify: '因果验证',
  root_cause: '根因分析',
  cost_breakdown: '成本拆解',
  cost_detail: '成本明细',
  summarizer: '生成报告',
}

function SqlToggle({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-indigo-500 hover:text-indigo-700"
      >
        {open ? '\u25B2 隐藏 SQL' : '\u25BC 查看 SQL'}
      </button>
      {open && <SqlHighlight sql={sql} />}
    </div>
  )
}

function TrendContent({ data }: { data: Record<string, unknown> }) {
  const trend = (data.trend as { dt: string; metric_value: number }[]) ?? []
  const sql = data.sql as string | undefined
  if (!trend.length) return <p className="text-xs text-gray-400">无趋势数据</p>
  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="dt" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(2) : String(v))} />
          <Line type="monotone" dataKey="metric_value" stroke="#6366f1" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      {sql && <SqlToggle sql={sql} />}
    </div>
  )
}

function AnomalyContent({ data }: { data: Record<string, unknown> }) {
  const found = data.is_anomaly as boolean | undefined
  const z_score = data.z_score as number | undefined
  const current_value = data.current_value as number | undefined
  const baseline_mean = data.baseline_mean as number | undefined
  const deviation_pct = data.deviation_pct as number | undefined
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-400">当前值</p>
        <p className="text-lg font-bold text-gray-800">{typeof current_value === 'number' ? current_value.toFixed(2) : '\u2014'}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-400">基线均值</p>
        <p className="text-lg font-bold text-gray-800">{typeof baseline_mean === 'number' ? baseline_mean.toFixed(2) : '\u2014'}</p>
      </div>
      <div className={`rounded-lg p-3 ${found ? 'bg-rose-50' : 'bg-emerald-50'}`}>
        <p className="text-xs text-gray-400">Z-Score</p>
        <p className={`text-lg font-bold ${found ? 'text-rose-600' : 'text-emerald-600'}`}>
          {typeof z_score === 'number' ? z_score.toFixed(2) : '\u2014'}
        </p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-400">偏差</p>
        <p className="text-lg font-bold text-gray-800">
          {typeof deviation_pct === 'number' ? `${deviation_pct.toFixed(1)}%` : '\u2014'}
        </p>
      </div>
      <div className="col-span-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${found ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {found ? '检测到异常' : '未检测到异常'}
        </span>
      </div>
    </div>
  )
}

function DimensionContent({ data }: { data: Record<string, unknown> }) {
  const breakdowns = data.breakdowns as Record<string, Array<Record<string, unknown>>> | undefined
  let breakdown: { dim: string; value: number }[] = []
  if (breakdowns) {
    const firstDim = Object.keys(breakdowns)[0]
    if (firstDim) {
      breakdown = (breakdowns[firstDim] ?? []).map(row => ({
        dim: String(row[firstDim] ?? ''),
        value: Number(row.metric_value ?? 0),
      }))
    }
  }
  if (!breakdown.length) return <p className="text-xs text-gray-400">无维度数据</p>
  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={breakdown} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="dim" type="category" tick={{ fontSize: 10 }} width={80} />
          <Tooltip />
          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function NodeContent({ node }: { node: DAGNode }) {
  const { data, node: name, error } = node
  if (error) return <p className="text-xs text-rose-500">{error}</p>
  if (!data) return <p className="text-xs text-gray-400">无数据</p>

  if (name === 'trend') return <TrendContent data={data} />
  if (name === 'anomaly') return <AnomalyContent data={data} />
  if (name === 'dimension_split') return <DimensionContent data={data} />
  if (name === 'summarizer') {
    const summary = (data.summary as string) ?? ''
    return (
      <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-lg p-4 border border-indigo-100">
        <MarkdownRenderer content={summary} />
      </div>
    )
  }

  const text = data.summary ?? data.conclusion ?? data.result ?? JSON.stringify(data, null, 2)
  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(text)}</p>
}

export default function DAGNodeCard({ node, defaultOpen = false }: DAGNodeCardProps) {
  const [open, setOpen] = useState(defaultOpen || node.status === 'failed')
  const label = NODE_LABELS[node.node] ?? node.node

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={node.status} />
          <span className="text-sm font-medium text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {node.latency_ms > 0 && (
            <span className="text-xs text-gray-400">{Math.round(node.latency_ms)}ms</span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-3">
            <NodeContent node={node} />
          </div>
        </div>
      )}
    </div>
  )
}
