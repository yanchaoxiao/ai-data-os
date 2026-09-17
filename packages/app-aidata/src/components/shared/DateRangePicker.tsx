'use client'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const PRESETS = [
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '90天', days: 90 },
]

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        max={to}
        onChange={e => onChange(e.target.value, to)}
        className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <span className="text-gray-400 text-sm">{'\u2192'}</span>
      <input
        type="date"
        value={to}
        min={from}
        max={daysAgo(0)}
        onChange={e => onChange(from, e.target.value)}
        className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(daysAgo(p.days), daysAgo(1))}
            className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
