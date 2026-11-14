import { escapeHtml } from './backend-api.mjs'
import { recordDialog, recordFields } from './crm-record-dialog.mjs'

export const instructorStatuses = { active: 'Active', 'on-leave': 'On leave', inactive: 'Inactive' }
const fields = ['code', 'name', 'mobile', 'email', 'address', 'branch', 'experience_years', 'licence_number', 'licence_valid_until', 'joined_on', 'status']

export function instructorListUrl(filters) {
  const params = new URLSearchParams({ tab: 'instructors' })
  if (filters.get('branch')) params.set('branch', filters.get('branch'))
  return '/dashboard?' + params
}

export function instructorAction(filters) {
  const id = filters.get('instructor')
  const action = filters.get('action')
  if (action === 'add') return { action }
  if (/^[1-9][0-9]{0,17}$/.test(id ?? '') && ['edit', 'delete'].includes(action)) return { id, action }
  return null
}

export function readInstructorFields(form) {
  return Object.fromEntries(fields.filter(field => form.has(field)).map(field => [field, form.get(field)]))
}

function renderForm(record, branches, url, creating) {
  const { input, select } = recordFields(record)
  return `<form method="post" action="${url}" class="student-edit">
    <div class="student-edit-fields">
      ${input('Instructor ID', 'code', creating ? 'maxlength="32"' : 'required maxlength="32"')}
      ${input('Full name', 'name', 'required maxlength="120"')}
      ${input('Mobile number', 'mobile', 'type="tel" required maxlength="32"')}
      ${input('Email', 'email', 'type="email" required maxlength="254"')}
      <label>Address<textarea name="address" rows="2" required>${escapeHtml(record.address ?? '')}</textarea></label>
      ${select('Branch', 'branch', [['', 'Choose a branch'], ...branches.map(branch => [branch.id, branch.label])], true)}
      ${input('Years of experience', 'experience_years', 'type="number" required min="0" max="32767"')}
      ${input('Driving licence number', 'licence_number', 'required maxlength="40"')}
      ${input('Licence valid until', 'licence_valid_until', 'type="date" required')}
      ${input('Joining date', 'joined_on', 'type="date" required')}
      ${select('Employment status', 'status', Object.entries(instructorStatuses))}
    </div>
    ${creating ? '<p class="student-form-note">Leave Instructor ID blank to generate one automatically.</p>' : ''}
    <button type="submit">${creating ? 'Add instructor' : 'Save changes'}</button>
  </form>`
}

export async function renderInstructorDialog(filters, api, branches, selected, issue) {
  const target = instructorAction(filters)
  if (!target) return ''
  const { id, action } = target
  const list = escapeHtml(instructorListUrl(filters))
  const url = `${list}&amp;action=${action}${id ? `&amp;instructor=${id}` : ''}`
  if (action === 'add') {
    const record = { branch: selected?.id, experience_years: 0, status: 'active', ...issue?.values }
    return recordDialog('Add instructor', list, renderForm(record, branches, url, true), issue)
  }

  try {
    const instructor = await api(`/api/instructors/${id}/`)
    const name = escapeHtml(instructor.name)
    if (action === 'edit') {
      return recordDialog(`Edit instructor · ${name}`, list,
        renderForm({ ...instructor, ...issue?.values }, branches, url, false), issue)
    }
    return recordDialog(`Delete instructor · ${name}`, list,
      `<p>Permanently delete the record for <strong>${name}</strong> and their attendance marks?</p>
        <p>Instructors with linked driving lessons can be set to Inactive from the Edit form.</p>
        <form method="post" action="${url}"><button type="submit">Delete instructor</button></form>`, issue)
  } catch (error) {
    if (error.status !== 404) throw error
    return recordDialog('Instructor unavailable', list, '<p>This instructor record is no longer available.</p>', issue)
  }
}
