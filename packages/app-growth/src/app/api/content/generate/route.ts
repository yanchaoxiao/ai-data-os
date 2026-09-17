import { guardPrompt, buildMessages, routeAndCall, parseStructuredOutput, scoreContent } from '@ai-xyc/growth'
import type { Industry, ContentType, Platform } from '@ai-xyc/growth'

interface GenerateRequest {
  prompt: string
  industry: Industry
  contentType: ContentType
  platforms: Platform[]
}

const VALID_INDUSTRIES = new Set(['finance', 'ecommerce', 'local_life', 'saas', 'generic'])
const VALID_CONTENT_TYPES = new Set(['copywriting', 'poster', 'video_script', 'graphic_text'])
const VALID_PLATFORMS = new Set(['wecom', 'wechat_mp', 'xiaohongshu', 'douyin'])

function validate(body: unknown): { ok: true; data: GenerateRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: '请求体格式错误' }
  const b = body as Record<string, unknown>

  if (typeof b.prompt !== 'string' || !b.prompt.trim()) return { ok: false, error: 'prompt 不能为空' }
  if (!VALID_INDUSTRIES.has(b.industry as string)) return { ok: false, error: '无效的 industry' }
  if (!VALID_CONTENT_TYPES.has(b.contentType as string)) return { ok: false, error: '无效的 contentType' }
  if (!Array.isArray(b.platforms) || b.platforms.length === 0) return { ok: false, error: 'platforms 至少选一个' }
  if (!b.platforms.every((p: unknown) => VALID_PLATFORMS.has(p as string))) return { ok: false, error: '包含无效的 platform' }

  return {
    ok: true,
    data: {
      prompt: b.prompt.trim(),
      industry: b.industry as Industry,
      contentType: b.contentType as ContentType,
      platforms: b.platforms as Platform[],
    },
  }
}

export async function POST(req: Request) {
  const start = Date.now()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '无效的 JSON' }, { status: 400 })
  }

  const validation = validate(body)
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const { prompt, industry, contentType, platforms } = validation.data

  const guard = guardPrompt(prompt)
  if (!guard.ok) {
    return Response.json({ code: 'PROMPT_REJECTED', reason: guard.reason }, { status: 400 })
  }

  let original: string
  let model: string
  try {
    const messages = buildMessages(prompt, industry, contentType, platforms)
    const result = await routeAndCall(industry, contentType, messages)
    original = result.content
    model = result.model
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[generate] LLM call failed:', detail)
    return Response.json(
      { error: 'LLM 服务暂时不可用', detail },
      { status: 502 }
    )
  }

  const platformResults = parseStructuredOutput(original, platforms, industry)
  const score = scoreContent(original)

  return Response.json({
    original,
    platforms: platformResults,
    score,
    model,
    latency_ms: Date.now() - start,
  })
}
