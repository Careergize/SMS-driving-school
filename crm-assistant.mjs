import { escapeHtml } from './backend-api.mjs'

const prompts = ['Who has pending fees?', 'Who was absent today?', 'Show instructor attendance this month', 'Show fuel expenses by branch', 'Show today’s driving lessons']
const formatDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' })
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const asMoney = value => value == null ? 'Not recorded' : money.format(value)
const today = () => formatDay.format(new Date())
const iso = date => date.toISOString().slice(0, 10)
const normalized = value => String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const label = value => String(value ?? '').replaceAll('-', ' ')
const displayTime = value => value ? value.slice(0, 16).replace('T', ' ') + ' IST' : '—'
const shift = (day, offset) => iso(new Date(Date.parse(day) + offset * 86_400_000))

function dates(question) {
  const now = today()
  const explicit = (question.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []).filter(day =>
    Number.isFinite(Date.parse(day)) && iso(new Date(day)) === day && !day.startsWith('0000'))
  if (explicit.length > 1) return { day: explicit[0], from: explicit[0], to: explicit[1] }
  if (explicit.length) return { day: explicit[0], from: explicit[0], to: explicit[0] }
  const monthWords = 'january february march april may june july august september october november december'.split(' ')
  const namedMonth = question.match(new RegExp('\\b(' + monthWords.join('|') + ')\\s+(\\d{4})\\b', 'i'))
  if (/\bmonth\b/i.test(question) || namedMonth) {
    const anchor = new Date(now)
    anchor.setUTCDate(1)
    if (namedMonth && Number(namedMonth[2]) >= 1000 && Number(namedMonth[2]) <= 9998) {
      anchor.setUTCFullYear(Number(namedMonth[2]), monthWords.indexOf(namedMonth[1].toLowerCase()), 1)
    } else if (/\blast month\b/i.test(question)) {
      anchor.setUTCMonth(anchor.getUTCMonth() - 1)
    }
    const from = iso(anchor)
    anchor.setUTCMonth(anchor.getUTCMonth() + 1)
    return { day: from, month: true, from, to: shift(iso(anchor), -1) }
  }
  const day = /\byesterday\b/i.test(question) ? shift(now, -1) : /\btomorrow\b/i.test(question) ? shift(now, 1) : now
  return { day, ...(/\b(today|yesterday|tomorrow)\b/i.test(question) ? { from: day, to: day } : {}) }
}

const routes = {
  attendance: /\b(attend\w*|absent|present|unmarked)\b/i,
  fuel: /\b(fuel|petrol|diesel|mileage|km\s*\/\s*l)\b/i,
  maintenance: /\b(maintenance|servic\w*|repairs?|tyres?|batter\w*)\b/i,
  fees: /\b(fees?|balance|unpaid|payments?|pay|paid|pending|owes?)\b/i,
  assignments: /\b(assign\w*|handover)\b/i,
  reservations: /\b(reserv\w*|blocked|availability|vehicle booking|driving test)\b/i,
  lessons: /\b(lesson\w*|class(?:es)?|schedule)\b/i,
  enquiries: /\b(enquir\w*|inquir\w*|leads?)\b/i,
  finances: /\b(revenue|profit|expenses?|financ\w*|reports?|admissions)\b/i,
  instructors: /\b(instructors?|trainers?)\b/i,
  students: /\b(students?|learners?)\b/i,
  vehicles: /\b(vehicles?|cars?|scooters?|fleet)\b/i,
  branches: /\b(branch\w*|locations?)\b/i,
  catalogue: /\b(courses?|programmes?|programs?|catalog\w*|faq\w*)\b/i,
}

function report(title, summary, columns = [], rows = []) {
  const notice = rows.length > 500 ? ' Showing the first 500 rows. Narrow your question to export a smaller group.' : ''
  return { title, summary: summary + notice, columns, rows: rows.slice(0, 500).map(row =>
    row.map(value => String(value ?? '—').slice(0, 300))) }
}

function namedRows(rows, question, field = 'name') {
  const query = ' ' + normalized(question) + ' '
  const matches = rows.filter(row => {
    const name = normalized(row[field] ?? '')
    return name && query.includes(' ' + name + ' ')
  })
  return matches.length ? matches : rows
}

async function optionalModel(question) {
  const model = process.env.SMS_ASSISTANT_MODEL
  if (!model) return null
  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: false, format: 'json', options: { num_predict: 450 },
        messages: [
          { role: 'system', content: 'Classify staff questions into exactly one route from: ' + Object.keys(routes).join(', ') +
            '. For a general question choose general and answer it briefly in plain text. Return JSON with route and answer. You have no access to private dashboard records. Never invent school facts or claim to make changes.' },
          { role: 'user', content: question },
        ],
      }),
    })
    if (!response.ok) return null
    return JSON.parse((await response.json()).message.content)
  } catch {
    return null
  }
}

