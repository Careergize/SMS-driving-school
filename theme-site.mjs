import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname)
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject' }

export async function handleThemeSite(request, response, { assets = true } = {}) {
  let pathname
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname) } catch { return false }
  if (!['GET', 'HEAD'].includes(request.method)) return false
  let path
  if (assets && pathname.startsWith('/dricub-assets/')) {
    const assetsRoot = resolve(root, 'public/dricub-assets')
    path = resolve(root, 'public', '.' + pathname)
    if (!path.startsWith(assetsRoot + sep)) { response.writeHead(404).end(); return true }
  } else {
    const { routes } = JSON.parse(await readFile(resolve(root, 'theme/manifest.json'), 'utf8'))
    const route = pathname === '/' ? '/' : pathname.replace(/\/$/, '') + '/'
    if (!routes.includes(route)) return false
    path = resolve(root, 'theme/pages', '.' + route, 'index.html')
  }
  try {
    const body = await readFile(path)
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    response.end(request.method === 'HEAD' ? undefined : body)
  } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end() }
  return true
}
