import { readFile } from 'node:fs/promises'

export async function registrationPage(appHtml) {
  let html = await readFile(new URL('./theme/pages/index.html', import.meta.url), 'utf8')
  const start = html.indexOf('</header>') + '</header>'.length
  const end = html.indexOf('<footer', start)
  if (start < '</header>'.length || end < start) throw new Error('Shared site layout missing')
  html = html.slice(0, start) + '<div id="page-main"><div id="root"></div></div>' + html.slice(end)
  const styles = [...appHtml.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(match => match[0]).join('')
  const modules = [...appHtml.matchAll(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g)].map(match => match[0]).join('')
  html = html.replace('<head>', '<head>' + styles)
    .replace('</head>', '<meta name="sms-local-api" content="enabled"></head>')
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Student registration | SMS Motor Driving School</title>')
    .replace('</body>', modules + '</body>')
  return html
}
