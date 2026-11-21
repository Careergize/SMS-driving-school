import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function updateTestimonials() {
  const path = resolve(import.meta.dirname, '../theme/pages/index.html')
  let html = await readFile(path, 'utf8')
  html = html.replace(/<label class="sms-branch-label">Google reviews for<select id="sms-reviews-branch"[\s\S]*?<\/select><\/label>/g, '')
  if (html.includes('id="sms-testimonials"')) {
    await writeFile(path, html)
    return
  }
  const review = html.match(/<section id="sms-google-reviews"[\s\S]*?<\/section>/)?.[0]
  if (!review) throw new Error('Google reviews section missing')
  html = html.replace(review, '')
  const widget = review.replace('<h3 id="sms-reviews-title">Their experience.<br>Your next step.</h3>', '<h2 id="sms-reviews-title">What our learners say</h2><p class="sms-testimonial-intro">Every journey starts with a first lesson. Hear from the people who started theirs with SMS.</p>')
    .replace('<a id="sms-reviews-all"', '<div class="sms-testimonial-controls" aria-label="Testimonial slider controls"><button type="button" id="sms-reviews-prev" aria-label="Previous review" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg></button><button type="button" id="sms-reviews-next" aria-label="Next review" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6M4 12h12"/></svg></button></div><a id="sms-reviews-all"')
  const marker = '<section class="elementor-section elementor-top-section elementor-element elementor-element-4bfed85'
  if (!html.includes(marker)) throw new Error('Training banner missing')
  html = html.replace(marker, '<section id="sms-testimonials" class="sms-testimonials" aria-labelledby="sms-reviews-title"><div class="sms-testimonial-inner">' + widget + '</div></section>\n' + marker)
  await writeFile(path, html)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await updateTestimonials()
