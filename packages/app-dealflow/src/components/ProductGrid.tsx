'use client'

import { ShareButton } from './ShareButton'

export interface ProductItem {
  id: number
  platform: string
  platform_id: string
  title: string
  image_url?: string
  price: number
  original_price?: number
  commission_rate: string
  is_flash_sale: boolean
  expires_at?: string
  sales_count: number
}

interface ProductGridProps {
  products: ProductItem[]
  loading?: boolean
}

function formatPrice(fen: number): string {
  return `\u00a5${(fen / 100).toFixed(2)}`
}

function formatSales(count: number): string {
  if (count > 10000) return `${(count / 10000).toFixed(1)}\u4e07\u4eba\u4ed8\u6b3e`
  return `${count}\u4eba\u4ed8\u6b3e`
}

function ProductCard({ product }: { product: ProductItem }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-gray-50">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🛒</div>
        )}
        {product.is_flash_sale && (
          <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            秒杀
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{product.title}</p>

        <div className="flex items-baseline gap-1.5">
          <span className="text-rose-500 font-bold text-sm">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-gray-400 text-[11px] line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="text-emerald-500 font-medium">佣金 {parseFloat(product.commission_rate).toFixed(1)}%</span>
          {product.sales_count > 0 && <span>{formatSales(product.sales_count)}</span>}
        </div>

        <ShareButton
          platformId={product.platform_id}
          platform={product.platform}
          className="mt-auto"
        />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/3 mt-1" />
        <div className="h-7 bg-gray-100 rounded mt-auto" />
      </div>
    </div>
  )
}

export function ProductGrid({ products, loading = false }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p className="text-3xl mb-2">📭</p>
        <p className="text-sm">暂无商品</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {products.map(p => <ProductCard key={`${p.platform}-${p.platform_id}`} product={p} />)}
    </div>
  )
}
