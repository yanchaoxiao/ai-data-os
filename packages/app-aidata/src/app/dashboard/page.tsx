'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react'
import MetricCard from '../../components/dashboard/MetricCard'
import SystemStatus from '../../components/dashboard/SystemStatus'
import { getMetrics, getServiceHealth, type MetricsResponse, type ServiceHealth, type ServiceStatus } from '../../lib/api'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd']

type ItemStatus = 'done' | 'partial' | 'missing'
interface ArchItem { label: string; status: ItemStatus; note?: string }
interface ArchLayer { name: string; en: string; color: string; items: ArchItem[] }

const ARCH_LAYERS: ArchLayer[] = [
  {
    name: '问答层', en: 'Chat Layer', color: 'indigo',
    items: [
      { label: '自然语言查询接口', status: 'done' },
      { label: 'DeepSeek LLM 集成', status: 'done' },
      { label: '指标上下文注入', status: 'done' },
      { label: '反馈采集 (L1)', status: 'done' },
      { label: '置信度 + 摘要生成', status: 'done' },
    ],
  },
  {
    name: '指标目录', en: 'Metric Catalog', color: 'emerald',
    items: [
      { label: '指标卡片网格', status: 'done' },
      { label: '血缘图谱 (SVG)', status: 'done' },
      { label: '手动新增指标', status: 'done' },
      { label: '批量导入', status: 'done' },
      { label: '标签过滤 + 全文搜索', status: 'done' },
    ],
  },
  {
    name: '归因分析', en: 'Attribution', color: 'amber',
    items: [
      { label: '快速检测 (异常 + 趋势)', status: 'done' },
      { label: 'DAG 节点流水线', status: 'done' },
      { label: '维度拆解 BarChart', status: 'done' },
      { label: '细化分析 (LLM 重推理)', status: 'done' },
      { label: '归因报告写回知识库', status: 'done' },
    ],
  },
  {
    name: '知识库', en: 'Knowledge Base', color: 'teal',
    items: [
      { label: '文章列表 + 分类树', status: 'done' },
      { label: 'Markdown 编辑器', status: 'done' },
      { label: '文件上传 / URL 抓取', status: 'done' },
      { label: '审核流 (发布/拒绝)', status: 'done' },
      { label: 'PG ILIKE 搜索', status: 'done' },
    ],
  },
  {
    name: '自进化', en: 'Evolution', color: 'violet',
    items: [
      { label: 'L1 反馈学习', status: 'done' },
      { label: 'L3 盲点发现', status: 'done' },
      { label: 'L4 评估门禁', status: 'done' },
      { label: 'L5 缓存进化', status: 'done' },
      { label: 'L6 指标发现', status: 'done' },
    ],
  },
]

