import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
export async function updateBlog() {
  async function linkPages(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await linkPages(path)
      else if (entry.name.endsWith('.html')) {
        const before = await readFile(path, 'utf8')
        const after = before.replace(/<header id="tt-header">[\s\S]*?<\/header>/g, header => header.includes('href="/blog/"') ? header : header.replace(/(<li id="nav-menu-item-23")/, '<li class="main-menu-item menu-item"><a href="/blog/" class="menu-link main-menu-link"><span data-hover="Blog">Blog</span></a></li>\n$1'))
          .replace(/(<ul id="menu-information"[^>]*>)/g, '$1<li><a href="/blog/">Blog</a></li>')
          .replace(/(<li><a href="\/blog\/">Blog<\/a><\/li>)(?:\1)+/g, '$1')
        if (after !== before) await writeFile(path, after)
      }
    }
  }
  await linkPages(resolve(root, 'theme/pages'))
  const path = resolve(root, 'theme/pages/blog/index.html')
  let html = await readFile(path, 'utf8')
  const content = await readFile(resolve(root, 'theme/sections/blog.html'), 'utf8')
  if (!html.includes('/dricub-assets/sms-blog.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/dricub-assets/sms-blog.css"></head>')
  const start = html.indexOf('</header>') + '</header>'.length
  const end = html.indexOf('<footer', start)
  if (start < '</header>'.length || end < start) throw new Error('Blog layout boundaries missing')
  html = html.slice(0, start) + content + html.slice(end)
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>Blog &amp; Videos | SMS Motor Driving School</title>')
    .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="Blog &amp; Videos | SMS Motor Driving School" />')
  await writeFile(path, html)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await updateBlog()
