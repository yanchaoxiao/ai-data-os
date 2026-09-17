// Simple TCP proxy: 0.0.0.0:1088 -> 127.0.0.1:1087
// Allows OrbStack VM to reach SS HTTP proxy via host.orbstack.internal:1088
const net = require('net')

const LISTEN_PORT = 1088
const TARGET_HOST = '127.0.0.1'
const TARGET_PORT = 1087

const server = net.createServer((clientSocket) => {
  const targetSocket = net.connect(TARGET_PORT, TARGET_HOST)

  clientSocket.on('data', (data) => targetSocket.write(data))
  targetSocket.on('data', (data) => clientSocket.write(data))

  clientSocket.on('error', () => targetSocket.destroy())
  targetSocket.on('error', () => clientSocket.destroy())

  clientSocket.on('close', () => targetSocket.destroy())
  targetSocket.on('close', () => clientSocket.destroy())
})

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`TCP proxy listening on 0.0.0.0:${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`)
})

server.on('error', (err) => {
  console.error('Server error:', err.message)
  process.exit(1)
})
