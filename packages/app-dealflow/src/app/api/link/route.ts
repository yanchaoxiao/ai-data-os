import { Pool } from 'pg'
import { NextResponse } from 'next/server'
import axios from 'axios'
import crypto from 'crypto'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const PDD_APP_KEY = process.env.PDD_APP_KEY ?? ''
const PDD_APP_SECRET = process.env.PDD_APP_SECRET ?? ''
const PDD_PID = process.env.PDD_PID ?? ''
const PDD_API_URL = 'https://gw-api.pinduoduo.com/api/router'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:3100'
// 推广链接缓存有效期（23 小时，略小于 PDD 的 24 小时）
const PROMO_URL_TTL_MS = 23 * 60 * 60 * 1000

function pddSign(params: Record<string, string | number>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  return crypto.createHmac('md5', PDD_APP_SECRET)
    .update(`${PDD_APP_SECRET}${sorted}${PDD_APP_SECRET}`)
    .digest('hex')
    .toUpperCase()
}

async function fetchPromoUrl(platformId: string): Promise<string> {
  const params: Record<string, string | number> = {
    type: 'pdd.ddk.goods.promotion.url.generate',
    client_id: PDD_APP_KEY,
    timestamp: Math.floor(Date.now() / 1000),
    data_type: 'JSON',
    p_id: PDD_PID,
    goods_id_list: JSON.stringify([parseInt(platformId, 10)]),
    generate_short_url: 1,
  }
  params.sign = pddSign(params)

  const res = await axios.post(PDD_API_URL, null, { params, timeout: 10000 })
  const body = res.data as {
    error_response?: { error_code: number; error_msg: string }
    goods_promotion_url_generate_response?: {
      goods_promotion_url_list: Array<{ short_url: string }>
    }
  }

  if (body.error_response) {
    throw new Error(`PDD API [${body.error_response.error_code}]: ${body.error_response.error_msg}`)
  }

  const list = body.goods_promotion_url_generate_response?.goods_promotion_url_list ?? []
  if (!list[0]?.short_url) throw new Error('PDD returned no promo URL')
  return list[0].short_url
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  // Allow same-origin requests from the remote itself (no origin) and from the portal
  const isAllowed = !origin || origin === ALLOWED_ORIGIN || origin === 'http://localhost:3004'
  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { platformId?: string; platform?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { platformId, platform } = body
  if (!platformId || !platform) {
    return NextResponse.json({ error: 'Missing platformId or platform' }, { status: 400 })
  }

  if (platform !== 'pdd') {
    return NextResponse.json({ error: `Platform ${platform} not supported yet` }, { status: 400 })
  }

  // If no PDD credentials configured, return a mock URL for development
  if (!PDD_APP_KEY || !PDD_APP_SECRET || !PDD_PID) {
    return NextResponse.json({
      url: `https://mobile.yangkeduo.com/goods.html?goods_id=${platformId}`,
      cached: false,
      mock: true,
    })
  }

  try {
    // 检查缓存
    const cached = await pool.query<{ promo_url: string; promo_url_updated_at: Date }>(
      `SELECT promo_url, promo_url_updated_at
       FROM dealflow.products
       WHERE platform = $1 AND platform_id = $2`,
      [platform, platformId]
    )
    const row = cached.rows[0]
    const now = Date.now()
    if (
      row?.promo_url &&
      row.promo_url_updated_at &&
      now - new Date(row.promo_url_updated_at).getTime() < PROMO_URL_TTL_MS
    ) {
      return NextResponse.json({ url: row.promo_url, cached: true })
    }

    // 生成新推广链接
    const url = await fetchPromoUrl(platformId)

    // 写回缓存
    await pool.query(
      `UPDATE dealflow.products
       SET promo_url = $1, promo_url_updated_at = NOW()
       WHERE platform = $2 AND platform_id = $3`,
      [url, platform, platformId]
    )

    return NextResponse.json({ url, cached: false })
  } catch (err) {
    console.error('[api/link]', err)
    // Fallback to a direct goods URL if PDD API fails
    return NextResponse.json({
      url: `https://mobile.yangkeduo.com/goods.html?goods_id=${platformId}`,
      cached: false,
      fallback: true,
    })
  }
}
