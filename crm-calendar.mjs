import { escapeHtml } from './backend-api.mjs'
import { renderStudentLicence } from './crm-licences.mjs'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const formatHour = hour => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
const localTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
})
const dayMs = 24 * 60 * 60 * 1000
const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const lessonDate = (base, week, day) => new Date(base.getTime() + (week * 7 + day) * dayMs)

function lessonRow(lesson, base, week, calendarUrl) {
  const date = lessonDate(base, week, lesson.day)
  const params = new URLSearchParams({ tab: 'vehicles', section: 'reservations', branch: lesson.branch.id, date: date.toISOString().slice(0, 10) })
  if (!lesson.vehicle) {
    params.set('action', 'add')
    params.set('purpose', 'lesson')
    params.set('lesson', lesson.id)
  }
  return `<li><div class="lesson-date"><span>${dateLabel.formatToParts(date).find(part => part.type === 'month').value}</span><strong>${date.getUTCDate()}</strong><small>${formatHour(lesson.hour)}</small></div>
    <div class="lesson-info"><strong>${lesson.name}</strong><span>${lesson.duration} min · Driving lesson</span><small>${lesson.instructor} · ${lesson.branch.name}</small>
      <a href="/dashboard?${escapeHtml(params.toString())}">${lesson.vehicle ? escapeHtml(lesson.vehicle) : 'Reserve vehicle'}</a></div>
    <span class="lesson-status attendance-${lesson.attendance}">${attendanceLabels[lesson.attendance]}</span>
    ${lesson.canMark ? `<form class="lesson-mark" method="post" action="${calendarUrl}&amp;action=mark-attendance&amp;lesson=${lesson.id}">
      <label for="mark-lesson-${lesson.id}">Attendance</label>
      <select id="mark-lesson-${lesson.id}" name="attendance">${Object.entries(attendanceLabels).map(([value, label]) => `<option value="${value}"${value === lesson.attendance ? ' selected' : ''}>${label}</option>`).join('')}</select>
      <button type="submit">Save</button>
    </form>` : ''}</li>`
}

const attendanceLabels = { present: 'Present', late: 'Late', absent: 'Absent', scheduled: 'Scheduled' }

function renderStudentAttendance(total, attendance, format) {
  const { attended, late, absent, percentage, today, history } = attendance
  const days = new Map()
  const months = new Set([today.slice(0, 7)])
  for (const record of history) {
    months.add(record.date.slice(0, 7))
    const statuses = days.get(record.date) ?? []
    statuses.push(record.status)
    days.set(record.date, statuses)
  }
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const calendars = [...months].sort().reverse().map(month => {
    const date = new Date(month + '-01T00:00:00Z')
    const offset = (date.getUTCDay() + 6) % 7
    const count = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    return `<details class="student-attendance-month"${month === today.slice(0, 7) ? ' open' : ''}>
      <summary>${monthLabel.format(date)}</summary>
      <div class="student-attendance-grid">
        ${weekdays.map(day => `<strong>${day}</strong>`).join('')}
        ${'<span aria-hidden="true"></span>'.repeat(offset)}
        ${Array.from({ length: count }, (_, index) => {
          const day = index + 1
          const key = month + '-' + String(day).padStart(2, '0')
          return `<div class="attendance-day"${key === today ? ' aria-current="date"' : ''}><time datetime="${key}">${day}</time>
            ${(days.get(key) ?? []).map(status => `<span class="lesson-status attendance-${status}">${attendanceLabels[status]}</span>`).join('')}
          </div>`
        }).join('')}
      </div>
    </details>`
  })
  const cards = [
    ['Total classes scheduled', total], ['Classes attended', attended], ['Absent classes', absent],
    ['Attendance percentage', percentage === null ? '—' : `${percentage}%`], ['Late arrivals', late],
  ]
  return `<section id="student-attendance" class="student-attendance" aria-labelledby="student-attendance-title">
    <div class="crm-intro"><h1 id="student-attendance-title">Attendance</h1><p>Late arrivals count as attended. The percentage uses marked classes.</p></div>
    <div class="crm-kpis student-kpis">
      ${cards.map(([label, value]) => `<div class="crm-card crm-kpi"><strong>${value}</strong><div>${label}</div></div>`).join('')}
    </div>
    <section class="crm-card student-attendance-panel"><h2>Attendance calendar</h2>${calendars.join('')}</section>
    <section class="crm-card student-attendance-panel"><h2>Attendance history · IST</h2>
      ${history.length ? `<ul class="lesson-list student-lesson-list">${[...history].reverse().map(record => `<li>
        <div class="lesson-info"><strong>${format.format(new Date(record.starts_at))}</strong><span>Instructor: ${escapeHtml(record.instructor)}</span></div>
        <span class="lesson-status attendance-${record.status}">${record.status === 'scheduled' && new Date(record.starts_at) < new Date() ? 'Awaiting mark' : attendanceLabels[record.status]}</span>
      </li>`).join('')}</ul>` : '<p>No classes have been scheduled yet.</p>'}
    </section>
  </section>`
}

