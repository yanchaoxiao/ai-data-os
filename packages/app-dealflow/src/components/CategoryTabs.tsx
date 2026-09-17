'use client'

const CATEGORIES = [
  { slug: 'vegetables', label: '🥦 蔬菜' },
  { slug: 'fruits', label: '🍎 水果' },
  { slug: 'eggs', label: '🥚 蛋品' },
  { slug: 'grain', label: '🌾 粮油' },
  { slug: 'meat', label: '🥩 肉类' },
  { slug: 'seafood', label: '🦐 海鲜' },
]

interface CategoryTabsProps {
  activeSlug: string
  onSelect?: (slug: string) => void
}

export function CategoryTabs({ activeSlug, onSelect }: CategoryTabsProps) {
  function handleSelect(slug: string) {
    if (onSelect) {
      onSelect(slug)
    } else {
      window.location.href = `/category/${slug}`
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {CATEGORIES.map(cat => (
        <button
          key={cat.slug}
          onClick={() => handleSelect(cat.slug)}
          className={`
            whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all
            ${activeSlug === cat.slug
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-600'
            }
          `}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

export { CATEGORIES }
