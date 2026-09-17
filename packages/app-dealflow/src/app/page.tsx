'use client'

import { useState, useEffect, useCallback } from 'react'
import { CategoryTabs } from '../components/CategoryTabs'
import { ProductGrid, type ProductItem } from '../components/ProductGrid'

export default function DealFlowPage() {
  const [activeSlug, setActiveSlug] = useState('vegetables')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async (slug: string) => {
    setLoading(true)
    setError(null)
    try {
      const base = process.env.NEXT_PUBLIC_REMOTE_DEALFLOW ?? ''
      const res = await fetch(`${base}/api/products?slug=${slug}&limit=50`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { products: ProductItem[]; error?: string }
      if (data.error) throw new Error(data.error)
      setProducts(data.products ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts(activeSlug)
  }, [activeSlug, loadProducts])

  function handleSelect(slug: string) {
    setActiveSlug(slug)
  }

  const handleShareCategory = () => {
    const url = `${window.location.origin}/category/${activeSlug}`
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-lg font-bold text-gray-800">🛒 DealFlow</span>
        <button
          onClick={handleShareCategory}
          className="text-xs text-rose-500 border border-rose-200 rounded-full px-3 py-1 hover:bg-rose-50 transition-colors"
        >
          分享此分类
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 flex flex-col gap-4">
        <CategoryTabs activeSlug={activeSlug} onSelect={handleSelect} />
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded p-2 border border-red-200">
            ⚠ {error}
          </div>
        )}
        <ProductGrid products={products} loading={loading} />
      </div>
    </div>
  )
}
