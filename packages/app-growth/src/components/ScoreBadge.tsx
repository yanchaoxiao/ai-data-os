'use client'

interface ScoreBadgeProps {
  total: number
  dimensions: Record<string, number>
}

const DIM_LABELS: Record<string, string> = {
  length:       '长度适中',
  cta:          'CTA',
  benefit:      '利益点',
  quantifiable: '数字化',
  compliance:   '合规',
  structure:    '结构',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

export function ScoreBadge({ total, dimensions }: ScoreBadgeProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-4 flex-wrap">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-gray-500">综合质量分</span>
        <span className={`text-2xl font-bold ${scoreColor(total)}`}>{total}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(dimensions).map(([key, val]) => (
          <span
            key={key}
            className={`text-xs flex items-center gap-0.5 ${val > 0 ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            {val > 0 ? '✓' : '✗'} {DIM_LABELS[key] ?? key}
          </span>
        ))}
      </div>
    </div>
  )
}
