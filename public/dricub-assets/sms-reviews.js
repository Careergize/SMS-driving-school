;(() => {
  const root = document.getElementById('sms-google-reviews')
  if (!root) return
  const status = document.getElementById('sms-reviews-status')
  const grid = document.getElementById('sms-reviews-grid')
  const summary = document.getElementById('sms-reviews-summary')
  const all = document.getElementById('sms-reviews-all')
  const attribution = document.getElementById('sms-reviews-attribution')
  const savedExcerpts = grid.innerHTML
  const justdialUrl = 'https://www.justdial.com/Thiruvananthapuram/SMS-Motor-Driving-School-Near-Canara-Bank-Pattoor-Pattoor/0471PX471-X471-170916114525-A3S1_BZDET/reviews'
  const showSavedExcerpts = () => {
    if (!savedExcerpts.trim()) return
    grid.innerHTML = savedExcerpts
    summary.replaceChildren()
    status.textContent = 'Selected Justdial review excerpts. Saved on 21 November 2026; not a live feed.'
    all.href = justdialUrl
    all.textContent = 'Read reviews on Justdial'
    attribution.replaceChildren(link('Source: Justdial', justdialUrl, 'sms-review-original'))
  }
  const previous = document.getElementById('sms-reviews-prev')
  const next = document.getElementById('sms-reviews-next')
  const updateControls = () => {
    if (previous) previous.disabled = grid.scrollLeft <= 2
    if (next) next.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 2
  }
  const move = direction => grid.scrollBy({ left: direction * ((grid.firstElementChild?.getBoundingClientRect().width || grid.clientWidth) + 24), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  previous?.addEventListener('click', () => move(-1))
  next?.addEventListener('click', () => move(1))
  grid.addEventListener('scroll', updateControls, { passive: true })
  window.addEventListener('resize', updateControls)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let paused = reducedMotion.matches
  let hovering = false
  let touching = false
  const playback = document.createElement('button')
  playback.type = 'button'
  playback.className = 'sms-reviews-playback'
  const updatePlayback = () => {
    playback.textContent = paused ? 'Play' : 'Pause'
    playback.setAttribute('aria-label', paused ? 'Start automatic review scrolling' : 'Pause automatic review scrolling')
  }
  updatePlayback()
  next?.parentElement.append(playback)
  playback.addEventListener('click', () => { paused = !paused; updatePlayback() })
  root.addEventListener('mouseenter', () => { hovering = true })
  root.addEventListener('mouseleave', () => { hovering = false })
  root.addEventListener('pointerdown', () => { touching = true })
  window.addEventListener('pointerup', () => { touching = false })
  window.addEventListener('pointercancel', () => { touching = false })
  reducedMotion.addEventListener('change', event => { paused = event.matches; updatePlayback() })
  const autoplay = setInterval(() => {
    if (paused || hovering || touching || document.hidden || root.contains(document.activeElement) || root.getAttribute('aria-busy') === 'true') return
    const bounds = root.getBoundingClientRect()
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || grid.scrollWidth <= grid.clientWidth + 2) return
    if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 2) grid.scrollTo({ left: 0, behavior: 'smooth' })
    else move(1)
  }, 4500)
  window.addEventListener('pagehide', () => clearInterval(autoplay), { once: true })
  let controller
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '' } catch { return '' } }
  const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node }
  const link = (text, href, className) => { const node = element('a', className, text); node.href = safeUrl(href) || all.href; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node }
  async function loadReviews() {
    controller?.abort()
    const current = controller = new AbortController()
    const timeout = setTimeout(() => current.abort(), 10000)
    grid.replaceChildren(); summary.replaceChildren(); attribution.replaceChildren()
    grid.scrollLeft = 0
    updateControls()
    all.href = 'https://www.google.com/search?q=' + encodeURIComponent('SMS Motor Driving School Vanchiyoor reviews')
    status.textContent = 'Loading reviews from Google…'
    root.setAttribute('aria-busy', 'true')
    try {
      const response = await fetch('/api/google-reviews/', { signal: current.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('Reviews unavailable')
      const data = await response.json()
      if (current !== controller) return
      if (!data.available) { showSavedExcerpts(); return }
      all.href = safeUrl(data.mapsUrl) || all.href
      if (Number.isFinite(data.rating)) summary.append(element('strong', 'sms-reviews-score', `${data.rating.toFixed(1)} / 5`))
      if (Number.isFinite(data.count)) summary.append(element('span', '', `${new Intl.NumberFormat('en-IN').format(data.count)} Google reviews`))
      const reviews = Array.isArray(data.reviews) ? data.reviews : []
      if (!reviews.length && savedExcerpts.trim()) { showSavedExcerpts(); return }
      all.textContent = 'Read reviews on Google'
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
      if (current === controller) showSavedExcerpts()
    } finally {
      clearTimeout(timeout)
      if (current === controller) root.setAttribute('aria-busy', 'false')
      requestAnimationFrame(updateControls)
    }
  }
  // Load once as the visitor approaches this section, instead of requesting on every page visit.
  if (savedExcerpts.trim()) { showSavedExcerpts(); requestAnimationFrame(updateControls) }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadReviews() } }, { rootMargin: '200px' })
    observer.observe(root)
  } else loadReviews()
})();
