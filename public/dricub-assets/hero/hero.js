(() => {
  const hero = document.getElementById('sms-hero')
  if (!hero) return
  const courses = [
    { id: 'manual', word: 'DRIVE', color: '#b31c2e', size: 345 },
    { id: 'automatic', word: 'EFFORTLESS', color: '#273344', size: 198 },
    { id: 'two-wheeler', word: 'FREEDOM', color: '#285a61', size: 265 },
    { id: 'refresher', word: 'CONFIDENT', color: '#702938', size: 225 },
  ]
  const sceneRoot = hero.querySelector('.sms-hero-scenes')
  const syncNavbar = index => document.documentElement.style.setProperty('--sms-nav-bg', courses[index].color)
  syncNavbar(0)
  const tabs = [...hero.querySelectorAll('[data-course]')]
  const underline = hero.querySelector('.sms-hero-underline')
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const times = [0,.031,.134,.206,.278,.34,.412,.485,.546,.583,.62,.69,.79,.85,.93,1]
  const coverage = [0,.006,.012,.023,.047,.07,.105,.158,.246,.55,.825,.9,.94,.956,.975,1]
  let current = 0, busy = false, paused = false, lastInteraction = -Infinity, frameId, pointerStart, unit = 1
  const factors = [.4, .3, .15, .55, .75]
  const crop = item => ({ x: item === 1 || item === 3 ? '100%' : '0%', y: item >= 2 ? '100%' : '0%' })
  const sprite = (item, x, y, size, rotation = 0, extra = '') => {
    const position = crop(item)
    return `<div class="sms-hero-sprite ${item ? 'sms-hero-prop' : 'sms-hero-vehicle'} ${extra}" style="--x:${x};--y:${y};--size:${size};--rotation:${rotation}deg;--crop-x:${position.x};--crop-y:${position.y};--delay:${-item}s"><span></span></div>`
  }
  const scenes = courses.map((course, index) => {
    const scene = document.createElement('div')
    scene.className = 'sms-hero-scene' + (index === 0 ? ' is-current' : '')
    scene.style.setProperty('--bg', course.color)
    scene.style.setProperty('--sheet', `url('/dricub-assets/hero/${course.id}.png')`)
    scene.innerHTML = `<div class="sms-hero-frame"><div class="sms-hero-layer"><span class="sms-hero-word" ${course.word.length > 6 ? 'data-long' : ''} style="--word-size:${course.size}">${course.word}</span></div><div class="sms-hero-layer"><span class="sms-hero-ground"></span></div><div class="sms-hero-layer">${sprite(0, 270, 20, 900)}</div><div class="sms-hero-layer">${sprite(2, 150, 180, 150, -12)}${sprite(1, 1140, 195, 170, 14)}${sprite(3, 1130, 565, 160, -12)}</div><div class="sms-hero-layer">${sprite(1, -100, 610, 360, -18, 'sms-hero-corner')}${sprite(2, 1260, -70, 300, 18, 'sms-hero-corner')}</div></div>`
    sceneRoot.append(scene)
    return scene
  })
  // Preload every sprite sheet so a transition never reveals an empty vehicle.
  courses.forEach(course => { const img = new Image(); img.src = `/dricub-assets/hero/${course.id}.png` })
  function updateTabs(index) {
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === index)))
    const tab = tabs[index]
    underline.style.width = tab.offsetWidth + 'px'
    underline.style.transform = `translateX(${tab.offsetLeft}px)`
    hero.querySelector('.sms-hero-pagination').textContent = `0${index + 1} / 04`
  }
  function layout() {
    const width = document.documentElement.clientWidth
    const headerHeight = document.getElementById('tt-header')?.getBoundingClientRect().height || 140
    const height = Math.max(width <= 540 ? 570 : 540, Math.min(900, innerHeight - headerHeight))
    hero.style.width = width + 'px'
    hero.style.marginLeft = -width / 2 + 'px'
    hero.style.height = height + 'px'
    unit = width <= 900 ? Math.min(width / 950, (height - 140) / 900) : Math.min(width / 1440, height / 900)
    hero.style.setProperty('--hero-unit', unit + 'px')
    scenes.forEach((scene, index) => {
      const word = scene.querySelector('.sms-hero-word')
      word.style.setProperty('--word-size', courses[index].size)
      const renderedWidth = word.getBoundingClientRect().width
      if (renderedWidth > width * .94) word.style.setProperty('--word-size', courses[index].size * width * .94 / renderedWidth)
    })
    updateTabs(current)
  }
  function sample(t) {
    const i = Math.max(0, times.findIndex(value => value >= t) - 1)
    if (t >= 1) return 1
    return coverage[i] + (coverage[i + 1] - coverage[i]) * ((t - times[i]) / (times[i + 1] - times[i]))
  }
  function change(index, direction = 1, manual = true) {
    if (manual) lastInteraction = performance.now()
    index = (index + courses.length) % courses.length
    if (busy || index === current) return
    const previous = scenes[current], next = scenes[index]
    const oldLayers = [...previous.querySelectorAll('.sms-hero-layer')], newLayers = [...next.querySelectorAll('.sms-hero-layer')]
    busy = true
    previous.style.zIndex = 2
    next.style.zIndex = 1
    next.classList.add('is-current')
    updateTabs(index)
    syncNavbar(index)
    const start = performance.now()
    const complete = () => {
      previous.classList.remove('is-current')
      previous.style.clipPath = ''
      previous.style.zIndex = ''
      next.style.zIndex = ''
      oldLayers.concat(newLayers).forEach(layer => { layer.style.transform = '' })
      current = index
      busy = false
      hero.style.setProperty('--scene-bg', courses[index].color)
      hero.querySelector('.sms-hero-status').textContent = `${tabs[index].textContent} driving course, slide ${index + 1} of 4`
    }
    if (reduceMotion.matches) { complete(); return }
    function animate(now) {
      const t = Math.min((now - start) / 970, 1), c = sample(t)
      previous.style.clipPath = direction > 0 ? `inset(0 ${c * 100}% 0 0)` : `inset(0 0 0 ${c * 100}%)`
      oldLayers.forEach(layer => { layer.style.transform = `translateX(${-direction * c * .14 * 1440 * unit}px)` })
      const p = Math.max(0, Math.min(1, (t - .5) / .42)), k = 1 - (1 - p) ** 2
      newLayers.forEach((layer, i) => { layer.style.transform = `translateX(${direction * (1 - k) * factors[i] * 1440 * unit}px)` })
      if (t < 1) frameId = requestAnimationFrame(animate)
      else complete()
    }
    frameId = requestAnimationFrame(animate)
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => change(i, i > current ? 1 : -1)))
  hero.querySelector('.sms-hero-next').addEventListener('click', () => change(current + 1, 1))
  hero.querySelector('.sms-hero-prev').addEventListener('click', () => change(current - 1, -1))
  hero.querySelector('.sms-hero-pause').addEventListener('click', event => {
    paused = !paused
    hero.classList.toggle('is-paused', paused)
    event.currentTarget.textContent = paused ? 'Play' : 'Pause'
    event.currentTarget.setAttribute('aria-pressed', String(paused))
    event.currentTarget.setAttribute('aria-label', paused ? 'Play slide animation' : 'Pause slide animation')
    lastInteraction = performance.now()
  })
  hero.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); change(current + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 1 : -1) }
  })
  hero.addEventListener('pointerdown', event => { if (!event.target.closest('button,a')) pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId } })
  window.addEventListener('pointerup', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y
    pointerStart = null
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) change(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
  })
  hero.addEventListener('pointercancel', () => { pointerStart = null })
  hero.addEventListener('focusin', () => { lastInteraction = performance.now() })
  let inView = true
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { inView = entry.isIntersecting }).observe(hero)
  setInterval(() => { if (!paused && inView && !document.hidden && performance.now() - lastInteraction > 6000) change(current + 1, 1, false) }, 4600)
  addEventListener('resize', layout)
  document.fonts.ready.then(layout)
  layout()
  if (!reduceMotion.matches) scenes[0].querySelectorAll('.sms-hero-layer').forEach((layer, i) => {
    layer.animate([{ transform: `translateX(${factors[i] * 1440 * unit}px)` }, { transform: 'translateX(0)' }], { duration: 900, easing: 'cubic-bezier(.22,.8,.3,1)' })
  })
})()