export async function answerQuestion(question, api, selected, previous) {
  const followUp = /^(?:and\b|what about\b|how about\b|for\b)/i.test(question)
  const context = followUp && previous ? previous : ''
  const model = Object.entries(routes).find(([, pattern]) => pattern.test(question))
    ?? Object.entries(routes).find(([, pattern]) => pattern.test(context))
  const ai = model ? null : await optionalModel(question)
  const route = model?.[0] ?? ai?.route
  if (!Object.hasOwn(routes, route)) {
    if (route === 'general' && typeof ai.answer === 'string' && ai.answer.trim()) {
      return report('General answer', ai.answer.trim().slice(0, 3800))
    }
    return report('Ask about your dashboard', 'I can look up attendance, fees, students, instructors, driving lessons, vehicles, fuel, assignments, maintenance, enquiries, branches, programmes and business reports. Try adding a branch name, a date, or “this month”.')
  }

  const branches = await api('/api/branches/?is_active=true')
  const findBranch = input => branches.find(item => {
    const value = ' ' + normalized(input) + ' '
    return [item.name, item.code].some(key => value.includes(' ' + normalized(key) + ' '))
  })
  const branch = findBranch(question) ?? (selected && branches.find(item => item.code === selected))
    ?? findBranch(context)
  const scope = branch?.name ?? 'All active branches'
  const period = dates(/\b(today|yesterday|tomorrow|month)\b|\d{4}/i.test(question) ? question : question + ' ' + context)
  const scoped = { branch_active: 'true', ...(branch && { branch: branch.code }) }
  const range = period.from ? { date_from: period.from, date_to: period.to } : {}
  const get = (path, params = scoped) => api(path + '?' + new URLSearchParams(params))
  const who = question + ' ' + context
  if (period.from && period.from > period.to) return report('Check the date range', 'Enter the earlier date first.')

  if (route === 'attendance') {
    if (!period.month && period.from && period.from !== period.to) {
      return report('Choose an attendance period', 'Ask for one date or a named month, such as November 2026.')
    }
    const kind = /\b(instructor|trainer)s?\b/i.test(who) ? 'instructors' : 'students'
    const statuses = value => new Set((value.match(/\b(absent|present|unmarked)\b/gi) ?? []).map(item => item.toLowerCase()))
    const requested = statuses(question)
    const matches = requested.size ? requested : statuses(context)
    const status = matches.size === 1 ? [...matches][0] : undefined
    const data = await get('/api/attendance/', { ...scoped, kind, date: period.day, period: period.month ? 'month' : 'day' })
    const people = namedRows(data.rows, who)
    const branchName = code => branches.find(item => item.code === code)?.name ?? code
    if (period.month) {
      const counts = people.map(item => {
        const marks = Object.values(item.marks)
        const present = marks.filter(mark => mark === 'present').length
        return [item.name, branchName(item.branch), present, marks.length - present]
      })
      const rows = status === 'present' ? counts.filter(row => row[2]) : status === 'absent' ? counts.filter(row => row[3]) : counts
      return report('Monthly ' + kind + ' attendance', `${scope} · ${period.from} to ${period.to}. ${rows.length} matching people.${status === 'unmarked' ? ' Unmarked days are available in daily attendance.' : ''}`,
        ['Name', 'Branch', 'Present days', 'Absent days'], rows)
    }
    const rows = people.map(item => [item.name, branchName(item.branch), item.marks[period.day] || 'unmarked'])
      .filter(row => !status || row[2] === status)
    const breakdown = !status ? ['present', 'absent', 'unmarked'].map(mark =>
      rows.filter(row => row[2] === mark).length + ' ' + mark).join(', ') + '.' : ''
    return report('Daily ' + kind + ' attendance', `${scope} · ${period.day}. ${rows.length} matching ${kind}${status ? ' marked ' + status : ''}. ${breakdown}`.trim(),
      ['Name', 'Branch', 'Attendance'], rows)
  }

  if (['fees', 'students'].includes(route)) {
    const students = namedRows(await get('/api/students/'), who)
    const branchName = code => branches.find(item => item.code === code)?.name ?? code
    if (route === 'fees') {
      const paid = /\bpaid\b/i.test(who) && !/\b(unpaid|pending|due|balance)\b/i.test(who)
      const all = /\b(all|every|summary)\b/i.test(who) && !/\b(unpaid|pending|due)\b/i.test(who)
      const matches = students.filter(item => all || item.payment === (paid ? 'paid' : 'unpaid'))
      const balance = item => item.total_fee == null || item.amount_paid == null ? null
        : (Math.round(Number(item.total_fee) * 100) - Math.round(Number(item.amount_paid) * 100)) / 100
      const known = matches.filter(item => balance(item) != null)
      return report(all ? 'Student fee summary' : paid ? 'Students with paid fees' : 'Students with pending fees',
        `${scope}. ${matches.length} matching students. Recorded balance: ${asMoney(known.reduce((total, item) => total + balance(item), 0))}. ${matches.length - known.length} with amounts unrecorded.`,
        ['Student', 'Branch', 'Total fee', 'Paid', 'Pending', 'Status'],
        matches.map(item => [item.name, branchName(item.branch), asMoney(item.total_fee), asMoney(item.amount_paid), asMoney(balance(item)), item.payment]))
    }
    return report('Students', `${scope}. ${students.length} students.`, ['Student', 'ID', 'Branch', 'Course', 'Status', 'Joined'],
      students.map(item => [item.name, item.code, branchName(item.branch), label(item.course), label(item.status), item.enrolled_on]))
  }

  if (route === 'fuel') {
    const data = await get('/api/vehicles/fuel/', { ...scoped, ...range })
    const group = /\bby instructor\b/i.test(who) ? 'instructors' : /\bby vehicle\b/i.test(who) ? 'vehicles' : /\bby branch\b/i.test(who) ? 'branches' : null
    const coverage = period.from ? `${period.from} to ${period.to}` : 'All recorded dates'
    if (group) return report('Fuel expense by ' + { branches: 'branch', vehicles: 'vehicle', instructors: 'instructor' }[group],
      `${scope} · ${coverage}. Total fuel expense ${asMoney(data.summary.total_expense)}.`,
      ['Group', 'Litres', 'Expense'], data.summary[group].map(item => [item.name, item.litres, asMoney(item.total_expense)]))
    return report('Fuel expenses', `${scope} · ${coverage}. Total fuel expense ${asMoney(data.summary.total_expense)}.`,
      ['Vehicle', 'Date', 'Branch', 'Instructor', 'Litres', 'Expense', 'km/L'],
      data.entries.map(item => [item.registration, item.filled_on, item.branch_name, item.instructor_name, item.litres, asMoney(item.total_expense), item.km_per_litre]))
  }

  if (route === 'lessons') {
    const records = await get('/api/lessons/', { ...scoped, ...(period.from ? range : { date_from: period.day, date_to: period.day }) })
    const people = namedRows(namedRows(records, who, 'student_name'), who, 'instructor_name')
    return report('Driving lessons', `${scope} · ${period.from && period.from !== period.to ? period.from + ' to ' + period.to : period.day}. ${people.length} lessons.`,
      ['Time', 'Student', 'Instructor', 'Vehicle', 'Attendance'],
      people.map(item => [displayTime(item.starts_at), item.student_name, item.instructor_name, item.vehicle_registration, item.attendance]))
  }

  if (route === 'finances') {
    const months = /\b3 months\b/i.test(who) ? 3 : /\bmonth\b/i.test(who) ? 1 : 6
    const data = await get('/api/reports/', { ...scoped, period: months })
    return report('Business report', `${scope}. Latest ${months} reporting month(s) available in the CRM.`,
      ['Month', 'Admissions', 'Enquiries', 'Revenue', 'Expenses', 'Pending'],
      data.map(item => [item.month.slice(0, 7), item.admissions, item.enquiries, asMoney(item.revenue), asMoney(item.expenses), asMoney(item.pending_payments)]))
  }

  const lists = {
    instructors: ['/api/instructors/', ['Instructor', 'ID', 'Mobile', 'Status', 'Joined'],
      item => [item.name, item.code, item.mobile, label(item.status), item.joined_on]],
    vehicles: ['/api/vehicles/', ['Registration', 'Vehicle', 'Branch', 'Status', 'Odometer'],
      item => [item.registration, item.name, item.branch_name, label(item.status), item.odometer]],
    assignments: ['/api/vehicles/assignments/', ['Vehicle', 'Instructor', 'Starts', 'Ends', 'Temporary'],
      item => [item.registration, item.instructor_name, item.starts_on, item.ends_on, item.temporary ? 'Yes' : 'No']],
    reservations: ['/api/vehicles/reservations/', ['Vehicle', 'Purpose', 'Start', 'End', 'Instructor', 'Student'],
      item => [item.registration, label(item.purpose), displayTime(item.starts_at), displayTime(item.ends_at), item.instructor_name, item.student_name]],
    maintenance: ['/api/vehicles/maintenance/', ['Vehicle', 'Work', 'Scheduled', 'Provider', 'Cost', 'Next due'],
      item => [item.registration, label(item.kind), item.scheduled_on, item.service_provider, asMoney(item.cost), item.next_due_on]],
    enquiries: ['/api/enquiries/', ['Name', 'Programme', 'Status', 'Received'],
      item => [item.name, item.programme, item.status, displayTime(item.created_at)]],
    catalogue: ['/api/catalog/', ['Name', 'Type', 'Summary'], item => [item.name, item.kind, item.summary]],
  }
  if (route === 'branches') return report('Branches', `${branches.length} active branches.`, ['Code', 'Branch'], branches.map(item => [item.code, item.name]))
  const [path, columns, toRow] = lists[route]
  const network = ['enquiries', 'catalogue'].includes(route)
  const params = network ? {} : route === 'reservations' ? { ...scoped, date: period.day } : scoped
  const records = await get(path, params)
  const named = namedRows(namedRows(records, who), who, 'instructor_name')
  const rows = named.filter(item => {
    if (!period.from || route === 'reservations') return true
    if (route === 'assignments') return item.starts_on <= period.to && (!item.ends_on || item.ends_on >= period.from)
    const date = item.scheduled_on ?? item.created_at?.slice(0, 10)
    return !date || (date >= period.from && date <= period.to)
  })
  return report(label(route[0].toUpperCase() + route.slice(1)),
    `${network ? 'School-wide records' : scope}${route === 'reservations' ? ' · ' + period.day : ''}. ${rows.length} records.`, columns, rows.map(toRow))
}

