import { escapeHtml } from './backend-api.mjs'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const formatHour = hour => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
const localTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
})
const dayMs = 24 * 60 * 60 * 1000
const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const lessonDate = (base, week, day) => new Date(base.getTime() + (week * 7 + day) * dayMs)

function lessonRow(lesson, base, week) {
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
    <span class="lesson-status attendance-${lesson.attendance}">${attendanceLabels[lesson.attendance]}</span></li>`
}

const attendanceLabels = { present: 'Present', absent: 'Absent', scheduled: 'Scheduled' }

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

export function renderDrivingLessons(branches, selected, base, week, period, attendance, records) {
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
    }
  })
  const branchLabel = selected?.label ?? 'All branches'

  return `<section class="booking-heading">
    <div><h1>Driving Lessons</h1><p>Weekly lesson schedule <span class="crm-tag">DEMO DATA</span></p></div>
    <details class="branch-switch"><summary><span>Branch</span><strong>${branchLabel}</strong></summary>
      <nav aria-label="Switch branch">${[undefined, ...branches].map(branch => `<a href="${url(branch, week)}"${branch === selected ? ' aria-current="true"' : ''}>${branch?.label ?? 'All branches'}</a>`).join('')}</nav>
    </details>
  </section>
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
        ${lessons.length ? `<ul class="lesson-list">${lessons.map(lesson => lessonRow(lesson, base, week)).join('')}</ul>` : '<p>No lessons match the selected filters.</p>'}
      </section>
    </div>`
}
