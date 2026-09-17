// lib-growth: 增长内容生成核心库
// 提供类型定义 + LLM 调用 + 内容评分

// ── 类型定义 ──

export type Industry = 'finance' | 'ecommerce' | 'local_life' | 'saas' | 'generic'
export type ContentType = 'copywriting' | 'poster' | 'video_script' | 'graphic_text'
export type Platform = 'wecom' | 'wechat_mp' | 'xiaohongshu' | 'douyin'

export interface PlatformResult {
  content: string
  tags?: string[]
}

export interface LLMResult {
  content: string
  model: string
}

export interface ScoreResult {
  total: number
  dimensions: Record<string, number>
}

// ── 平台元数据 ──

export const PLATFORM_META: Record<Platform, { icon: string; label: string; desc: string }> = {
  wecom: { icon: '💬', label: '企业微信', desc: '简洁专业，适合群发和单聊' },
  wechat_mp: { icon: '📰', label: '公众号', desc: '深度长文，标题吸引眼球' },
  xiaohongshu: { icon: '📱', label: '小红书', desc: '种草风，emoji+话题标签' },
  douyin: { icon: '🎵', label: '抖音', desc: '短视频脚本，节奏感强' },
}

// ── Prompt 安全守卫 ──

const BANNED_PATTERNS = [
  /政治敏感|反动|颠覆/i,
  /色情|裸体|成人/i,
  /赌博|博彩/i,
  /毒品|吸毒/i,
  /自杀|自残/i,
]

export function guardPrompt(prompt: string): { ok: true } | { ok: false; reason: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { ok: false, reason: 'prompt 不能为空' }
  }
  if (prompt.length > 2000) {
    return { ok: false, reason: 'prompt 超过 2000 字限制' }
  }
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(prompt)) {
      return { ok: false, reason: 'prompt 包含敏感内容' }
    }
  }
  return { ok: true }
}

// ── 构建 LLM 消息 ──

const INDUSTRY_LABELS: Record<Industry, string> = {
  finance: '金融',
  ecommerce: '电商',
  local_life: '本地生活',
  saas: 'SaaS',
  generic: '通用',
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  copywriting: '营销文案',
  poster: '海报文案',
  video_script: '视频脚本',
  graphic_text: '图文',
}

export function buildMessages(
  prompt: string,
  industry: Industry,
  contentType: ContentType,
  platforms: Platform[]
): Array<{ role: 'system' | 'user'; content: string }> {
  const platformDesc = platforms
    .map(p => `${PLATFORM_META[p].icon} ${PLATFORM_META[p].label}（${PLATFORM_META[p].desc}）`)
    .join('\n')

  const system = `你是一位资深营销内容策划师，擅长为不同平台生成高质量营销内容。

行业：${INDUSTRY_LABELS[industry]}
内容类型：${CONTENT_TYPE_LABELS[contentType]}
目标平台：
${platformDesc}

要求：
1. 为每个目标平台生成定制化内容，贴合该平台的内容风格和用户习惯
2. 内容要有吸引力、有明确的行动号召（CTA）
3. 包含具体的利益点和数字化表达
4. 小红书内容要带 emoji 和话题标签
5. 抖音内容要写成短视频脚本格式（分镜+口播）

输出格式（严格遵循 JSON）：
\`\`\`json
{
  "original": "通用版本的核心文案",
  "platforms": {
    "wecom": { "content": "...", "tags": [] },
    "wechat_mp": { "content": "...", "tags": [] },
    "xiaohongshu": { "content": "...", "tags": ["#话题1", "#话题2"] },
    "douyin": { "content": "...", "tags": [] }
  }
}
\`\`\`
只输出 JSON，不要其他文字。`

  const user = `请根据以下需求生成营销内容：

${prompt}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// ── LLM 调用 ──

export async function routeAndCall(
  _industry: Industry,
  _contentType: ContentType,
  messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<LLMResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || ''
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || 'https://api.deepseek.com'
  const model = process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || 'deepseek-chat'

  if (!apiKey) {
    // Mock response for development without API key
    return {
      content: JSON.stringify({
        original: `【${_industry}】${messages[1].content.slice(0, 50)}...的核心营销文案`,
        platforms: {
          wecom: { content: `【企业微信群发】${messages[1].content.slice(0, 80)}...\n\n了解更多，请点击链接 →`, tags: [] },
          wechat_mp: { content: `【公众号推文】\n\n${messages[1].content.slice(0, 100)}...\n\n点击「阅读原文」获取详情`, tags: [] },
          xiaohongshu: { content: `✨ ${messages[1].content.slice(0, 60)}...\n\n💡 划重点：\n1. 超值优惠\n2. 限时活动\n3. 品质保障\n\n#好物推荐 #限时优惠`, tags: ['#好物推荐', '#限时优惠'] },
          douyin: { content: `【分镜1】开场：你还在为...烦恼吗？\n【分镜2】痛点：${messages[1].content.slice(0, 40)}...\n【分镜3】解决方案：看这里！\n【分镜4】CTA：点击下方链接，立即体验！`, tags: [] },
        },
      }),
      model: 'mock-fallback',
    }
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const content = data.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('LLM returned empty content')

  return { content, model }
}