const avatar = `<svg class="assistant-avatar" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="32" fill="#dce9ff"/>
  <path d="M15 40V26c0-12 7-19 17-19s17 7 17 19v14c0 5 3 8 4 10H11c2-3 4-6 4-10" fill="#233252"/>
  <path d="M7 58c4-9 12-13 21-14h8c9 1 17 5 21 14-7 4-15 6-25 6S14 62 7 58" fill="#2457a6"/>
  <path d="M27 38h10v10c-3 4-7 4-10 0z" fill="#c98565"/>
  <path d="M20 25c5-1 12-4 17-9 1 5 4 7 7 9v5c0 9-6 14-12 14s-12-5-12-14z" fill="#e7aa87"/>
  <circle cx="27" cy="30" r="1.3" fill="#233252"/><circle cx="37" cy="30" r="1.3" fill="#233252"/>
  <path d="M29 36q3 3 6 0" fill="none" stroke="#8c484c" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="20" cy="36" r="2" fill="#f3cd73"/><circle cx="44" cy="36" r="2" fill="#f3cd73"/>
</svg>`

export function renderAssistantConversation(conversation, issue) {
  const entries = conversation.map(({ id, question, title, summary, columns, rows }) => {
    const table = columns.length && rows.length ? `<div class="crm-table" tabindex="0" aria-label="Answer data">
      <table><thead><tr>${columns.map(column => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, 12).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>` : ''
    return `<article class="assistant-turn">
      <p class="assistant-question"><strong>You</strong> ${escapeHtml(question)}</p>
      <div class="assistant-reply">${avatar}<div class="assistant-answer crm-card">
        <span class="assistant-label">Maya · Staff assistant</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p>
        ${table}
        ${rows.length > 12 ? `<p class="assistant-label">Showing 12 of ${rows.length} report rows.</p>` : ''}
        <a class="student-action" href="/assistant-reports/${id}/">Download PDF</a>
      </div></div></article>`
  }).join('')
  return (entries || '<p class="assistant-welcome">Hi, I’m Maya. Ask me about attendance, pending fees, lessons, vehicles, or other school records.</p>')
    + (issue ? `<p class="error" role="alert">${escapeHtml(issue.message)}</p>` : '')
}

