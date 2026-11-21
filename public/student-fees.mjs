const dialog = document.getElementById('student-fee-dialog')
const trigger = document.querySelector('[data-fee-open]')
if (dialog && trigger) {
  trigger.addEventListener('click', () => dialog.showModal())
  dialog.querySelector('[data-fee-close]').addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close() } })
  dialog.addEventListener('close', () => trigger.focus())
  const form = dialog.querySelector('form')
  const upload = form.querySelector('[type="file"]')
  upload.addEventListener('change', () => {
    const file = upload.files[0]
    upload.setCustomValidity(file && (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg'].includes(file.type)) ? 'Choose a PNG or JPEG screenshot up to 5 MB.' : '')
  })
  form.addEventListener('submit', () => { form.querySelector('[type="submit"]').disabled = true })
}
