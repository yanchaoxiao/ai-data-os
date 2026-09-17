import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../components/AuthProvider'
import AuthGate from '../components/AuthGate'

export const metadata: Metadata = {
  title: 'ai-xyc',
  description: '你的 AI 生产力平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
