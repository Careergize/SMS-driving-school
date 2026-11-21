import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { updateBlog } from './update-blog.mjs'
import { updateAbout } from './update-about.mjs'

const root = resolve(import.meta.dirname, '..')
const palette = {
  fdc400: 'd32027',
  fde19a: 'f7b7ba',
  fdf59a: 'fde8e9',
  fbed50: 'f4a4a8',
  fbf069: 'f8c7ca',
}
async function recolor(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name)
    if (entry.isDirectory()) await recolor(file)
    else if (/\.(css|html)$/.test(entry.name)) {
      const before = await readFile(file, 'utf8')
      const after = before.replace(/#(fdc400|fde19a|fdf59a|fbed50|fbf069)\b/gi, (_, hex) => '#' + palette[hex.toLowerCase()])
        .replace(/rgba?\(\s*253\s*,\s*196\s*,\s*0\s*([,)])/gi, (_, ending) => 'rgb' + (ending === ',' ? 'a' : '') + '(211,32,39' + ending)
        .replaceAll('/dricub-assets/wp-content/uploads/2022/05/carObj-1.png', '/dricub-assets/sms-moving-car.png')
        .replaceAll('/dricub-assets/wp-content/uploads/2017/10/carObj-mobile.jpg', '/dricub-assets/sms-moving-car-mobile.png')
        .replace(/(?:id="pass-test"\s+)*class="tt-promo-02 road"/g, 'id="pass-test" class="tt-promo-02 road"')
        .replace(/<div class="tt-header-wrapper-top">[\s\S]*?<!-- end of top header-->/g, '')
        .replace(/<div class="tt-header-top-toggle">[\s\S]*?<\/div>/g, '')
        .replace(/(<div class="tt-footer-copyright">)([\s\S]*?)(<\/div>)/g, (_, start, content, end) => start + content.trim().replace(/\s*·?\s*Powered by Careergize LLP\.?/gi, '') + ' · Powered by Careergize LLP' + end)
        .replace(/(<footer\b[\s\S]*?<\/footer>)/g, footer => footer.includes('100054573483960') ? footer : footer.replace(/(<ul class="tt-social-icon">)/, '$1<li><a href="https://www.facebook.com/p/SMS-Driving-school-Trivandrum-100054573483960/" target="_blank" rel="noopener noreferrer" aria-label="SMS Motor Driving School on Facebook" title="Facebook"><i class="icon-facebook-logo" aria-hidden="true"></i></a></li>'))
        .replace(/(<header id="tt-header">[\s\S]*?<\/header>)/g, header => header.replaceAll('/dricub-assets/sms-logo.svg', '/dricub-assets/sms-navbar-logo-transparent.png').replaceAll('/dricub-assets/sms-navbar-logo.jpg', '/dricub-assets/sms-navbar-logo-transparent.png'))
      if (before !== after) await writeFile(file, after)
    }
  }
}
export async function customizeTheme() {
  await recolor(resolve(root, 'theme/pages'))
  await recolor(resolve(root, 'public/dricub-assets'))
  const logoPath = resolve(root, 'public/dricub-assets/sms-logo.svg')
  const logo = await readFile(logoPath, 'utf8')
  await writeFile(logoPath, logo.replaceAll('#ffe66a', '#ef6167').replaceAll('#fdc400', '#d32027').replaceAll('#fff3ac', '#fca9ad').replace('fill="#454545"', 'fill="#fff"'))
  const homePath = resolve(root, 'theme/pages/index.html')
  let home = await readFile(homePath, 'utf8')
  const heroSection = await readFile(resolve(root, 'theme/sections/hero.html'), 'utf8')
  home = home.replace(/<section\b(?=[^>]*\bdata-id="5c1d2a7")[^>]*>[\s\S]*?<\/section>/, heroSection)
    .replace(/<section id="sms-hero"[\s\S]*?<\/section>/, heroSection)
  const processSection = await readFile(resolve(root, 'theme/sections/process.html'), 'utf8')
  home = home.replace(/<section id="sms-process"[\s\S]*?<\/section>\s*/g, '')
  const hero = home.indexOf('id="sms-hero"')
  const insertion = home.indexOf('</section>', hero) + '</section>'.length
  if (hero < 0 || insertion < '</section>'.length) throw new Error('Could not locate the homepage hero')
  home = home.slice(0, insertion) + '\n' + processSection + home.slice(insertion)
  if (!home.includes('href="/dricub-assets/process/process.css"')) home = home.replace('</head>', '<link rel="stylesheet" href="/dricub-assets/process/process.css"></head>')
  if (!home.includes('href="/dricub-assets/hero/hero.css"')) home = home.replace('</head>', '<link rel="stylesheet" href="/dricub-assets/hero/hero.css"></head>')
  if (!home.includes('src="/dricub-assets/hero/hero.js"')) home = home.replace('</body>', '<script src="/dricub-assets/hero/hero.js" defer></script></body>')
  await writeFile(homePath, home)
  await updateBlog()
  await updateAbout()
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) await customizeTheme()
