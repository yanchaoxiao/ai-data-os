import type { QueryResponse } from '../../lib/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  query?: string
  response?: QueryResponse
  loading?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}
