;(() => {
  const root = document.getElementById('sms-google-reviews')
  if (!root) return
  const selector = document.getElementById('sms-reviews-branch')
  const status = document.getElementById('sms-reviews-status')
  const grid = document.getElementById('sms-reviews-grid')
  const summary = document.getElementById('sms-reviews-summary')
  const all = document.getElementById('sms-reviews-all')
  const attribution = document.getElementById('sms-reviews-attribution')
  let controller
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '' } catch { return '' } }
  const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node }
  const link = (text, href, className) => { const node = element('a', className, text); node.href = safeUrl(href) || all.href; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node }
  async function loadReviews() {
    controller?.abort()
    const current = controller = new AbortController()
    const timeout = setTimeout(() => current.abort(), 10000)
    grid.replaceChildren(); summary.replaceChildren(); attribution.replaceChildren()
    all.href = 'https://www.google.com/search?q=' + encodeURIComponent('SMS Motor Driving School ' + selector.options[selector.selectedIndex].text + ' reviews')
    status.textContent = 'Loading reviews from Google…'
    root.setAttribute('aria-busy', 'true')
    try {
      const response = await fetch('/api/google-reviews/?branch=' + encodeURIComponent(selector.value), { signal: current.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('Reviews unavailable')
      const data = await response.json()
      if (current !== controller) return
      if (!data.available) { status.textContent = 'Read what our learners say on Google. Reviews are available through the link below.'; return }
      all.href = safeUrl(data.mapsUrl) || all.href
      if (Number.isFinite(data.rating)) summary.append(element('strong', 'sms-reviews-score', `${data.rating.toFixed(1)} / 5`))
      if (Number.isFinite(data.count)) summary.append(element('span', '', `${new Intl.NumberFormat('en-IN').format(data.count)} Google reviews`))
      const reviews = Array.isArray(data.reviews) ? data.reviews : []
      status.textContent = reviews.length ? 'A selection of reviews from Google, sorted by relevance.' : 'There are no reviews to display for this branch yet.'
      reviews.forEach(review => {
        const card = element('article', 'sms-review-card')
        const header = element('div', 'sms-review-author')
        if (safeUrl(review.photo)) { const photo = element('img'); photo.src = safeUrl(review.photo); photo.alt = ''; photo.width = 40; photo.height = 40; photo.loading = 'lazy'; photo.referrerPolicy = 'no-referrer'; header.append(photo) }
        const byline = element('div')
        byline.append(link(review.author || 'Google user', review.authorUrl, 'sms-review-name'), element('span', 'sms-review-time', review.relativeTime || ''))
        header.append(byline); card.append(header)
        if (Number.isFinite(review.rating)) { const stars = element('p', 'sms-review-stars', '★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))); stars.setAttribute('aria-label', `${review.rating} out of 5 stars`); card.append(stars) }
        if (review.text) card.append(element('p', 'sms-review-text', review.text))
        if (review.translated) card.append(element('p', 'sms-review-translation', 'Translated by Google'))
        card.append(link('View original review on Google', review.url, 'sms-review-original'))
        grid.append(card)
      })
      attribution.append(element('span', 'sms-google-attribution', 'Google Maps'))
      attribution.firstChild.setAttribute('translate', 'no')
      for (const item of data.attributions || []) if (item.provider) attribution.append(link(item.provider, item.providerUri, 'sms-review-original'))
      attribution.append(link('How Google reviews work', 'https://support.google.com/contributionpolicy/answer/7400114', 'sms-review-original'))
    } catch {
      if (current === controller) status.textContent = 'Google reviews could not be loaded right now. You can still read them directly on Google.'
    } finally {
      clearTimeout(timeout)
      if (current === controller) root.setAttribute('aria-busy', 'false')
    }
  }
  selector.addEventListener('change', loadReviews)
  // Load once as the visitor approaches this section, instead of requesting on every page visit.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadReviews() } }, { rootMargin: '200px' })
    observer.observe(root)
  } else loadReviews()
})();
