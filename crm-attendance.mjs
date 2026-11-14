import { escapeHtml } from './backend-api.mjs'

const labels = { present: 'Present', absent: 'Absent' }
const count = new Intl.NumberFormat('en-IN').format
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date())
const dateLabel = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' })
const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || value.startsWith('0000-')) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function attendanceFilters(filters) {
  const kind = filters.get('kind') === 'instructors' ? 'instructors' : 'students'
  const period = filters.get('period') === 'month' ? 'month' : 'day'
  const month = filters.get('month')
  const value = period === 'month' && month ? month + '-01' : filters.get('date')
  const status = filters.get('status')
  return {
    kind, period, date: validDate(value) ? value : today(),
    status: Object.hasOwn(labels, status) || (period === 'day' && status === 'unmarked') ? status : '',
  }
}

export function attendanceUrl({ status, ...filters }, branch) {
  const query = new URLSearchParams({ tab: 'attendance', ...filters })
  if (branch) query.set('branch', branch)
  if (status) query.set('status', status)
  return '/dashboard?' + query
}

function shiftDate(value, period, offset) {
  const date = new Date(value)
  if (period === 'month') {
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + offset)
  } else {
    date.setUTCDate(date.getUTCDate() + offset)
  }
  const shifted = date.toISOString().slice(0, 10)
  return validDate(shifted) ? shifted : value
}

function badge(status, compact = false) {
  const label = labels[status] || 'Unmarked'
  const content = compact ? { present: 'P', absent: 'A' }[status] || '–' : label
  return `<span class="attendance-badge attendance-${status || 'unmarked'}"${compact ? ` role="img" aria-label="${label}" title="${label}"` : ''}>${content}</span>`
}

function renderRows(data, filters, branchNames, url) {
  const { rows, days } = data
  const { status: filter, date } = filters
  const monthly = filters.period === 'month'
  const empty = `<tr><td colspan="${monthly ? days.length + 4 : 4}">No ${filters.kind} for this selection.</td></tr>`
  const visible = filter ? rows.filter(row => monthly
    ? Object.values(row.marks).includes(filter)
    : (row.marks[date] ?? 'unmarked') === filter) : rows
  return visible.map(row => {
    const identity = `<th scope="row">${escapeHtml(row.name)}<small>${escapeHtml(row.code)}</small></th>
      <td>${branchNames.get(row.branch) || escapeHtml(row.branch)}</td>`
    if (monthly) {
      const marks = Object.values(row.marks)
      const present = marks.filter(status => status === 'present').length
      const absent = marks.length - present
      return `<tr>${identity}<td>${present}</td><td>${absent}</td>
        ${days.map(day => `<td>${badge(row.marks[day], true)}</td>`).join('')}</tr>`
    }
    const status = row.marks[filters.date]
    const actions = filters.date <= data.today ? `<form class="attendance-actions" method="post" action="${url}">
      <input type="hidden" name="person" value="${row.id}">
      ${Object.entries(labels).map(([value, label]) => `<button name="status" value="${value}"${status === value ? ' disabled' : ''} aria-label="Mark ${escapeHtml(row.name)} ${label.toLowerCase()}">${label}</button>`).join('')}
    </form>` : '–'
    return `<tr>${identity}<td>${badge(status)}</td><td>${actions}</td></tr>`
  }).join('') || empty
}

