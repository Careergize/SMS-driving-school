import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname } from 'node:path'
import { handlePortal } from './staff-portal.mjs'
import { handlePublicApi } from './public-api.mjs'

const port = Number(process.env.SMS_PREVIEW_PORT ?? 4173)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('SMS_PREVIEW_PORT must be a port number from 1 to 65535.')
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

const server = createServer(async (request, response) => {
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host)) {
    response.writeHead(403).end()
    return
  }
  const pathname = new URL(`http://localhost${request.url}`).pathname
  if (await handlePublicApi(request, response)) return
  if (await handlePortal(pathname, request, response)) return
  const isPublicPage = ['/', '/about', '/about/', '/blog', '/blog/', '/blog/instagram', '/blog/instagram/'].includes(pathname)
  const file = isPublicPage ? '/index.html' : pathname
  if (!/^\/(?:assets\/)?[\w.-]+$/.test(file) || !contentTypes[extname(file)]) {
    response.writeHead(404).end()
    return
  }

  try {
    let contents = await readFile(new URL(`./dist${file}`, import.meta.url))
    if (file === '/index.html') {
      contents = contents.toString()
        .replace('</head>', '<meta name="sms-local-api" content="enabled"></head>')
        .replace('</body>', '<div style="padding:16px;text-align:center"><a href="/login">Staff sign in</a></div></body>')
    }
    response.writeHead(200, { 'Content-Type': contentTypes[extname(file)] }).end(contents)
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end()
  }
})

server.on('error', error => {
  if (error.code !== 'EADDRINUSE') throw error
  console.error(`Port ${port} is already in use. Stop the old preview or set SMS_PREVIEW_PORT to another port.`)
  process.exitCode = 1
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Staff login at http://127.0.0.1:${port}/login`)
})
