'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import MessageBubble from './MessageBubble'
import type { ChatSession } from './types'

interface Props {
  session: ChatSession | null
  loading: boolean
  onSend: (query: string) => void
}

const SUGGESTED = [
  '巴西信用卡拒绝率是多少？',
  '什么是拒绝率？',
  '为什么支付成功率下降了？',
  '支付成功率',
]

export default function ChatPanel({ session, loading, onSend }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages?.length])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    onSend(text)
    setInput('')
  }

  const messages = session?.messages ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">AI Data OS</h2>
              <p className="text-sm text-gray-400 mb-8">输入问题，从数据中获取洞察</p>
              <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="p-3 text-left text-sm bg-white border border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-gray-500 hover:text-gray-800 shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="输入问题..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white px-5 py-3 rounded-xl hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
