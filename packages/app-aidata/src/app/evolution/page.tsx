'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, RefreshCw, Zap, ChevronRight } from 'lucide-react'
import {
  getAdminStatus,
  triggerLoop,
  getL1Events,
  getL3Report,
  getL4History,
  getL5Stats,
  getL6Candidates,
  approveL6Candidate,
  rejectL6Candidate,
  type LoopStatus,
  type FeedbackEvent,
  type L3Report,
  type L4HistoryItem,
  type L5Stats,
  type L6Candidate,
} from '../../lib/api'

const LOOP_META: Record<string, { color: string; trigger: string; desc: string }> = {
  L1: { color: 'emerald', trigger: '实时 · 用户点赞/纠错', desc: '采集反馈信号，沉淀正负样本' },
  L2: { color: 'blue', trigger: '人工审核 · 结论写回', desc: '高置信结论回写知识库' },
  L3: { color: 'amber', trigger: '每日 · 盲点扫描', desc: '发现缺失指标与知识盲区' },
  L4: { color: 'purple', trigger: '每日 · 评估门禁', desc: '回归评估，守住答案质量' },
  L5: { color: 'cyan', trigger: '每日 · 缓存进化', desc: '热点预热，提升命中率' },
  L6: { color: 'pink', trigger: '每日 · 指标发现', desc: '从查询日志挖掘新指标候选' },
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50',
  blue: 'border-blue-200 bg-blue-50',
  amber: 'border-amber-200 bg-amber-50',
  purple: 'border-purple-200 bg-purple-50',
  cyan: 'border-cyan-200 bg-cyan-50',
  pink: 'border-pink-200 bg-pink-50',
}
const DOT_MAP: Record<string, string> = {
  emerald: 'bg-emerald-400',
  blue: 'bg-blue-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  cyan: 'bg-cyan-400',
  pink: 'bg-pink-400',
}

function StatusDot({ status, color }: { status: string; color: string }) {
  if (status === 'up') return <span className={`w-2 h-2 rounded-full ${DOT_MAP[color]} inline-block`} />
  if (status === 'error') return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
  return <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
}

function L4Chart({ history }: { history: L4HistoryItem[] }) {
  if (history.length < 2) return <p className="text-xs text-gray-400">历史数据不足</p>
  const vals = history.map((h) => h.pass_rate)
  const max = Math.max(...vals, 1)
  const W = 360,
    H = 70,
    PAD = 4
  const pts = vals
    .map((v, i) => {
      const x = PAD + (i / (vals.length - 1)) * (W - 2 * PAD)
      const y = H - PAD - (v / max) * (H - 2 * PAD)
      return `${x},${y}`
    })
    .join(' ')
  const lastRate = vals[vals.length - 1]
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>{history[0]?.date}</span>
        <span className="font-medium text-purple-600">{(lastRate * 100).toFixed(0)}%</span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
        {vals.map((v, i) => {
          const x = PAD + (i / (vals.length - 1)) * (W - 2 * PAD)
          const y = H - PAD - (v / max) * (H - 2 * PAD)
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#8b5cf6" />
        })}
      </svg>
    </div>
  )
}

type DrawerContent =
  | { type: 'L1'; data: { events: FeedbackEvent[]; today_count: number; positive_rate: number } }
  | { type: 'L2'; pending: number }
  | { type: 'L3'; data: L3Report }
  | { type: 'L4'; data: L4HistoryItem[] }
  | { type: 'L5'; data: L5Stats }
  | { type: 'L6'; data: L6Candidate[]; onUpdate: () => void }

