'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const FEATURES = [
  { icon: '💡', title: '灵感收集', desc: '随时随地记录灵感，AI 辅助分类与关联' },
  { icon: '🔄', title: '创意打磨', desc: 'LLM 多轮对话，从模糊想法到清晰方案' },
  { icon: '📋', title: '方案拆解', desc: '自动拆解执行步骤，生成 TODO 清单' },
  { icon: '🚀', title: '一键启动', desc: '对接 Growth / DealFlow 模块，想法直达落地' },
]

const ROADMAP = [
  { phase: 'Phase 1', title: '灵感笔记 + AI 对话', status: 'planned' },
  { phase: 'Phase 2', title: '创意看板 + 协作', status: 'planned' },
  { phase: 'Phase 3', title: '方案生成 + 任务拆解', status: 'planned' },
  { phase: 'Phase 4', title: '跨模块联动落地', status: 'planned' },
]

export default function IdeaForgePage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/30">
      {/* 顶部标题区 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-3xl mx-auto px-6 pt-12 pb-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-200 mb-4"
          >
            <span className="text-3xl">⚡</span>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            IdeaForge
          </h1>
          <p className="text-gray-500 text-sm">从想法到实现，一键闭环</p>
          <span className="inline-block mt-3 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            🔨 建设中 · Coming Soon
          </span>
        </motion.div>
      </div>

      {/* 功能预览 */}
      <div className="max-w-3xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              className={`relative bg-white rounded-xl border p-4 transition-all cursor-default ${
                hoveredFeature === i
                  ? 'border-amber-300 shadow-md shadow-amber-100'
                  : 'border-gray-100 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
              <AnimatePresence>
                {hoveredFeature === i && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 origin-left rounded-b-xl"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 路线图 */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🗺️</span> 开发路线图
          </h2>
          <div className="space-y-3">
            {ROADMAP.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 border border-amber-200 shrink-0">
                  <span className="text-xs font-bold text-amber-600">{i + 1}</span>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-500 font-medium">{item.phase}</span>
                    <p className="text-sm text-gray-700">{item.title}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
                    {item.status === 'planned' ? '📋 计划中' : item.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部引导 */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-4 text-center"
        >
          <p className="text-xs text-gray-500">
            IdeaForge 正在筹备中，先去试试其他模块吧 →
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <a
              href="/aidata"
              className="text-xs px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
            >
              🤖 AI Data OS
            </a>
            <a
              href="/growth"
              className="text-xs px-3 py-1.5 bg-white text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              📈 Growth
            </a>
            <a
              href="/dealflow"
              className="text-xs px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors font-medium"
            >
              🛒 DealFlow
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
