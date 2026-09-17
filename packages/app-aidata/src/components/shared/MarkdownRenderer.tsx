'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

function highlightText(text: string): React.ReactNode[] {
  const regex = /(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}月\d{1,2}日(?:[-—~]\d{1,2}日)?|\d{1,2}月\d{1,2}日[-—~]\d{1,2}月\d{1,2}日|z_score[=-]?[\d.]+|[+-]?\d{1,3}(?:,\d{3})*\.\d+|[+-]?\d+(?:\.\d+)?%|[+-]?\d+(?:,\d{3})*)/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(
      <span key={match.index} className="font-semibold text-indigo-600 bg-indigo-50 px-0.5 rounded">
        {match[0]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function HighlightP({ children }: { children?: React.ReactNode }) {
  if (typeof children === 'string') {
    return <p className="mb-2 leading-relaxed text-gray-700">{highlightText(children)}</p>
  }
  return <p className="mb-2 leading-relaxed text-gray-700">{children}</p>
}

function HighlightLi({ children }: { children?: React.ReactNode }) {
  if (typeof children === 'string') {
    return <li className="text-sm text-gray-700 leading-relaxed mb-1">{highlightText(children)}</li>
  }
  return <li className="text-sm text-gray-700 leading-relaxed mb-1">{children}</li>
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-100">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-gray-800 mt-3 mb-2 flex items-center gap-2">
      <span className="w-1 h-4 bg-indigo-500 rounded-full" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-gray-800 mt-2 mb-1">{children}</h3>
  ),
  p: HighlightP,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-0.5">{children}</ol>,
  li: HighlightLi,
  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="text-amber-600 not-italic font-medium">{children}</em>,
  code: ({ children }) => <code className="bg-gray-100 text-indigo-600 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-200 pl-3 italic text-gray-600 mb-3 bg-indigo-50/50 py-1 pr-2 rounded-r">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-gray-100" />,
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}
