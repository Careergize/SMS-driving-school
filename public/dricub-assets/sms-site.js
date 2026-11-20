/* Keep the original theme widgets; submit the demo's forms to the SMS backend. */
(() => {
  let activeModal = null
  let modalTrigger = null
  const closeModal = () => {
    if (!activeModal) return
    activeModal.classList.remove('in', 'show')
    activeModal.style.display = 'none'
    activeModal.setAttribute('aria-hidden', 'true')
    activeModal.removeAttribute('aria-modal')
    document.querySelector('.sms-modal-backdrop')?.remove()
    document.body.classList.remove('modal-open')
    activeModal = null
    modalTrigger?.focus()
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-toggle="modal"]')
    if (trigger) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const target = trigger.getAttribute('data-target')
      const modal = (target?.startsWith('#') && document.getElementById(target.slice(1))) || document.getElementById('ModalOrderPackage01')
      if (!modal) return
      closeModal()
      modalTrigger = trigger
      activeModal = modal
      document.body.append(modal)
      const backdrop = document.createElement('div')
      backdrop.className = 'modal-backdrop fade in show sms-modal-backdrop'
      document.body.append(backdrop)
      document.body.classList.add('modal-open')
      modal.style.display = 'block'
      modal.classList.add('in', 'show')
      modal.setAttribute('aria-hidden', 'false')
      modal.setAttribute('aria-modal', 'true')
      const title = modal.querySelector('h6')
      if (title) modal.setAttribute('aria-label', title.textContent.trim())
      modal.querySelector('.close')?.setAttribute('aria-label', 'Close dialog')
      modal.querySelector('.close')?.removeAttribute('aria-hidden')
      modal.querySelector('input:not([type="hidden"]), button, select')?.focus()
    } else if (activeModal && (event.target.closest('[data-dismiss="modal"]') || event.target === activeModal || event.target.classList.contains('sms-modal-backdrop'))) {
      event.preventDefault()
      event.stopImmediatePropagation()
      closeModal()
    }
  }, true)
  document.addEventListener('keydown', event => {
    if (!activeModal) return
    if (event.key === 'Escape') { event.preventDefault(); closeModal() }
    if (event.key === 'Tab') {
      const controls = [...activeModal.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  })
  const aliases = {
    name: ['your-name', 'your-first-name', 'first-name', 'name', 'author'],
    phone: ['your-phone', 'your-tel', 'phone', 'day-phone'],
    email: ['your-email', 'email'],
    message: ['your-message', 'message', 'comment'],
    programme: ['menu-280', 'your-program', 'programme'],
  }
  document.querySelectorAll('form.wpcf7-form, form#commentform').forEach(form => {
    const status = document.createElement('p')
    status.className = 'sms-form-status'
    status.setAttribute('role', 'status')
    form.append(status)
    form.querySelectorAll('[aria-required="true"]').forEach(field => { field.required = true })
    form.querySelectorAll('input, select, textarea').forEach(field => {
      if (!field.getAttribute('aria-label') && !field.id && field.placeholder) field.setAttribute('aria-label', field.placeholder.replace(/\*|\.\.\./g, '').trim())
    })
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (!form.reportValidity()) return
      const fields = new FormData(form)
      const get = names => names.map(name => String(fields.get(name) || '').trim()).find(Boolean) || ''
      const payload = Object.fromEntries(Object.entries(aliases).map(([name, names]) => [name, get(names)]))
      payload.programme ||= form.closest('.modal')?.querySelector('h6')?.textContent.trim() || 'General enquiry'
      if (!payload.name || !payload.phone) {
        status.textContent = 'Please enter your name and phone number.'
        status.dataset.error = 'true'
        return
      }
      const submit = form.querySelector('[type="submit"]')
      if (submit) submit.disabled = true
      status.textContent = 'Sending…'
      delete status.dataset.error
      try {
        const response = await fetch('/api/enquiries/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!response.ok) throw new Error('Enquiry delivery unavailable')
        status.textContent = 'Thank you! SMS Driving School has received your enquiry.'
        status.dataset.error = 'false'
        form.reset()
      } catch {
        status.textContent = 'Your enquiry could not be sent. Please try again, or download it to share with the school.'
        status.dataset.error = 'true'
        let download = form.querySelector('.sms-download')
        if (!download) { download = document.createElement('a'); download.className = 'sms-download'; download.textContent = 'Download enquiry'; form.append(download) }
        if (download.dataset.objectUrl) URL.revokeObjectURL(download.dataset.objectUrl)
        const url = URL.createObjectURL(new Blob(['Enquiry for SMS Driving School\n\n' + Object.entries(payload).map(([key, value]) => key + ': ' + value).join('\n')], { type: 'text/plain' }))
        download.href = url
        download.download = 'sms-driving-school-enquiry.txt'
        download.dataset.objectUrl = url
      } finally { if (submit) submit.disabled = false }
    })
  })
  // Search stays on the local blog and filters the imported article cards.
  document.querySelectorAll('form[role="search"], form.search-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault()
      const input = form.querySelector('input[type="search"], input[name="s"]')
      location.href = '/blog/?q=' + encodeURIComponent(input?.value || '')
    })
  })
  const query = new URLSearchParams(location.search).get('q')?.toLowerCase()
  if (query) document.querySelectorAll('.tt-post').forEach(post => { post.hidden = !post.textContent.toLowerCase().includes(query) })
})();

/* Play the program entrance once when the section reaches the viewport. */
(() => {
 const section = document.getElementById('our-programs');
 if (!section || !('IntersectionObserver' in window)) return;
 const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { section.classList.add('is-ready'); observer.disconnect(); }
 }, { threshold: .12 });
 observer.observe(section);
})();
