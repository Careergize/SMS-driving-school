const panel = document.querySelector('.assistant-widget')
const transcript = panel.querySelector('.assistant-transcript')
const launcher = panel.querySelector('summary')
const input = panel.querySelector('#assistant-question')
let pending = false

function scrollToLatest() {
  const latest = transcript.querySelector('[role="alert"]') ?? transcript.querySelector('.assistant-turn:last-of-type')
  if (latest) transcript.scrollTop += latest.getBoundingClientRect().top - transcript.getBoundingClientRect().top
}

panel.addEventListener('toggle', () => {
  if (panel.open) scrollToLatest()
})

panel.querySelector('.assistant-close').addEventListener('click', () => {
  panel.open = false
  launcher.focus()
})

panel.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.open) {
    event.preventDefault()
    panel.open = false
    launcher.focus()
  }
})

panel.addEventListener('submit', async event => {
  event.preventDefault()
  if (pending) return
  const form = event.target
  const data = new URLSearchParams(new FormData(form, event.submitter))
  const feedback = panel.querySelector('.assistant-feedback')
  const buttons = panel.querySelectorAll('button[type="submit"]')
  pending = true
  buttons.forEach(button => { button.disabled = true })
  feedback.textContent = 'Maya is checking…'
  transcript.setAttribute('aria-busy', 'true')
  try {
    const response = await fetch(form.action, {
      method: 'POST', body: data, headers: { 'X-Assistant-Panel': '1' },
    })
    if (response.redirected) {
      window.location.assign(response.url)
      return
    }
    if (![200, 400, 503].includes(response.status)) throw new Error()
    transcript.innerHTML = await response.text()
    scrollToLatest()
    if (response.ok && form.contains(input)) input.value = ''
  } catch {
    feedback.textContent = 'Could not reach Maya. Try again.'
    return
  } finally {
    pending = false
    buttons.forEach(button => { button.disabled = false })
    transcript.setAttribute('aria-busy', 'false')
    if (feedback.textContent === 'Maya is checking…') feedback.textContent = ''
    if (panel.open) input.focus({ preventScroll: true })
  }
})
