export const backendOrigin = new URL(process.env.SMS_BACKEND_URL || 'http://127.0.0.1:8000').origin

export class BackendError extends Error {
  constructor(status, details) {
    super(`Django API returned ${status}`)
    this.status = status
    this.details = details
  }
}

export function backendFetch(path, options = {}, timeout = 5000) {
  return fetch(new URL(path, backendOrigin), {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(timeout),
  })
}

export async function backendApi(path, { token, method = 'GET', data, timeout } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Token ${token}`
  const multipart = data instanceof FormData
  if (data && !multipart) headers['Content-Type'] = 'application/json'
  const response = await backendFetch(path, { method, headers, body: multipart ? data : data && JSON.stringify(data) }, timeout)
  if (!response.ok) {
    const details = [400, 409].includes(response.status) ? await response.json().catch(() => null) : null
    throw new BackendError(response.status, details)
  }
  if (response.status !== 204) return response.json()
}

export function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(value).replace(/[&<>"']/g, character => entities[character])
}
