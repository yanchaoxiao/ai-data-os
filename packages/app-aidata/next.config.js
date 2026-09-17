const path = require('path')
const { loadEnvConfig } = require('@next/env')

loadEnvConfig(path.resolve(__dirname, '../..'))

const SELF_URL = process.env.NEXT_PUBLIC_REMOTE_AIDATA || 'http://localhost:3001'

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: SELF_URL,
  transpilePackages: ['@ai-xyc/ui', '@ai-xyc/utils', '@ai-xyc/types', '@ai-xyc/auth', '@ai-xyc/ai', '@xyflow/react'],
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ]
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.output.uniqueName = 'aidata'
      config.output.publicPath = `${SELF_URL}/_next/`
      config.plugins.push(
        new webpack.container.ModuleFederationPlugin({
          name: 'aidata',
          filename: 'static/chunks/remoteEntry.js',
          exposes: {
            './pages/index': './src/components/RemoteEntry.tsx',
          },
          shared: {
            react:     { singleton: true, requiredVersion: false },
            'react-dom': { singleton: true, requiredVersion: false },
          },
        })
      )
    }
    return config
  },
}
module.exports = nextConfig
