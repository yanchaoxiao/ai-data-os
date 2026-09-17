'use client'

import { useState } from 'react'
import type { Platform, PlatformResult } from '@ai-xyc/growth'

const PLATFORM_META: Record<Platform, { icon: string; label: string }> = {
  wecom:       { icon: '💬', label: '企业微信' },
  wechat_mp:   { icon: '📰', label: '公众号' },
  xiaohongshu: { icon: '📱', label: '小红书' },
  douyin:      { icon: '🎵', label: '抖音' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
        copied
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
          : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
      }`}
    >
      {copied ? '已复制 ✓' : '📋 复制'}
    </button>
  )
}

interface ResultGridProps {
  platforms: Partial<Record<Platform, PlatformResult>>
  model?: string
  latency_ms?: number
}

export function ResultGrid({ platforms, model, latency_ms }: ResultGridProps) {
  const entries = Object.entries(platforms) as [Platform, PlatformResult][]

  return (
    <div className="flex flex-col gap-3">
      {latency_ms !== undefined && (
        <p className="text-[10px] text-gray-400 text-right">
          模型: {model} · 耗时 {(latency_ms / 1000).toFixed(1)}s
        </p>
      )}
      <div className={`grid gap-3 ${entries.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : entries.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {entries.map(([platform, result]) => {
          const meta = PLATFORM_META[platform]
          const copyText = result.tags
            ? `${result.content}\n\n${result.tags.join(' ')}`
            : result.content

          return (
            <div key={platform} className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
                <span className="text-xs font-medium text-gray-700">{meta.icon} {meta.label}</span>
                <CopyButton text={copyText} />
              </div>
              <div className="px-3 py-2.5 flex-1 overflow-y-auto max-h-64">
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{result.content}</p>
                {result.tags && result.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
