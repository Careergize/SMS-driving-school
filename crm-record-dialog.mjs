import { escapeHtml } from './backend-api.mjs'

export function recordFields(record) {
  const input = (label, name, attributes = '') =>
    `<label>${label}<input name="${name}" ${attributes} value="${escapeHtml(record[name] ?? '')}"></label>`
  const select = (label, name, options, required = false) =>
    `<label>${label}<select name="${name}"${required ? ' required' : ''}>${options.map(([value, text]) =>
      `<option value="${escapeHtml(value)}"${String(record[name] ?? '') === String(value) ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`
  return { input, select }
}

export function recordDialog(title, list, content, issue) {
  return `<dialog class="student-dialog" aria-labelledby="student-dialog-title">
    <div class="student-dialog-header"><h2 id="student-dialog-title">${title}</h2>
      <a class="student-action" href="${list}" data-close-student-dialog autofocus>Close</a></div>
    ${issue ? `<p class="error" role="alert">${escapeHtml(issue.message)}</p>` : ''}
    ${content}
  </dialog><script type="module" src="/student-dialog.mjs"></script>`
}
