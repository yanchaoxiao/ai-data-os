const path = require('path')
const fs = require('fs')

// Manually load .env from project root (loadEnvConfig unreliable in some setups)
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
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

const SELF_URL = process.env.NEXT_PUBLIC_REMOTE_DEALFLOW || 'http://localhost:3004'

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: SELF_URL,
  env: {
    NEXT_PUBLIC_REMOTE_DEALFLOW: SELF_URL,
    DATABASE_URL: process.env.DATABASE_URL || '',
    PDD_APP_KEY: process.env.PDD_APP_KEY || '',
    PDD_APP_SECRET: process.env.PDD_APP_SECRET || '',
    PDD_PID: process.env.PDD_PID || '',
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'http://localhost:3100',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.pddpic.com' },
      { protocol: 'https', hostname: '**.pddpic.com' },
    ],
  },
  transpilePackages: ['@ai-xyc/ui', '@ai-xyc/utils', '@ai-xyc/types', '@ai-xyc/auth', '@ai-xyc/ai'],
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
      config.output.uniqueName = 'dealflow'
      config.output.publicPath = `${SELF_URL}/_next/`
      config.plugins.push(
        new webpack.container.ModuleFederationPlugin({
          name: 'dealflow',
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
