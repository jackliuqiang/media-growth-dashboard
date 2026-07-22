import fs from 'node:fs'
import fsp from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readState, stateFilePath, stateRoot, writeState } from '../shared/state-store.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const isDev = args.includes('--dev')
const shouldOpen = args.includes('--open')
const requestedPort = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 4181
const host = '127.0.0.1'
const clients = new Set()
const vite = isDev ? await (await import('vite')).createServer({ root: projectRoot, server: { middlewareMode: true, hmr: { port: requestedPort + 10_000 } }, appType: 'spa' }) : null

await readState()

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 2 * 1024 * 1024) throw new Error('请求数据超过 2 MiB')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function notifyStateChanged() {
  for (const response of clients) response.write(`event: state\ndata: updated\n\n`)
}

async function handleApi(request, response, url) {
  if (url.pathname === '/api/health' && request.method === 'GET') {
    json(response, 200, { ok: true, dataRoot: stateRoot(), schemaVersion: 1 })
    return true
  }
  if (url.pathname === '/api/state' && request.method === 'GET') {
    json(response, 200, await readState())
    return true
  }
  if (url.pathname === '/api/state' && request.method === 'PUT') {
    if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
      json(response, 415, { error: '只接受 application/json' })
      return true
    }
    try {
      const state = await writeState(await readJson(request))
      notifyStateChanged()
      json(response, 200, state)
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : '保存失败' })
    }
    return true
  }
  if (url.pathname === '/api/events' && request.method === 'GET') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    response.write('event: ready\ndata: connected\n\n')
    clients.add(response)
    request.on('close', () => clients.delete(response))
    return true
  }
  return false
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

async function serveProduction(response, pathname) {
  const distRoot = path.join(projectRoot, 'dist')
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '')
  let target = path.resolve(distRoot, relative)
  if (!target.startsWith(`${distRoot}${path.sep}`) && target !== path.join(distRoot, 'index.html')) {
    response.writeHead(403).end('Forbidden')
    return
  }
  try {
    const stat = await fsp.stat(target)
    if (stat.isDirectory()) target = path.join(target, 'index.html')
    const body = await fsp.readFile(target)
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(target)] || 'application/octet-stream' })
    response.end(body)
  } catch {
    const body = await fsp.readFile(path.join(distRoot, 'index.html'))
    response.writeHead(200, { 'Content-Type': contentTypes['.html'] })
    response.end(body)
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${host}`)
  try {
    if (await handleApi(request, response, url)) return
    if (vite) {
      vite.middlewares(request, response, () => json(response, 404, { error: 'Not found' }))
      return
    }
    await serveProduction(response, url.pathname)
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : '服务异常' })
  }
})

async function listen(port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve(port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

let port = requestedPort
while (port < requestedPort + 20) {
  try {
    await listen(port)
    break
  } catch (error) {
    if (error?.code !== 'EADDRINUSE') throw error
    port += 1
  }
}
if (!server.listening) throw new Error(`端口 ${requestedPort}-${port} 均不可用`)

const url = `http://${host}:${port}/`
await fsp.writeFile(path.join(stateRoot(), 'runtime.json'), `${JSON.stringify({ url, pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 })
console.log(`自媒体增长驾驶舱已启动：${url}`)
console.log(`本地数据目录：${stateRoot()}`)

let watchTimer
const watcher = fs.watch(path.dirname(stateFilePath()), (_event, filename) => {
  if (filename !== path.basename(stateFilePath())) return
  clearTimeout(watchTimer)
  watchTimer = setTimeout(notifyStateChanged, 100)
})

if (shouldOpen) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const commandArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  spawn(command, commandArgs, { detached: true, stdio: 'ignore' }).unref()
}

async function shutdown() {
  watcher.close()
  for (const response of clients) response.end()
  clients.clear()
  server.close()
  server.closeAllConnections?.()
  await vite?.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
