'use client'

import React, { useEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom'

interface RemoteAppProps {
  remoteName: string
  moduleName: string
  fallback?: React.ReactNode
}

const REMOTE_BASES: Record<string, string> = {
  aidata:    process.env.NEXT_PUBLIC_REMOTE_AIDATA    || 'http://localhost:3001',
  growth:    process.env.NEXT_PUBLIC_REMOTE_GROWTH    || 'http://localhost:3002',
  ideaforge: process.env.NEXT_PUBLIC_REMOTE_IDEAFORGE || 'http://localhost:3003',
  dealflow:  process.env.NEXT_PUBLIC_REMOTE_DEALFLOW  || 'http://localhost:3004',
}

const scriptCache = new Map<string, Promise<void>>()

type SharedScope = Record<string, Record<string, {
  get: () => Promise<() => unknown>
  from: string
  eager: boolean
  loaded: number
}>>

const SHARED_SCOPE: SharedScope = {
  react: {
    [React.version]: { get: () => Promise.resolve(() => React), from: 'portal', eager: false, loaded: 1 },
  },
  'react-dom': {
    [ReactDOM.version]: { get: () => Promise.resolve(() => ReactDOM), from: 'portal', eager: false, loaded: 1 },
  },
}

function loadScript(url: string): Promise<void> {
  if (scriptCache.has(url)) return scriptCache.get(url)!
  const p = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${url}`)))
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
    document.head.appendChild(script)
  })
  scriptCache.set(url, p)
  return p
}

export function RemoteApp({ remoteName, moduleName, fallback }: RemoteAppProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [hasMountFn, setHasMountFn] = useState(false)
  const mountFnRef = useRef<((el: HTMLElement) => () => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountContainerRef = useRef<HTMLDivElement>(null)

  const isNotRunning = error?.includes('Failed to load script') || error?.includes('webpack')

  useEffect(() => {
    const loadRemote = async () => {
      try {
        const base = REMOTE_BASES[remoteName]
        if (!base) throw new Error(`No URL configured for remote: ${remoteName}`)

        await loadScript(`${base}/_next/static/chunks/webpack.js`)
        await loadScript(`${base}/_next/static/chunks/remoteEntry.js`)

        const container = (window as Record<string, unknown>)[remoteName] as RemoteContainer | undefined
        if (!container) throw new Error(`Remote ${remoteName} not available after script load`)

        await container.init(SHARED_SCOPE)

        const factory = await container.get(moduleName)
        const mod = factory() as {
          default?: React.ComponentType
          mount?: (el: HTMLElement) => () => void
        }

        if (typeof mod.mount === 'function') {
          mountFnRef.current = mod.mount
          setHasMountFn(true)
        } else if (mod.default) {
          setComponent(() => mod.default as React.ComponentType)
        } else {
          throw new Error(`Module ${moduleName} has no usable export`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load remote')
      }
    }

    loadRemote()
  }, [remoteName, moduleName])

  useEffect(() => {
    if (!hasMountFn || !mountFnRef.current || !mountContainerRef.current) return
    return mountFnRef.current(mountContainerRef.current)
  }, [hasMountFn])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4 px-6 text-center">
        <p className="text-red-500 font-medium">加载失败: {error}</p>
        {isNotRunning ? (
          <div className="max-w-md space-y-2 text-sm text-gray-500">
            <p>该模块服务（{REMOTE_BASES[remoteName]}）当前未启动。</p>
            <p>请先在终端启动对应模块，或稍后再试。</p>
          </div>
        ) : (
          <a
            href={REMOTE_BASES[remoteName] || '#'}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-500 hover:underline"
          >
            在新窗口打开 →
          </a>
        )}
      </div>
    )
  }

  if (!Component && !hasMountFn) {
    return fallback || (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]" />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (hasMountFn) {
    return <div ref={mountContainerRef} className="h-full overflow-y-auto" />
  }

  const Comp = Component!
  return (
    <div className="h-full overflow-y-auto">
      <Comp />
    </div>
  )
}

interface RemoteContainer {
  init: (shareScope: unknown) => Promise<void>
  get: (module: string) => Promise<() => { default: React.ComponentType; mount?: (el: HTMLElement) => () => void }>
}
