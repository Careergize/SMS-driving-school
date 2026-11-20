import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleReviewsHandler } from './google-reviews.mjs'

async function request(handler, branch = 'vanchiyoor', method = 'GET') {
  const result = { headers: {} }
  await handler({ url: '/api/google-reviews/?branch=' + branch, method }, {
    setHeader(name, value) { result.headers[name] = value },
    writeHead(status, headers) { result.status = status; Object.assign(result.headers, headers) },
    end(body) { result.body = JSON.parse(body) },
  })
  return result
}

test('unconfigured credentials return an honest unavailable state without upstream calls', async () => {
  const handler = createGoogleReviewsHandler({ env: {}, fetcher() { throw Error('Unexpected upstream call') } })
  const result = await request(handler)
  assert.equal(result.body.available, false)
  assert.equal(result.body.reason, 'not_configured')
  assert.equal(result.headers['Cache-Control'], 'no-store')
})

test('routes by allowlisted branch and preserves Google review author attribution', async () => {
  let requested
  const handler = createGoogleReviewsHandler({ env: { GOOGLE_PLACES_API_KEY: 'test-secret', GOOGLE_PLACE_ID_KULATHOOR: 'test-place-id' }, fetcher: async (url, options) => {
    requested = { url, options }
    return { ok: true, json: async () => ({ rating: 4.5, userRatingCount: 123, googleMapsUri: 'https://maps.google.com/example', reviews: [{ rating: 5, text: { text: 'Test fixture only' }, authorAttribution: { displayName: 'Test Author', uri: 'https://maps.google.com/author', photoUri: 'https://example.com/avatar' }, googleMapsUri: 'https://maps.google.com/review' }] }) }
  } })
  const result = await request(handler, 'kulathoor')
  assert.match(requested.url, /test-place-id/)
  assert.equal(requested.options.headers['X-Goog-Api-Key'], 'test-secret')
  assert.equal(result.body.reviews[0].author, 'Test Author')
  assert.equal(result.body.reviews[0].url, 'https://maps.google.com/review')
  assert.ok(!JSON.stringify(result.body).includes('test-secret'))
  assert.equal((await request(handler, 'unknown')).status, 400)
  assert.equal((await request(handler, 'kulathoor', 'POST')).status, 405)
})

test('provider failures are contained and upstream calls are rate limited', async () => {
  const handler = createGoogleReviewsHandler({ env: { GOOGLE_PLACES_API_KEY: 'test-secret', GOOGLE_PLACE_ID: 'test-place-id', GOOGLE_REVIEWS_REQUESTS_PER_MINUTE: '1' }, fetcher: async () => ({ ok: false }) })
  assert.equal((await request(handler)).status, 503)
  assert.equal((await request(handler)).status, 429)
})