const studentLessonDay = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' })
const studentLessonTime = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' })

function renderStudentLessonList(lessons, emptyMessage, isHistory = false) {
  if (!lessons.length) return `<p>${emptyMessage}</p>`
  return `<ul class="lesson-list student-lesson-list">${lessons.map(lesson => {
    const status = Object.hasOwn(attendanceLabels, lesson.attendance) ? lesson.attendance : 'scheduled'
    const label = lesson.in_progress ? 'In progress'
      : (lesson.attendance_pending ?? (isHistory && status === 'scheduled')) ? 'Attendance pending' : attendanceLabels[status]
    const start = new Date(lesson.starts_at)
    const time = lesson.ends_at
      ? studentLessonTime.formatRange(start, new Date(lesson.ends_at))
      : studentLessonTime.format(start)
    return `<li>
      <div class="lesson-info">
        <strong>${studentLessonDay.format(start)}</strong>
        <span>${time} IST</span>
        <span>${escapeHtml(lesson.branch)} · Instructor: ${escapeHtml(lesson.instructor)}</span>
        ${lesson.vehicle ? `<small>Vehicle: ${escapeHtml(lesson.vehicle)}</small>` : ''}
      </div>
      <span class="lesson-status attendance-${status}">${label}</span>
    </li>`
  }).join('')}</ul>`
}

