import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, basename } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const base = 'https://st.ourhtmldemo.com/new/Udrive/'
const assetDirectory = resolve(root, 'public/dricub-assets/process')
await mkdir(assetDirectory, { recursive: true })
const html = await readFile(resolve(root, 'udrive-reference.html'), 'utf8')
const originalCss = await readFile(resolve(root, 'udrive-reference.css'), 'utf8')
let section = html.match(/<section class="process-section">[\s\S]*?<\/section>/)[0]
const resources = [...new Set([...section.matchAll(/assets\/images\/[\w/.-]+/g)].map(match => match[0]))]
await Promise.all(resources.map(async resource => {
  const response = await fetch(new URL(resource, base))
  if (!response.ok) throw new Error('Asset unavailable: ' + resource)
  await writeFile(resolve(assetDirectory, basename(resource)), Buffer.from(await response.arrayBuffer()))
}))
section = section.replace('<section class="process-section">', '<section id="sms-process" class="process-section" aria-labelledby="process-title">')
  .replace('https://www.youtube.com/watch?v=nfP5N9Yc72A&amp;t=28s', 'https://www.youtube.com/watch?v=QmIgOqrwG80')
  .replaceAll('assets/images/shape/', '/dricub-assets/process/').replaceAll('assets/images/resource/', '/dricub-assets/process/').replaceAll('assets/images/icons/', '/dricub-assets/process/')
  .replace('<h2>Start the process</h2>', '<h2 id="process-title">Start the process</h2>')
  .replaceAll('href="index.html"', 'href="#" data-toggle="modal" data-target="#ModalOrderPackage01"')
  .replace('class="lightbox-image" data-caption=""', 'class="lightbox-image" target="_blank" rel="noopener noreferrer" aria-label="Watch the driving lesson video"')
  .replace('<i class="flaticon-play-button-1"></i>', '<span class="sms-play-icon" aria-hidden="true"></span>')
  .replace('<i class="flaticon-right-arrow-1"></i>', '')
  .replaceAll('class="count-text"', 'class="count-text" aria-hidden="true"')
  .replace('src="/dricub-assets/process/video-1.jpg" alt=""', 'src="/dricub-assets/process/video-1.jpg" alt="A learner practising driving with an instructor" loading="lazy" width="540" height="220"')
await mkdir(resolve(root, 'theme/sections'), { recursive: true })
await writeFile(resolve(root, 'theme/sections/process.html'), section + '\n')
let css = originalCss.slice(originalCss.indexOf('.process-section{'), originalCss.indexOf('/** pricing-section **/'))
css = css.replaceAll('.process-section', '#sms-process')
await writeFile(resolve(assetDirectory, 'original-layout.css'), css)
// Bundle the exact section fonts locally, with no external font dependency.
const fontResponse = await fetch('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap')
if (!fontResponse.ok) throw new Error('Could not retrieve section fonts')
let fontCss = await fontResponse.text()
for (const [index, url] of [...new Set([...fontCss.matchAll(/url\((https:[^)]+)\)/g)].map(match => match[1]))].entries()) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Font unavailable')
  const name = 'font-' + index + (url.includes('.woff2') ? '.woff2' : '.ttf')
  await writeFile(resolve(assetDirectory, name), Buffer.from(await response.arrayBuffer()))
  fontCss = fontCss.replaceAll(url, '/dricub-assets/process/' + name)
}
await writeFile(resolve(assetDirectory, 'fonts.css'), fontCss)
console.log('Imported process section with ' + resources.length + ' local images and local fonts.')
