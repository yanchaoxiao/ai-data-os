'use client'

import { useState } from 'react'
import ConfidenceBadge from './ConfidenceBadge'
import SQLPreview from './SQLPreview'
import SourcePanel from './SourcePanel'
import { sendFeedback } from '../../lib/api'
import type { Message } from './types'

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [feedbackSent, setFeedbackSent] = useState<'up' | 'down' | null>(null)

  const handleFeedback = async (rating: 'up' | 'down') => {
    if (feedbackSent) return
    const queryId = (message.response?.metadata?.query_id as string) || ''
    const query = message.query || ''
    try {
      await sendFeedback({
        query_id: queryId,
        query,
        rating,
        answer_type: message.response?.type,
      })
      setFeedbackSent(rating)
    } catch {
      // 静默失败
    }
  }

  if (message.loading) {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 max-w-2xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
            <span className="text-sm">思考中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-2xl px-4 py-3 max-w-2xl ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white border border-gray-200 text-gray-700 shadow-sm'
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>

        {!isUser && message.response && (
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ConfidenceBadge confidence={message.response.confidence} />
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {message.response.type}
              </span>
              {message.response.cache_hit && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  缓存命中
                </span>
              )}
              {message.response.caveat && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {message.response.caveat}
                </span>
              )}
            </div>

            {typeof message.response.metadata?.sql === 'string' && (
              <SQLPreview sql={message.response.metadata.sql} />
            )}

            {message.response.metadata && (
              <SourcePanel metadata={message.response.metadata} />
            )}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">这个回答有帮助吗？</span>
              <button
                onClick={() => handleFeedback('up')}
                disabled={feedbackSent !== null}
                className={`text-sm px-2 py-0.5 rounded transition-colors ${
                  feedbackSent === 'up'
                    ? 'bg-green-100 text-green-600'
                    : feedbackSent
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                }`}
              >
                👍
              </button>
              <button
                onClick={() => handleFeedback('down')}
                disabled={feedbackSent !== null}
                className={`text-sm px-2 py-0.5 rounded transition-colors ${
                  feedbackSent === 'down'
                    ? 'bg-red-100 text-red-600'
                    : feedbackSent
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                👎
              </button>
              {feedbackSent && (
                <span className="text-xs text-gray-400">感谢反馈！</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
