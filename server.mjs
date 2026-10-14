import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const root = resolve('dist')
const indexFile = resolve(root, 'index.html')
const port = Number.parseInt(process.env.PORT || '4173', 10)
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'], ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'], ['.ttf', 'font/ttf'], ['.webp', 'image/webp'], ['.woff', 'font/woff'], ['.woff2', 'font/woff2'],
])

function insideRoot(path) {
  return path === root || path.startsWith(`${root}${sep}`)
}

async function fileFor(requestUrl) {
  let pathname
  try { pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname) }
  catch { return { status: 400 } }
  const candidate = resolve(root, `.${pathname}`)
  if (!insideRoot(candidate)) return { status: 400 }
  try {
    const info = await stat(candidate)
    if (info.isFile()) return { status: 200, path: candidate }
  } catch { /* The SPA fallback handles public routes such as /r and /i. */ }
  return { status: 200, path: indexFile }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return
  }
  const target = await fileFor(request.url || '/')
  if (!target.path) { response.writeHead(target.status); response.end(); return }
  try {
    const info = await stat(target.path)
    const immutable = target.path.includes(`${sep}assets${sep}`)
    response.writeHead(200, {
      'Content-Type': mime.get(extname(target.path).toLowerCase()) || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    })
    if (request.method === 'HEAD') response.end()
    else createReadStream(target.path).pipe(response)
  } catch {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Build non disponibile. Esegui npm run build prima di avviare il server.')
  }
})

server.listen(Number.isFinite(port) ? port : 4173, '0.0.0.0', () => {
  console.log(`G.A.T.E. frontend disponibile sulla porta ${Number.isFinite(port) ? port : 4173}`)
})
