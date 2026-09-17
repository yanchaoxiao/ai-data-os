'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { QuickCheckResult } from '../../lib/api'

interface QuickCheckPanelProps {
  result: QuickCheckResult
}

export default function QuickCheckPanel({ result }: QuickCheckPanelProps) {
  const { trend, anomaly } = result
  const isAnomaly = anomaly?.is_anomaly

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        isAnomaly ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
      }`}>
        <span className="text-2xl">{isAnomaly ? '\u26A0\uFE0F' : '\u2705'}</span>
        <div>
          <p className={`font-semibold text-sm ${isAnomaly ? 'text-rose-700' : 'text-emerald-700'}`}>
            {isAnomaly ? '检测到异常' : '指标正常'}
          </p>
          {anomaly?.z_score !== undefined && (
            <p className="text-xs text-gray-500">
              Z-Score: {anomaly.z_score.toFixed(2)}，偏差: {anomaly.deviation_pct?.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {trend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-3">近期趋势</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dt" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: unknown) => String(v)} />
              <Line type="monotone" dataKey="value" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
