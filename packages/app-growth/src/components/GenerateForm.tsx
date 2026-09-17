'use client'

import { useState } from 'react'
import type { Industry, ContentType, Platform } from '@ai-xyc/growth'

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'finance',    label: '金融' },
  { value: 'ecommerce',  label: '电商' },
  { value: 'local_life', label: '本地生活' },
  { value: 'saas',       label: 'SaaS' },
  { value: 'generic',    label: '通用' },
]

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'copywriting',  label: '营销文案' },
  { value: 'poster',       label: '海报文案' },
  { value: 'video_script', label: '视频脚本' },
  { value: 'graphic_text', label: '图文' },
]

const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: 'wecom',       label: '企业微信', icon: '💬' },
  { value: 'wechat_mp',   label: '公众号',   icon: '📰' },
  { value: 'xiaohongshu', label: '小红书',   icon: '📱' },
  { value: 'douyin',      label: '抖音',     icon: '🎵' },
]

interface GenerateFormProps {
  onSubmit: (data: {
    prompt: string
    industry: Industry
    contentType: ContentType
    platforms: Platform[]
  }) => void
  loading: boolean
}

export function GenerateForm({ onSubmit, loading }: GenerateFormProps) {
  const [prompt, setPrompt] = useState('')
  const [industry, setIndustry] = useState<Industry>('generic')
  const [contentType, setContentType] = useState<ContentType>('copywriting')
  const [platforms, setPlatforms] = useState<Platform[]>(['wecom'])

  function togglePlatform(p: Platform) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || platforms.length === 0 || loading) return
    onSubmit({ prompt: prompt.trim(), industry, contentType, platforms })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="描述你的营销需求，例如：推广一款儿童编程课，目标是让家长了解 AI 时代学编程的重要性..."
        rows={3}
        maxLength={2000}
        className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-emerald-400 placeholder-gray-400"
      />

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={industry}
          onChange={e => setIndustry(e.target.value as Industry)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-emerald-400"
        >
          {INDUSTRIES.map(i => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>

        <select
          value={contentType}
          onChange={e => setContentType(e.target.value as ContentType)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-emerald-400"
        >
          {CONTENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="flex gap-1 ml-auto">
          {PLATFORMS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePlatform(p.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                platforms.includes(p.value)
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !prompt.trim() || platforms.length === 0}
        className="w-full py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 active:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '生成中…' : '✨ 生成内容'}
      </button>
    </form>
  )
}