const STATUS_CONFIG = {
  done:    { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', label: '已实现' },
  partial: { icon: AlertCircle, color: 'text-amber-500',   bg: 'bg-amber-50',   label: '部分实现' },
  missing: { icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-50',     label: '缺失' },
}

const COLOR_MAP: Record<string, string> = {
  indigo:  'border-indigo-300 bg-indigo-50',
  emerald: 'border-emerald-300 bg-emerald-50',
  amber:   'border-amber-300 bg-amber-50',
  teal:    'border-teal-300 bg-teal-50',
  violet:  'border-violet-300 bg-violet-50',
}
const HEADER_MAP: Record<string, string> = {
  indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  teal: 'bg-teal-500', violet: 'bg-violet-500',
}

function ArchLayerCard({ layer }: { layer: ArchLayer }) {
  const [open, setOpen] = useState(false)
  const done = layer.items.reduce((acc, i) => acc + (i.status === 'done' ? 1 : i.status === 'partial' ? 0.5 : 0), 0)
  const total = layer.items.length
  const pct = Math.round((done / total) * 100)
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div className={`rounded-xl border ${COLOR_MAP[layer.color]} overflow-hidden`}>
      <div className={`${HEADER_MAP[layer.color]} px-4 py-2.5 flex items-center justify-between`}>
        <div>
          <span className="text-white font-semibold text-sm">{layer.name}</span>
          <span className="text-white/70 text-xs ml-2">{layer.en}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/90 text-xs font-medium">{done}/{total}</span>
          <button onClick={() => setOpen(v => !v)} className="text-white/80 hover:text-white">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      <div className="px-4 py-2">
        <div className="w-full bg-white/60 rounded-full h-1.5 mb-2">
          <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        {open && (
          <ul className="space-y-1.5 mt-2 mb-1">
            {layer.items.map(item => {
              const cfg = STATUS_CONFIG[item.status]
              const Icon = cfg.icon
              return (
                <li key={item.label} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${cfg.bg}`}>
                  <Icon size={14} className={`${cfg.color} mt-0.5 shrink-0`} />
                  <div>
                    <span className="text-xs text-gray-700 font-medium">{item.label}</span>
                    {item.note && <span className="text-xs text-gray-400 ml-1">— {item.note}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function ServiceBadge({ s }: { s: ServiceStatus }) {
  const isUp = s.status === 'up'
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
      isUp ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
    }`}>
      {isUp
        ? <Wifi size={13} className="text-emerald-500 shrink-0" />
        : <WifiOff size={13} className="text-red-400 shrink-0" />}
      <span className="font-medium text-gray-700">{s.name}</span>
      <span className={`ml-auto font-mono ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
        {isUp ? `${s.latency_ms}ms` : 'DOWN'}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetrics(await getMetrics())
      } catch {
        setMetrics({
          p95_latency_ms: { 'gateway.query': 0, 'semantic.query': 0, 'fusion.fuse': 0, 'llm.chat': 0 },
          counters: { cache_hit: 0, cache_miss: 0, total_queries: 0, errors: 0 },
          cache_hit_rate: 0,
        })
      }
    }
    const fetchHealth = async () => {
      try {
        setServiceHealth(await getServiceHealth())
      } catch { /* ignore */ }
    }
    fetchMetrics()
    fetchHealth()
    const t = setInterval(() => { fetchMetrics(); fetchHealth() }, 15000)
    return () => clearInterval(t)
  }, [])

  const latencyData = metrics
    ? Object.entries(metrics.p95_latency_ms).map(([name, value]) => ({ name: name.split('.').pop() || name, p95: Math.round(value) }))
    : []

  const cacheData = metrics
    ? [{ name: '命中', value: metrics.counters.cache_hit || 0 }, { name: '未命中', value: metrics.counters.cache_miss || 0 }]
    : []

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">系统仪表盘</h2>
        <p className="text-sm text-gray-500 mt-1">实时监控系统运行状态</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="总查询数" value={metrics?.counters.total_queries || 0} />
        <MetricCard title="缓存命中率" value={`${Math.round((metrics?.cache_hit_rate || 0) * 100)}%`} color="green" />
        <MetricCard title="P95 延迟" value={Math.round(metrics?.p95_latency_ms['gateway.query'] || 0)} unit="ms" color="amber" />
        <MetricCard title="错误数" value={metrics?.counters.errors || 0} color="red" />
      </div>

      {/* Service health */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">服务运行状态</h3>
            <p className="text-xs text-gray-400 mt-0.5">实时探活 · 每 15s 刷新</p>
          </div>
          {serviceHealth && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              serviceHealth.overall === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {serviceHealth.overall === 'up' ? '全部正常' : '部分异常'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {serviceHealth
            ? serviceHealth.services.map(s => <ServiceBadge key={s.key} s={s} />)
            : Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>

      {/* Architecture completion */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">功能完成度</h3>
            <p className="text-xs text-gray-400 mt-0.5">点击层级查看明细</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" />已实现</span>
            <span className="flex items-center gap-1"><AlertCircle size={12} className="text-amber-500" />部分实现</span>
            <span className="flex items-center gap-1"><XCircle size={12} className="text-red-400" />缺失</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {ARCH_LAYERS.map(layer => <ArchLayerCard key={layer.name} layer={layer} />)}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">P95 延迟分布 (ms)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="p95" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">缓存分布</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={cacheData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {cacheData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <SystemStatus />
        </div>
      </div>
    </div>
  )
}
