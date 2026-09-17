const COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
]

function hashColor(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff
  return COLORS[h % COLORS.length]
}

interface TagBadgeProps {
  tag: string
  size?: 'sm' | 'xs'
}

export default function TagBadge({ tag, size = 'sm' }: TagBadgeProps) {
  const cls = size === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
  return (
    <span className={`rounded-full font-medium ${cls} ${hashColor(tag)}`}>
      {tag}
    </span>
  )
}
