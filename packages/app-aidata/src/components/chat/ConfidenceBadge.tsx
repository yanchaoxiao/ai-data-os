'use client'

interface Props {
  confidence: number
}

export default function ConfidenceBadge({ confidence }: Props) {
  const percent = Math.round(confidence * 100)

  let color: string
  let bg: string
  if (confidence >= 0.7) {
    color = 'text-green-700'
    bg = 'bg-green-50 border-green-200'
  } else if (confidence >= 0.4) {
    color = 'text-amber-700'
    bg = 'bg-amber-50 border-amber-200'
  } else {
    color = 'text-red-700'
    bg = 'bg-red-50 border-red-200'
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${color} ${bg}`}>
      <svg viewBox="0 0 12 12" className="w-3 h-3">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle
          cx="6"
          cy="6"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${confidence * 31.4} 31.4`}
          strokeLinecap="round"
          transform="rotate(-90 6 6)"
        />
      </svg>
      {percent}%
    </span>
  )
}
