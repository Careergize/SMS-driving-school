import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { customizeTheme } from './customize-theme.mjs'

// Import only public presentation resources. Never import WordPress data or credentials.
const base = 'https://smartdata.tonytemplates.com/dricub-driving-school/'
const root = resolve(import.meta.dirname, '..')
const publicRoot = resolve(root, 'public/dricub-assets')
const pagesRoot = resolve(root, 'theme/pages')
const assets = new Map()
const pages = new Map()
const failures = []
const decode = value => value.replaceAll('&#038;', '&').replaceAll('&amp;', '&').replaceAll('\\/', '/')
const extension = /\.(?:css|js|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|otf|mp4)(?:[?#]|$)/i
function assetPath(url) {
  if (url.hostname === 'fonts.googleapis.com') return '/dricub-assets/fonts/' + createHash('sha256').update(url.search).digest('hex').slice(0, 16) + '.css'
  if (url.hostname === 'fonts.gstatic.com') return '/dricub-assets/fonts' + url.pathname
  return '/dricub-assets/' + url.pathname.replace(/^\/dricub-driving-school\//, '').replaceAll(/\/{2,}/g, '/')
}
function asset(value, from = base) {
  if (!value || /^(data:|#|javascript:|mailto:|tel:)/i.test(value)) return value
  let url
  try { url = new URL(decode(value), from) } catch { return value }
  const replacements = {
    '/dricub-driving-school/wp-content/themes/dricub-driving-school/images/carobj.png': 'wp-content/uploads/2022/05/carObj-1.png',
    '/dricub-driving-school/wp-content/themes/dricub-driving-school/images/socila-services-bg.jpg': 'wp-content/themes/dricub-driving-school/images/social-services-bg.jpg',
    '/dricub-driving-school/wp-content/themes/dricub-driving-school/images/parallax-img-02.jpg': 'wp-content/uploads/2017/10/parallax-img-02-1.jpg',
    '/dricub-driving-school/wp-content/themes/images/parallax-img-01.jpg': 'wp-content/uploads/2017/10/parallax-img-01.jpg',
  }
  if (replacements[url.pathname]) url = new URL(replacements[url.pathname], base)
  if (![new URL(base).hostname, 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return value
  if (url.hostname === 'fonts.googleapis.com' && url.pathname !== '/css') return value
  if (!extension.test(url.href) && url.hostname !== 'fonts.googleapis.com') return value
  const local = assetPath(url)
  if (!assets.has(local)) assets.set(local, { url: url.href, done: false })
  return local + url.hash
}
function discover(text, from) {
  text = text.replace(/\/\*[\s\S]*?\*\//g, '')
  text.replace(/(?:src|href|data-src|poster)\s*=\s*(["'])(.*?)\1/gi, (_, quote, value) => asset(value, from))
  text.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_, quote, value) => asset(value, from))
  text.replace(/(?:https?:)?\/\/[^\s<>"'()\\]+\.(?:png|jpe?g|gif|webp|svg|woff2?|ttf|css)(?:\?[^\s<>"'()\\]*)?/gi, value => asset(value, from))
  text.replace(/srcset\s*=\s*(["'])(.*?)\1/gi, (_, quote, value) => value.split(',').forEach(candidate => asset(candidate.trim().split(/\s+/)[0], from)))
  text.replace(/@import\s+(["'])(.*?)\1/gi, (_, quote, value) => asset(value, from))
}
async function download(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' } })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) { if (attempt === 2) throw error }
  }
}
const home = await readFile(resolve(root, 'dricub-reference.html'), 'utf8')
pages.set('/', home)
// Match the complete navigation, including all six program pages and blog details.
const routes = new Set(['/about/', '/programs/', '/frequently-asked-questions/', '/blog/', '/testimonials/', '/contact/'])
for (const match of home.matchAll(/href=["']https:\/\/smartdata\.tonytemplates\.com\/dricub-driving-school\/([^"'#?]*)["']/g)) {
  if (/^(program\/|hello-world)/.test(match[1])) routes.add('/' + match[1])
}
for (const route of routes) {
  try { pages.set(route, (await download(new URL(route.slice(1), base))).toString()); console.log('Page ' + route) }
  catch (error) { failures.push({ url: route, error: error.message }) }
}
const blog = pages.get('/blog/') || ''
for (const match of blog.matchAll(/href=["']https:\/\/smartdata\.tonytemplates\.com\/dricub-driving-school\/([^"'#?]*)["']/g)) {
  const route = '/' + match[1]
  if (!route.includes('.') && !/\/(?:wp-|category|tag|author|feed|page)\b/.test(route) && route.split('/').filter(Boolean).length === 1 && !pages.has(route) && route !== '/') {
    try { pages.set(route, (await download(new URL(route.slice(1), base))).toString()); console.log('Article ' + route) }
    catch (error) { failures.push({ url: route, error: error.message }) }
  }
}
const archives = new Set()
for (const html of pages.values()) {
  for (const match of html.matchAll(/href=["']https:\/\/smartdata\.tonytemplates\.com\/dricub-driving-school\/((?:category|tag|author)\/[^"'#?]+|\d{4}\/\d{2}\/)["']/g)) archives.add('/' + match[1])
}
await Promise.all([...archives].map(async route => {
  try { pages.set(route, (await download(new URL(route.slice(1), base))).toString()); console.log('Archive ' + route) }
  catch (error) { failures.push({ url: route, error: error.message }) }
}))
for (const [route, html] of pages) discover(html, new URL(route.slice(1), base))
const runtimeUrl = new URL('wp-content/plugins/elementor/assets/js/webpack.runtime.min.js', base)
try {
  const runtime = await readFile(resolve(root, 'public', assetPath(runtimeUrl).slice(1)), 'utf8')
  for (const match of runtime.matchAll(/"([\w.-]+\.bundle\.min\.js)"/g)) asset(match[1], runtimeUrl)
} catch {}
// Resolve CSS imports, fonts, background images and relative image dependencies.
while ([...assets.values()].some(entry => !entry.done)) {
  const pending = [...assets.entries()].filter(([, entry]) => !entry.done).slice(0, 8)
  await Promise.all(pending.map(async ([local, entry]) => {
    entry.done = true
    try {
      let bytes
      if (!/\.css$/.test(local)) {
        try { bytes = await readFile(resolve(root, 'public', local.slice(1))) } catch {}
      }
      bytes ||= await download(entry.url)
      if (/webpack\.runtime\.min\.js$/.test(local)) {
        for (const match of bytes.toString().matchAll(/"([\w.-]+\.bundle\.min\.js)"/g)) asset(match[1], entry.url)
      }
      if (/\.css$/.test(local)) {
        let css = bytes.toString()
        discover(css, entry.url)
        css = css.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_, quote, value) => 'url("' + asset(value, entry.url) + '")')
          .replace(/@import\s+(["'])(.*?)\1/gi, (_, quote, value) => '@import "' + asset(value, entry.url) + '"')
        bytes = Buffer.from(css)
      }
      const destination = resolve(root, 'public', local.slice(1))
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, bytes)
    } catch (error) { failures.push({ url: entry.url, error: error.message }) }
  }))
  console.log(`Assets ${[...assets.values()].filter(entry => entry.done).length}/${assets.size}`)
}
function transform(html, route) {
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, script => {
    if (/contact-form-7|swv-js|wp-emoji|speculationrules|yoast-schema/.test(script)) return ''
    return script
  }).replace(/<link\b[^>]*\brel=["'](?:alternate|https:\/\/api\.w\.org\/|EditURI|shortlink|canonical|dns-prefetch)["'][^>]*>/gi, '')
  html = html.replace(/(?:src|href|data-src|poster)\s*=\s*(["'])(.*?)\1/gi, (match, quote, value) => {
    const local = asset(value, new URL(route.slice(1), base))
    return match.replace(value, local)
  }).replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_, quote, value) => 'url(' + asset(value, base) + ')')
  html = html.replace(/srcset\s*=\s*(["'])(.*?)\1/gi, (_, quote, value) => 'srcset=' + quote + value.split(',').map(candidate => {
    const [url, ...size] = candidate.trim().split(/\s+/)
    return [asset(url), ...size].join(' ')
  }).join(', ') + quote)
  // Configured runtime asset paths must also stay local.
  html = html.replaceAll('https:\\/\\/smartdata.tonytemplates.com\\/dricub-driving-school\\/wp-content\\/', '/dricub-assets/wp-content/')
    .replaceAll(base + 'wp-content/', '/dricub-assets/wp-content/')
    .replaceAll(base + 'wp-includes/', '/dricub-assets/wp-includes/')
    .replaceAll(base, '/')
    .replaceAll(base.slice(0, -1), '/')
    .replace(/((?:href|action)=["'])\/dricub-driving-school\//g, '$1/')
  // Replace only the business identity; retain the demo's layout and content.
  if (route === '/') html = html.replace('class="tt-layout-01"', 'id="ready" class="tt-layout-01 sms-ready"').replaceAll('src="/dricub-assets/wp-content/uploads/2017/10/tt-img-01.png" alt=""', 'src="/dricub-assets/sms-road-training.png" alt="SMS Driving School road training car"')
  html = html.replace(/(<img\b[^>]*\bsrc=["'])[^"']*\/(?:logo|footer-logo-1)\.jpg(["'][^>]*>)/gi, '$1/dricub-assets/sms-logo.svg$2')
    .replaceAll('DriCub', 'SMS').replaceAll('Dricub', 'SMS')
    .replaceAll('Safe Drive Driving School', 'SMS Driving School')
    .replaceAll('School of Driving', 'SMS Driving School')
    .replace(/<title>(.*?)<\/title>/i, (_, title) => '<title>' + title.replace(/Driving School/g, 'SMS Driving School') + '</title>')
    .replaceAll('alt="Logo Image"', 'alt="SMS Driving School"')
    .replace(/action=["'][^"']*["']/gi, 'action="/api/enquiries/"')
    .replace(/\snovalidate=["']novalidate["']/gi, '')
  return html.replace('</head>', '<link rel="stylesheet" href="/dricub-assets/sms-site.css"></head>')
    .replace('</body>', '<script src="/dricub-assets/sms-site.js" defer></script></body>')
}
await mkdir(pagesRoot, { recursive: true })
for (const [route, html] of pages) {
  const destination = resolve(pagesRoot, '.' + route, 'index.html')
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, transform(html, route))
}
await writeFile(resolve(root, 'theme/manifest.json'), JSON.stringify({ reference: base, routes: [...pages.keys()], assets: assets.size, failures }, null, 2) + '\n')
await customizeTheme()
console.log(JSON.stringify({ pages: pages.size, assets: assets.size, failures }, null, 2))
if (failures.length) process.exitCode = 1
