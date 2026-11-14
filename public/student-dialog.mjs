const dialog = document.querySelector('.student-dialog')
const close = dialog.querySelector('[data-close-student-dialog]')
dialog.addEventListener('cancel', event => {
  event.preventDefault()
  window.location.assign(close.href)
})
dialog.showModal()
