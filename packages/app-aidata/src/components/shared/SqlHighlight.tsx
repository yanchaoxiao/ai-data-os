'use client'

import { useMemo } from 'react'

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'AS', 'ON', 'IN', 'IS', 'NULL',
  'BETWEEN', 'LIKE', 'ILIKE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
  'INNER', 'LEFT', 'RIGHT', 'OUTER', 'JOIN', 'UNION', 'ALL', 'DISTINCT',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'WITH',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'ASC', 'DESC',
  'TRUE', 'FALSE', 'PARTITION', 'OVER', 'CROSS', 'FULL', 'NULLS', 'FIRST', 'LAST',
])

const FNS = new Set([
  'SUM', 'COUNT', 'AVG', 'MAX', 'MIN', 'COALESCE', 'NULLIF', 'IF',
  'DATE', 'YEAR', 'MONTH', 'DAY', 'NOW', 'CAST', 'CONVERT',
  'TRIM', 'UPPER', 'LOWER', 'CONCAT', 'SUBSTRING', 'LENGTH',
  'ROUND', 'FLOOR', 'CEIL', 'ABS', 'ROW_NUMBER', 'RANK', 'LAG', 'LEAD',
])

type TType = 'keyword' | 'fn' | 'string' | 'number' | 'operator' | 'plain'

const COLORS: Record<TType, string> = {
  keyword: '#6366f1',
  fn:      '#8b5cf6',
  string:  '#059669',
  number:  '#d97706',
  operator:'#6b7280',
  plain:   '#374151',
}

const CLAUSE_PATTERNS: [RegExp, string][] = [
  [/\s+GROUP\s+BY\s+/gi,  '\nGROUP BY '],
  [/\s+ORDER\s+BY\s+/gi,  '\nORDER BY '],
  [/\s+HAVING\s+/gi,      '\nHAVING '],
  [/\s+LIMIT\s+/gi,       '\nLIMIT '],
  [/\s+INNER\s+JOIN\s+/gi,'\nINNER JOIN '],
  [/\s+LEFT\s+JOIN\s+/gi, '\nLEFT JOIN '],
  [/\s+RIGHT\s+JOIN\s+/gi,'\nRIGHT JOIN '],
  [/\s+JOIN\s+/gi,        '\nJOIN '],
  [/\s+UNION\s+ALL\s+/gi, '\nUNION ALL '],
  [/\s+UNION\s+/gi,       '\nUNION '],
  [/\s+FROM\s+/gi,        '\nFROM '],
  [/\s+WHERE\s+/gi,       '\nWHERE '],
]

function formatSQL(raw: string): string {
  let sql = raw.replace(/\s+/g, ' ').trim()
  for (const [re, rep] of CLAUSE_PATTERNS) {
    sql = sql.replace(re, rep)
  }
  return sql
}

function tokenize(sql: string): Array<{ type: TType; value: string }> {
  const result: Array<{ type: TType; value: string }> = []
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === '\n') { result.push({ type: 'plain', value: '\n' }); i++; continue }
    if (ch === ' ' || ch === '\t') {
      let j = i
      while (j < sql.length && (sql[j] === ' ' || sql[j] === '\t')) j++
      result.push({ type: 'plain', value: sql.slice(i, j) })
      i = j; continue
    }
    if (ch === "'") {
      let j = i + 1
      while (j < sql.length && sql[j] !== "'") j++
      result.push({ type: 'string', value: sql.slice(i, j + 1) })
      i = j + 1; continue
    }
    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z_]/.test(sql[i - 1]))) {
      let j = i
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++
      result.push({ type: 'number', value: sql.slice(i, j) })
      i = j; continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++
      const word = sql.slice(i, j)
      if (j < sql.length && sql[j] === '.') {
        while (j < sql.length && /[a-zA-Z0-9_.]/.test(sql[j])) j++
        result.push({ type: 'plain', value: sql.slice(i, j) })
      } else {
        const up = word.toUpperCase()
        const type: TType = KEYWORDS.has(up) ? 'keyword' : FNS.has(up) ? 'fn' : 'plain'
        result.push({ type, value: word })
      }
      i = j; continue
    }
    if (/[=<>!]/.test(ch)) {
      let j = i
      while (j < sql.length && /[=<>!]/.test(sql[j])) j++
      result.push({ type: 'operator', value: sql.slice(i, j) })
      i = j; continue
    }
    result.push({ type: 'plain', value: ch })
    i++
  }
  return result
}

export default function SqlHighlight({ sql }: { sql: string }) {
  const formatted = useMemo(() => formatSQL(sql), [sql])
  const tokens = useMemo(() => tokenize(formatted), [formatted])

  return (
    <pre
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 12.5,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace',
        lineHeight: 1.8,
        overflowX: 'auto',
        whiteSpace: 'pre',
        margin: 0,
      }}
    >
      {tokens.map((t, idx) => (
        <span key={idx} style={{ color: COLORS[t.type] }}>{t.value}</span>
      ))}
    </pre>
  )
}
