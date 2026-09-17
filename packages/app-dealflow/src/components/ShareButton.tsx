'use client'

import { useState, useCallback } from 'react'

interface ShareButtonProps {
  platformId: string
  platform: string
  className?: string
}

type FetchState = 'idle' | 'loading' | 'error'
type CopyState = 'idle' | 'copied'

export function ShareButton({ platformId, platform, className = '' }: ShareButtonProps) {
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [cachedUrl, setCachedUrl] = useState<string | null>(null)

  const fetchUrl = useCallback(async (): Promise<string | null> => {
    if (cachedUrl) return cachedUrl
    setFetchState('loading')
    try {
      const base = process.env.NEXT_PUBLIC_REMOTE_DEALFLOW ?? ''
      const res = await fetch(`${base}/api/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, platform }),
      })
      if (!res.ok) throw new Error('Request failed')
      const { url } = await res.json() as { url: string }
      setCachedUrl(url)
      setFetchState('idle')
      return url
    } catch {
      setFetchState('error')
      setTimeout(() => setFetchState('idle'), 2000)
      return null
    }
  }, [platformId, platform, cachedUrl])

  const handleBuy = useCallback(async () => {
    if (fetchState === 'loading') return
    const url = await fetchUrl()
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [fetchUrl, fetchState])

  const handleCopy = useCallback(async () => {
    if (fetchState === 'loading') return
    const url = await fetchUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 2000)
  }, [fetchUrl, fetchState])

  const isLoading = fetchState === 'loading'
  const isError = fetchState === 'error'

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <button
        onClick={handleBuy}
        disabled={isLoading}
        className={`
          flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors
          ${isLoading ? 'opacity-60 cursor-not-allowed bg-rose-50 text-rose-400 border-rose-200'
            : isError ? 'bg-red-50 text-red-500 border-red-200'
            : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600 active:bg-rose-700'}
        `}
      >
        {isLoading ? '生成中…' : isError ? '失败' : '去购买'}
      </button>
      <button
        onClick={handleCopy}
        disabled={isLoading}
        className={`
          flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors
          ${copyState === 'copied' ? 'bg-green-50 text-green-600 border-green-200'
            : isLoading ? 'opacity-60 cursor-not-allowed bg-white text-gray-400 border-gray-200'
            : 'bg-white text-gray-600 border-gray-200 hover:border-rose-400 hover:text-rose-600'}
        `}
      >
        {copyState === 'copied' ? '已复制 ✓' : '推广'}
      </button>
    </div>
  )
}
