'use client'

import { useState, useEffect, useCallback } from 'react'
import { sendQuery } from '../lib/api'
import ChatPanel from '../components/chat/ChatPanel'
import ChatSidebar from '../components/chat/ChatSidebar'
import type { ChatSession, Message } from '../components/chat/types'

const STORAGE_KEY = 'aidata_chat_sessions'
const MAX_SESSIONS = 50

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

function persist(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {}
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = loadSessions()
    setSessions(saved)
    if (saved.length > 0) setCurrentId(saved[0].id)
    setMounted(true)
  }, [])

  const currentSession = sessions.find(s => s.id === currentId) ?? null

  const createNewSession = useCallback(() => {
    const s: ChatSession = { id: genId(), title: '新对话', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
    setSessions(prev => {
      const next = [s, ...prev].slice(0, MAX_SESSIONS)
      persist(next)
      return next
    })
    setCurrentId(s.id)
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      persist(next)
      return next
    })
    setCurrentId(prev => {
      if (prev !== id) return prev
      const remaining = sessions.filter(s => s.id !== id)
      return remaining.length > 0 ? remaining[0].id : null
    })
  }, [sessions])

  const handleSend = useCallback(async (queryText: string) => {
    if (loading) return

    let sid = currentId
    if (!sid) {
      const s: ChatSession = {
        id: genId(),
        title: queryText.slice(0, 20) + (queryText.length > 20 ? '…' : ''),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setSessions(prev => {
        const next = [s, ...prev].slice(0, MAX_SESSIONS)
        persist(next)
        return next
      })
      setCurrentId(s.id)
      sid = s.id
    }

    const userMsgId = genId()
    const asstMsgId = genId()
    const userMsg: Message = { id: userMsgId, role: 'user', content: queryText }
    const asstMsg: Message = { id: asstMsgId, role: 'assistant', content: '', loading: true }

    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== sid) return s
        const isFirst = s.messages.length === 0
        return {
          ...s,
          title: isFirst ? (queryText.slice(0, 20) + (queryText.length > 20 ? '…' : '')) : s.title,
          messages: [...s.messages, userMsg, asstMsg],
          updatedAt: Date.now(),
        }
      })
      persist(next)
      return next
    })

    setLoading(true)
    try {
      const response = await sendQuery({ query: queryText })
      setSessions(prev => {
        const next = prev.map(s => {
          if (s.id !== sid) return s
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === asstMsgId
                ? { ...m, content: response.answer, query: queryText, response, loading: false }
                : m
            ),
            updatedAt: Date.now(),
          }
        })
        persist(next)
        return next
      })
    } catch {
      setSessions(prev => {
        const next = prev.map(s => {
          if (s.id !== sid) return s
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === asstMsgId
                ? { ...m, content: '请求失败，请检查后端服务是否启动', loading: false }
                : m
            ),
          }
        })
        persist(next)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [currentId, loading])

  if (!mounted) return null

  return (
    <div className="flex h-full">
      <ChatSidebar
        sessions={sessions}
        currentId={currentId}
        onSelect={setCurrentId}
        onNew={createNewSession}
        onDelete={deleteSession}
      />
      <div className="flex-1 overflow-hidden bg-gray-50">
        <ChatPanel session={currentSession} loading={loading} onSend={handleSend} />
      </div>
    </div>
  )
}
