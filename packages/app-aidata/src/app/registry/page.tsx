'use client'

import { useState, useEffect } from 'react'
import { Search, GitBranch, Plus, TrendingUp, X, Database, Layers, FileText } from 'lucide-react'
import {
  getRegistryMetrics,
  type MetricDef,
} from '../../lib/api'
import TagBadge from '../../components/shared/TagBadge'
import RegisterModal from '../../components/registry/RegisterModal'
import MetricGraph from '../../components/registry/MetricGraph'

type TabType = 'list' | 'graph'

interface GraphInfo {
  ancestors: { name: string; label: string }[]
  descendants: { name: string; label: string }[]
}

function computeGraph(metrics: MetricDef[], selected: MetricDef): GraphInfo {
  const ancestors: { name: string; label: string }[] = []
  const descendants: { name: string; label: string }[] = []

  let current = selected
  const visited = new Set<string>()
  while (current.derived_from && !visited.has(current.derived_from)) {
    visited.add(current.derived_from)
    const parent = metrics.find(m => m.name === current.derived_from)
    if (!parent) break
    ancestors.push({ name: parent.name, label: parent.label })
    current = parent
  }

  metrics.forEach(m => {
    if (m.derived_from === selected.name) {
      descendants.push({ name: m.name, label: m.label })
    }
  })

  return { ancestors, descendants }
}

export default function RegistryPage() {
  const [tab, setTab] = useState<TabType>('list')
  const [metrics, setMetrics] = useState<MetricDef[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [selected, setSelected] = useState<MetricDef | null>(null)
  const [showModal, setShowModal] = useState(false)

  const load = () => {
    setLoading(true)
    getRegistryMetrics()
      .then(r => { setMetrics(r.metrics); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const allTags = Array.from(new Set(metrics.flatMap(m => m.tags ?? [])))

  const toggleTag = (t: string) =>
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const q = search.toLowerCase()
  const filtered = metrics.filter(m => {
    const matchSearch = !q || m.name.includes(q) || m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    const matchTags = activeTags.length === 0 || activeTags.every(t => (m.tags ?? []).includes(t))
    return matchSearch && matchTags
  })

  const graph = selected ? computeGraph(metrics, selected) : null

  function navigateToAttribution(metricName: string) {
    const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/aidata') ? '/aidata' : ''
    window.location.href = `${base}/attribution?metric=${metricName}`
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 pt-6 pb-4 space-y-3 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">指标目录</h2>
              <p className="text-sm text-gray-400 mt-0.5">浏览、注册和管理语义层指标</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} />
              新增指标
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索 name / label / description..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {allTags.slice(0, 8).map(t => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeTags.includes(t)
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {(['list', 'graph'] as TabType[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'graph' && <GitBranch size={13} />}
                {t === 'list' ? '列表' : '图谱'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'list' ? (
            loading ? (
              <div className="text-center text-gray-400 py-16 text-sm">加载中...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-400 py-16 text-sm">暂无匹配指标</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(m => {
                  const isAtomic = !m.derived_from
                  return (
                    <button
                      key={m.name}
                      onClick={() => setSelected(m)}
                      className={`relative text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                        selected?.name === m.name
                          ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${isAtomic ? 'bg-emerald-400' : 'bg-violet-400'}`} />
                      <div className="flex items-start justify-between gap-2 mb-2 ml-2">
                        <span className="font-semibold text-gray-800 text-sm leading-tight">{m.label}</span>
                        {m.derived_from ? (
                          <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded shrink-0 font-medium">派生</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded shrink-0 font-medium">原子</span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-500 font-mono mb-2 ml-2">{m.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 ml-2">{m.description}</p>
                      <div className="flex flex-wrap gap-1.5 ml-2">
                        {(m.tags ?? []).map(t => <TagBadge key={t} tag={t} size="xs" />)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            <MetricGraph metrics={metrics} onSelect={name => {
              const m = metrics.find(x => x.name === name)
              if (m) setSelected(m)
            }} selectedName={selected?.name} />
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm">{selected.label}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-mono mb-1">{selected.name}</p>
              <h4 className="font-bold text-gray-900">{selected.label}</h4>
            </div>

            {selected.description && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <FileText size={12} /> 描述
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">{selected.description}</p>
              </div>
            )}

            {selected.expr && (
              <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Layers size={12} className="text-indigo-500" /> 计算公式
                </p>
                <code className="block text-xs font-mono text-indigo-700 break-all">{selected.expr}</code>
              </div>
            )}

            {selected.source && (
              <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Database size={12} className="text-emerald-500" /> 数据源
                </p>
                <p className="text-xs font-mono text-emerald-700">{selected.source.table}</p>
              </div>
            )}

            {(selected.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(selected.tags ?? []).map(t => <TagBadge key={t} tag={t} size="sm" />)}
              </div>
            )}

            {graph && (
              <div className="space-y-3">
                {graph.ancestors.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1.5">上游指标</p>
                    {graph.ancestors.map(a => (
                      <button key={a.name} onClick={() => {
                        const m = metrics.find(x => x.name === a.name)
                        if (m) setSelected(m)
                      }} className="block text-xs text-indigo-600 hover:underline mb-1">{`↑ ${a.label}`}</button>
                    ))}
                  </div>
                )}
                {graph.descendants.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1.5">派生指标</p>
                    {graph.descendants.map(d => (
                      <button key={d.name} onClick={() => {
                        const m = metrics.find(x => x.name === d.name)
                        if (m) setSelected(m)
                      }} className="block text-xs text-indigo-600 hover:underline mb-1">{`↓ ${d.label}`}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 发起归因 */}
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={() => navigateToAttribution(selected.name)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              <TrendingUp size={14} />
              发起归因分析
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <RegisterModal onClose={() => setShowModal(false)} onSuccess={load} />
      )}
    </div>
  )
}
