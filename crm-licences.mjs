import { escapeHtml } from './backend-api.mjs'

const base = '/dashboard?tab=licences'
const results = { pending: 'Pending', passed: 'Passed', failed: 'Failed' }
const practice = { 'not-started': 'Not started', 'in-progress': 'In progress', completed: 'Completed' }
const courses = { manual: 'Manual car (4 wheeler)', automatic: 'Automatic car (4 wheeler)', 'two-wheeler': '2 wheeler', refresher: 'Refresher' }
const documentLabels = { ll: 'Learner’s licence', dl: 'Driving licence', supporting: 'Supporting document' }
const format = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const text = value => escapeHtml(value || '—')
const date = value => value ? format.format(new Date(value)) : '—'

function select(label, key, choices, value, empty = '') {
  return `<label>${label}<select name="${key}">
    ${empty ? `<option value="">${empty}</option>` : ''}
    ${Object.entries(choices).map(([id, name]) => `<option value="${escapeHtml(id)}"${id === value ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}
  </select></label>`
}

function field(label, key, value, type = 'text') {
  return `<label>${label}<input type="${type}" name="${key}" value="${escapeHtml(value ?? '')}"></label>`
}

export function renderLicenceJourney(record) {
  const stages = [
    ['Admission completed', 'Completed', date(record.admission_date)],
    ['Learner’s licence application', record.ll_application ? 'Completed' : 'Pending', [record.ll_application, record.ll_application_date && date(record.ll_application_date)]],
    ['Learner’s licence test', results[record.ll_result], record.ll_test_date && date(record.ll_test_date)],
    ['Driving practice', practice[record.practice_status], [record.practice_completed_on && date(record.practice_completed_on), record.instructor_approved && 'Instructor approved']],
    ['Driving test booking', record.dl_test_date ? (record.dl_result === 'pending' ? 'Scheduled' : results[record.dl_result]) : 'Pending', record.dl_test_date && date(record.dl_test_date)],
    ['Driving licence issued', record.dl_number ? 'Completed' : 'Not started', [record.dl_number, record.dl_issue_date && date(record.dl_issue_date)]],
  ]
  return `<ol class="licence-journey">${stages.map(([label, status, details]) => `<li>
    <div><strong>${label}</strong><span>${escapeHtml([details].flat().filter(Boolean).join(' · '))}</span></div>
    <span class="enquiry-status">${escapeHtml(status)}</span>
  </li>`).join('')}</ol>`
}

export function renderStudentLicence(licence, uploadMessage) {
  const { record, documents } = licence
  const details = [
    ['RTO office', record.office], ['LL application number', record.ll_application], ['Learner’s licence number', record.ll_number],
    ['Learner’s licence expiry', date(record.ll_expiry_date)], ['DL application number', record.dl_application],
    ['Driving test date', date(record.dl_test_date)], ['Driving test result', results[record.dl_result]],
    ['Driving licence number', record.dl_number],
  ]
  return `<section id="student-licence" class="student-licence" aria-labelledby="student-licence-title">
    <div class="crm-intro"><h1 id="student-licence-title">Licence &amp; RTO</h1></div>
    <section class="crm-card licence-panel"><h2>Licence application progress</h2>${renderLicenceJourney(record)}</section>
    <section class="crm-card licence-panel"><h2>Application details</h2><dl class="licence-details">
      ${details.map(([label, value]) => `<div><dt>${label}</dt><dd>${text(value)}</dd></div>`).join('')}
    </dl></section>
    <section class="crm-card licence-panel"><h2>Licence downloads</h2>
      ${['ll', 'dl'].filter(kind => documents[kind]).map(kind => `<p><a href="/student-login?licence=${kind}">Download ${documentLabels[kind]}</a></p>`).join('') || '<p>No licence documents available yet.</p>'}
    </section>
    <section class="crm-card licence-panel"><h2>Upload supporting document</h2>
      ${uploadMessage ? `<p role="status">${escapeHtml(uploadMessage)}</p>` : ''}
      ${documents.student ? `<p>Current upload: ${text(documents.student)}</p>` : ''}
      <form method="post" action="/student-login?action=licence-upload" enctype="multipart/form-data" class="licence-fields">
        <label>Supporting document <input type="file" name="document" accept=".pdf,.png,.jpg,.jpeg" required></label>
        <div class="licence-actions"><button type="submit">Upload document</button></div>
      </form>
      <p>PDF, PNG or JPEG, up to 5 MB. A new upload replaces your previous one.</p>
    </section>
  </section>`
}

export async function renderLicenceAdmin(filters, api, issue) {
  const id = filters.get('student')
  if (/^[1-9]\d{0,17}$/.test(id ?? '')) {
    try {
      return renderRecord(await api(`/api/students/licences/${id}/`), issue, filters.get('saved') === '1')
    } catch (error) {
      if (error.status !== 404) throw error
      return `<section class="crm-intro"><h1>Student record unavailable</h1><a href="${base}">Back to Licence &amp; RTO</a></section>`
    }
  }
  const query = new URLSearchParams(filters)
  query.delete('tab')
  query.delete('student')
  let filterError = ''
  const [register, branches] = await Promise.all([
    api(`/api/students/licences/?${query}`).catch(async error => {
      if (error.status !== 400) throw error
      filterError = Object.values(error.details ?? {}).flat().filter(value => typeof value === 'string').join(' ') || 'Check the filter values and try again.'
      return { ...await api('/api/students/licences/'), rows: [] }
    }),
    api('/api/branches/'),
  ])
  const { summary, statuses, rows } = register
  const mainCards = [
    ['Total Students', 'total', 'All registered students'],
    ['LL Completed', 'll-completed', 'LL process completed'],
    ['DL Test Pending', 'dl-test-pending', 'Awaiting test booking'],
    ['DL Issued', 'dl-issued', 'Driving licence issued'],
  ]
  const indicators = ['ll-application-pending', 'll-test-pending', 'practice-in-progress', 'dl-test-scheduled', 'dl-test-failed', 'documents-pending']
  const current = key => filters.get(key) || ''
  return `<section class="crm-intro"><h1>Licence &amp; RTO Management</h1><p>Track student applications, tests and licence documents.</p></section>
    <div class="crm-kpis">${mainCards.map(([label, key, description]) => `<a class="crm-card crm-kpi licence-kpi" href="${base}${key === 'total' ? '' : '&amp;status=' + key}">
      <div>${label}</div><strong>${summary[key]}</strong><small>${description}</small></a>`).join('')}</div>
    <div class="licence-indicators">${indicators.map(key => `<a class="enquiry-status" href="${base}&amp;status=${key}">${statuses[key]} <strong>${summary[key]}</strong></a>`).join('')}</div>
    <section class="crm-card licence-panel">
      <h2>Student RTO register</h2>
      ${filterError ? `<p class="error" role="alert">${escapeHtml(filterError)}</p>` : ''}
      <form class="licence-fields" method="get" action="/dashboard">
        <input type="hidden" name="tab" value="licences">
        ${field('Student name, ID or mobile', 'q', current('q'))}
        ${select('Branch', 'branch', Object.fromEntries(branches.map(branch => [branch.code, branch.name])), current('branch'), 'All branches')}
        ${select('Course', 'course', courses, current('course'), 'All courses')}
        ${select('Licence status', 'status', statuses, current('status'), 'All statuses')}
        <details class="licence-advanced"${['office', 'coordinator', 'll_result', 'dl_result', 'application_from', 'application_to', 'test_from', 'test_to'].some(current) ? ' open' : ''}>
          <summary>Advanced filters</summary><div class="licence-fields">
            ${field('RTO office', 'office', current('office'))}${field('Coordinator', 'coordinator', current('coordinator'))}
            ${select('LL test result', 'll_result', results, current('ll_result'), 'Any result')}
            ${select('DL test result', 'dl_result', results, current('dl_result'), 'Any result')}
            ${field('Application date from', 'application_from', current('application_from'), 'date')}
            ${field('Application date to', 'application_to', current('application_to'), 'date')}
            ${field('Driving test date from', 'test_from', current('test_from'), 'date')}
            ${field('Driving test date to', 'test_to', current('test_to'), 'date')}
          </div>
        </details>
        <div class="licence-actions"><button type="submit">Apply filters</button><a href="${base}">Clear filters</a></div>
      </form>
    </section>
    ${filterError ? '' : `<div class="crm-section-title licence-results"><strong>${rows.length} matching students</strong><div class="licence-actions">
      <a href="/licence-export.xlsx?${escapeHtml(query.toString())}">Export Excel</a>
      <a href="/licence-export.pdf?${escapeHtml(query.toString())}">Download PDF</a>
    </div></div>
    <div class="crm-card crm-table" tabindex="0" aria-label="Student RTO tracking table">
      <table><thead><tr><th scope="col">Student</th><th scope="col">Branch &amp; course</th><th scope="col">RTO &amp; coordinator</th>
      <th scope="col">Learner’s licence</th><th scope="col">Driving licence</th><th scope="col">Current status</th><th scope="col">Last updated</th><th scope="col">Action</th></tr></thead>
      <tbody>${rows.map(row => `<tr>
        <th scope="row">${text(row.name)}<small>${text(row.code)} · ${text(row.phone)}</small></th>
        <td>${text(row.branch)}<small>${text(courses[row.course])} · Admitted ${date(row.enrolled_on)}</small></td>
        <td>${text(row.record.office)}<small>${text(row.record.coordinator)}</small></td>
        <td>Application: ${text(row.record.ll_application)}<small>Number: ${text(row.record.ll_number)} · Applied ${date(row.record.ll_application_date)}</small><small>Test: ${date(row.record.ll_test_date)}</small></td>
        <td>Application: ${text(row.record.dl_application)}<small>Number: ${text(row.record.dl_number)} · Test ${date(row.record.dl_test_date)}</small></td>
        <td>${row.statuses.map(key => `<small>${statuses[key]}</small>`).join('')}</td>
        <td>${date(row.record.updated_at)}</td><td><a href="${base}&amp;student=${row.id}">View Details</a></td>
      </tr>`).join('') || '<tr><td colspan="8">No students match these filters.</td></tr>'}</tbody></table>
    </div>`}`
}

function renderRecord(row, issue, saved) {
  const { record, documents } = row
  const input = (label, key, type) => field(label, key, issue?.values?.[key] ?? record[key], type)
  const value = key => issue?.values?.[key] ?? record[key]
  const upload = kind => `<label>${documentLabels[kind]} upload<input type="file" name="${kind}_document" accept=".pdf,.png,.jpg,.jpeg"></label>
    ${documents[kind] ? `<p><a href="/licence-documents/${row.id}/${kind}">Download ${text(documents[kind])}</a></p>` : ''}`
  return `<section class="crm-intro"><a href="${base}">← Back to Licence &amp; RTO</a><h1>${text(row.name)}</h1><p>Student licence record</p></section>
    <section class="crm-card licence-panel"><h2>Student information</h2><dl class="licence-details">
      ${[['Student ID', row.code], ['Mobile', row.phone], ['Branch', row.branch], ['Course', row.course_label],
          ['Admission date', date(row.enrolled_on)], ['Assigned instructor', row.instructor]].map(([label, item]) => `<div><dt>${label}</dt><dd>${text(item)}</dd></div>`).join('')}
    </dl></section>
    <section class="crm-card licence-panel"><h2>Licence journey</h2>${renderLicenceJourney(record)}</section>
    ${issue?.licence ? `<p class="error" role="alert">${escapeHtml(issue.licence)}</p>` : ''}
    ${saved ? '<p role="status">Licence record saved.</p>' : ''}
    <form method="post" enctype="multipart/form-data" action="${base}&amp;student=${row.id}">
      <section class="crm-card licence-panel"><h2>RTO and admission</h2><div class="licence-fields">
        ${input('RTO office', 'office')}${input('Assigned RTO coordinator', 'coordinator')}${input('Admission completed on', 'admission_date', 'date')}
      </div></section>
      <section class="crm-card licence-panel"><h2>Learner’s licence</h2><div class="licence-fields">
        ${input('LL application number', 'll_application')}${input('LL application date', 'll_application_date', 'date')}
        ${input('LL test date', 'll_test_date', 'date')}${select('LL test result', 'll_result', results, value('ll_result'))}
        ${input('LL number', 'll_number')}${input('LL issue date', 'll_issue_date', 'date')}${input('LL expiry date', 'll_expiry_date', 'date')}
        ${upload('ll')}
      </div></section>
      <section class="crm-card licence-panel"><h2>Driving practice</h2><div class="licence-fields">
        ${select('Practice status', 'practice_status', practice, value('practice_status'))}
        ${input('Training completion date', 'practice_completed_on', 'date')}
        <label class="licence-checkbox"><input type="checkbox" value="true" name="instructor_approved"${value('instructor_approved') === true || value('instructor_approved') === 'true' ? ' checked' : ''}> Instructor approval recorded</label>
      </div></section>
      <section class="crm-card licence-panel"><h2>Driving licence</h2><div class="licence-fields">
        ${input('DL application number', 'dl_application')}${input('DL application date', 'dl_application_date', 'date')}
        ${input('DL test booking date', 'dl_booking_date', 'date')}${input('Driving test date', 'dl_test_date', 'date')}
        ${select('Driving test result', 'dl_result', results, value('dl_result'))}
        ${input('DL number', 'dl_number')}${input('DL issue date', 'dl_issue_date', 'date')}${upload('dl')}
      </div></section>
      <section class="crm-card licence-panel"><h2>Remarks and supporting documents</h2>
        <label>Internal remarks<textarea name="remarks" rows="4" maxlength="3000">${escapeHtml(value('remarks') || '')}</textarea></label>
        <div class="licence-fields">${upload('supporting')}</div>
        ${documents.student ? `<p>Student upload: <a href="/licence-documents/${row.id}/student">${text(documents.student)}</a></p>` : ''}
        <p>Accepted files: PDF, PNG or JPEG, up to 5 MB each.</p>
      </section>
      <button type="submit">Save licence record</button>
    </form>`
}
