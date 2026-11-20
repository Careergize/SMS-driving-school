import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

try { loadEnvFile(fileURLToPath(new URL('./.env.local', import.meta.url))) }
catch (error) { if (error.code !== 'ENOENT') throw error }

const branchKeys = {
  vanchiyoor: 'GOOGLE_PLACE_ID_VANCHIYOOR',
  kulathoor: 'GOOGLE_PLACE_ID_KULATHOOR',
  peroorkada: 'GOOGLE_PLACE_ID_PEROORKADA',
  manacaud: 'GOOGLE_PLACE_ID_MANACAUD',
}

// Credentials and upstream requests remain on the server. No review content is persisted.
export function createGoogleReviewsHandler({ env = process.env, fetcher = fetch } = {}) {
  const pending = new Map()
  // Limit upstream requests without storing Google review content.
  const calls = []
  return async function handleGoogleReviews(request, response) {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname !== '/api/google-reviews/') return false
    const send = (status, payload) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      response.end(JSON.stringify(payload))
      return true
    }
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return send(405, { available: false }) }
    const branch = url.searchParams.get('branch') || 'vanchiyoor'
    if (!Object.hasOwn(branchKeys, branch)) return send(400, { available: false, reason: 'unknown_branch' })
    const key = env.GOOGLE_PLACES_API_KEY?.trim()
    const placeId = (env[branchKeys[branch]] || (branch === 'vanchiyoor' ? env.GOOGLE_PLACE_ID : '') || '').trim()
    if (!key || !placeId) return send(200, { available: false, reason: 'not_configured', branch })
    if (!/^[A-Za-z0-9_-]{5,300}$/.test(placeId)) return send(200, { available: false, reason: 'configuration_error', branch })
    try {
      if (!pending.has(branch)) {
        const now = Date.now()
        while (calls.length && now - calls[0] >= 60000) calls.shift()
        const maximum = Math.max(1, Math.min(120, Number(env.GOOGLE_REVIEWS_REQUESTS_PER_MINUTE) || 30))
        if (calls.length >= maximum) return send(429, { available: false, reason: 'temporarily_unavailable', branch })
        calls.push(now)
        const task = (async () => {
          const upstream = await fetcher(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
            headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews,attributions' },
            signal: AbortSignal.timeout(8000), redirect: 'error',
          })
          if (!upstream.ok) throw new Error('Google review request failed')
          const place = await upstream.json()
          return { available: true, branch, name: place.displayName?.text || 'SMS Motor Driving School', rating: place.rating ?? null, count: place.userRatingCount ?? null,
            mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=SMS&query_place_id=${encodeURIComponent(placeId)}`,
            reviews: (place.reviews || []).slice(0, 5).map(review => ({
              author: review.authorAttribution?.displayName || 'Google user', authorUrl: review.authorAttribution?.uri || '', photo: review.authorAttribution?.photoUri || '',
              rating: review.rating, text: review.text?.text || review.originalText?.text || '', originalLanguage: review.originalText?.languageCode || '',
              translated: Boolean(review.text?.text && review.originalText?.text && review.text.text !== review.originalText.text),
              relativeTime: review.relativePublishTimeDescription || '', publishedAt: review.publishTime || '', url: review.googleMapsUri || place.googleMapsUri || '',
            })), attributions: place.attributions || [], }
        })()
        pending.set(branch, task)
        task.finally(() => { if (pending.get(branch) === task) pending.delete(branch) }).catch(() => {})
      }
      return send(200, await pending.get(branch))
    } catch { return send(503, { available: false, reason: 'temporarily_unavailable', branch }) }
  }
}

export const handleGoogleReviews = createGoogleReviewsHandler()
