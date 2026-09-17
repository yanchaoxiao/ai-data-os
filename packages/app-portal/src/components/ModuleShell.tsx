'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ModuleShellProps {
  name: string
  icon: string
  color: string
  children: React.ReactNode
}

export default function ModuleShell({ name, icon, color, children }: ModuleShellProps) {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="flex items-center gap-4 px-5 h-14 border-b border-gray-200 shrink-0 bg-white shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors text-sm"
        >
          <ArrowLeft size={15} />
          <span>返回</span>
        </Link>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{icon}</span>
          <span className={`text-sm font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
            {name}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
