import { escapeHtml } from './backend-api.mjs'
import { recordDialog, recordFields } from './crm-record-dialog.mjs'

const sections = { fleet: 'Vehicle list', assignments: 'Assignments', reservations: 'Availability & bookings', maintenance: 'Maintenance', fuel: 'Fuel' }
const nouns = { fleet: 'vehicle', assignments: 'assignment', reservations: 'reservation', maintenance: 'maintenance record', fuel: 'fuel entry' }
const vehicleKinds = { manual: 'Manual car', automatic: 'Automatic car', 'two-wheeler': 'Two-wheeler' }
const vehicleStatuses = { active: 'Active', maintenance: 'In maintenance', inactive: 'Inactive' }
const purposes = { lesson: 'Driving lesson', booking: 'Vehicle booking', test: 'Driving test', block: 'Blocked' }
const maintenanceKinds = {
  service: 'Regular service', oil: 'Oil change', tyre: 'Tyre replacement', battery: 'Battery replacement',
  brakes: 'Brake inspection', engine: 'Engine maintenance', repair: 'General repair', accident: 'Accident repair',
}
const fieldNames = {
  fleet: ['registration', 'name', 'branch', 'kind', 'status', 'odometer'],
  assignments: ['vehicle', 'instructor', 'starts_on', 'ends_on', 'temporary', 'handed_over_at', 'handover_condition', 'returned_at', 'return_condition', 'notes'],
  reservations: ['vehicle', 'purpose', 'lesson', 'new_student', 'instructor', 'starts_at', 'ends_at', 'used_at', 'notes', 'reassignment_reason'],
  maintenance: ['vehicle', 'kind', 'scheduled_on', 'completed_on', 'service_provider', 'provider_contact', 'cost', 'service_odometer', 'next_due_on', 'next_due_km', 'notes'],
  fuel: ['vehicle', 'instructor', 'filled_on', 'litres', 'price_per_litre', 'odometer', 'full_tank'],
}
const nullable = new Set(['ends_on', 'handed_over_at', 'returned_at', 'lesson', 'new_student', 'instructor', 'starts_at', 'ends_at', 'used_at', 'completed_on', 'cost', 'service_odometer', 'next_due_on', 'next_due_km'])
const timezone = 'Asia/Kolkata'
const isoDate = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone })
const isoTime = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })
const dateLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', dateStyle: 'long' })
const timeLabel = new Intl.DateTimeFormat('en-IN', { timeZone: timezone, hour: 'numeric', minute: '2-digit' })
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const formatLocal = value => value ? isoTime.format(new Date(value)).replace(' ', 'T') : ''
const formatDateTime = value => value ? escapeHtml(formatLocal(value).replace('T', ' ')) : '–'
const today = () => isoDate.format(new Date())
const idPattern = /^[1-9][0-9]{0,17}$/
const text = value => value == null || value === '' ? '–' : escapeHtml(value)

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !value.startsWith('0000-')
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function vehicleFilters(filters) {
  const section = filters.get('section')
  const date = filters.get('date')
  const result = { section: Object.hasOwn(sections, section) ? section : 'fleet', date: validDate(date) ? date : today() }
  for (const key of ['vehicle', 'instructor']) {
    if (idPattern.test(filters.get(key) ?? '')) result[key] = filters.get(key)
  }
  if (result.section === 'reservations' && filters.get('history') === '1') result.history = '1'
  if (result.section === 'reservations' && filters.get('full') === '1') result.full = '1'
  const type = filters.get('type')
  if (result.section === 'reservations' && Object.hasOwn(purposes, type)) result.type = type
  if (result.section === 'fuel') {
    for (const key of ['date_from', 'date_to']) {
      if (validDate(filters.get(key))) result[key] = filters.get(key)
    }
  }
  return result
}

export function vehicleListUrl(filters, patch = {}) {
  const params = new URLSearchParams({ tab: 'vehicles', ...vehicleFilters(filters), ...patch })
  const branch = filters.get('branch')
  if (branch) params.set('branch', branch)
  for (const [key, value] of params) {
    if (value === '') params.delete(key)
  }
  return '/dashboard?' + params
}

