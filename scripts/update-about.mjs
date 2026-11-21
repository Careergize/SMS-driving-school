import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function updateAbout() {
  const path = resolve(import.meta.dirname, '../theme/pages/about/index.html')
  let html = await readFile(path, 'utf8')
  const start = html.indexOf('</header>') + '</header>'.length
  const end = html.indexOf('<footer', start)
  if (start < '</header>'.length || end < start) throw new Error('About page layout boundaries missing')
  const content = '\n<main id="page-main" class="page-main"><section aria-labelledby="about-title" style="min-height:50vh;display:flex;align-items:center;justify-content:center;padding:80px 24px;text-align:center;background:#fff"><div><p style="color:#b31c2e;font-size:16px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">About us</p><h1 id="about-title" style="font-size:clamp(40px,7vw,72px);line-height:1.1;margin:16px 0 32px">Coming soon</h1><a class="btn" href="/">Back to home</a></div></section></main>\n'
  html = html.slice(0, start) + content + html.slice(end)
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>About — Coming Soon | SMS Motor Driving School</title>')
    .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="About — Coming Soon | SMS Motor Driving School" />')
  await writeFile(path, html)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await updateAbout()
