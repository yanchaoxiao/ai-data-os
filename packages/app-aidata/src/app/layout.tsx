import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="h-screen">
      <body className="h-screen">{children}</body>
    </html>
  )
}
