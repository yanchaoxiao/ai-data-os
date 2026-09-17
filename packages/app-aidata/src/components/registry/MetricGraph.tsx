'use client'

import { useCallback, useMemo } from 'react'
import type { MetricDef } from '../../lib/api'

const LEVEL_COLORS = ['#4f46e5', '#7c3aed', '#a855f7', '#c084fc', '#818cf8']
const NODE_W = 160
const NODE_H = 40
const H_GAP = 80
const V_GAP = 18

function getLevelColor(level: number) {
  return LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)]
}

function computeLevels(metrics: MetricDef[]): Map<string, number> {
  const map = new Map<string, number>()
  const visit = (name: string, visited = new Set<string>()): number => {
    if (map.has(name)) return map.get(name)!
    if (visited.has(name)) return 0
    visited.add(name)
    const m = metrics.find(x => x.name === name)
    const level = m?.derived_from ? visit(m.derived_from, visited) + 1 : 0
    map.set(name, level)
    return level
  }
  metrics.forEach(m => visit(m.name))
  return map
}

interface MetricGraphProps {
  metrics: MetricDef[]
  onSelect: (name: string) => void
  selectedName?: string
}

export default function MetricGraph({ metrics, onSelect, selectedName }: MetricGraphProps) {
  const levels = useMemo(() => computeLevels(metrics), [metrics])

  const grouped = useMemo(() => {
    const g = new Map<number, MetricDef[]>()
    metrics.forEach(m => {
      const l = levels.get(m.name) ?? 0
      if (!g.has(l)) g.set(l, [])
      g.get(l)!.push(m)
    })
    return g
  }, [metrics, levels])

  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>()
    grouped.forEach((mList, level) => {
      mList.forEach((m, idx) => {
        positions.set(m.name, {
          x: level * (NODE_W + H_GAP) + 24,
          y: idx * (NODE_H + V_GAP) + 24,
        })
      })
    })
    return positions
  }, [grouped])

  const { svgWidth, svgHeight } = useMemo(() => {
    let maxX = 0, maxY = 0
    nodePositions.forEach(({ x, y }) => {
      maxX = Math.max(maxX, x + NODE_W)
      maxY = Math.max(maxY, y + NODE_H)
    })
    return { svgWidth: maxX + 24, svgHeight: maxY + 24 }
  }, [nodePositions])

  const edges = useMemo(() =>
    metrics
      .filter(m => m.derived_from && nodePositions.has(m.derived_from!) && nodePositions.has(m.name))
      .map(m => {
        const from = nodePositions.get(m.derived_from!)!
        const to = nodePositions.get(m.name)!
        const x1 = from.x + NODE_W
        const y1 = from.y + NODE_H / 2
        const x2 = to.x
        const y2 = to.y + NODE_H / 2
        const cx = (x1 + x2) / 2
        return { id: `${m.derived_from}-${m.name}`, x1, y1, x2, y2, cx }
      }),
    [metrics, nodePositions]
  )

  const handleClick = useCallback((name: string) => { onSelect(name) }, [onSelect])

  if (!metrics.length) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400 text-sm">
        暂无指标数据
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white overflow-auto">
      <svg width={svgWidth} height={svgHeight} style={{ minHeight: 320, display: 'block' }}>
        {edges.map(e => (
          <path
            key={e.id}
            d={`M${e.x1},${e.y1} C${e.cx},${e.y1} ${e.cx},${e.y2} ${e.x2},${e.y2}`}
            fill="none"
            stroke="#c4b5fd"
            strokeWidth={1.5}
            markerEnd="url(#arrow)"
          />
        ))}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#c4b5fd" />
          </marker>
        </defs>
        {metrics.map(m => {
          const pos = nodePositions.get(m.name)
          if (!pos) return null
          const level = levels.get(m.name) ?? 0
          const isSelected = m.name === selectedName
          const labelText = m.label.length > 16 ? m.label.slice(0, 15) + '...' : m.label
          return (
            <g
              key={m.name}
              transform={`translate(${pos.x},${pos.y})`}
              onClick={() => handleClick(m.name)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={getLevelColor(level)}
                stroke={isSelected ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 2.5 : 1}
              />
              <text
                x={NODE_W / 2}
                y={NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={12}
                fontFamily="system-ui, sans-serif"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {labelText}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
