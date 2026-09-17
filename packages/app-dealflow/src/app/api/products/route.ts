import { Pool } from 'pg'
import { NextResponse } from 'next/server'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
  const platform = searchParams.get('platform')

  try {
    const conditions: string[] = []
    const values: (string | number)[] = []
    let idx = 1

    if (slug) {
      conditions.push(`$${idx} = ANY(category_slugs)`)
      values.push(slug)
      idx++
    }

    if (platform) {
      conditions.push(`platform = $${idx}`)
      values.push(platform)
      idx++
    }

    // 排除已过期的秒杀商品
    conditions.push(`(expires_at IS NULL OR expires_at > NOW())`)

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    values.push(limit)

    const res = await pool.query(
      `SELECT id, platform, platform_id, title, image_url, price, original_price,
              commission_rate, is_flash_sale, expires_at, category_slugs, sales_count, updated_at
       FROM dealflow.products
       ${where}
       ORDER BY is_flash_sale DESC, sales_count DESC
       LIMIT $${idx}`,
      values
    )

    return NextResponse.json({ products: res.rows })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/products]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