export function renderAssistantWidget(filters, conversation = []) {
  const params = new URLSearchParams(filters)
  params.set('assistant', 'ask')
  const url = escapeHtml('/dashboard?' + params)
  return `<details class="assistant-widget"${filters.get('assistant') === 'open' ? ' open' : ''}>
    <summary>${avatar}<span>Ask Maya</span></summary>
    <section class="assistant-panel" aria-labelledby="assistant-title">
    <header class="assistant-header">${avatar}<div><h2 id="assistant-title">Maya</h2><p>Staff assistant</p></div>
      <button class="assistant-close" type="button" aria-label="Close Maya chat">×</button></header>
    <form class="assistant-prompts" method="post" action="${url}" aria-label="Example questions">${prompts.map(prompt =>
      `<button type="submit" name="question" value="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}</form>
    <div class="assistant-transcript" role="log" aria-label="Conversation" tabindex="0">${renderAssistantConversation(conversation)}</div>
    <p class="assistant-feedback" role="status"></p>
    <form class="assistant-compose crm-card" method="post" action="${url}">
      <label for="assistant-question">Ask a question</label>
      <div><input id="assistant-question" name="question" required maxlength="500" placeholder="Ask about your school…"><button type="submit">Send</button></div>
    </form>
  </section></details><script type="module" src="/assistant-widget.mjs"></script>`
}