export async function renderAttendance(filters, api, branches, selected, issue) {
  const options = attendanceFilters(filters)
  const { kind, period, date, status: filter } = options
  const monthly = period === 'month'
  const branch = selected?.id
  const url = (patch = {}) => escapeHtml(attendanceUrl({ ...options, ...patch }, branch))
  const params = new URLSearchParams({ kind, period, date, branch_active: 'true' })
  if (branch) params.set('branch', branch)
  const data = await api(`/api/attendance/?${params}`)
  const branchNames = new Map(branches.map(item => [item.id, item.label]))
  const marks = data.rows.flatMap(row => Object.values(row.marks))
  const present = marks.filter(status => status === 'present').length
  const absent = marks.length - present
  const cards = [
    ['Present', present, 'present', 'P'],
    ['Absent', absent, 'absent', 'A'],
  ]
  if (!monthly) cards.push(['Unmarked', data.rows.length - marks.length, 'unmarked', '–'])
  const heading = (monthly ? monthLabel : dateLabel).format(new Date(date))
  const next = shiftDate(date, period, 1)
  const previous = shiftDate(date, period, -1)
  const nextVisible = monthly ? next.slice(0, 7) <= data.today.slice(0, 7) : next <= data.today

  return `<section class="booking-heading">
    <div><h1>Attendance</h1><p>Review daily attendance by branch or see the full month.</p></div>
    </section>
    <nav class="attendance-options" aria-label="Attendance group and period">
      ${[['students', 'Students'], ['instructors', 'Instructors']].map(([value, label]) =>
        `<a href="${url({ kind: value })}"${kind === value ? ' aria-current="true"' : ''}>${label}</a>`).join('')}
      ${[['day', 'Daily'], ['month', 'Monthly']].map(([value, label]) =>
        `<a href="${url({ period: value, status: value === 'month' && filter === 'unmarked' ? '' : filter })}"${period === value ? ' aria-current="true"' : ''}>${label}</a>`).join('')}
    </nav>
    <form class="crm-filters" method="get" action="/dashboard">
      <input type="hidden" name="tab" value="attendance">
      <input type="hidden" name="kind" value="${kind}">
      <input type="hidden" name="period" value="${period}">
      ${filter ? `<input type="hidden" name="status" value="${filter}">` : ''}
      <div><label for="attendance-branch">Branch</label><select id="attendance-branch" name="branch">
        <option value="">All branches</option>
        ${branches.map(item => `<option value="${escapeHtml(item.id)}"${item.id === branch ? ' selected' : ''}>${branchNames.get(item.id)}</option>`).join('')}
      </select></div>
      <div><label for="attendance-date">${monthly ? 'Month' : 'Date'}</label>
        <input id="attendance-date" type="${monthly ? 'month' : 'date'}" name="${monthly ? 'month' : 'date'}" value="${monthly ? date.slice(0, 7) : date}" required>
      </div><button type="submit">Apply filters</button>
    </form>
    ${issue ? `<p class="error" role="alert">${escapeHtml(issue.message)}</p>` : ''}
    <div class="crm-section-title attendance-heading">
      <h2>${heading}</h2>
      <nav class="attendance-options" aria-label="Attendance dates">
        <a href="${url({ date: previous })}">Previous ${period}</a>
        <a href="${url({ date: data.today })}">${monthly ? 'This month' : 'Today'}</a>
        ${nextVisible ? `<a href="${url({ date: next })}">Next ${period}</a>` : ''}
      </nav>
    </div>
    <section class="crm-summary-cards${monthly ? ' attendance-month-summary' : ''}" aria-label="${monthly ? 'Monthly attendance totals' : 'Daily attendance totals'}">
      ${cards.map(([label, total, status, icon]) => `<a class="crm-card crm-kpi crm-summary-card"
        href="${url({ status: filter === status ? '' : status })}"${filter === status ? ' aria-current="true"' : ''}>
        <div><span>${label}</span><i class="attendance-${status}" aria-hidden="true">${icon}</i></div>
        <strong>${count(total)}</strong>
      </a>`).join('')}
    </section>
    ${monthly ? '<p class="attendance-summary">P = Present · A = Absent · – = No mark</p>' : ''}
    <section class="crm-card crm-table" tabindex="0" aria-label="Scrollable attendance records">
      <table class="${monthly ? 'attendance-month' : ''}" aria-label="${kind === 'students' ? 'Student' : 'Instructor'} attendance">
        <thead><tr><th scope="col">Name</th><th scope="col">Branch</th>
          ${monthly ? `<th scope="col">Present</th><th scope="col">Absent</th>${data.days.map(day =>
            `<th scope="col" title="${dateLabel.format(new Date(day))}">${Number(day.slice(-2))}</th>`).join('')}` : '<th scope="col">Attendance</th><th scope="col">Mark attendance</th>'}
        </tr></thead>
        <tbody>${renderRows(data, options, branchNames, url())}</tbody>
      </table>
    </section>`
}
