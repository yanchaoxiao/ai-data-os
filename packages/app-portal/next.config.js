const path = require('path')
const { loadEnvConfig } = require('@next/env')

loadEnvConfig(path.resolve(__dirname, '../..'))

const REMOTE_URLS = {
  aidata:    process.env.NEXT_PUBLIC_REMOTE_AIDATA    || 'http://localhost:3001',
  growth:    process.env.NEXT_PUBLIC_REMOTE_GROWTH    || 'http://localhost:3002',
  ideaforge: process.env.NEXT_PUBLIC_REMOTE_IDEAFORGE || 'http://localhost:3003',
  dealflow:  process.env.NEXT_PUBLIC_REMOTE_DEALFLOW  || 'http://localhost:3004',
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ai-xyc/ui', '@ai-xyc/utils', '@ai-xyc/types', '@ai-xyc/auth', '@ai-xyc/ai'],
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.plugins.push(
        new webpack.container.ModuleFederationPlugin({
          name: 'portal',
          remotes: {
            aidata:    `aidata@${REMOTE_URLS.aidata}/_next/static/chunks/remoteEntry.js`,
            growth:    `growth@${REMOTE_URLS.growth}/_next/static/chunks/remoteEntry.js`,
            ideaforge: `ideaforge@${REMOTE_URLS.ideaforge}/_next/static/chunks/remoteEntry.js`,
            dealflow:  `dealflow@${REMOTE_URLS.dealflow}/_next/static/chunks/remoteEntry.js`,
          },
        })
      )
    }
    return config
  },
}
module.exports = nextConfig