// ── 解析结构化输出 ──

export function parseStructuredOutput(
  raw: string,
  platforms: Platform[],
  _industry: Industry
): Partial<Record<Platform, PlatformResult>> {
  // Try to extract JSON from the response
  let parsed: Record<string, unknown>
  try {
    // Remove markdown code fence if present
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    parsed = JSON.parse(jsonStr.trim())
  } catch {
    // If JSON parse fails, put the raw text as the content for each platform
    const result: Partial<Record<Platform, PlatformResult>> = {}
    for (const p of platforms) {
      result[p] = { content: raw, tags: [] }
    }
    return result
  }

  const platformsData = (parsed.platforms ?? {}) as Record<string, { content?: string; tags?: string[] }>
  const result: Partial<Record<Platform, PlatformResult>> = {}

  for (const p of platforms) {
    const pData = platformsData[p]
    if (pData && typeof pData.content === 'string') {
      result[p] = {
        content: pData.content,
        tags: Array.isArray(pData.tags) ? pData.tags : [],
      }
    }
  }

  return result
}

// ── 内容评分 ──

export function scoreContent(content: string): ScoreResult {
  const dimensions: Record<string, number> = {
    length: 0,
    cta: 0,
    benefit: 0,
    quantifiable: 0,
    compliance: 0,
    structure: 0,
  }

  // Length: 50-500 chars is ideal
  if (content.length >= 50 && content.length <= 500) {
    dimensions.length = 20
  } else if (content.length >= 20) {
    dimensions.length = 10
  }

  // CTA: check for call-to-action keywords
  if (/立即|点击|领取|购买|体验|了解|咨询|扫码|链接|下单|预约/.test(content)) {
    dimensions.cta = 20
  }

  // Benefit: check for benefit keywords
  if (/优惠|折扣|省钱|免费|赠送|福利|限时|专属|超值|划算|省心|高效|便捷/.test(content)) {
    dimensions.benefit = 15
  }

  // Quantifiable: check for numbers/percentages
  if (/\d+%|\d+元|\d+折|\d+天|\d+小时|\d+分钟|\d+人/.test(content)) {
    dimensions.quantifiable = 15
  }

  // Compliance: no banned words
  if (!/最|第一|国家级|世界级|顶级/.test(content)) {
    dimensions.compliance = 15
  }

  // Structure: has line breaks or bullet points
  if (/\n|\*|•|-/.test(content)) {
    dimensions.structure = 15
  }

  const total = Object.values(dimensions).reduce((a, b) => a + b, 0)
  return { total, dimensions }
}