function DrawerBody({ content }: { content: DrawerContent }) {
  if (content.type === 'L1') {
    const { events, today_count, positive_rate } = content.data
    return (
      <div className="space-y-3">
        <div className="flex gap-4">
          <div className="bg-emerald-50 rounded-lg p-3 flex-1 text-center">
            <p className="text-2xl font-bold text-emerald-600">{today_count}</p>
            <p className="text-xs text-gray-500">今日反馈</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 flex-1 text-center">
            <p className="text-2xl font-bold text-blue-600">{(positive_rate * 100).toFixed(0)}%</p>
            <p className="text-xs text-gray-500">近 7 日正面率</p>
          </div>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">最近反馈</p>
        <div className="space-y-2">
          {events.length === 0 && <p className="text-xs text-gray-400">暂无反馈记录</p>}
          {events.slice(0, 10).map((ev, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <span>{ev.rating === 'up' ? '👍' : '👎'}</span>
                <span className="text-gray-500 truncate flex-1">{ev.query}</span>
              </div>
              {ev.correct_metric && <p className="text-indigo-600">→ 正确指标: {ev.correct_metric}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (content.type === 'L2') {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{content.pending}</p>
          <p className="text-xs text-gray-500 mt-1">待审核写回候选</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          高置信度的问答结论会进入写回候选池，经人工审核后回写到知识库，形成系统记忆。审核操作在「写回审核」中完成。
        </p>
      </div>
    )
  }

  if (content.type === 'L3') {
    const { missing_metrics, knowledge_gaps } = content.data
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            缺失指标 ({missing_metrics.length})
          </p>
          {missing_metrics.length === 0 && <p className="text-xs text-gray-400">暂无缺失指标</p>}
          {missing_metrics.map((m, i) => (
            <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-amber-800">{m.pattern}</span>
                <span className="text-amber-600">{m.count} 次查询</span>
              </div>
              <p className="text-gray-500 mt-0.5">{m.suggestion}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            知识盲区 ({knowledge_gaps.length})
          </p>
          {knowledge_gaps.length === 0 && <p className="text-xs text-gray-400">暂无知识盲区</p>}
          {knowledge_gaps.map((g, i) => (
            <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 mb-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-orange-800">{g.pattern}</span>
                <span className="text-orange-600">{g.count} 次查询</span>
              </div>
              <p className="text-gray-500 mt-0.5">{g.suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (content.type === 'L4') {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">近 30 天通过率趋势</p>
        <L4Chart history={content.data} />
        <div className="space-y-1.5 mt-2">
          {[...content.data]
            .reverse()
            .slice(0, 7)
            .map((h, i) => (
              <div key={i} className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1">
                <span className="text-gray-500">{h.date}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">
                    {h.pass}/{h.total}
                  </span>
                  <span className={`font-medium ${h.pass_rate >= 0.8 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {(h.pass_rate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  if (content.type === 'L5') {
    const { hit_rate, top_queries } = content.data
    return (
      <div className="space-y-3">
        <div className="bg-cyan-50 rounded-lg p-3 text-center">
          <p className="text-3xl font-bold text-cyan-600">{(hit_rate * 100).toFixed(0)}%</p>
          <p className="text-xs text-gray-500">整体缓存命中率</p>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top 10 预热查询</p>
        {top_queries.length === 0 && <p className="text-xs text-gray-400">暂无预热数据</p>}
        {top_queries.slice(0, 10).map((q, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
            <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
            <span className="flex-1 truncate text-gray-700">{q.query}</span>
            <span className="text-cyan-600 shrink-0">{q.count}次</span>
          </div>
        ))}
      </div>
    )
  }

  if (content.type === 'L6') {
    const { data: candidates, onUpdate } = content
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">{candidates.filter((c) => c.status === 'pending').length} 个待确认</p>
        {candidates.length === 0 && <p className="text-xs text-gray-400">暂无候选指标</p>}
        {candidates.map((c) => (
          <div
            key={c.name}
            className={`rounded-lg border p-3 text-xs ${
              c.status === 'pending'
                ? 'border-pink-200 bg-pink-50'
                : c.status === 'approved'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <span className="font-medium text-gray-800">{c.label}</span>
                <span className="text-gray-400 ml-1">({c.name})</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  c.status === 'pending'
                    ? 'bg-pink-100 text-pink-700'
                    : c.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {c.status}
              </span>
            </div>
            <p className="text-gray-500 mb-1">
              {c.table}.{c.measure} · {c.aggregation}
            </p>
            <p className="text-gray-400 mb-2">
              来源: {c.discovered_from} · 置信度: {(c.confidence * 100).toFixed(0)}%
            </p>
            {c.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => approveL6Candidate(c.name).then(onUpdate)}
                  className="text-[11px] bg-emerald-500 text-white px-2.5 py-1 rounded hover:bg-emerald-600 transition-colors"
                >
                  ✓ 通过
                </button>
                <button
                  onClick={() => rejectL6Candidate(c.name).then(onUpdate)}
                  className="text-[11px] bg-gray-200 text-gray-600 px-2.5 py-1 rounded hover:bg-gray-300 transition-colors"
                >
                  ✗ 拒绝
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return null
}

export default function EvolutionPage() {
  const [loops, setLoops] = useState<LoopStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<DrawerContent | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [triggering, setTriggering] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const data = await getAdminStatus()
      setLoops(data)
    } catch (e) {
      console.error('admin status error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const openDrawer = async (id: string) => {
    setSelectedId(id)
    setDrawerLoading(true)
    setDrawer(null)
    try {
      if (id === 'L1') {
        setDrawer({ type: 'L1', data: await getL1Events() })
      } else if (id === 'L2') {
        const l2 = loops.find((l) => l.id === 'L2')
        setDrawer({ type: 'L2', pending: Number(l2?.kpi.value ?? 0) })
      } else if (id === 'L3') {
        setDrawer({ type: 'L3', data: await getL3Report() })
      } else if (id === 'L4') {
        setDrawer({ type: 'L4', data: await getL4History() })
      } else if (id === 'L5') {
        setDrawer({ type: 'L5', data: await getL5Stats() })
      } else if (id === 'L6') {
        const reload = async () => {
          setDrawer({ type: 'L6', data: await getL6Candidates(), onUpdate: reload })
          loadStatus()
        }
        setDrawer({ type: 'L6', data: await getL6Candidates(), onUpdate: reload })
      }
    } catch (e) {
      console.error('drawer load error', e)
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleTrigger = async (e: React.MouseEvent, loopId: string) => {
    e.stopPropagation()
    setTriggering(loopId)
    try {
      await triggerLoop(loopId)
      setTimeout(loadStatus, 1000)
    } catch (e) {
      console.error('trigger error', e)
    } finally {
      setTriggering(null)
    }
  }

  const selectedLoop = loops.find((l) => l.id === selectedId)
  const meta = selectedId ? LOOP_META[selectedId] : null

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-800">自进化</h2>
            <p className="text-sm text-gray-500 mt-1">六层学习循环 · 系统自我进化状态监控</p>
          </div>
          <button
            onClick={loadStatus}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">加载中...</div>
        ) : loops.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-400">
            暂无循环状态（请确认后端 /api/v1/admin/status 可访问）
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {loops.map((loop) => {
              const m = LOOP_META[loop.id]
              if (!m) return null
              return (
                <button
                  key={loop.id}
                  onClick={() => openDrawer(loop.id)}
                  className={`relative text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${COLOR_MAP[m.color]} ${
                    selectedId === loop.id ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={loop.status} color={m.color} />
                      <span className="text-xs font-medium text-gray-600">{loop.id}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-0.5">{loop.name}</h3>
                  <p className="text-[11px] text-gray-500 mb-3 line-clamp-1">{m.desc}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{loop.kpi.value}</p>
                      <p className="text-[10px] text-gray-500">{loop.kpi.label}</p>
                    </div>
                    {['L3', 'L4', 'L5', 'L6'].includes(loop.id) && (
                      <button
                        onClick={(e) => handleTrigger(e, loop.id)}
                        disabled={triggering === loop.id}
                        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-40"
                        title="手动触发"
                      >
                        <Zap size={11} />
                        {triggering === loop.id ? '触发中…' : '触发'}
                      </button>
                    )}
                  </div>
                  {loop.last_run && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      上次: {new Date(loop.last_run).toLocaleString('zh-CN')}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedId && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedId(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400">
                  {selectedId} · {meta?.trigger}
                </p>
                <h2 className="font-semibold text-gray-900">{selectedLoop?.name ?? selectedId}</h2>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {drawerLoading && (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!drawerLoading && drawer && <DrawerBody content={drawer} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
