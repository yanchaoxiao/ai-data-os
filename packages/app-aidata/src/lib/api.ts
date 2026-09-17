'use client'

import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_AIDATA_URL || 'http://localhost:3005'

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.NEXT_PUBLIC_AIDATA_API_KEY ?? 'dev-api-key' },
})

export interface QueryRequest {
  query: string
  user_id?: string
  context?: Record<string, unknown>
}

export interface QueryResponse {
  answer: string
  type: string
  confidence: number
  caveat?: string
  cache_hit: boolean
  metadata?: Record<string, unknown>
}

export interface HealthResponse {
  status: string
}

export async function sendQuery(req: QueryRequest): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>('/query', req)
  return data
}

export interface FeedbackRequest {
  query_id: string
  query: string
  rating: 'up' | 'down'
  answer_type?: string
  correct_answer?: string
  correct_metric?: string
  correct_type?: string
}

export async function sendFeedback(req: FeedbackRequest): Promise<{ status: string; actions: string[] }> {
  const { data } = await api.post('/feedback', req)
  return data
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export interface ServiceStatus {
  name: string
  key: string
  status: 'up' | 'down' | 'unknown' | 'degraded'
  latency_ms: number
}

export interface ServiceHealth {
  overall: 'up' | 'degraded'
  services: ServiceStatus[]
}

export interface MetricsResponse {
  p95_latency_ms: Record<string, number>
  counters: { cache_hit: number; cache_miss: number; total_queries: number; errors: number }
  cache_hit_rate: number
}

export async function getServiceHealth(): Promise<ServiceHealth> {
  const { data } = await api.get<ServiceHealth>('/status/health')
  return data
}

export async function getMetrics(): Promise<MetricsResponse> {
  const { data } = await api.get<MetricsResponse>('/metrics')
  return data
}

// ── 指标目录 (Registry) ──

export interface MetricSource {
  table: string
  measures: Record<string, string>
}

export interface MetricDef {
  name: string
  label: string
  alias?: string
  description: string
  expr: string
  dimensions?: string[]
  tags: string[]
  source?: MetricSource
  derived_from?: string
  filter?: Record<string, string>
}

export interface TreeNode {
  name: string
  label: string
  derivation_type: string | null
  children: TreeNode[]
}

export interface MetricGraphResponse {
  metric: MetricDef
  ancestors: { name: string; label: string; derivation_type: string | null; depth: number }[]
  descendants: { name: string; label: string; derivation_type: string | null; depth: number }[]
  siblings: { name: string; label: string; shared_table: string }[]
  neo4j_available: boolean
}

export interface ForestResponse {
  forest: TreeNode[]
  neo4j_available: boolean
}

export async function getRegistryMetrics(): Promise<{ metrics: MetricDef[]; count: number }> {
  const { data } = await api.get('/registry/metrics')
  return data
}

export async function getMetricGraph(name: string): Promise<MetricGraphResponse> {
  const { data } = await api.get(`/registry/metrics/${name}`)
  return data
}

export async function getRegistryForest(): Promise<ForestResponse> {
  const { data } = await api.get('/registry/forest')
  return data
}

export async function registerMetric(metric: MetricDef): Promise<{ status: string; name: string }> {
  const { data } = await api.post('/registry/metrics', metric)
  return data
}

// ── 知识库 (Knowledge) ──

export interface KBCategory {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
}

export interface KBArticle {
  id: number
  title: string
  content: string
  category_id: number | null
  source_type: string
  status: 'pending' | 'ai_reviewed' | 'published' | 'rejected' | 'community'
  created_at: string
  updated_at: string
}

export interface ArticleInput {
  title: string
  content?: string
  category_id?: number | null
  source_type?: string
  status?: string
}

export async function getKBCategories(): Promise<KBCategory[]> {
  const { data } = await api.get('/knowledge/categories')
  return data
}

export async function getKBArticles(params?: {
  categoryId?: number
  q?: string
  status?: string
}): Promise<KBArticle[]> {
  const { data } = await api.get('/knowledge/articles', { params: {
    category_id: params?.categoryId,
    q: params?.q,
    status: params?.status,
  }})
  return data
}

export async function getKBArticle(id: number): Promise<KBArticle> {
  const { data } = await api.get(`/knowledge/articles/${id}`)
  return data
}

export async function createKBArticle(input: ArticleInput): Promise<KBArticle> {
  const { data } = await api.post('/knowledge/articles', input)
  return data
}

export async function updateKBArticle(id: number, input: Partial<ArticleInput>): Promise<KBArticle> {
  const { data } = await api.put(`/knowledge/articles/${id}`, input)
  return data
}

export async function uploadKBFile(file: File): Promise<KBArticle> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/knowledge/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchKBUrl(url: string): Promise<{ title: string; content: string }> {
  const { data } = await api.post('/knowledge/fetch-url', { url })
  return data
}

export async function publishKBArticle(id: number): Promise<void> {
  await api.post(`/knowledge/articles/${id}/publish`)
}

export async function rejectKBArticle(id: number): Promise<void> {
  await api.post(`/knowledge/articles/${id}/reject`)
}

export async function createKBCategory(name: string, parentId?: number): Promise<KBCategory> {
  const { data } = await api.post('/knowledge/categories', { name, parent_id: parentId ?? null, sort_order: 0 })
  return data
}

export async function deleteKBCategory(id: number): Promise<void> {
  await api.delete(`/knowledge/categories/${id}`)
}

// ── 归因分析 (Attribution) ──

export interface AttributionContext {
  start?: string
  end?: string
  granularity?: string
  engine?: string
}

export interface AttributionNode {
  node: string
  status: 'success' | 'failed' | 'skipped'
  latency_ms: number
  error?: string
  data?: Record<string, unknown>
}

export interface AttributionResult {
  conclusion: string
  short_circuit: boolean
  nodes: AttributionNode[]
  state: Record<string, unknown>
  metric: MetricDef
  sql: string
  analysis_start?: string
}

export interface QuickCheckResult {
  trend: { dt: string; value: number }[]
  anomaly: {
    is_anomaly?: boolean
    z_score?: number
    current_value?: number
    baseline_mean?: number
    deviation_pct?: number
  }
}

export async function runAttribution(
  metricName: string,
  context?: AttributionContext
): Promise<AttributionResult> {
  const { data } = await api.post('/attribution/run', { metric_name: metricName, context })
  return data
}

export async function quickCheck(
  metricName: string,
  context?: AttributionContext
): Promise<QuickCheckResult> {
  const { data } = await api.post('/attribution/quick-check', { metric_name: metricName, context })
  return data
}

export async function refineAttribution(
  state: Record<string, unknown>,
  extraContext: string
): Promise<{ summary: string }> {
  const { data } = await api.post('/attribution/refine', { state, extra_context: extraContext })
  return data
}

// ── 自进化 (Evolution) ──

export interface LoopStatus {
  id: string
  name: string
  status: string
  trigger: string
  kpi: { label: string; value: string | number }
  last_run: string | null
}

export interface FeedbackEvent {
  query_id: string
  query: string
  rating: 'up' | 'down'
  correct_metric?: string
  timestamp?: number
}

export interface L3Report {
  date: string
  missing_metrics: { pattern: string; count: number; suggestion: string }[]
  knowledge_gaps: { pattern: string; count: number; suggestion: string }[]
  scanned_queries: number
}

export interface L4HistoryItem {
  date: string
  total: number
  pass: number
  pass_rate: number
}

export interface L5Stats {
  hit_rate: number
  top_queries: { query: string; count: number }[]
  total_cached: number
}

export interface L6Candidate {
  name: string
  label: string
  table: string
  measure: string
  aggregation: string
  status: 'pending' | 'approved' | 'rejected'
  discovered_from: string
  confidence: number
}

export async function getAdminStatus(): Promise<LoopStatus[]> {
  const { data } = await api.get<LoopStatus[]>('/admin/status')
  return data
}

export async function triggerLoop(name: string): Promise<{ triggered: boolean; loop: string }> {
  const { data } = await api.post(`/admin/loops/${name}/trigger`)
  return data
}

export async function getL1Events(): Promise<{ events: FeedbackEvent[]; today_count: number; positive_rate: number }> {
  const { data } = await api.get('/admin/loops/L1/events')
  return data
}

export async function getL3Report(): Promise<L3Report> {
  const { data } = await api.get<L3Report>('/admin/loops/L3/report')
  return data
}

export async function getL4History(): Promise<L4HistoryItem[]> {
  const { data } = await api.get<L4HistoryItem[]>('/admin/loops/L4/history')
  return data
}

export async function getL5Stats(): Promise<L5Stats> {
  const { data } = await api.get<L5Stats>('/admin/loops/L5/stats')
  return data
}

export async function getL6Candidates(): Promise<L6Candidate[]> {
  const { data } = await api.get<L6Candidate[]>('/admin/loops/L6/candidates')
  return data
}

export async function approveL6Candidate(name: string): Promise<void> {
  await api.post(`/admin/loops/L6/candidates/${name}/approve`)
}

export async function rejectL6Candidate(name: string): Promise<void> {
  await api.post(`/admin/loops/L6/candidates/${name}/reject`)
}
