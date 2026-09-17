'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'

const modules = [
  {
    id: 'chat',
    name: '对话问答',
    desc: '语义查询指标，AI 驱动的数据对话',
    href: '/aidata',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    titleColor: 'text-indigo-700',
    icon: '🤖',
    badge: 'AI 问答',
    badgeBg: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'diagnosis',
    name: '归因分析',
    desc: '数据波动溯源，DAG 根因定位',
    href: '/aidata/attribution',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    titleColor: 'text-amber-700',
    icon: '🔍',
    badge: '异常诊断',
    badgeBg: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'registry',
    name: '指标目录',
    desc: '指标注册管理，知识图谱浏览',
    href: '/aidata/registry',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    titleColor: 'text-emerald-700',
    icon: '📊',
    badge: '指标查询',
    badgeBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'knowledge',
    name: '知识库',
    desc: '业务文档、需求材料、技术方案问答',
    href: '/aidata/knowledge',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    titleColor: 'text-teal-700',
    icon: '📚',
    badge: '业务知识',
    badgeBg: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'evolution',
    name: '自进化',
    desc: '自进化 Loop 状态监控与管理',
    href: '/aidata/evolution',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    titleColor: 'text-rose-600',
    icon: '🧬',
    badge: '管理员',
    badgeBg: 'bg-rose-100 text-rose-500',
  },
  {
    id: 'dashboard',
    name: '系统仪表盘',
    desc: '实时监控，系统健康状态总览',
    href: '/aidata/dashboard',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    titleColor: 'text-violet-700',
    icon: '📉',
    badge: '系统监控',
    badgeBg: 'bg-violet-100 text-violet-600',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

const otherApps = [
  {
    id: 'growth',
    name: 'Growth',
    desc: '增长数据看板，追踪每一个关键指标',
    href: '/growth',
    icon: '📈',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  {
    id: 'ideaforge',
    name: 'IdeaForge',
    desc: '从想法到实现，一键闭环',
    href: '/ideaforge',
    icon: '⚡',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'New',
  },
  {
    id: 'dealflow',
    name: 'DealFlow',
    desc: '电商商品聚合，发现最优惠的选择',
    href: '/dealflow',
    icon: '🛒',
    color: 'text-rose-500',
    bg: 'bg-rose-50 border-rose-200',
    badge: 'Soon',
  },
]

export default function PortalPage() {
  const { user, logout } = useAuth()
  const visibleModules = modules.filter((mod) => mod.id !== 'evolution' || user?.role === 'admin')

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-16">
      {user && (
        <div className="fixed top-4 right-4 flex items-center gap-3 z-10">
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
            {user.username}
            <span
              className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                user.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {user.role === 'admin' ? '管理员' : '用户'}
            </span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-600 transition-colors bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm"
          >
            <LogOut size={13} />
            登出
          </button>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-500 bg-clip-text text-transparent mb-3">ai-xyc</h1>
        <p className="text-gray-400 text-base">选择你要进入的系统</p>
      </motion.div>

      <div className="w-full max-w-2xl space-y-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {visibleModules.map((mod) => (
            <motion.div key={mod.id} variants={item}>
              <Link href={mod.href} className="block group">
                <div className={`rounded-2xl border ${mod.border} ${mod.bg} p-6 transition-shadow duration-200 hover:shadow-md`}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{mod.icon}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mod.badgeBg}`}>
                      {mod.badge}
                    </span>
                  </div>
                  <h2 className={`text-lg font-bold ${mod.titleColor} mb-1`}>{mod.name}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">{mod.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-gray-300 mb-3 pl-1">其他应用</p>
          <div className="grid grid-cols-3 gap-3">
            {otherApps.map((app) => (
              <Link key={app.id} href={app.href} className="block group">
                <div className={`rounded-xl border ${app.bg} px-4 py-3 transition-shadow duration-200 hover:shadow-sm flex items-center gap-3`}>
                  <span className="text-xl">{app.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold ${app.color}`}>{app.name}</span>
                      {app.badge && (
                        <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1">{app.badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{app.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  )
}
