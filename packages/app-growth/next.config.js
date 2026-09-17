const path = require('path')
const fs = require('fs')

// Manually load .env from project root
const envPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

const SELF_URL = process.env.NEXT_PUBLIC_REMOTE_GROWTH || 'http://localhost:3002'

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: SELF_URL,
  env: {
    NEXT_PUBLIC_REMOTE_GROWTH: SELF_URL,
  },
  transpilePackages: ['@ai-xyc/ui', '@ai-xyc/utils', '@ai-xyc/types', '@ai-xyc/auth', '@ai-xyc/ai', '@ai-xyc/growth'],
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.output.uniqueName = 'growth'
      config.output.publicPath = `${SELF_URL}/_next/`
      config.plugins.push(
        new webpack.container.ModuleFederationPlugin({
          name: 'growth',
          filename: 'static/chunks/remoteEntry.js',
          exposes: {
            './pages/index': './src/components/RemoteEntry.tsx',
          },
          shared: {},
        })
      )
    }
    return config
  },
}
module.exports = nextConfig
