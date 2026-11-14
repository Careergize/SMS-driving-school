import { backendFetch } from './backend-api.mjs'

export async function handlePublicApi(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const methods = { '/api/catalog/': 'GET', '/api/enquiries/': 'POST' }
  const method = Object.hasOwn(methods, url.pathname) && methods[url.pathname]
  if (!method) return false

  if (request.method !== method) {
    response.writeHead(405, { Allow: method }).end()
    return true
  }
  if (method === 'POST' && request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) {
    response.writeHead(403).end()
    return true
  }

  let body
  try {
    if (method === 'POST') {
      const chunks = []
      let length = 0
      for await (const chunk of request) {
        length += chunk.length
        if (length > 16_384) {
          response.writeHead(413).end()
          return true
        }
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks)
    }

    const headers = { Accept: 'application/json' }
    if (body) headers['Content-Type'] = 'application/json'
    const upstream = await backendFetch(url.pathname + url.search, { method, body, headers })
    const payload = await upstream.text()
    response.writeHead(upstream.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    }).end(payload)
  } catch {
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
      .end(JSON.stringify({ detail: 'The local Django server is unavailable.' }))
  }
  return true
}
