'use client'

import { useState, useRef } from 'react'
import { X, Plus, Upload, Download, Tag, Calculator, Database, FileText, Type, Hash, Link2 } from 'lucide-react'
import { registerMetric, type MetricDef } from '../../lib/api'
import MetricPicker from '../shared/MetricPicker'

type Tab = 'manual' | 'bulk'

interface Row extends Partial<MetricDef> {
  _valid?: boolean
  _error?: string
}

function downloadTemplate() {
  const header = 'name,label,description,formula,source_table,tags,derived_from'
  const example = 'cm_example,示例指标,这是一个示例指标,SUM(revenue)-SUM(cost),orders_fact,cm;payment,,'
  const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'metric_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseRows(raw: Record<string, string>[]): Row[] {
  return raw.map(r => {
    const name = (r['name'] ?? '').trim()
    const label = (r['label'] ?? '').trim()
    if (!name || !label) return { ...r, _valid: false, _error: 'name 和 label 必填' }
    return {
      name,
      label,
      description: r['description'] ?? '',
      expr: r['formula'] ?? '',
      source: r['source_table'] ? { table: r['source_table'], measures: {} } : undefined,
      tags: r['tags'] ? r['tags'].split(';').map((t: string) => t.trim()).filter(Boolean) : [],
      derived_from: r['derived_from'] || undefined,
      _valid: true,
    }
  })
}

interface RegisterModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function RegisterModal({ onClose, onSuccess }: RegisterModalProps) {
  const [tab, setTab] = useState<Tab>('manual')
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [formula, setFormula] = useState('')
  const [sourceTable, setSourceTable] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [derivedFrom, setDerivedFrom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleManualSubmit = async () => {
    if (!name || !label) { setError('name 和 label 必填'); return }
    setSubmitting(true); setError('')
    try {
      await registerMetric({
        name, label, description,
        expr: formula,
        tags,
        source: sourceTable ? { table: sourceTable, measures: {} } : undefined,
        derived_from: derivedFrom || undefined,
      } as MetricDef)
      onSuccess()
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message ?? '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const { read, utils } = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw: Record<string, string>[] = utils.sheet_to_json(ws, { defval: '' })
    setRows(parseRows(raw))
  }

  const handleBulkImport = async () => {
    const valid = rows.filter(r => r._valid)
    if (!valid.length) return
    setImporting(true)
    setImportProgress({ done: 0, total: valid.length })
    let done = 0
    for (const row of valid) {
      try {
        await registerMetric(row as MetricDef)
      } catch {
        // 单条失败不阻断批量导入
      }
      done++
      setImportProgress({ done, total: valid.length })
    }
    setImporting(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">新增指标</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          {(['manual', 'bulk'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'manual' ? '手动填写' : '批量导入'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'manual' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-gray-100 focus-within:border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <Hash size={11} className="text-indigo-500" /> name <span className="text-red-400">*</span>
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="cm_example" className="w-full bg-transparent px-0 py-1 text-sm focus:outline-none font-mono text-gray-700" />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-gray-100 focus-within:border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <Type size={11} className="text-indigo-500" /> label <span className="text-red-400">*</span>
                  </label>
                  <input value={label} onChange={e => setLabel(e.target.value)}
                    placeholder="示例指标" className="w-full bg-transparent px-0 py-1 text-sm focus:outline-none text-gray-700" />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100 focus-within:border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <FileText size={11} className="text-indigo-500" /> description
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full bg-transparent px-0 py-1 text-sm focus:outline-none text-gray-700 resize-none" />
              </div>

              <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100 focus-within:border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <Calculator size={11} className="text-indigo-500" /> formula（计算公式）
                </label>
                <textarea value={formula} onChange={e => setFormula(e.target.value)} rows={2}
                  placeholder="SUM(revenue) - SUM(cost)"
                  className="w-full bg-transparent px-0 py-1 text-sm font-mono focus:outline-none text-indigo-700 resize-none" />
              </div>

              <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100 focus-within:border-emerald-200 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <Database size={11} className="text-emerald-500" /> source_table
                </label>
                <input value={sourceTable} onChange={e => setSourceTable(e.target.value)}
                  placeholder="orders_fact" className="w-full bg-transparent px-0 py-1 text-sm font-mono focus:outline-none text-emerald-700" />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                <label className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <Tag size={11} className="text-indigo-500" /> tags
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {tags.map(t => (
                    <span key={t} className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium shadow-sm">
                      {t}
                      <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-indigo-900"><X size={10} /></button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="输入后按 Enter 添加"
                    className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
                  />
                  <button onClick={addTag} className="p-1 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"><Plus size={14} /></button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <Link2 size={11} className="text-violet-500" /> derived_from（可选）
                </label>
                <MetricPicker value={derivedFrom} onChange={setDerivedFrom} placeholder="选择父指标..." />
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
                  <Download size={14} /> 下载模板
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors">
                  <Upload size={14} /> 选择文件（xlsx / csv）
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
              </div>

              {rows.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-auto max-h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-500">状态</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-500">name</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-500">label</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-500">tags</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-500">错误</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                            <td className="px-3 py-2">
                              {r._valid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">✓ 有效</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-medium">✗ 无效</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-700">{r.name}</td>
                            <td className="px-3 py-2 text-gray-700">{r.label}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {r.tags?.map(t => <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{t}</span>)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-red-500">{r._error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importProgress && (
                <p className="text-sm text-gray-500">导入进度：{importProgress.done} / {importProgress.total}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
          {tab === 'manual' ? (
            <button onClick={handleManualSubmit} disabled={submitting}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? '提交中...' : '提交'}
            </button>
          ) : (
            <button
              onClick={handleBulkImport}
              disabled={importing || rows.filter(r => r._valid).length === 0}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? '导入中...' : `确认导入 ${rows.filter(r => r._valid).length} 条`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