export function renderStudentLessons(profile, { upcoming: lessons, history }, summary, profileError, saved, attendance, instructors, licence, uploadMessage) {
  const { name, phone, email = '', address = '', birth_date, branch, course } = profile
  const birthDate = birth_date
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(birth_date))
    : 'Not recorded'
  const firstName = name.trim().split(/\s+/)[0]
  const format = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  })
  const today = [...lessons, ...history].filter(lesson => lesson.date === attendance.today)
    .sort((first, second) => Date.parse(first.starts_at) - Date.parse(second.starts_at))
  const upcoming = lessons.filter(lesson => lesson.date !== attendance.today)
  const past = history.filter(lesson => lesson.date !== attendance.today)
  const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const cards = [
    ['Total Classes', summary.total, 'Enrolled sessions'],
    ['Completed', summary.completed, 'Training sessions'],
    ['Remaining', summary.remaining, 'Upcoming sessions'],
    ['Pending Fees', summary.pending_fees === null ? 'Not set' : rupees.format(summary.pending_fees), 'Outstanding balance'],
  ]
  return `<div class="crm-shell student-dashboard">
    <aside class="crm-side">
      <a class="crm-brand" href="/"><img src="/sms-logo.jpg" alt=""><span>SMS<small>Student portal</small></span></a>
      <nav aria-label="Student dashboard">
        <a href="#student-overview">Dashboard</a>
        <a href="#student-attendance">Attendance</a>
        <a href="#lessons">Driving Lessons</a>
        <a href="#learner-test">Learner’s Test</a>
        <a href="#student-instructors">Instructor Details</a>
        <a href="#student-licence">Licence &amp; RTO</a>
        <a href="#student-profile">My Profile</a>
      </nav>
      <form class="crm-side-footer" method="post" action="/student-login"><button name="action" value="sign-out">Sign out</button></form>
    </aside>
    <main class="crm-main">
      <div class="crm-top"><span>STUDENT PORTAL</span><span>${escapeHtml(name)}</span></div>
      <section id="student-overview" class="crm-intro student-overview" aria-labelledby="student-overview-title">
        <h1 id="student-overview-title">Welcome, <span class="student-welcome-name">${escapeHtml(firstName)}</span></h1>
        <div class="crm-kpis student-kpis" aria-label="Class and fee summary">
          ${cards.map(([label, value, detail]) => `<div class="crm-card crm-kpi">
            <strong>${escapeHtml(value)}</strong><div>${label}</div><small>${detail}</small>
          </div>`).join('')}
        </div>
        <div class="crm-card student-summary">
          <h2>Driving lesson schedule</h2>
          <p>${today.length ? `${today.length} ${today.length === 1 ? 'lesson' : 'lessons'} today · ` : ''}${lessons.length ? `${lessons[0].in_progress ? 'In progress since' : 'Next lesson'} ${format.format(new Date(lessons[0].starts_at))} IST` : 'No upcoming lessons.'}</p>
          <a href="#lessons">View driving lessons</a>
        </div>
      </section>
      <section id="lessons" class="student-lessons" aria-labelledby="student-lessons-title">
        <div class="crm-intro"><h1 id="student-lessons-title">Driving Lessons</h1><p>All times in IST</p></div>
        <div class="crm-card booking-card student-lesson-group">
          <h2>Today’s lessons</h2>
          ${renderStudentLessonList(today, 'You have no driving lessons today.', true)}
        </div>
        <div class="crm-card booking-card student-lesson-group">
          <h2>Upcoming lessons</h2>
          ${renderStudentLessonList(upcoming, 'You have no driving lessons booked after today.')}
        </div>
        <div class="crm-card booking-card student-lesson-group">
          <h2>Lesson history</h2>
          ${renderStudentLessonList(past, 'You have no lessons from previous days.', true)}
        </div>
      </section>
      ${renderStudentAttendance(summary.total, attendance, format)}
      <section id="learner-test" class="student-learner-test" aria-labelledby="learner-test-title">
        <div class="crm-intro"><h1 id="learner-test-title">SMS Learner’s Licence Practice Test</h1></div>
        <div class="crm-card learner-test-card" data-learner-test>
          <p>Practice with 20 questions on traffic rules, road signs and safe driving. You have 60 seconds per question. Review your answers at the end.</p>
          <button type="button" data-action="start" hidden>Start practice test</button>
          <noscript><p>Enable JavaScript to take the practice test.</p></noscript>
        </div>
        <script type="module" src="/learner-test.mjs"></script>
      </section>
      ${renderStudentLicence(licence, uploadMessage)}
      <section id="student-instructors" class="student-instructors" aria-labelledby="student-instructors-title">
        <div class="crm-intro"><h1 id="student-instructors-title">Instructor Details</h1></div>
        ${instructors.length ? `<div class="enquiry-grid">
          ${instructors.map(instructor => `<article class="crm-card enquiry-card">
            <div><h2>${escapeHtml(instructor.name)}</h2><p>${instructor.assigned ? 'Assigned instructor' : instructor.upcoming ? 'Upcoming lesson instructor' : 'Past lesson instructor'}</p></div>
            <dl class="enquiry-details">
              <div><dt>Branch</dt><dd>${escapeHtml(instructor.branch)}</dd></div>
              <div><dt>Experience</dt><dd>${Number.isInteger(instructor.experience_years) ? `${instructor.experience_years} ${instructor.experience_years === 1 ? 'year' : 'years'}` : 'Not recorded'}</dd></div>
              <div><dt>Contact number</dt><dd>${instructor.mobile ? escapeHtml(instructor.mobile) : 'Not recorded'}</dd></div>
            </dl>
          </article>`).join('')}
        </div>` : '<p class="crm-card">Instructor details will appear once an instructor is assigned or a lesson is booked.</p>'}
      </section>
      <section id="student-profile" class="student-profile${profileError ? ' student-profile-error' : ''}" aria-labelledby="student-profile-title">
        <div class="crm-intro"><h1 id="student-profile-title">My Profile</h1></div>
        <form class="crm-card student-profile-form" method="post" action="/student-login#student-profile">
          <input type="hidden" name="action" value="profile">
          ${profileError ? `<p class="error" role="alert">${escapeHtml(profileError)}</p>` : ''}
          ${saved ? '<p role="status">Your profile was updated.</p>' : ''}
          <label for="profile-name">Full name</label>
          <input id="profile-name" name="name" value="${escapeHtml(name)}" autocomplete="name" maxlength="120" required>
          <label for="profile-phone">Contact number</label>
          <input id="profile-phone" name="phone" type="tel" value="${escapeHtml(phone)}" autocomplete="tel" maxlength="32">
          <label for="profile-email">Email address</label>
          <input id="profile-email" name="email" type="email" value="${escapeHtml(email)}" autocomplete="email" maxlength="254">
          <label for="profile-address">Home address</label>
          <textarea id="profile-address" name="address" autocomplete="street-address" rows="3" maxlength="500">${escapeHtml(address)}</textarea>
          <dl class="enquiry-details student-profile-details">
            <div><dt>Date of birth</dt><dd>${escapeHtml(birthDate)}</dd></div>
            <div><dt>Branch</dt><dd>${escapeHtml(branch ?? 'Not recorded')}</dd></div>
            <div><dt>Course</dt><dd>${escapeHtml(course ?? 'Not recorded')}</dd></div>
          </dl>
          <p>Contact the driving school to correct your date of birth.</p>
          <button type="submit">Save changes</button>
        </form>
      </section>
    </main>
  </div>`
}