export function vehicleAction(filters) {
  const { section } = vehicleFilters(filters)
  const action = filters.get('action')
  const id = filters.get('record')
  if (action === 'add' || (['edit', 'delete'].includes(action) && idPattern.test(id ?? ''))) {
    const collection = section === 'fleet' ? '/api/vehicles/' : '/api/vehicles/' + section + '/'
    return { action, id, section, collection }
  }
  return null
}

export function readVehicleFields(section, form) {
  const values = {}
  for (const name of fieldNames[section]) {
    const value = form.get(name)
    if (typeof value === 'string') values[name] = value === '' && nullable.has(name) ? null : value
  }
  return values
}

export function vehiclePayload(values, file) {
  if (!file?.size) return values
  const payload = new FormData()
  for (const [name, value] of Object.entries(values)) payload.set(name, value ?? '')
  payload.set('bill', file)
  return payload
}

function table(columns, rows, label, extraClass = '') {
  return `<section class="crm-card crm-table ${extraClass}" tabindex="0" aria-label="${label}">
    <table><thead><tr>${columns.map(column => `<th scope="col">${column}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('') || `<tr><td colspan="${columns.length}">No records for this selection.</td></tr>`}</tbody></table></section>`
}

const row = (title, cells) => `<tr><th scope="row">${title}</th>${cells.map(value => `<td>${value}</td>`).join('')}</tr>`
const link = (label, href) => `<a class="student-action" href="${escapeHtml(href)}">${label}</a>`

function recordActions(filters, record) {
  return `<div class="student-row-actions">${['edit', 'delete'].map(action =>
    link(action === 'edit' ? 'Edit' : 'Delete', vehicleListUrl(filters, { action, record: record.id }))).join('')}</div>`
}

function activeOn(assignment, day) {
  return assignment.starts_on <= day && (!assignment.ends_on || assignment.ends_on >= day)
}

function fleetTable(fleet, assignments, filters) {
  const date = today()
  const current = new Map()
  for (const assignment of assignments.filter(item => activeOn(item, date))) {
    const names = current.get(assignment.vehicle) ?? new Set()
    names.add(assignment.instructor_name)
    current.set(assignment.vehicle, names)
  }
  return table(['Registration / vehicle', 'Branch', 'Type', 'Status', 'Odometer', 'Currently assigned', 'Actions'], fleet.map(vehicle => row(
    `${text(vehicle.registration)}<small>${text(vehicle.name)}</small>`, [
      text(vehicle.branch_name), vehicleKinds[vehicle.kind], vehicleStatuses[vehicle.status], `${vehicle.odometer.toLocaleString('en-IN')} km`,
      current.has(vehicle.id) ? [...current.get(vehicle.id)].map(escapeHtml).join(', ') : 'Unassigned',
      recordActions(filters, vehicle),
    ],
  )), 'Fleet list')
}

function assignmentTable(records, filters, date) {
  return table(['Vehicle', 'Instructor', 'Start / end', 'Assignment', 'Handover', 'Return', 'Notes', 'Actions'], records.map(record => row(
    text(record.registration), [
      text(record.instructor_name), `${text(record.starts_on)}<small>Through ${text(record.ends_on || 'open-ended')}</small>`,
      `${record.temporary ? 'Temporary' : 'Standard'}<small>${activeOn(record, date) ? 'Active on selected date' : 'Outside selected date'}</small>`,
      `${formatDateTime(record.handed_over_at)}<small>${text(record.handover_condition)}</small>`,
      `${formatDateTime(record.returned_at)}<small>${text(record.return_condition)}</small>`,
      text(record.notes), recordActions(filters, record) + link('Usage', vehicleListUrl(filters, {
        section: 'reservations', instructor: record.instructor, vehicle: '', history: '1',
      })),
    ],
  )), 'Instructor assignment history')
}

function scheduleTimeline(fleet, records, date, filters, options) {
  if (!fleet.length) return '<p class="crm-card">No vehicles for this selection.</p>'

  const hourMs = 3_600_000
  const midnight = Date.parse(date + 'T00:00:00+05:30')
  const dayEnd = midnight + 24 * hourMs
  const byVehicle = new Map(fleet.map(vehicle => [vehicle.id, []]))
  let firstHour = 8
  let lastHour = 20
  for (const record of records) {
    const slots = byVehicle.get(record.vehicle)
    if (!slots) continue
    const start = Math.max(midnight, Date.parse(record.starts_at))
    const end = Math.min(dayEnd, Date.parse(record.ends_at))
    if (!(start < end)) continue
    if (!options.type || record.purpose === options.type) slots.push({ record, start, end })
    firstHour = Math.min(firstHour, Math.floor((start - midnight) / hourMs))
    lastHour = Math.max(lastHour, Math.ceil((end - midnight) / hourMs))
  }
  if (options.full) {
    firstHour = 0
    lastHour = 24
  }

  const startTime = midnight + firstHour * hourMs
  const endTime = midnight + lastHour * hourMs
  const hours = lastHour - firstHour
  const position = time => ((time - startTime) * 100 / (endTime - startTime)).toFixed(5) + '%'
  const now = Date.now()
  const currentLine = now >= startTime && now < endTime
    ? `<span class="vehicle-now" style="--left:${position(now)}" title="Current time" aria-hidden="true"></span>` : ''
  const ticks = Array.from({ length: hours }, (_, index) =>
    `<span>${timeLabel.format(startTime + index * hourMs)}</span>`).join('')

  const rows = fleet.map(vehicle => {
    const slots = byVehicle.get(vehicle.id).sort((a, b) => a.start - b.start)
    const laneEnds = []
    const bookings = slots.map(({ record, start, end }) => {
      // Each label gets an hour of room, even when the reservation is shorter.
      const labelStart = Math.min(start, endTime - hourMs)
      const laneEnd = Math.max(end, labelStart + hourMs)
      let lane = laneEnds.findIndex(until => until <= labelStart)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = laneEnd

      const purpose = purposes[record.purpose]
      const time = `${timeLabel.format(new Date(record.starts_at))} – ${timeLabel.format(new Date(record.ends_at))}`
      const instructor = record.instructor_name || 'Unassigned'
      const student = record.student_name || 'Unassigned'
      const showInstructor = record.purpose !== 'block'
      const showStudent = record.purpose === 'lesson'
      const details = [vehicle.registration, purpose, time, showInstructor && `Instructor: ${instructor}`,
        showStudent && `Student: ${student}`].filter(Boolean).join(' · ')
      const href = vehicleListUrl(filters, { action: 'edit', record: record.id })
      const style = `--lane:${lane};--left:${position(start)};--right:${position(end)};--label-left:${position(labelStart)}`
      const secondary = options.instructor && String(record.instructor) !== options.instructor
      return `<div class="vehicle-event vehicle-event-${record.purpose}${secondary ? ' vehicle-event-other' : ''}" style="${style}">
        <span class="vehicle-event-duration" aria-hidden="true"></span>
        <a class="vehicle-event-card" href="${escapeHtml(href)}" aria-label="${escapeHtml(details)}" title="${escapeHtml(details)}">
          <span class="vehicle-event-kind">${purpose}${record.used_at ? '<small>Recorded use</small>' : ''}</span><span class="vehicle-event-time">${time}</span>
          ${showInstructor ? `<span class="vehicle-event-person"><small>Instructor</small><strong>${escapeHtml(instructor)}</strong></span>` : ''}
          ${showStudent ? `<span class="vehicle-event-person"><small>Student</small><strong>${escapeHtml(student)}</strong></span>` : ''}
        </a>
      </div>`
    }).join('')

    return `<div class="vehicle-timeline-row" style="--lanes:${Math.max(1, laneEnds.length)}">
      <div class="vehicle-timeline-identity">
        <strong>${text(vehicle.registration)}</strong>
        <span>${text(vehicle.name)}</span>
        <small>${text(vehicle.branch_name)} · ${vehicleKinds[vehicle.kind]}</small>
        <span class="vehicle-timeline-status${vehicle.status === 'active' ? ' vehicle-timeline-active' : ''}">${vehicleStatuses[vehicle.status]}</span>
      </div>
      <div class="vehicle-timeline-track${vehicle.status === 'active' ? '' : ' vehicle-track-off'}">
        ${currentLine}
        ${bookings || `<span class="vehicle-empty-track">${vehicle.status !== 'active' ? 'Unavailable' : options.type ? 'No matching bookings' : 'No bookings'}</span>`}
      </div>
    </div>`
  }).join('')

  return `<div class="vehicle-timeline-scroll" role="region" tabindex="0" aria-label="Daily vehicle timeline. Scroll horizontally to see more hours.">
    <div class="vehicle-timeline" style="--hours:${hours}">
      <div class="vehicle-timeline-row vehicle-timeline-header">
        <div class="vehicle-timeline-identity">Vehicle <small>Times in IST</small></div>
        <div class="vehicle-timeline-ticks">${ticks}</div>
      </div>
      ${rows}
    </div>
  </div>`
}

function reservationTable(records, filters) {
  return table(['Vehicle', 'Time (IST)', 'Purpose', 'Instructor / student', 'Recorded use', 'Notes / vehicle moves', 'Actions'], records.map(record => row(
    text(record.registration), [
      `${formatDateTime(record.starts_at)}<small>To ${formatDateTime(record.ends_at)}</small>`,
      purposes[record.purpose],
      `${text(record.instructor_name)}${record.student_name ? `<small>${text(record.student_name)}</small>` : ''}`,
      formatDateTime(record.used_at),
      text(record.notes) + record.moves.map(move => `<small>${text(move.previous_vehicle)} → ${text(move.next_vehicle)} · ${formatDateTime(move.changed_at)} · ${text(move.reason)}</small>`).join(''),
      recordActions(filters, record),
    ],
  )), 'Reservations and recorded vehicle usage')
}

function maintenanceTable(records, filters) {
  return table(['Vehicle', 'Work', 'Scheduled / completed', 'Service provider', 'Cost / odometer', 'Next service due', 'Bill', 'Actions'], records.map(record => row(
    text(record.registration), [
      `${maintenanceKinds[record.kind]}<small>${text(record.notes)}</small>`,
      `${text(record.scheduled_on)}<small>${record.completed_on ? 'Completed ' + text(record.completed_on) : 'Scheduled'}</small>`,
      `${text(record.service_provider)}<small>${text(record.provider_contact)}</small>`,
      `${record.cost == null ? '–' : currency.format(record.cost)}<small>${record.service_odometer == null ? '–' : record.service_odometer + ' km'}</small>`,
      `${text(record.next_due_on)}<small>${record.next_due_km == null ? '–' : record.next_due_km + ' km'}</small>`,
      record.bill_name ? link(text(record.bill_name), '/vehicle-bills/' + record.id + '/') : '–',
      recordActions(filters, record) + link('Block time', vehicleListUrl(filters, {
        section: 'reservations', date: record.scheduled_on, vehicle: record.vehicle, action: 'add', purpose: 'block',
      })),
    ],
  )), 'Vehicle maintenance and service bills')
}

function renderFuel(data, filters) {
  const { entries, summary } = data
  const litres = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 3 }) + ' L'
  const totals = [['Total fuel expense', currency.format(summary.total_expense)], ['Fuel filled', litres(summary.litres)], ['Fuel entries', summary.count]]
  const breakdowns = [['Branch', summary.branches], ['Vehicle', summary.vehicles], ['Instructor', summary.instructors]]
  return `<section class="crm-summary-cards" aria-label="Fuel totals">${totals.map(([label, value]) =>
    `<div class="crm-card crm-kpi crm-summary-card"><span>${label}</span><strong>${value}</strong></div>`).join('')}</section>
    <div class="crm-section-title"><h2>Fuel log</h2></div>
    <p class="attendance-summary">Efficiency uses the distance between full tanks divided by the litres added since the previous full tank, including partial fills.</p>
    ${table(['Vehicle', 'Date', 'Branch', 'Instructor', 'Quantity', 'Price / L', 'Expense', 'Odometer', 'Efficiency', 'Actions'],
      entries.map(entry => row(text(entry.registration), [
        text(entry.filled_on), text(entry.branch_name), text(entry.instructor_name || 'Unassigned'),
        litres(entry.litres) + `<small>${entry.full_tank ? 'Full tank' : 'Partial fill'}</small>`,
        currency.format(entry.price_per_litre), currency.format(entry.total_expense),
        Number(entry.odometer).toLocaleString('en-IN') + ' km',
        entry.km_per_litre == null ? '–' : text(entry.km_per_litre) + ' km/L',
        recordActions(filters, entry),
      ])), 'Fuel entry log')}
    <div class="crm-section-title"><h2>Fuel expense breakdown</h2></div>
    <div class="crm-two fuel-breakdown">${breakdowns.map(([label, groups]) =>
      table([label, 'Litres', 'Expense'], groups.map(group =>
        row(text(group.name), [litres(group.litres), currency.format(group.total_expense)])), 'Fuel expense by ' + label.toLowerCase())).join('')}</div>`
}

function renderForm(section, record, context, url, creating) {
  const { fleet, branches, instructors, lessons, students } = context
  const { input, select } = recordFields(record)
  const options = (items, label) => items.map(item => [item.id, text(label(item))])
  const vehicles = options(fleet, item => item.registration + ' · ' + item.name)
  const instructorsOptions = options(instructors, item => item.name + ' · ' + item.code)
  const number = (label, name, required = false) => input(label, name, `type="number" min="0" max="2147483647"${required ? ' required' : ''}`)
  const day = (label, name, required = false) => input(label, name, `type="date"${required ? ' required' : ''}`)
  const dateTime = (label, name) => input(label + ' (IST)', name, 'type="datetime-local"')
  const area = (label, name) => `<label>${label}<textarea name="${name}" rows="2" maxlength="1000">${escapeHtml(record[name] ?? '')}</textarea></label>`
  const vehicle = () => select('Vehicle', 'vehicle', [['', 'Select vehicle'], ...vehicles], true)
  const instructor = required => select('Instructor', 'instructor', [['', required ? 'Select instructor' : 'None'], ...instructorsOptions], required)
  let fields
  let hint = ''
  if (section === 'fleet') {
    fields = `${input('Registration', 'registration', 'required maxlength="24"')}
      ${input('Vehicle name / model', 'name', 'required maxlength="100"')}
      ${select('Branch', 'branch', [['', 'Select branch'], ...branches.map(item => [item.id, item.label])], true)}
      ${select('Type', 'kind', Object.entries(vehicleKinds), true)}
      ${select('Status', 'status', Object.entries(vehicleStatuses), true)}
      ${number('Odometer (km)', 'odometer', true)}`
  } else if (section === 'assignments') {
    fields = `${vehicle()}${instructor(true)}
      ${day('Start date', 'starts_on', true)}${day('End date', 'ends_on')}
      ${select('Assignment type', 'temporary', [['false', 'Standard'], ['true', 'Temporary']])}
      ${dateTime('Handover time', 'handed_over_at')}${area('Condition at handover', 'handover_condition')}
      ${dateTime('Return time', 'returned_at')}${area('Condition at return', 'return_condition')}${area('Notes', 'notes')}`
    hint = 'Temporary assignments need an end date. Assignments can overlap because vehicles can be shared. Use reservations to set aside driving time.'
  } else if (section === 'reservations') {
    const lessonOptions = options(lessons, item => formatLocal(item.starts_at).replace('T', ' ') + ' · ' + item.student_name + ' / ' + item.instructor_name)
    if (record.lesson && !lessons.some(item => String(item.id) === String(record.lesson))) {
      lessonOptions.push([record.lesson, 'Current linked lesson'])
    }
    fields = `${vehicle()}${select('Purpose', 'purpose', Object.entries(purposes), true)}
      ${select('Existing lesson', 'lesson', [['', 'No existing lesson'], ...lessonOptions])}
      ${creating ? select('Student for a new lesson', 'new_student', [['', 'No new lesson'], ...options(students, item => item.name + ' · ' + item.code)]) : ''}
      ${instructor(false)}${dateTime('Starts', 'starts_at')}${dateTime('Ends', 'ends_at')}
      ${dateTime('Actual use started', 'used_at')}${area('Notes', 'notes')}
      ${creating ? '' : input('Reason for vehicle reassignment', 'reassignment_reason', 'maxlength="300"')}`
    hint = 'For an existing lesson, the instructor and times come from the lesson. To create a lesson, choose a student, instructor and hourly start. Lessons reserve one hour. For a booking, test or block, enter both times.'
  } else if (section === 'fuel') {
    fields = `${vehicle()}${instructor(false)}
      ${day('Filling date', 'filled_on', true)}
      ${input('Quantity (litres)', 'litres', 'type="number" required min="0.001" max="99999.999" step="0.001"')}
      ${input('Price per litre (₹)', 'price_per_litre', 'type="number" required min="0.01" max="999999.99" step="0.01"')}
      ${number('Odometer at fill (km)', 'odometer', true)}
      ${select('Fill type', 'full_tank', [['true', 'Full tank'], ['false', 'Partial fill']])}`
    hint = 'Choose the instructor responsible for this expense, if known. Mark partial fills so they are counted correctly in the next efficiency reading.'
  } else {
    fields = `${vehicle()}${select('Work type', 'kind', Object.entries(maintenanceKinds), true)}
      ${day('Scheduled date', 'scheduled_on', true)}${day('Completed date', 'completed_on')}
      ${input('Service provider', 'service_provider', 'maxlength="160"')}${input('Provider contact', 'provider_contact', 'maxlength="120"')}
      ${input('Cost (₹)', 'cost', 'type="number" min="0" step="0.01" max="99999999.99"')}
      ${number('Service odometer (km)', 'service_odometer')}${day('Next service due date', 'next_due_on')}
      ${number('Next service due at (km)', 'next_due_km')}${area('Work notes', 'notes')}
      <label>Service bill (PDF, PNG or JPEG)<input type="file" name="bill" accept=".pdf,.png,.jpg,.jpeg"></label>`
    hint = 'Bills can be up to 5 MB. Use Block time on a saved maintenance record to make the vehicle unavailable for its service appointment.'
  }
  return `<form method="post" action="${escapeHtml(url)}" class="student-edit"${section === 'maintenance' ? ' enctype="multipart/form-data"' : ''}>
    <div class="student-edit-fields">${fields}</div>
    ${hint ? `<p class="student-form-note">${hint}</p>` : ''}
    <button type="submit">${creating ? 'Add ' + nouns[section] : 'Save changes'}</button></form>`
}

async function dialog(filters, api, context, selected, issue) {
  const target = vehicleAction(filters)
  if (!target) return ''
  const { action, id, section, collection } = target
  const list = vehicleListUrl(filters)
  const url = vehicleListUrl(filters, { action, ...(id && { record: id }) })
  const close = escapeHtml(list)
  try {
    if (action === 'delete') {
      const record = await api(collection + id + '/')
      return recordDialog('Delete ' + nouns[section], close,
        `<p>Permanently delete this ${nouns[section]} for <strong>${text(record.registration)}</strong>?</p>
          ${section === 'reservations' && record.lesson ? '<p>The linked student lesson will stay on the schedule without a vehicle.</p>' : ''}
          <form method="post" action="${escapeHtml(url)}"><button type="submit">Confirm deletion</button></form>`, issue)
    }
    const options = vehicleFilters(filters)
    const creating = action === 'add'
    let record = creating ? {
      branch: selected?.id, vehicle: options.vehicle, status: 'active', odometer: 0,
      starts_on: options.date, temporary: false, scheduled_on: options.date,
      filled_on: options.date, full_tank: true,
      purpose: ['block', 'lesson'].includes(filters.get('purpose')) ? filters.get('purpose') : 'booking',
      lesson: context.lessons.find(item => String(item.id) === filters.get('lesson'))?.id,
      starts_at: options.date + 'T09:00', ends_at: options.date + 'T10:00',
    } : await api(collection + id + '/')
    if (!creating) {
      record = { ...record }
      for (const name of ['handed_over_at', 'returned_at', 'starts_at', 'ends_at', 'used_at']) {
        if (record[name]) record[name] = formatLocal(record[name])
      }
    }
    return recordDialog((creating ? 'Add ' : 'Edit ') + nouns[section], close,
      renderForm(section, { ...record, ...issue?.values }, context, url, creating), issue)
  } catch (error) {
    if (error.status !== 404) throw error
    return recordDialog('Record unavailable', close, '<p>This record is no longer available.</p>', issue)
  }
}

function renderFilters(options, context, selected) {
  const { section, date, vehicle, instructor } = options
  const { branches, fleet, instructors } = context
  const dropdown = (name, title, current, items) => `<div><label for="vehicle-filter-${name}">${title}</label>
    <select id="vehicle-filter-${name}" name="${name}"><option value="">All ${title.toLowerCase()}</option>
    ${items.map(([id, label]) => `<option value="${escapeHtml(id)}"${String(id) === current ? ' selected' : ''}>${label}</option>`).join('')}</select></div>`
  return `<form class="crm-filters" method="get" action="/dashboard">
    <input type="hidden" name="tab" value="vehicles"><input type="hidden" name="section" value="${section}">
    ${options.history ? '<input type="hidden" name="history" value="1">' : ''}
    ${options.full ? '<input type="hidden" name="full" value="1">' : ''}
    ${options.type ? `<input type="hidden" name="type" value="${options.type}">` : ''}
    ${dropdown('branch', 'Branches', selected?.id, branches.map(branch => [branch.id, branch.label]))}
    ${section !== 'fleet' ? dropdown('vehicle', 'Vehicles', vehicle, fleet.map(item => [item.id, text(item.registration)])) : ''}
    ${['assignments', 'reservations', 'fuel'].includes(section) ? dropdown('instructor', 'Instructors', instructor, instructors.map(item => [item.id, text(item.name)])) : ''}
    ${section === 'fuel' ? `<div><label for="fuel-from">From</label><input id="fuel-from" type="date" name="date_from" value="${options.date_from || ''}"></div>
      <div><label for="fuel-to">To</label><input id="fuel-to" type="date" name="date_to" value="${options.date_to || ''}"></div>` : ''}
    ${['assignments', 'reservations'].includes(section) ? `<div><label for="vehicle-date">Date</label><input id="vehicle-date" type="date" name="date" value="${date}" required></div>` : ''}
    <button type="submit">Apply filters</button></form>`
}

export async function renderVehicles(filters, api, branches, selected, issue) {
  const options = vehicleFilters(filters)
  const { section, date, vehicle, instructor, history, type } = options
  const target = vehicleAction(filters)
  const editing = target && target.action !== 'delete'
  const branchParams = new URLSearchParams({ branch_active: 'true' })
  if (selected) branchParams.set('branch', selected.id)
  const query = new URLSearchParams(branchParams)
  if (vehicle && section !== 'fleet') query.set('vehicle', vehicle)
  if (section === 'reservations') query.set('date', date)
  if (instructor && ['assignments', 'fuel'].includes(section)) query.set('instructor', instructor)
  const invalidFuelRange = section === 'fuel' && options.date_from && options.date_to && options.date_from > options.date_to
  if (section === 'fuel') {
    for (const key of ['date_from', 'date_to']) {
      if (options[key]) query.set(key, options[key])
    }
  }
  const collection = section === 'fleet' ? 'assignments' : section
  const historyQuery = new URLSearchParams(query)
  historyQuery.delete('date')
  if (instructor) historyQuery.set('instructor', instructor)
  const [fleet, records, instructors, lessons, students, allVehicles, usageHistory] = await Promise.all([
    api('/api/vehicles/?' + branchParams),
    invalidFuelRange ? null : api('/api/vehicles/' + collection + '/?' + query),
    editing || ['assignments', 'reservations', 'fuel'].includes(section) ? api('/api/instructors/?branch_active=true') : [],
    editing && section === 'reservations' ? api('/api/lessons/?branch_active=true&date_from=' + date + '&date_to=' + date) : [],
    editing && section === 'reservations' && target.action === 'add' ? api('/api/students/?branch_active=true') : [],
    editing ? api('/api/vehicles/?branch_active=true') : [],
    history ? api('/api/vehicles/reservations/?' + historyQuery) : null,
  ])
  const context = { branches, fleet, instructors, lessons, students }
  let content
  if (section === 'fleet') content = fleetTable(fleet, records, filters)
  if (section === 'assignments') content = assignmentTable(records, filters, date)
  if (section === 'maintenance') content = maintenanceTable(records, filters)
  if (section === 'fuel') content = invalidFuelRange
    ? '<p class="error" role="alert">End date must be on or after the start date.</p>' : renderFuel(records, filters)
  if (section === 'reservations') {
    const visibleFleet = vehicle ? fleet.filter(item => String(item.id) === vehicle) : fleet
    const usage = (usageHistory ?? records).filter(item =>
      (!instructor || String(item.instructor) === instructor) && (!type || item.purpose === type))
    const shift = offset => new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10)
    content = `<div class="crm-section-title"><h2>${dateLabel.format(new Date(date))}</h2><nav class="attendance-options" aria-label="Vehicle calendar dates">
      ${link('Previous day', vehicleListUrl(filters, { date: shift(-1) }))}
      ${link('Today', vehicleListUrl(filters, { date: today() }))}
      ${link('Next day', vehicleListUrl(filters, { date: shift(1) }))}
      ${link(options.full ? 'Working hours' : 'Show 24 hours', vehicleListUrl(filters, { full: options.full ? '' : '1' }))}</nav></div>
      <nav class="vehicle-timeline-key" aria-label="Filter by booking type">
        ${Object.entries(purposes).map(([key, label]) => `<a class="vehicle-event-${key}"
          href="${escapeHtml(vehicleListUrl(filters, { type: type === key ? '' : key }))}"${type === key ? ' aria-current="true"' : ''}>${label}</a>`).join('')}
      </nav>
      <p class="attendance-summary">${type ? `Showing only ${purposes[type].toLowerCase()} entries. Select the active filter to show all booking types.` : 'Scroll across the day. Each coloured line shows the exact booked time. Open a booking to see its details.'}</p>
      ${scheduleTimeline(visibleFleet, records, date, filters, options)}
      <div class="crm-section-title"><h2>${history ? 'Reservation history &amp; recorded usage' : 'Reservations &amp; recorded usage'}</h2>
        ${link(history ? 'Show selected day' : 'Show all dates', vehicleListUrl(filters, { history: history ? '' : '1' }))}</div>
      ${reservationTable(usage, filters)}`
  }
  return `<section class="booking-heading"><div><h1>Vehicles</h1><p>Fleet, instructor assignments, reservations and service history.</p></div>
    ${link('Add ' + nouns[section], vehicleListUrl(filters, { action: 'add' }))}</section>
    <nav class="attendance-options" aria-label="Vehicles sections">${Object.entries(sections).map(([key, label]) =>
      `<a href="${escapeHtml(vehicleListUrl(filters, { section: key, vehicle: '', instructor: '' }))}"${section === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    ${renderFilters(options, context, selected)}
    ${content}
    ${await dialog(filters, api, { ...context, fleet: allVehicles }, selected, issue)}`
}
