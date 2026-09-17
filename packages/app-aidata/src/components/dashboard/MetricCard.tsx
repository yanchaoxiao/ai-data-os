'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  change?: number
  unit?: string
  color?: string
}

export default function MetricCard({ title, value, change, unit = '', color = 'indigo' }: Props) {
  const trendIcon =
    change === undefined ? null :
    change > 0 ? <TrendingUp size={16} className="text-green-500" /> :
    change < 0 ? <TrendingDown size={16} className="text-red-500" /> :
    <Minus size={16} className="text-gray-400" />

  const trendColor =
    change === undefined ? '' :
    change > 0 ? 'text-green-600' :
    change < 0 ? 'text-red-600' :
    'text-gray-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold text-${color}-600`}>
          {value}{unit}
        </span>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-sm ${trendColor} mb-0.5`}>
            {trendIcon}
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  )
}