function lessonCalendar(lessons, base, week) {
  const slots = new Map()
  for (const lesson of lessons) {
    const slot = lesson.day * 24 + lesson.hour
    if (!slots.has(slot)) slots.set(slot, [])
    slots.get(slot).push(lesson)
  }
  const hours = [...new Set([8, 9, 10, 11, 12, 13, 14, 15, 16, ...lessons.map(lesson => lesson.hour)])].sort((a, b) => a - b)
  return `<div class="booking-scroll" tabindex="0" aria-label="Scrollable weekly lesson calendar">
    <table class="booking-grid" aria-label="Weekly lesson calendar">
      <thead><tr><th scope="col">Time</th>${weekdays.map((day, index) => `<th scope="col">${day}<small>${dateLabel.format(lessonDate(base, week, index))}</small></th>`).join('')}</tr></thead>
      <tbody>${hours.map(hour => `<tr><th scope="row">${formatHour(hour)}</th>${weekdays.map((_, day) => {
        const entries = slots.get(day * 24 + hour) ?? []
        const today = week === 0 && day === 0 ? ' class="booking-today"' : ''
        return `<td${today}>${entries.map(lesson => `<div class="booking-event attendance-${lesson.attendance}" title="${lesson.name} · ${lesson.branch.name} · ${formatHour(hour)}"><strong>${lesson.name}</strong><small>${formatHour(hour)} · ${lesson.duration} min</small><small>${attendanceLabels[lesson.attendance]}</small></div>`).join('')}</td>`
      }).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>`
}

export function renderDrivingLessons(branches, selected, base, week, period, attendance, records, students, instructors, vehicles, date, issue) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date())
  const formDate = issue?.values?.date ?? date
  const activeAttendance = Object.hasOwn(attendanceLabels, attendance) ? attendance : ''
  const url = (branch, offset, status = activeAttendance) => `/dashboard?tab=bookings&amp;week=${offset}${branch ? `&amp;branch=${branch.id}` : ''}${period !== '6' ? `&amp;period=${period}` : ''}${status ? `&amp;attendance=${status}` : ''}`
  const lessons = records.map(record => {
    const parts = Object.fromEntries(localTime.formatToParts(new Date(record.starts_at)).map(({ type, value }) => [type, value]))
    const date = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
    return {
      branch: branches.find(branch => branch.id === record.branch),
      id: record.id,
      vehicle: record.vehicle_registration,
      day: (date - lessonDate(base, week, 0).getTime()) / dayMs,
      hour: Number(parts.hour),
      name: escapeHtml(record.student_name),
      instructor: escapeHtml(record.instructor_name),
      duration: record.duration_minutes,
      attendance: record.attendance,
      canMark: new Date(record.starts_at) <= new Date(),
    }
  })
  const branchLabel = selected?.label ?? 'All branches'

  return `<section class="booking-heading">
    <div><h1>Driving Lessons</h1><p>Weekly lesson schedule</p></div>
    <details class="branch-switch"><summary><span>Branch</span><strong>${branchLabel}</strong></summary>
      <nav aria-label="Switch branch">${[undefined, ...branches].map(branch => `<a href="${url(branch, week)}"${branch === selected ? ' aria-current="true"' : ''}>${branch?.label ?? 'All branches'}</a>`).join('')}</nav>
    </details>
  </section>
    <details class="crm-card lesson-scheduler"${issue?.lesson ? ' open' : ''}>
      <summary>Schedule a lesson</summary>
      ${issue?.lesson ? `<p class="error" role="alert">${escapeHtml(issue.lesson)}</p>` : ''}
      ${students.length && instructors.length ? `<form class="crm-filters" method="post" action="${url(selected, week)}&amp;action=schedule">
        <div><label for="lesson-student">Student</label><select id="lesson-student" name="student" required><option value="">Choose student</option>${students.map(student => `<option value="${student.id}"${String(student.id) === issue?.values?.student ? ' selected' : ''}>${escapeHtml(student.name)} · ${escapeHtml(student.code)}</option>`).join('')}</select></div>
        <div><label for="lesson-instructor">Instructor</label><select id="lesson-instructor" name="instructor" required><option value="">Choose instructor</option>${instructors.map(instructor => `<option value="${instructor.id}"${String(instructor.id) === issue?.values?.instructor ? ' selected' : ''}>${escapeHtml(instructor.name)} · ${escapeHtml(instructor.code)}</option>`).join('')}</select></div>
        <div><label for="lesson-vehicle">Vehicle (optional)</label><select id="lesson-vehicle" name="vehicle">
          <option value="">Assign later</option>
          ${vehicles.map(vehicle => `<option value="${vehicle.id}"${String(vehicle.id) === issue?.values?.vehicle ? ' selected' : ''}>${escapeHtml(vehicle.registration)} · ${escapeHtml(vehicle.name)} · ${escapeHtml(vehicle.branch_name)}</option>`).join('')}
        </select></div>
        <div><label for="lesson-day">Lesson date</label><input type="date" id="lesson-day" name="date" min="${today}" value="${escapeHtml(formDate < today ? today : formDate)}" required></div>
        <div><label for="lesson-hour">Start time (IST)</label><select id="lesson-hour" name="hour" required><option value="">Choose time</option>${Array.from({ length: 24 }, (_, hour) => `<option value="${hour}"${String(hour) === issue?.values?.hour ? ' selected' : ''}>${formatHour(hour)}</option>`).join('')}</select></div>
        <button type="submit">Schedule lesson</button>
      </form>` : '<p>Add a student and an active instructor in the selected branch to schedule a lesson.</p>'}
    </details>
    <div class="booking-toolbar"><div>
        <a href="${url(selected, 0)}">Snapshot week</a>
        ${week > -520 ? `<a href="${url(selected, week - 1)}" aria-label="Previous week">‹</a>` : ''}
        ${week < 520 ? `<a href="${url(selected, week + 1)}" aria-label="Next week">›</a>` : ''}
      </div><strong>${dateLabel.format(lessonDate(base, week, 0))} – ${dateLabel.format(lessonDate(base, week, 6))}, ${lessonDate(base, week, 6).getUTCFullYear()}</strong></div>
    <div class="booking-layout">
      <section class="crm-card booking-card" aria-labelledby="calendar-title">
        <h2 id="calendar-title">Weekly calendar</h2>
        <nav class="attendance-legend" aria-label="Filter lessons by attendance">${[['', 'All'], ...Object.entries(attendanceLabels)].map(([status, label]) => `<a class="lesson-status attendance-${status || 'all'}" href="${url(selected, week, status)}"${status === activeAttendance ? ' aria-current="true"' : ''}>${label}</a>`).join('')}</nav>
        ${lessonCalendar(lessons, base, week)}
      </section>
      <section class="crm-card booking-card" id="lessons" aria-labelledby="lessons-title">
        <h2 id="lessons-title">Lesson list</h2>
        ${issue?.attendanceMark ? `<p class="error" role="alert">${escapeHtml(issue.attendanceMark)}</p>` : ''}
        ${lessons.length ? `<ul class="lesson-list">${lessons.map(lesson => lessonRow(lesson, base, week, url(selected, week))).join('')}</ul>` : '<p>No lessons match the selected filters.</p>'}
      </section>
    </div>`
}
