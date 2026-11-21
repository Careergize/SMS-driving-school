import { readFileSync } from 'node:fs'
import { lessonDate, renderDrivingLessons } from './crm-calendar.mjs'
import { renderLicenceAdmin } from './crm-licences.mjs'
import { escapeHtml } from './backend-api.mjs'
import { renderAttendance } from './crm-attendance.mjs'
import { renderVehicles } from './crm-vehicles.mjs'
import { instructorListUrl, instructorStatuses, renderInstructorDialog } from './crm-instructors.mjs'
import { courseLabels, renderStudentDialog, studentListUrl, studentStatuses } from './crm-students.mjs'

export const dashboardStyles = readFileSync(new URL('./crm-dashboard.css', import.meta.url), 'utf8')

const count = new Intl.NumberFormat('en-IN').format
const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format
const compactRupees = value => value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${Math.round(value / 1000)}k`
const pct = (value, total) => total ? Math.round(value / total * 100) : 0

const instructorFields = [
  'Instructor ID', 'Name', 'Mobile Number', 'Email', 'Address', 'Branch',
  'Experience', 'Driving Licence Number', 'Licence Validity', 'Joining Date', 'Employment Status',
]

function branchSelect(branches, selected) {
  return `<label for="branch">Branch</label><select id="branch" name="branch"><option value="">All branches</option>${branches.map(branch => `<option value="${branch.id}"${selected === branch ? ' selected' : ''}>${branch.label}</option>`).join('')}</select>`
}

const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortMonth = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' })
const displayDate = value => dateLabel.format(new Date(value))

function renderStudents(branches, selected, filters, students) {
  const search = (filters.get('student-search') || '').trim()
  students = students.filter(student => !search || String(student.name || '').toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const paymentFilter = filters.get('payment')
  const list = escapeHtml(studentListUrl(filters))
  const activePayment = ['paid', 'unpaid'].includes(paymentFilter) ? paymentFilter : ''
  const paidCount = students.filter(student => student.payment === 'paid').length
  const paymentTabs = [['', 'All Students', students.length, 'ST'], ['paid', 'Paid', paidCount, 'PD'], ['unpaid', 'Unpaid', students.length - paidCount, 'UP']]
  const visibleStudents = activePayment ? students.filter(student => student.payment === activePayment) : students
  const rows = visibleStudents.map(({ id, branch, code, name, course, status, payment }) => {
    const location = branches.find(item => item.id === branch)
    const actions = [['view', 'View'], ['edit', 'Edit'], ['delete', 'Delete']]
    return `<tr><th scope="row">${escapeHtml(code)}</th><td>${escapeHtml(name)}</td>
      <td>${location?.label ?? escapeHtml(branch)}</td><td>${courseLabels[course]}</td><td>${studentStatuses[status]}</td>
      <td>${payment === 'paid' ? 'Paid' : 'Unpaid'}</td>
      <td><div class="student-row-actions">${actions.map(([action, label]) =>
        `<a class="student-action" href="${list}&amp;student=${id}&amp;action=${action}" aria-label="${label} ${escapeHtml(name)}">${label}</a>`).join('')}</div></td></tr>`
  })

  return `<section class="crm-intro" aria-labelledby="students-title">
      <h1 id="students-title">Students</h1>
      <p>View student enrolments and training status by branch.</p>
    </section>
    <form class="crm-filters" method="get" action="/dashboard">
      <input type="hidden" name="tab" value="students">
      ${activePayment ? `<input type="hidden" name="payment" value="${activePayment}">` : ''}
      <div>${branchSelect(branches, selected)}</div>
      <div><label for="student-name-search">Student name</label><input id="student-name-search" name="student-search" type="search" value="${escapeHtml(search)}" placeholder="Search by student name"></div>
      <button type="submit">Apply filters</button>
      ${search ? `<a href="${escapeHtml(studentListUrl(new URLSearchParams([...filters].filter(([key]) => key !== 'student-search'))))}">Clear search</a>` : ''}
    </form>
    <div class="crm-section-title"><h2>Student directory</h2><span>${count(rows.length)} students</span>
      <a class="student-action" href="${list}&amp;action=add">Add student</a></div>
    <nav class="crm-summary-cards" aria-label="Filter students by payment">
      ${paymentTabs.map(([payment, label, total, code]) => `<a class="crm-card crm-kpi crm-summary-card"
        href="/dashboard?tab=students${selected ? `&amp;branch=${selected.id}` : ''}${payment ? `&amp;payment=${payment}` : ''}${search ? `&amp;student-search=${escapeHtml(encodeURIComponent(search))}` : ''}"${payment === activePayment ? ' aria-current="true"' : ''}>
        <div><span>${label}</span><i class="attendance-${payment === 'paid' ? 'present' : payment === 'unpaid' ? 'absent' : 'scheduled'}" aria-hidden="true">${code}</i></div>
        <strong>${count(total)}</strong>
      </a>`).join('')}
    </nav>
    <section class="crm-card crm-table" tabindex="0" aria-label="Scrollable student directory">
      <table aria-label="Student records">
        <thead><tr><th scope="col">Student ID</th><th scope="col">Name</th><th scope="col">Branch</th><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Payment</th><th scope="col">Actions</th></tr></thead>
        <tbody>${rows.join('') || '<tr><td colspan="7">No students match the selected filters.</td></tr>'}</tbody>
      </table>
    </section>`
}

function renderInstructors(branches, selected, filters, instructors) {
  const list = escapeHtml(instructorListUrl(filters))
  const rows = instructors.map(instructor => {
    const location = branches.find(item => item.id === instructor.branch)
    const fields = [
      escapeHtml(instructor.name), escapeHtml(instructor.mobile), escapeHtml(instructor.email),
      escapeHtml(instructor.address), location?.label ?? escapeHtml(instructor.branch), `${instructor.experience_years} years`,
      escapeHtml(instructor.licence_number), displayDate(instructor.licence_valid_until),
      displayDate(instructor.joined_on), instructorStatuses[instructor.status],
    ]
    const actions = [['edit', 'Edit'], ['delete', 'Delete']].map(([action, label]) =>
      `<a class="student-action" href="${list}&amp;instructor=${instructor.id}&amp;action=${action}" aria-label="${label} ${escapeHtml(instructor.name)}">${label}</a>`).join('')
    return `<tr><th scope="row">${escapeHtml(instructor.code)}</th>${fields.map(value => `<td>${value}</td>`).join('')}
      <td><div class="student-row-actions">${actions}</div></td></tr>`
  })

  return `<section class="crm-intro" aria-labelledby="instructors-title">
      <h1 id="instructors-title">Instructors</h1>
      <p>View instructor contact, licence and employment details across the branch network.</p>
    </section>
    <form class="crm-filters" method="get" action="/dashboard">
      <input type="hidden" name="tab" value="instructors">
      <div>${branchSelect(branches, selected)}</div><button type="submit">Apply filters</button>
    </form>
    <div class="crm-section-title"><h2>Instructor directory</h2><span>${count(rows.length)} instructors</span>
      <a class="student-action" href="${list}&amp;action=add">Add instructor</a></div>
    <section class="crm-card crm-table" tabindex="0" aria-label="Scrollable instructor directory">
      <table aria-label="Instructor records"><thead><tr>${instructorFields.map(field => `<th scope="col">${field}</th>`).join('')}<th scope="col">Actions</th></tr></thead>
      <tbody>${rows.join('') || `<tr><td colspan="${instructorFields.length + 1}">No instructors for this selection.</td></tr>`}</tbody></table>
    </section>`
}

function pendingRegistration({ message, status }) {
  return message.startsWith('Student registration request\n') && ['new', 'contacted'].includes(status)
}

function renderEnquiries(enquiries, branches, tab, issue, filters = new URLSearchParams(), students = []) {
  const pending = enquiries.filter(pendingRegistration)
  const other = enquiries.filter(enquiry => !pendingRegistration(enquiry))
  const completedTab = filters.get('enquiry-view') === 'completed'
  const selectedBranch = filters.get('enquiry-branch') || ''
  const search = (filters.get('enquiry-search') || '').trim()
  const studentByCode = new Map(students.map(student => [student.code, student]))
  const visible = other.filter(enquiry => {
    if ((enquiry.status === 'closed') !== completedTab) return false
    if (!completedTab) return true
    const student = studentByCode.get(`registration-${enquiry.id}`)
    if (selectedBranch && student?.branch !== selectedBranch) return false
    return !search || [enquiry.name, enquiry.phone, enquiry.email, student?.name, student?.code].some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))
  })
  const branchOptions = branches.map(({ code, name }) =>
    `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`).join('')
  const statuses = { new: 'New', contacted: 'Processing', closed: 'Enquiry done' }

  function renderCard(enquiry, review = false) {
    const { id, name, phone, email, programme, message, status, created_at } = enquiry
    const [, birthDate, notes] = message.match(/^Student registration request\r?\n\s*Date of birth: (\d{4}-\d{2}-\d{2})(?:\r?\n\s*([\s\S]+))?$/) ?? []
    const statusClass = ['new', 'contacted', 'closed'].includes(status) ? status : 'new'
    return `<article class="crm-card enquiry-card enquiry-card-${statusClass}" aria-labelledby="enquiry-${id}">
      <header class="enquiry-card-heading">
        <div><h3 id="enquiry-${id}">${escapeHtml(name)}</h3><p>${escapeHtml(programme)}</p></div>
        <span class="enquiry-status enquiry-status-${statusClass}">${escapeHtml(review ? 'Pending approval' : (statuses[status] ?? status))}</span>
      </header>
      <dl class="enquiry-details">
        <div><dt>Phone</dt><dd>${escapeHtml(phone)}</dd></div>
        ${email ? `<div><dt>Email</dt><dd>${escapeHtml(email)}</dd></div>` : ''}
        ${birthDate ? `<div><dt>Date of birth</dt><dd>${displayDate(birthDate)}</dd></div>` : ''}
        <div><dt>Received</dt><dd>${displayDate(created_at)}</dd></div>
        ${studentByCode.has(`registration-${id}`) ? `<div><dt>Branch</dt><dd>${escapeHtml(branches.find(branch => branch.code === studentByCode.get(`registration-${id}`).branch)?.name || studentByCode.get(`registration-${id}`).branch)}</dd></div>` : ''}
      </dl>
      ${(birthDate ? notes : message) ? `<p class="enquiry-message">${escapeHtml(birthDate ? notes : message)}</p>` : ''}
      ${review && status !== 'closed' ? '<button class="enquiry-processing" type="button" disabled>Processing</button>' : ''}
      ${!message.startsWith('Student registration request\n') ? `<form class="enquiry-update" method="post" action="/dashboard?tab=enquiries&amp;update-enquiry=${id}">
        <label>Status<select name="status" aria-label="Enquiry status for ${escapeHtml(name)}">
          ${[['new', 'New'], ['contacted', 'Processing'], ['closed', 'Enquiry done']].map(([value, label]) => `<option value="${value}"${status === value ? ' selected' : ''}>${label}</option>`).join('')}
        </select></label>
        <button class="enquiry-whatsapp" type="submit">Save status</button>
      </form>` : ''}
      ${review ? `<form class="enquiry-approval" method="post" action="/dashboard?tab=${tab}&amp;approve=${id}">
        <label>Branch<select name="branch" required><option value="">Select branch</option>${branchOptions}</select></label>
        <label>Course<select name="course" required><option value="">Select course</option><option value="manual">Manual car</option><option value="automatic">Automatic car</option><option value="two-wheeler">Two-wheeler</option><option value="refresher">Refresher</option></select></label>
        <button type="submit" aria-label="Approve registration for ${escapeHtml(name)}">Approve</button>
      </form>` : ''}
    </article>`
  }

  return `<div class="enquiry-inbox${tab === 'enquiries' ? ' enquiry-inbox-primary' : ''}">
    ${tab === 'enquiries' ? '<header class="crm-intro"><h1>Enquiries</h1><p>Review student registrations and other requests from the website.</p></header>' : ''}
    ${issue?.approval ? `<p class="error" role="alert">${escapeHtml(issue.approval)}</p>` : ''}
    <section aria-labelledby="pending-registrations">
      <div class="enquiry-section-heading"><h2 id="pending-registrations">Pending registrations</h2><span>${pending.length} awaiting approval</span></div>
      ${pending.length ? `<div class="enquiry-grid">${pending.map(enquiry => renderCard(enquiry, true)).join('')}</div>` : '<p class="crm-card enquiry-empty">No registrations are waiting for approval.</p>'}
    </section>
    ${tab === 'enquiries' ? `<section aria-labelledby="other-enquiries">
      <nav class="enquiry-tabs" aria-label="Enquiry status">
        <a href="/dashboard?tab=enquiries"${!completedTab ? ' aria-current="page"' : ''}>Other enquiries (${other.filter(enquiry => enquiry.status !== 'closed').length})</a>
        <a href="/dashboard?tab=enquiries&amp;enquiry-view=completed"${completedTab ? ' aria-current="page"' : ''}>Completed (${other.filter(enquiry => enquiry.status === 'closed').length})</a>
      </nav>
      <div class="enquiry-section-heading"><h2 id="other-enquiries">${completedTab ? 'Completed enquiries' : 'Other enquiries'}</h2></div>
      ${completedTab ? `<form class="crm-filters" method="get" action="/dashboard">
        <input type="hidden" name="tab" value="enquiries"><input type="hidden" name="enquiry-view" value="completed">
        <div><label for="enquiry-branch">Branch</label><select id="enquiry-branch" name="enquiry-branch"><option value="">All branches</option>${branches.map(branch => `<option value="${escapeHtml(branch.code)}"${selectedBranch === branch.code ? ' selected' : ''}>${escapeHtml(branch.name)}</option>`).join('')}</select></div>
        <div><label for="enquiry-search">Search students</label><input id="enquiry-search" name="enquiry-search" type="search" value="${escapeHtml(search)}" placeholder="Name, phone, email or student code"></div>
        <button type="submit">Search</button><a href="/dashboard?tab=enquiries&amp;enquiry-view=completed">Clear filters</a>
      </form>` : ''}
      ${visible.length ? `<div class="enquiry-grid">${visible.map(enquiry => renderCard(enquiry)).join('')}</div>` : `<p class="crm-card enquiry-empty">${completedTab ? 'No completed enquiries match your filters.' : 'No open enquiries received.'}</p>`}
    </section>` : ''}
  </div>`
}

function renderStudentKeys(students, enquiries, branches, filters, issue) {
  const branch = filters.get('branch') || ''
  const search = (filters.get('search') || '').trim()
  const approved = new Set(enquiries.filter(item => item.status === 'closed').map(item => `registration-${item.id}`))
  const visible = students.filter(student => approved.has(student.code)
    && (!branch || student.branch === branch)
    && (!search || [student.name, student.code, student.phone].some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))))
  return `<header class="crm-intro"><h1>Student keys</h1><p>Issue student login codes for approved registrations. Show the code to share privately, or send it via WhatsApp.</p></header>
    ${issue?.approval ? `<p class="error" role="alert">${escapeHtml(issue.approval)}</p>` : ''}
    <form class="crm-filters" method="get" action="/dashboard"><input type="hidden" name="tab" value="student-keys">
      <div><label for="key-branch">Branch</label><select id="key-branch" name="branch"><option value="">All branches</option>${branches.map(item => `<option value="${escapeHtml(item.code)}"${branch === item.code ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></div>
      <div><label for="key-search">Search students</label><input id="key-search" name="search" type="search" value="${escapeHtml(search)}" placeholder="Name, phone or student code"></div>
      <button type="submit">Search</button><a href="/dashboard?tab=student-keys">Clear filters</a>
    </form>
    <div class="enquiry-grid">${visible.map(student => `<article class="crm-card enquiry-card">
      <h2>${escapeHtml(student.name)}</h2><p>${escapeHtml(student.code)} · ${escapeHtml(branches.find(item => item.code === student.branch)?.name || student.branch)}</p>
      <p>${escapeHtml(student.phone)}</p><form class="student-key-actions" method="post" action="/dashboard?tab=student-keys&amp;issue-access=${student.code.slice('registration-'.length)}">
        <button type="submit" name="delivery" value="show">Issue &amp; show code</button>
        <button class="enquiry-whatsapp" type="submit" name="delivery" value="whatsapp">Issue code via WhatsApp</button>
      </form></article>`).join('') || '<p class="crm-card enquiry-empty">No approved students match your filters.</p>'}</div>`
}

function dashboardShell(content, tab, query, username) {
  const overview = `/dashboard${query ? `?${query}` : ''}`
  const bookings = `/dashboard?tab=bookings${query ? `&amp;${query}` : ''}`
  const active = name => tab === name ? ' aria-current="page"' : ''
  return `<div class="crm-shell">
    <aside class="crm-side">
      <a class="crm-brand" href="/dashboard"><img src="/sms-logo.jpg" alt=""><span>SMS CRM<small>Driving School</small></span></a>
      <span class="crm-nav-label">WORKSPACE</span>
      <nav aria-label="Dashboard sections">
        <a href="${overview}#overview"${active('overview')}><span aria-hidden="true">⌂</span> Dashboard</a>
        <a href="/dashboard?tab=licences"${active('licences')}><span class="licence-nav-icon" aria-hidden="true"></span> Licence &amp; RTO</a>
        <a href="${bookings}"${active('bookings')}><span aria-hidden="true">▤</span> Driving Lessons</a>
        <a href="/dashboard?tab=vehicles${query ? `&amp;${query}` : ''}"${active('vehicles')}><span aria-hidden="true">▰</span> Vehicles</a>
        <a href="/dashboard?tab=attendance${query ? `&amp;${query}` : ''}"${active('attendance')}><span aria-hidden="true">✓</span> Attendance</a>
        <a href="/dashboard?tab=students${query ? `&amp;${query}` : ''}"${active('students')}><span aria-hidden="true">♧</span> Students</a>
        <a href="/dashboard?tab=instructors${query ? `&amp;${query}` : ''}"${active('instructors')}><span aria-hidden="true">♙</span> Instructors</a>
        <a href="/dashboard?tab=enquiries"${active('enquiries')}><span aria-hidden="true">✉</span> Enquiries</a>
        <a href="/dashboard?tab=student-keys"${active('student-keys')}><span aria-hidden="true">⚿</span> Student keys</a>
        <a href="${overview}#analytics"><span aria-hidden="true">▥</span> Reports</a>
        <a href="${overview}#branches"><span aria-hidden="true">◇</span> Branch comparison</a>
        <a href="${overview}#operations"><span aria-hidden="true">⚙</span> Operations</a>
      </nav>
      <div class="crm-side-footer"><a href="/">Public website ↗</a><form method="post" action="/logout"><button type="submit">Sign out</button></form></div>
    </aside>
    <main class="crm-main" id="overview">
      <div class="crm-top"><span>WORKSPACE / ${tab === 'student-keys' ? 'STUDENT KEYS' : tab === 'bookings' ? 'DRIVING LESSONS' : tab === 'licences' ? 'LICENCE &amp; RTO' : tab.toUpperCase()}</span><span>${username} <b>Staff</b></span></div>
      ${content}
      <footer class="crm-footer">SMS Motor Driving School · Local CRM</footer>
    </main>
  </div>`
}

function chart(rows, series) {
  const maximum = Math.max(...rows.flatMap(row => series.map(item => row[item.key])), 1)
  return `<div class="crm-chart" style="--columns:${rows.length}">${rows.map(row => `<div class="crm-column">
    <div class="crm-bars">${series.map(item => `<span class="crm-bar ${item.key}" style="--height:${row[item.key] / maximum * 100}%" tabindex="0" aria-label="${row.month} ${item.label}: ${item.format(row[item.key])}"><span>${item.format(row[item.key])}</span></span>`).join('')}</div>
    <span>${row.month}</span></div>`).join('')}</div>
    <div class="crm-legend">${series.map(item => `<span><i class="${item.key}"></i>${item.label}</span>`).join('')}</div>`
}

export async function renderDashboard(filters, api, username, issue) {
  const tab = filters.get('tab')
  if (tab === 'student-keys') {
    const [students, enquiries, branches] = await Promise.all([api('/api/students/'), api('/api/enquiries/'), api('/api/branches/')])
    return dashboardShell(renderStudentKeys(students, enquiries, branches, filters, issue), tab, '', username)
  }
  if (tab === 'licences') {
    return dashboardShell(await renderLicenceAdmin(filters, api, issue), tab, '', username)
  }
  if (tab === 'enquiries') {
    const [enquiries, branches, students] = await Promise.all([api('/api/enquiries/'), api('/api/branches/'), api('/api/students/')])
    return dashboardShell(renderEnquiries(enquiries, branches, tab, issue, filters, students), tab, '', username)
  }
  const branches = (await api('/api/branches/?is_active=true')).map(({ code, name, area }) => ({
    id: code, name: escapeHtml(name), label: [name, area].filter(Boolean).map(escapeHtml).join(' · '),
  }))
  const selected = branches.find(branch => branch.id === filters.get('branch'))
  if (tab === 'vehicles') {
    const content = await renderVehicles(filters, api, branches, selected, issue)
    const query = selected ? 'branch=' + encodeURIComponent(selected.id) : ''
    return dashboardShell(content, tab, query, username)
  }
  if (tab === 'attendance') {
    const content = await renderAttendance(filters, api, branches, selected, issue)
    const query = selected ? 'branch=' + encodeURIComponent(selected.id) : ''
    return dashboardShell(content, tab, query, username)
  }
  const period = ['1', '3', '6'].includes(filters.get('period')) ? filters.get('period') : '6'
  const rawWeek = Number(filters.get('week'))
  const week = Number.isInteger(rawWeek) && Math.abs(rawWeek) <= 520 ? rawWeek : 0
  const branchParams = new URLSearchParams(selected ? { branch: selected.id } : {})
  const query = [branchParams.toString(), period !== '6' && `period=${period}`, week && `week=${week}`].filter(Boolean).join('&amp;')
  branchParams.set('branch_active', 'true')
  if (tab === 'students') {
    const [students, dialog] = await Promise.all([
      api(`/api/students/?${branchParams}`),
      renderStudentDialog(filters, api, branches, selected, issue),
    ])
    const registrations = (await api('/api/enquiries/')).filter(pendingRegistration)
    const pending = renderEnquiries(registrations, branches.map(({ id, label }) => ({ code: id, name: label })), tab, issue)
    return dashboardShell(renderStudents(branches, selected, filters, students) + pending + dialog, tab, query, username)
  }
  if (tab === 'instructors') {
    const [instructors, dialog] = await Promise.all([
      api(`/api/instructors/?${branchParams}`),
      renderInstructorDialog(filters, api, branches, selected, issue),
    ])
    return dashboardShell(renderInstructors(branches, selected, filters, instructors) + dialog, tab, query, username)
  }
  const reportParams = new URLSearchParams(branchParams)
  reportParams.set('period', period)
  const dashboard = api(`/api/dashboard/?${reportParams}`)
  if (tab === 'bookings') {
    const { snapshot } = await dashboard
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date())
    const base = new Date(snapshot.date || today)
    base.setUTCDate(base.getUTCDate() - (base.getUTCDay() + 6) % 7)
    const requestedDate = filters.get('date')
    const requestedDay = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate ?? '') ? new Date(requestedDate) : null
    const dateWeek = requestedDay && Number.isFinite(requestedDay.getTime()) ? Math.floor((requestedDay - base) / 604800000) : week
    const attendance = filters.get('attendance')
    const [students, instructors, vehicles] = await Promise.all([
      api(`/api/students/?${branchParams}`),
      api(`/api/instructors/?${branchParams}&status=active`),
      api(`/api/vehicles/?${branchParams}`),
    ])
    branchParams.set('date_from', lessonDate(base, dateWeek, 0).toISOString().slice(0, 10))
    branchParams.set('date_to', lessonDate(base, dateWeek, 6).toISOString().slice(0, 10))
    if (['present', 'absent', 'late', 'scheduled'].includes(attendance)) branchParams.set('attendance', attendance)
    const lessons = await api(`/api/lessons/?${branchParams}`)
    const date = requestedDay && Number.isFinite(requestedDay.getTime()) ? requestedDate : (week === 0 ? today : branchParams.get('date_from'))
    return dashboardShell(renderDrivingLessons(branches, selected, base, dateWeek, period, attendance, lessons, students.filter(student => student.status !== 'completed'), instructors, vehicles.filter(vehicle => vehicle.status === 'active'), date, issue), tab, query, username)
  }
  const [{ totals, snapshot }, trends, comparison, operations] = await Promise.all([
    dashboard,
    api(`/api/reports/?${reportParams}`),
    api(`/api/reports/branch-comparison/?${reportParams}`),
    api(`/api/operations/?${reportParams}`),
  ])
  const scope = selected?.label ?? 'All branches'
  const monthly = trends.map(row => ({ ...row, month: shortMonth.format(new Date(row.month)), students: row.admissions }))
  const first = trends[0]?.month
  const last = trends.at(-1)?.month
  const range = first
    ? [first, ...(first === last ? [] : [last])].map(month => monthLabel.format(new Date(month))).join(' – ')
    : 'No report data'
  const asOf = snapshot.date ? displayDate(snapshot.date) : 'Unavailable'
  const cards = [
    ['Total branches', count(selected ? 1 : branches.length), 'Network coverage', 'BR'],
    ['Total students', count(totals.admissions), range, 'ST'],
    ['Active students', count(snapshot.active_students), asOf, 'AC'],
    ['New enquiries', count(totals.enquiries), range, 'EN'],
    ['Admissions on snapshot date', count(snapshot.admissions_today), asOf, 'AD'],
    ['Total instructors', count(snapshot.instructors), asOf, 'IN'],
    ['Total vehicles', count(snapshot.vehicles), asOf, 'VE'],
    ['Training sessions on snapshot date', count(snapshot.training_sessions_today), asOf, 'TR'],
    ['Driving tests scheduled', count(snapshot.tests_scheduled), asOf, 'DT'],
    ['Total revenue', rupees(totals.revenue), range, 'RV'],
    ['Pending payments', rupees(totals.pending_payments), range, 'PP'],
    ['Total expenses', rupees(totals.expenses), range, 'EX'],
  ]
  const performance = [
    ['Enquiry conversion', 'enquiry_conversion', 'Admissions / enquiries'],
    ['Training completion', 'training_completion', 'Completed courses / admissions'],
    ['Driving test pass rate', 'test_pass_rate', 'Passed / tests taken'],
    ['Instructor performance', 'instructor_performance', 'Lessons delivered / target'],
    ['Vehicle utilisation', 'vehicle_utilisation', 'Booked / available vehicle slots'],
  ]
  const courseMix = [
    ['Manual car', operations.course_mix.manual], ['Automatic car', operations.course_mix.automatic],
    ['Two-wheeler', operations.course_mix.two_wheeler], ['Refresher', operations.course_mix.refresher],
  ]
  return dashboardShell(`<section class="booking-heading">
        <div><h1>Business overview</h1><p>Branch performance and financial reporting <span class="crm-tag">DEMO DATA</span></p></div>
      </section>
      <form class="crm-filters" method="get" action="/dashboard">
        <input type="hidden" name="week" value="${week}">
        <div>${branchSelect(branches, selected)}</div>
        <div><label for="period">Reporting period</label><select id="period" name="period">${[['6', 'Last 6 months'], ['3', 'Last 3 months'], ['1', 'This month']].map(([value, label]) => `<option value="${value}"${period === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div>
        <button type="submit">Apply filters</button><span class="crm-asof">Snapshot · ${asOf}</span>
      </form>
      <div class="crm-section-title"><h2>Key metrics</h2><span>${scope} · ${range}</span></div>
      <div class="crm-kpis">${cards.map(([label, value, note, code]) => `<article class="crm-card crm-kpi"><div><span>${label}</span><i aria-hidden="true">${code}</i></div><strong>${value}</strong><small>${note}</small></article>`).join('')}</div>

      <div class="crm-section-title" id="analytics"><h2>Trends</h2><span>Monthly performance</span></div>
      <div class="crm-two">
        <section class="crm-card"><h3>Student admissions</h3><p>New enrolments by month</p>${chart(monthly, [{ key: 'students', label: 'Admissions', format: count }])}</section>
        <section class="crm-card"><h3>Revenue and expenses</h3><p>Monthly collections and operating costs</p>${chart(monthly, [{ key: 'revenue', label: 'Revenue', format: compactRupees }, { key: 'expenses', label: 'Expenses', format: compactRupees }])}</section>
      </div>

      <div class="crm-section-title" id="branches"><h2>Branch comparison</h2><span>${range}</span></div>
      <section class="crm-card crm-table"><table aria-label="Branch performance comparison">
        <thead><tr><th scope="col">Branch</th><th scope="col">Students</th><th scope="col">Revenue</th><th scope="col">Expenses</th><th scope="col">Conversion</th><th scope="col">Test pass rate</th></tr></thead>
        <tbody>${comparison.map(row => {
          return `<tr><th scope="row"><a href="/dashboard?branch=${encodeURIComponent(row.branch_id)}&amp;period=${period}">${escapeHtml(row.branch__name)}</a><small>${[row.branch__area, row.branch_id].filter(Boolean).map(escapeHtml).join(' · ')}</small></th><td>${count(row.admissions)}</td><td>${rupees(row.revenue)}</td><td>${rupees(row.expenses)}</td><td>${row.enquiry_conversion_pct}%</td><td>${row.test_pass_pct}%</td></tr>`
        }).join('')}</tbody></table>
      </section>

      <div class="crm-section-title" id="operations"><h2>Operations</h2><span>Training and course mix</span></div>
      <div class="crm-two">
        <section class="crm-card"><h3>Performance indicators</h3>${performance.map(([label, key, note]) => {
          const { value, total, percent } = operations.indicators[key]
          return `<div class="crm-meter"><div><strong>${label}</strong><span>${percent}%</span></div><progress aria-label="${label}" max="100" value="${percent}"></progress><small>${note} · ${count(value)} / ${count(total)}</small></div>`
        }).join('')}</section>
        <section class="crm-card"><h3>Course distribution</h3><p>${count(totals.admissions)} admissions in the selected period</p>${courseMix.map(([label, value]) => `<div class="crm-meter"><div><strong>${label}</strong><span>${count(value)} · ${pct(value, totals.admissions)}%</span></div><progress aria-label="${label} share" max="100" value="${pct(value, totals.admissions)}"></progress></div>`).join('')}</section>
      </div>`, 'overview', query, username)
}
