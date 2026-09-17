import { guardPrompt, buildMessages, routeAndCall, parseStructuredOutput, scoreContent } from '@ai-xyc/growth'
import type { Industry, ContentType, Platform } from '@ai-xyc/growth'

const MAX_BATCH = 20

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '无效的 JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  if (!Array.isArray(b.prompts) || b.prompts.length === 0) {
    return Response.json({ error: 'prompts 不能为空' }, { status: 400 })
  }
  if (b.prompts.length > MAX_BATCH) {
    return Response.json({ error: `每批最多 ${MAX_BATCH} 条` }, { status: 400 })
  }

  const industry = b.industry as Industry
  const contentType = b.contentType as ContentType
  const platforms = b.platforms as Platform[]

  const tasks = (b.prompts as string[]).map(async (prompt) => {
    if (typeof prompt !== 'string') return { error: '每条 prompt 必须是字符串' }

    const guard = guardPrompt(prompt.trim())
    if (!guard.ok) return { error: `PROMPT_REJECTED: ${guard.reason}` }

    try {
      const messages = buildMessages(prompt.trim(), industry, contentType, platforms)
      const { content: original, model } = await routeAndCall(industry, contentType, messages)
      const platformResults = parseStructuredOutput(original, platforms, industry)
      const score = scoreContent(original)
      return { original, platforms: platformResults, score, model }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'LLM 调用失败' }
    }
  })

  const results = await Promise.allSettled(tasks)
  return Response.json({
    results: results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: String(r.reason) }
    ),
  })
}
