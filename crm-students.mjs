import { escapeHtml } from './backend-api.mjs'
import { recordDialog, recordFields } from './crm-record-dialog.mjs'

export const courseLabels = { manual: 'Manual car', automatic: 'Automatic car', 'two-wheeler': 'Two-wheeler', refresher: 'Refresher' }
export const studentStatuses = { 'in-training': 'In training', enrolled: 'Enrolled', completed: 'Completed' }
const paymentLabels = { paid: 'Paid', unpaid: 'Unpaid / balance due' }
const attendanceLabels = { scheduled: 'Scheduled', present: 'Present', absent: 'Absent' }
const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })
const lessonTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
const money = value => value == null ? 'Not recorded' : rupees.format(value)
const valueOr = (value, fallback = 'Not recorded') => escapeHtml(value || fallback)

export function studentListUrl(filters) {
  const params = new URLSearchParams({ tab: 'students' })
  for (const key of ['branch', 'payment', 'period', 'week']) {
    if (filters.get(key)) params.set(key, filters.get(key))
  }
  return '/dashboard?' + params
}

export function studentAction(filters) {
  const id = filters.get('student')
  const action = filters.get('action')
  if (action === 'add') return { action }
  if (/^[1-9][0-9]{0,17}$/.test(id ?? '') && ['view', 'edit', 'delete'].includes(action)) {
    return { id, action }
  }
  return null
}

function renderDetails(student) {
  const fields = [
    ['Student ID', escapeHtml(student.code)],
    ['Joined', date.format(new Date(student.enrolled_on))],
    ['Branch', [student.branch_name, student.branch_area].filter(Boolean).map(escapeHtml).join(' · ')],
    ['Course', courseLabels[student.course]],
    ['Vehicle type', student.course === 'two-wheeler' ? 'Two-wheeler' : 'Four-wheeler'],
    ['Training status', studentStatuses[student.status]],
    ['Assigned instructor', valueOr(student.instructor_name, 'Unassigned')],
    ['Student phone', valueOr(student.phone)],
    ['Guardian / contact person', valueOr(student.guardian_name)],
    ['Guardian / contact number', valueOr(student.guardian_phone)],
    ['Payment status', paymentLabels[student.payment]],
    ['Total fee', money(student.total_fee)],
    ['Amount paid', money(student.amount_paid)],
    ['Pending amount', money(student.pending_amount)],
  ]
  const lessons = student.lessons.map(lesson => `<li>
    <strong>${lessonTime.format(new Date(lesson.starts_at))}</strong>
    <span>${escapeHtml(lesson.instructor_name)} · ${lesson.duration_minutes} min · ${attendanceLabels[lesson.attendance]}${lesson.vehicle_registration ? ' · ' + escapeHtml(lesson.vehicle_registration) : ''}</span>
  </li>`).join('')
  return `<dl class="student-details">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <section class="student-lessons"><h3>Class details</h3>
      ${lessons ? `<ul>${lessons}</ul>` : '<p>No classes have been scheduled.</p>'}
    </section>`
}

function renderEdit(student, branches, instructors, url, creating = false) {
  const { input, select } = recordFields(student)
  const instructorOptions = instructors.map(item => [item.id, escapeHtml(item.name)])
  if (student.instructor && !instructors.some(item => String(item.id) === String(student.instructor))) {
    instructorOptions.push([student.instructor, valueOr(student.instructor_name, 'Current instructor')])
  }
  const branchOptions = branches.map(branch => [branch.id, branch.label])
  if (student.branch && !branches.some(branch => branch.id === student.branch)) {
    branchOptions.push([student.branch, valueOr(student.branch_name, 'Current branch')])
  }
  return `<form method="post" action="${url}" class="student-edit">
    <div class="student-edit-fields">
      ${creating ? input('Student ID', 'code', 'maxlength="32"') : ''}
      ${input('Student name', 'name', 'required maxlength="120"')}
      ${input('Joining date', 'enrolled_on', 'type="date" required')}
      ${select('Branch', 'branch', [['', 'Choose a branch'], ...branchOptions], true)}
      ${select('Course and vehicle type', 'course', [['', 'Choose a course'], ...Object.entries(courseLabels)], true)}
      ${select('Training status', 'status', Object.entries(studentStatuses))}
      ${select('Assigned instructor', 'instructor', [['', 'Unassigned'], ...instructorOptions])}
      ${input('Student phone', 'phone', 'type="tel" maxlength="32"')}
      ${input('Guardian / contact person', 'guardian_name', 'maxlength="120"')}
      ${input('Guardian / contact number', 'guardian_phone', 'type="tel" maxlength="32"')}
      ${select('Payment status when amounts are unknown', 'payment', Object.entries(paymentLabels))}
      ${input('Total fee (₹)', 'total_fee', 'type="number" min="0" max="99999999.99" step="0.01"')}
      ${input('Amount paid (₹)', 'amount_paid', 'type="number" min="0" max="99999999.99" step="0.01"')}
    </div>
    <p class="student-form-note">Enter both payment amounts or leave both blank. When amounts are entered, the balance and payment status update automatically.</p>
    ${creating ? '<p class="student-form-note">Leave Student ID blank to generate one automatically.</p>' : ''}
    <button type="submit">${creating ? 'Add student' : 'Save changes'}</button>
  </form>`
}

export async function renderStudentDialog(filters, api, branches, selected, issue) {
  const target = studentAction(filters)
  if (!target) return ''
  const { id, action } = target
  const list = escapeHtml(studentListUrl(filters))
  const url = mode => `${list}&amp;student=${id}&amp;action=${mode}`
  if (action === 'add') {
    const instructors = await api('/api/instructors/?branch_active=true')
    const enrolled_on = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date())
    const student = { branch: selected?.id, enrolled_on, status: 'enrolled', payment: 'unpaid', ...issue?.values }
    return recordDialog('Add student', list, renderEdit(student, branches, instructors, list + '&amp;action=add', true), issue)
  }
  let content
  let title
  try {
    const student = await api(`/api/students/${id}/`)
    title = `${{ view: 'Student details', edit: 'Edit student', delete: 'Delete student' }[action]} · ${escapeHtml(student.name)}`
    if (action === 'view') {
      content = `${renderDetails(student)}<a class="student-action" href="${url('edit')}">Edit student</a>`
    } else if (action === 'edit') {
      const instructors = await api('/api/instructors/?branch_active=true')
      content = renderEdit({ ...student, ...issue?.values }, branches, instructors, url('edit'))
    } else {
      content = `<p>Permanently delete <strong>${escapeHtml(student.name)}</strong> and their student record?</p>
        <p>Any linked driving lessons will also be deleted.</p>
        <form method="post" action="${url('delete')}"><button type="submit">Delete student</button></form>`
    }
  } catch (error) {
    if (error.status !== 404) throw error
    title = 'Student unavailable'
    content = '<p>This student record is no longer available.</p>'
  }
  return recordDialog(title, list, content, issue)
}

export function readStudentFields(fields) {
  const data = {}
  for (const key of ['code', 'name', 'enrolled_on', 'branch', 'course', 'status', 'instructor', 'phone', 'guardian_name', 'guardian_phone', 'payment', 'total_fee', 'amount_paid']) {
    if (fields.has(key)) data[key] = fields.get(key)
  }
  for (const key of ['instructor', 'total_fee', 'amount_paid']) {
    if (data[key] === '') data[key] = null
  }
  return data
}
