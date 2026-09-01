import { createServer, type Server, type Socket } from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'

const target = 'rwiki.cn:443'

export interface SshConnectProxy {
  readonly url: string
  close(): Promise<void>
}

export function isReviewedConnectRequest(line: string): boolean {
  return line === `CONNECT ${target} HTTP/1.1`
}

export async function startSshConnectProxy(): Promise<SshConnectProxy> {
  const sockets = new Set<Socket>()
  const children = new Set<ChildProcess>()
  const server: Server = createServer(socket => {
    sockets.add(socket)
    let buffer = Buffer.alloc(0)
    const reject = () => { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n') }
    socket.once('data', chunk => {
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length > 4096) return reject()
      const boundary = buffer.indexOf('\r\n\r\n')
      if (boundary < 0) return reject()
      const line = buffer.subarray(0, boundary).toString('ascii').split('\r\n')[0] ?? ''
      if (!isReviewedConnectRequest(line)) return reject()
      const child = spawn('ssh', ['-W', target, 'ali'], { stdio: ['pipe', 'pipe', 'ignore'] })
      children.add(child)
      child.once('spawn', () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        const remainder = buffer.subarray(boundary + 4)
        if (remainder.length > 0) child.stdin?.write(remainder)
        socket.pipe(child.stdin!)
        child.stdout!.pipe(socket)
      })
      child.once('exit', () => socket.destroy())
      child.once('error', () => socket.destroy())
    })
    socket.once('close', () => sockets.delete(socket))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('DSH E2E SSH proxy address is invalid')
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      for (const socket of sockets) socket.destroy()
      for (const child of children) child.kill('SIGTERM')
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}
