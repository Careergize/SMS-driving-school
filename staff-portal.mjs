import { randomBytes } from 'node:crypto'
import { backendApi, backendFetch, escapeHtml } from './backend-api.mjs'
import { dashboardStyles, renderDashboard } from './crm-dashboard.mjs'
import { renderStudentLessons } from './crm-calendar.mjs'
import { answerQuestion, renderAssistantConversation, renderAssistantWidget } from './crm-assistant.mjs'
import { attendanceFilters, attendanceUrl } from './crm-attendance.mjs'
import { readVehicleFields, vehicleAction, vehicleListUrl, vehiclePayload } from './crm-vehicles.mjs'
import { instructorAction, instructorListUrl, readInstructorFields } from './crm-instructors.mjs'
import { readStudentFields, studentAction, studentListUrl } from './crm-students.mjs'

const sessionLifetime = 8 * 60 * 60
const sessionCookie = 'sms_staff'
const sessions = new Map()

function page(title, content, isDashboard = false, isLogin = false) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | SMS Motor Driving School</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/dricub-assets/sms-favicon-32.png?v=2">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8f5f5; color: #18181e; font: 1rem/1.55 Arial, sans-serif; }
    a { color: #a3152b; text-underline-offset: .2em; }
    :focus-visible { outline: 3px solid #a3152b; outline-offset: 4px; }
    header { background: #08244e; color: white; padding: 1rem max(1.25rem, calc((100% - 68rem) / 2)); }
    header a { color: white; display: inline-flex; align-items: center; gap: .75rem; text-decoration: none; font-weight: 700; }
    header img { width: 48px; height: 38px; object-fit: contain; border-radius: 4px; background: white; }
    main { width: min(68rem, calc(100% - 2.5rem)); margin: clamp(2rem, 7vw, 5rem) auto; }
    .panel { padding: clamp(1.25rem, 4vw, 2rem); background: white; border: 1px solid #eadfe1; border-radius: .65rem; }
    .label { font-size: .78rem; text-transform: uppercase; letter-spacing: .14em; color: #a3152b; font-weight: 700; }
    h1 { line-height: 1.1; font-size: clamp(2rem, 5vw, 3rem); margin: .4rem 0; }
    h2 { margin-top: 0; font-size: 1.2rem; }
    p { color: #57535a; }
    label { display: block; font-weight: 700; margin: 1rem 0 .3rem; }
    input, textarea { width: 100%; padding: .7rem; font: inherit; border: 1px solid #81777c; border-radius: .3rem; }
    button { background: #a3152b; color: white; border: 0; border-radius: .35rem; padding: .75rem 1rem; font: inherit; font-weight: 700; cursor: pointer; }
    button:hover { background: #821023; }
    .error { color: #941327; background: #fff0f2; padding: .75rem; border-radius: .35rem; }
    .heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
    ul { padding-left: 1.25rem; margin-bottom: 0; }
    li + li { margin-top: .4rem; }
    ${isDashboard ? dashboardStyles : ''}
    ${isLogin ? loginStyles : ''}
  </style>
</head>
<body>
  ${isDashboard || isLogin ? '' : '<header><a href="/"><img src="/sms-logo.jpg" alt=""> SMS Motor Driving School</a></header>'}
  ${content}
</body>
</html>`
}

const loginStyles = `
  body { --login-accent: rgb(189, 24, 48); display: grid; place-items: center; min-height: 100svh; background: #f2f4f7; }
  .login {
    display: grid; grid-template-columns: 1.08fr 1fr;
    width: min(66rem, calc(100% - 2rem)); margin: 1.5rem auto;
    padding: clamp(1rem, 4vw, 3rem); background: white; border-radius: 2rem;
    box-shadow: 0 2rem 5rem rgba(29, 39, 56, .16);
  }
  .login-intro {
    display: flex; flex-direction: column; min-height: 32rem; overflow: hidden;
    position: relative; isolation: isolate; padding: clamp(1.5rem, 4vw, 3rem);
    border-radius: 1.75rem; background: var(--login-accent); color: #fff;
  }
  .login-intro img {
    position: absolute; inset: auto 0 0; z-index: -2; width: 100%; height: 60%; object-fit: cover;
  }
  .login-intro::after {
    content: ''; position: absolute; inset: 0; z-index: -1;
    background: linear-gradient(175deg, var(--login-accent) 38%, rgb(189 24 48 / 65%) 66%, transparent 86%);
  }
  .login-intro h2 { font-size: clamp(1.85rem, 3.7vw, 3rem); line-height: 1.08; letter-spacing: -.04em; margin: 0; }
  .login-intro p { color: inherit; max-width: 21rem; margin: .8rem 0 0; }
  .login-form { align-self: center; width: min(100%, 24rem); justify-self: center; padding: 1.5rem clamp(.75rem, 2vw, 1.5rem); }
  .login-brand { display: flex; gap: .65rem; align-items: center; justify-content: center; font-size: .9rem; font-weight: 700; }
  .login-brand img { width: 3rem; height: 2.5rem; object-fit: contain; }
  .login-form h1 { text-align: center; font-size: clamp(1.9rem, 3vw, 2.6rem); letter-spacing: -.04em; margin: 1.2rem 0 .4rem; }
  .login-subtitle, .login-home, .login-register { text-align: center; font-size: .9rem; margin: 0; }
  .login-register { margin-bottom: .75rem; }
  .login-register a { font-weight: 700; text-decoration: underline; }
  .login-form form { margin: 1.5rem 0; }
  .login-form label { font-size: .875rem; }
  .login-form input { background: #f3f4f6; border: 1px solid #d9dce2; border-radius: .7rem; padding: .85rem 1rem; }
  .login-form button { width: 100%; margin-top: 1.35rem; border-radius: .7rem; background: var(--login-accent); color: #fff; }
  .login-form button:hover { background: #a3152b; }
  @media (max-width: 680px) {
    .login { grid-template-columns: 1fr; }
    .login-intro { min-height: 12rem; }
    .login-intro img { height: 100%; width: 52%; left: auto; }
    .login-intro::after { background: linear-gradient(90deg, var(--login-accent) 55%, rgb(189 24 48 / 65%) 80%, transparent); }
    .login-intro h2, .login-intro p { max-width: 70%; }
  }
`

function signIn(error = '') {
  return page('Staff sign in', `<main class="login">
    <section class="login-intro" aria-labelledby="portal-title">
      <h2 id="portal-title">Manage your<br>driving school.</h2>
      <p>Students, lessons, and vehicles in one dashboard.</p>
      <img src="/about-driving.webp" alt="">
    </section>
    <section class="login-form" aria-labelledby="sign-in-title">
    <div class="login-brand"><img src="/sms-logo.jpg" alt=""> SMS Motor Driving School</div>
    <h1 id="sign-in-title">Welcome back</h1>
    <p class="login-subtitle">Sign in with your staff account.</p>
    ${error ? `<p class="error" role="alert">${error}</p>` : ''}
    <form method="post" action="/login">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required maxlength="150">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
    </form>
    <p class="login-register">Already enrolled? <a href="/student-login">Student login</a></p>
    <p class="login-register">New to the driving school? <a href="/register">Register here</a></p>
    <p class="login-home"><a href="/">Back to the website</a></p>
    </section>
  </main>`, false, true)
}

function sendPage(response, status, html) {
  const widget = html.includes('src="/assistant-widget.mjs"')
  const scripts = widget || html.includes('src="/student-dialog.mjs"') || html.includes('src="/learner-test.mjs"') ? "script-src 'self'; " : ''
  const connections = widget ? "connect-src 'self'; " : ''
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; " + scripts + connections + "form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  }).end(html)
}

function redirect(response, location, cookie) {
  if (cookie) response.setHeader('Set-Cookie', cookie)
  response.writeHead(303, { Location: location }).end()
}

function cookie(token, age) {
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}`
}

function studentAccessWhatsApp({ phone, access_code }) {
  const number = (phone ?? '').trim().replace(/[\s().-]/g, '')
  let recipient
  if (/^\+[1-9]\d{7,14}$/.test(number)) recipient = number.slice(1)
  else if (/^91[6-9]\d{9}$/.test(number)) recipient = number
  else if (/^0?[6-9]\d{9}$/.test(number)) recipient = '91' + number.slice(-10)
  else return null
  const message = `SMS Motor Driving School: Your private student access code is ${access_code}. Use it with your full name and date of birth on the Student Login page. Please keep this code private.`
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`
}

async function sendLicenceDownload(response, path, token) {
  const download = await backendFetch(path, { headers: { Authorization: `Token ${token}` } }, 30_000)
  if (!download.ok) {
    response.writeHead(download.status).end()
    return
  }
  const content = Buffer.from(await download.arrayBuffer())
  response.writeHead(200, {
    'Content-Type': download.headers.get('content-type'),
    'Content-Disposition': download.headers.get('content-disposition') || 'attachment',
    'X-Content-Type-Options': 'nosniff',
  }).end(content)
}

export async function handlePortal(pathname, request, response) {
  const billId = pathname.match(/^\/vehicle-bills\/([1-9][0-9]{0,17})\/$/)?.[1]
  const reportId = pathname.match(/^\/assistant-reports\/([a-f0-9]{32})\/$/)?.[1]
  const licenceDocument = pathname.match(/^\/licence-documents\/([1-9]\d{0,17})\/(ll|dl|supporting|student)$/)
  const licenceExport = pathname.match(/^\/licence-export\.(xlsx|pdf)$/)
  if (!billId && !reportId && !licenceDocument && !licenceExport && !['/login', '/student-login', '/dashboard', '/logout'].includes(pathname)) return false
  response.setHeader('Cache-Control', 'no-store')

  if (pathname === '/student-login') {
    if (!['GET', 'POST'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, POST' }).end()
      return true
    }
    let error = ''
    let status = 200
    const studentSession = request.headers.cookie?.match(/(?:^|;\s*)sms_student=([A-Za-z0-9_.:-]{1,300})(?:;|$)/)?.[1]
    const studentCookie = (token, age) => `sms_student=${token}; Path=/student-login; HttpOnly; SameSite=Strict; Max-Age=${age}`
    const portalPath = '/api/auth/student-portal/'
    const studentQuery = new URL(request.url, 'http://localhost').searchParams
    const showStudentPortal = async (profileError = '', saved = false) => {
      const { lessons, lesson_history: history = [], summary, attendance, instructors, licence, ...profile } = await backendApi(portalPath, { token: studentSession })
      const uploadMessage = { saved: 'Document uploaded.', invalid: 'Choose a PDF, PNG or JPEG file up to 5 MB.', failed: 'Upload failed. Try again.' }[studentQuery.get('upload')] ?? ''
      sendPage(response, status, page('Student Dashboard', renderStudentLessons(profile, { upcoming: lessons, history }, summary, profileError, saved, attendance, instructors, licence, uploadMessage), true))
    }
    const licenceKind = new URL(request.url, 'http://localhost').searchParams.get('licence')
    if (request.method === 'GET' && ['ll', 'dl'].includes(licenceKind)) {
      if (!studentSession) redirect(response, '/student-login')
      else {
        try {
          await sendLicenceDownload(response, `${portalPath}?licence=${licenceKind}`, studentSession)
        } catch {
          response.writeHead(503).end()
        }
      }
      return true
    }
    if (request.method === 'GET' && studentSession) {
      try {
        await showStudentPortal('', new URL(request.url, 'http://localhost').searchParams.get('saved') === '1')
        return true
      } catch (failure) {
        if (failure.status === 401) response.setHeader('Set-Cookie', studentCookie('', 0))
        else {
          status = 503
          error = 'Student portal is temporarily unavailable. Try again shortly.'
        }
      }
    }
    if (request.method === 'POST') {
      const origin = request.headers.origin
      if (origin && origin !== `http://${request.headers.host}`) {
        response.writeHead(403).end()
        return true
      }
      const licenceUpload = studentQuery.get('action') === 'licence-upload'
      if (licenceUpload && !studentSession) {
        redirect(response, '/student-login')
        return true
      }
      const chunks = []
      let bytes = 0
      for await (const chunk of request) {
        bytes += chunk.length
        if (bytes > (licenceUpload ? 5 * 1024 * 1024 + 8192 : 4096)) {
          if (licenceUpload) redirect(response, '/student-login?upload=invalid#student-licence')
          else response.writeHead(413).end()
          return true
        }
        chunks.push(chunk)
      }
      if (licenceUpload) {
        let result = 'saved'
        try {
          const data = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers['content-type'] } }).formData()
          await backendApi(portalPath, { token: studentSession, method: 'POST', data })
        } catch (failure) {
          if (failure.status === 401) {
            redirect(response, '/student-login', studentCookie('', 0))
            return true
          }
          result = failure.status === 400 || failure instanceof TypeError ? 'invalid' : 'failed'
        }
        redirect(response, `/student-login?upload=${result}#student-licence`)
        return true
      }
      const fields = new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
      if (fields.get('action') === 'sign-out') {
        redirect(response, '/student-login', studentCookie('', 0))
        return true
      }
      if (fields.get('action') === 'profile') {
        if (!studentSession) {
          redirect(response, '/student-login')
          return true
        }
        try {
          const data = Object.fromEntries(['name', 'phone', 'email', 'address'].filter(field => fields.has(field)).map(field => [field, fields.get(field)]))
          await backendApi(portalPath, { token: studentSession, method: 'PATCH', data })
          redirect(response, '/student-login?saved=1#student-profile')
        } catch (failure) {
          if (failure.status === 401) redirect(response, '/student-login', studentCookie('', 0))
          else {
            status = failure.status === 400 ? 400 : 503
            try {
              await showStudentPortal(status === 400 ? 'Check your name, contact number, email and address.' : 'Could not save your details. Try again shortly.')
            } catch {
              sendPage(response, 503, page('Student portal unavailable', '<main class="panel"><h1>Student portal unavailable</h1><a href="/student-login#student-profile">Back to My Profile</a></main>'))
            }
          }
        }
        return true
      }
      try {
        const { session } = await backendApi('/api/auth/student-login/', {
          method: 'POST',
          data: { name: fields.get('name'), birth_date: fields.get('birthDate'), access_code: fields.get('accessCode') },
        })
        redirect(response, '/student-login', studentCookie(session, sessionLifetime))
        return true
      } catch (failure) {
        status = [400, 401].includes(failure.status) ? 401 : failure.status === 429 ? 429 : 503
        error = status === 401 ? 'Check your name, date of birth and access code.' : status === 429
          ? 'Too many sign-in attempts. Try again in a minute.' : 'Student sign-in is temporarily unavailable. Try again shortly.'
      }
    }
    const today = new Date()
    const cutoffYear = today.getFullYear() - 18
    const cutoffDay = Math.min(today.getDate(), new Date(cutoffYear, today.getMonth() + 1, 0).getDate())
    const latestBirthDate = [cutoffYear, String(today.getMonth() + 1).padStart(2, '0'), String(cutoffDay).padStart(2, '0')].join('-')
    sendPage(response, status, page('Student login', `<main class="login">
      <section class="login-intro" aria-labelledby="student-portal-title">
        <h2 id="student-portal-title">Your driving lessons</h2>
        <img src="/about-driving.webp" alt="">
      </section>
      <section class="login-form" aria-labelledby="student-login-title">
        <div class="login-brand"><img src="/sms-logo.jpg" alt=""> SMS Motor Driving School</div>
        <h1 id="student-login-title">Student login</h1>
        ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
        <form method="post" action="/student-login">
          <label for="student-name">Full name</label>
          <input id="student-name" name="name" autocomplete="name" maxlength="120" required>
          <label for="student-birth-date">Date of birth</label>
          <input id="student-birth-date" name="birthDate" type="date" autocomplete="bday" max="${latestBirthDate}" aria-describedby="student-age-limit" required>
          <small id="student-age-limit">You must be at least 18 years old.</small>
          <label for="student-access-code">Private access code</label>
          <input id="student-access-code" name="accessCode" type="password" autocomplete="current-password" minlength="24" maxlength="24" required>
          <small>Get your code from the driving school after approval.</small>
          <button type="submit">Submit</button>
        </form>
        <p class="login-register">New to the driving school? <a href="/register">Register here</a></p>
        <p class="login-home"><a href="/login">Back to staff sign-in</a></p>
      </section>
    </main>`, false, true))
    return true
  }

  const now = Date.now()
  for (const [key, session] of sessions) {
    if (session.expiry <= now) sessions.delete(key)
  }
  const token = request.headers.cookie?.match(/(?:^|;\s*)sms_staff=([a-f0-9]{64})(?:;|$)/)?.[1]
  const session = sessions.get(token)
  if (licenceDocument || licenceExport) {
    if (request.method !== 'GET') response.writeHead(405, { Allow: 'GET' }).end()
    else if (!session) redirect(response, '/login')
    else {
      const query = new URL(request.url, 'http://localhost').searchParams
      const path = licenceDocument ? `/api/students/licences/${licenceDocument[1]}/documents/${licenceDocument[2]}/`
        : `/api/students/licences/export.${licenceExport[1]}?${query}`
      try {
        await sendLicenceDownload(response, path, session.apiToken)
      } catch {
        response.writeHead(503).end()
      }
    }
    return true
  }
  if (billId || reportId) {
    if (request.method !== 'GET') response.writeHead(405, { Allow: 'GET' }).end()
    else if (!session) redirect(response, '/login')
    else {
      try {
        const report = reportId ? session.conversation?.find(item => item.id === reportId) : null
        if (reportId && !report) {
          response.writeHead(404).end()
          return true
        }
        const headers = { Authorization: `Token ${session.apiToken}` }
        const download = report
          ? await backendFetch('/api/assistant/pdf/', {
            method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: report.question, title: report.title, summary: report.summary, columns: report.columns, rows: report.rows }),
          }, 20_000)
          : await backendFetch(`/api/vehicles/maintenance/${billId}/bill/`, { headers }, 15_000)
        if ([401, 403].includes(download.status)) {
          sessions.delete(token)
          redirect(response, '/login', cookie('', 0))
        } else if (!download.ok) {
          response.writeHead(download.status).end()
        } else {
          const content = Buffer.from(await download.arrayBuffer())
          response.writeHead(200, {
            'Content-Type': download.headers.get('content-type'),
            'Content-Disposition': download.headers.get('content-disposition') || 'attachment',
            'X-Content-Type-Options': 'nosniff',
          }).end(content)
        }
      } catch {
        response.writeHead(503).end()
      }
    }
    return true
  }

  if (request.method === 'GET' && pathname === '/dashboard') {
    if (!session) {
      redirect(response, '/login')
      return true
    }
    try {
      const filters = new URL(request.url, 'http://localhost').searchParams
      if (filters.get('tab') === 'assistant') {
        filters.delete('tab')
        filters.set('assistant', 'open')
        redirect(response, '/dashboard?' + filters)
        return true
      }
      const api = path => backendApi(path, { token: session.apiToken })
      const content = await renderDashboard(filters, api, escapeHtml(session.username))
      sendPage(response, 200, page('CRM Dashboard', content + renderAssistantWidget(filters, session.conversation), true))
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        sessions.delete(token)
        redirect(response, '/login', cookie('', 0))
      } else {
        sendPage(response, 503, page('CRM temporarily unavailable',
          '<main class="panel"><h1>CRM temporarily unavailable</h1><p>Check that the Django server is running and reload the dashboard.</p></main>'))
      }
    }
  } else if (request.method === 'GET' && pathname === '/login') {
    if (session) redirect(response, '/dashboard')
    else sendPage(response, 200, signIn())
  } else if (request.method === 'POST') {
    const origin = request.headers.origin
    if (origin && origin !== `http://${request.headers.host}`) {
      response.writeHead(403).end()
      return true
    }

    if (pathname === '/logout') {
      if (session) {
        try {
          await backendApi('/api/auth/logout/', { token: session.apiToken, method: 'POST' })
        } catch (error) {
          if (![401, 403].includes(error.status)) {
            sendPage(response, 503, page('Sign-out unavailable',
              '<main class="panel"><h1>Sign-out unavailable</h1><p>Check the Django server and try again.</p><form method="post" action="/logout"><button type="submit">Retry sign out</button></form></main>'))
            return true
          }
        }
      }
      sessions.delete(token)
      redirect(response, '/login', cookie('', 0))
      return true
    }

    const filters = new URL(request.url, 'http://localhost').searchParams
    const tab = filters.get('tab')
    const enquiryId = pathname === '/dashboard' && tab === 'enquiries' && /^[1-9]\d{0,17}$/.test(filters.get('update-enquiry') ?? '') ? filters.get('update-enquiry') : null
    const licenceId = pathname === '/dashboard' && tab === 'licences' && /^[1-9]\d{0,17}$/.test(filters.get('student') ?? '') ? filters.get('student') : null
    const accessAction = filters.has('issue-access') ? 'issue-access' : 'approve'
    const requestedRegistration = filters.get(accessAction)
    const approvalId = pathname === '/dashboard' && (accessAction === 'issue-access' ? tab === 'student-keys' : ['students', 'enquiries'].includes(tab)) && /^\d+$/.test(requestedRegistration ?? '') ? requestedRegistration : null
    const scheduleLesson = pathname === '/dashboard' && tab === 'bookings' && filters.get('action') === 'schedule'
    const markLesson = pathname === '/dashboard' && tab === 'bookings' && filters.get('action') === 'mark-attendance'
      && /^[1-9]\d{0,17}$/.test(filters.get('lesson') ?? '')
    const assistant = pathname === '/dashboard' && filters.get('assistant') === 'ask'
    const isInstructor = tab === 'instructors'
    const vehicle = pathname === '/dashboard' && tab === 'vehicles' ? vehicleAction(filters) : null
    const recordAction = isInstructor ? instructorAction : studentAction
    const target = pathname === '/dashboard' && ['students', 'instructors'].includes(tab) && recordAction(filters)
    const attendance = pathname === '/dashboard' && filters.get('tab') === 'attendance' ? attendanceFilters(filters) : null
    if (pathname === '/dashboard' && !enquiryId && !assistant && !approvalId && !scheduleLesson && !markLesson && !licenceId && ((!vehicle && !attendance && (!target || target.action === 'view')) || attendance?.period === 'month')) {
      response.writeHead(405, { Allow: 'GET' }).end()
      return true
    }
    if ((enquiryId || target || attendance || vehicle || assistant || approvalId || scheduleLesson || markLesson || licenceId) && !session) {
      redirect(response, '/login')
      return true
    }

    let fields
    const multipart = (vehicle?.section === 'maintenance' || licenceId) && request.headers['content-type']?.startsWith('multipart/form-data;')
    const bodyLimit = multipart ? (licenceId ? 15 : 5) * 1024 * 1024 + 65_536 : target || vehicle || licenceId ? 32768 : 8192
    const chunks = []
    let length = 0
    try {
      for await (const chunk of request) {
        length += chunk.length
        if (length > bodyLimit) {
          response.writeHead(413).end()
          return true
        }
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks)
      fields = multipart
        ? await new Response(body, { headers: { 'Content-Type': request.headers['content-type'] } }).formData()
        : new URLSearchParams(body.toString('utf8'))
    } catch {
      response.writeHead(400).end()
      return true
    }

    if (licenceId) {
      const api = (path, options) => backendApi(path, { ...options, token: session.apiToken })
      const payload = new FormData()
      for (const [key, value] of fields) {
        if (typeof value === 'string' || value.size > 0) payload.set(key, value)
      }
      payload.set('instructor_approved', fields.get('instructor_approved') === 'true' ? 'true' : 'false')
      try {
        await api(`/api/students/licences/${licenceId}/`, { method: 'PATCH', data: payload, timeout: 30_000 })
        redirect(response, `/dashboard?tab=licences&student=${licenceId}&saved=1`)
      } catch (error) {
        const details = Object.values(error.details ?? {}).flat().filter(value => typeof value === 'string')
        const issue = { licence: details.join(' ') || 'Could not save the licence record. Try again.',
          values: Object.fromEntries([...payload].filter(([, value]) => typeof value === 'string')) }
        try {
          const content = await renderDashboard(filters, api, escapeHtml(session.username), issue)
          sendPage(response, error.status || 503, page('Licence &amp; RTO', content, true))
        } catch {
          sendPage(response, 503, page('Licence register unavailable', '<main class="panel"><h1>Licence register unavailable</h1><a href="/dashboard?tab=licences">Back to Licence &amp; RTO</a></main>'))
        }
      }
      return true
    }
    if (markLesson) {
      const api = (path, options) => backendApi(path, { ...options, token: session.apiToken })
      const lesson = filters.get('lesson')
      filters.delete('lesson')
      filters.delete('action')
      filters.delete('attendance')
      try {
        await api(`/api/lessons/${lesson}/`, { method: 'PATCH', data: { attendance: fields.get('attendance') } })
        redirect(response, `/dashboard?${filters}#lessons`)
      } catch (error) {
        const attendanceMark = error.details?.attendance?.[0] || 'Could not save attendance. Try again.'
        try {
          const content = await renderDashboard(filters, api, session.username, { attendanceMark })
          sendPage(response, error.status || 503, page('Dashboard', content, true))
        } catch {
          sendPage(response, 503, page('Attendance unavailable', '<main class="panel"><h1>Attendance unavailable</h1><a href="/dashboard?tab=bookings">Return to Driving Lessons</a></main>'))
        }
      }
      return true
    }
    if (scheduleLesson) {
      const api = (path, options) => backendApi(path, { ...options, token: session.apiToken })
      const values = Object.fromEntries(fields)
      const { student, instructor, vehicle, date, hour } = values
      try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !/^(?:[0-9]|1[0-9]|2[0-3])$/.test(hour ?? '')) {
          throw new Error('Choose a valid lesson date and start time.')
        }
        const starts_at = `${date}T${hour.padStart(2, '0')}:00:00+05:30`
        if (vehicle) {
          await api('/api/vehicles/reservations/', {
            method: 'POST',
            data: { vehicle, new_student: student, instructor, starts_at, purpose: 'lesson' },
          })
        } else {
          await api('/api/lessons/', { method: 'POST', data: { student, instructor, starts_at } })
        }
        const next = new URLSearchParams({ tab: 'bookings', date })
        if (filters.has('branch')) next.set('branch', filters.get('branch'))
        redirect(response, `/dashboard?${next}#lessons`)
      } catch (error) {
        const details = Object.values(error.details ?? {}).flat().filter(value => typeof value === 'string')
        const lesson = details.join(' ') || (error.status ? 'Could not schedule the lesson. Check the selections and try again.' : error.message)
        try {
          const content = await renderDashboard(filters, api, session.username, { lesson, values })
          sendPage(response, error.status || 400, page('Dashboard', content, true))
        } catch {
          sendPage(response, 503, page('Scheduling unavailable', '<main class="panel"><h1>Scheduling unavailable</h1><a href="/dashboard?tab=bookings">Return to Driving Lessons</a></main>'))
        }
      }
      return true
    }
    if (enquiryId) {
      const api = (path, options) => backendApi(path, { ...options, token: session.apiToken })
      try {
        const status = fields.get('status')
        if (!['new', 'contacted', 'closed'].includes(status)) throw new Error('Choose a valid enquiry status.')
        const enquiry = await api(`/api/enquiries/${enquiryId}/`)
        if (enquiry.message.startsWith('Student registration request\n')) throw new Error('Use Approve to complete a student registration.')
        await api(`/api/enquiries/${enquiryId}/`, { method: 'PATCH', data: { status } })
        redirect(response, '/dashboard?tab=enquiries')
      } catch (error) {
        try {
          const content = await renderDashboard(filters, api, session.username, { approval: error.status ? 'Could not save enquiry status. Please try again.' : error.message })
          sendPage(response, error.status || 400, page('Dashboard', content, true))
        } catch {
          sendPage(response, 503, page('Enquiries unavailable', '<main class="panel"><h1>Could not save enquiry status</h1><a href="/dashboard?tab=enquiries">Return to enquiries</a></main>'))
        }
      }
      return true
    }
    if (approvalId) {
      const api = (path, options) => backendApi(path, { ...options, token: session.apiToken })
      try {
        const action = accessAction === 'issue-access' ? 'access' : 'approve'
        const result = await api(`/api/enquiries/${approvalId}/${action}/`, {
          method: 'POST',
          data: { branch: fields.get('branch'), course: fields.get('course') },
        })
        if (result.access_code) {
          const whatsapp = studentAccessWhatsApp(result)
          if (fields.get('delivery') === 'whatsapp' && whatsapp) {
            response.setHeader('Referrer-Policy', 'no-referrer')
            redirect(response, whatsapp)
            return true
          }
          sendPage(response, 200, page('Student access code', `<main class="panel">
            <h1>Student access code</h1>
            <p>Share this code privately with ${escapeHtml(result.name)}. It is shown only on this page. Issuing a new code replaces the previous one.</p>
            <p><strong><code>${escapeHtml(result.access_code)}</code></strong></p>
            ${whatsapp ? `<p><a href="${escapeHtml(whatsapp)}" target="_blank" rel="noopener noreferrer">Open WhatsApp with access code</a></p>`
              : '<p>No valid WhatsApp number is saved. Check the phone number in Student Details.</p>'}
            <p><a href="/dashboard?tab=students">Go to Students</a> · <a href="/dashboard?tab=student-keys">Student keys</a></p>
          </main>`))
        } else {
          redirect(response, '/dashboard?tab=students')
        }
      } catch (error) {
        const approval = error.details?.message?.[0] || error.details?.detail || 'Could not approve the registration. Check the branch and course and try again.'
        try {
          const content = await renderDashboard(filters, api, session.username, { approval })
          sendPage(response, error.status || 503, page('Dashboard', content, true))
        } catch {
          sendPage(response, 503, page('Approval unavailable', '<main class="panel"><h1>Approval unavailable</h1><a href="/dashboard?tab=enquiries">Return to enquiries</a></main>'))
        }
      }
      return true
    }
    if (assistant) {
      const question = fields.get('question')?.trim()
      const conversation = session.conversation ?? []
      const api = path => backendApi(path, { token: session.apiToken })
      const branch = filters.get('branch')
      const sendAssistant = (status, issue) => {
        if (request.headers['x-assistant-panel'] === '1') {
          response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
            .end(renderAssistantConversation(session.conversation ?? [], issue))
        } else {
          filters.set('assistant', 'open')
          redirect(response, '/dashboard?' + filters)
        }
      }
      try {
        await api('/api/auth/me/')
        if (!question || question.length > 500) {
          sendAssistant(400, { message: 'Enter a question of up to 500 characters.' })
          return true
        }
        const answer = await answerQuestion(question, api, branch, conversation.at(-1))
        session.conversation = [...(session.conversation ?? []), { id: randomBytes(16).toString('hex'), question, ...answer }].slice(-20)
        sendAssistant(200)
      } catch (error) {
        if ([401, 403].includes(error.status)) {
          sessions.delete(token)
          redirect(response, '/login', cookie('', 0))
          return true
        }
        sendAssistant(503, { message: 'The dashboard data is temporarily unavailable. Try again.' })
      }
      return true
    }

    if (target || attendance || vehicle) {
      const api = (path, options) => backendApi(path, { ...options, token: session.apiToken })
      const readFields = isInstructor ? readInstructorFields : readStudentFields
      const values = vehicle ? readVehicleFields(vehicle.section, fields)
        : ['add', 'edit'].includes(target?.action) ? readFields(fields) : undefined
      const section = vehicle ? 'Vehicles' : attendance ? 'Attendance' : isInstructor ? 'Instructors' : 'Students'
      try {
        if (vehicle) {
          const path = vehicle.action === 'add' ? vehicle.collection : `${vehicle.collection}${vehicle.id}/`
          const method = { add: 'POST', edit: 'PATCH', delete: 'DELETE' }[vehicle.action]
          const data = method === 'DELETE' ? undefined : vehiclePayload(values, multipart ? fields.get('bill') : null)
          await api(path, { method, data, timeout: 20_000 })
          redirect(response, vehicleListUrl(filters))
          return true
        }
        if (attendance) {
          await api('/api/attendance/', {
            method: 'POST',
            data: { kind: attendance.kind, date: attendance.date, person: fields.get('person'), status: fields.get('status') },
          })
          redirect(response, attendanceUrl(attendance, filters.get('branch')))
          return true
        }
        const collection = `/api/${tab}/`
        const path = `${collection}${target.id}/`
        if (target.action === 'add') {
          const prefix = isInstructor ? 'INS' : 'STU'
          const code = values.code?.trim() || `${prefix}-${randomBytes(6).toString('hex').toUpperCase()}`
          await api(collection, { method: 'POST', data: { ...values, code } })
        } else if (target.action === 'delete') {
          await api(path + (isInstructor ? '' : '?delete_lessons=1'), { method: 'DELETE' })
        } else {
          if (!isInstructor) delete values.code
          await api(path, { method: 'PATCH', data: values })
        }
        redirect(response, (isInstructor ? instructorListUrl : studentListUrl)(filters))
      } catch (error) {
        if ([401, 403].includes(error.status)) {
          sessions.delete(token)
          redirect(response, '/login', cookie('', 0))
          return true
        }
        const message = isInstructor && error.status === 409 && target.action === 'delete'
          ? 'This instructor has linked records. Set their status to Inactive to keep the history.'
          : error.details ? Object.values(error.details).flat().join(' ')
            : attendance ? 'Attendance could not be saved.' : 'The record could not be changed.'
        try {
          const content = await renderDashboard(filters, api, escapeHtml(session.username), { message, values })
          sendPage(response, error.status ?? 503, page(section, content + renderAssistantWidget(filters, session.conversation), true))
        } catch {
          sendPage(response, 503, page(`${section} unavailable`,
            `<main class="panel"><h1>${section} unavailable</h1><p>Check the Django server and try again.</p></main>`))
        }
      }
      return true
    }

    try {
      const account = await backendApi('/api/auth/login/', {
        method: 'POST',
        timeout: 30_000,
        data: { username: fields.get('username'), password: fields.get('password') },
      })
      sessions.delete(token)
      const newToken = randomBytes(32).toString('hex')
      sessions.set(newToken, { expiry: now + sessionLifetime * 1000, apiToken: account.token, username: account.username })
      redirect(response, '/dashboard', cookie(newToken, sessionLifetime))
    } catch (error) {
      if ([400, 401, 403].includes(error.status)) {
        sendPage(response, 401, signIn('Check your username and password and try again.'))
      } else if (error.status === 429) {
        sendPage(response, 429, signIn('Too many sign-in attempts. Try again in a minute.'))
      } else {
        sendPage(response, 503, signIn('Check that the Django server is running and try again.'))
      }
    }
  } else {
    response.writeHead(405, { Allow: pathname === '/dashboard' ? 'GET' : pathname === '/logout' ? 'POST' : 'GET, POST' }).end()
  }
  return true
}
