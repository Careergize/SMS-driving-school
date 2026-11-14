import { randomBytes } from 'node:crypto'
import { backendApi, backendFetch, escapeHtml } from './backend-api.mjs'
import { dashboardStyles, renderDashboard } from './crm-dashboard.mjs'
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
  <link rel="icon" href="/sms-logo.jpg">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8f5f5; color: #18181e; font: 1rem/1.55 Arial, sans-serif; }
    a { color: #a3152b; text-underline-offset: .2em; }
    :focus-visible { outline: 3px solid #a3152b; outline-offset: 4px; }
    header { background: #19191f; color: white; padding: 1rem max(1.25rem, calc((100% - 68rem) / 2)); }
    header a { color: white; display: inline-flex; align-items: center; gap: .75rem; text-decoration: none; font-weight: 700; }
    header img { width: 48px; height: 38px; object-fit: contain; border-radius: 4px; background: white; }
    main { width: min(68rem, calc(100% - 2.5rem)); margin: clamp(2rem, 7vw, 5rem) auto; }
    .panel { padding: clamp(1.25rem, 4vw, 2rem); background: white; border: 1px solid #eadfe1; border-radius: .65rem; }
    .label { font-size: .78rem; text-transform: uppercase; letter-spacing: .14em; color: #a3152b; font-weight: 700; }
    h1 { line-height: 1.1; font-size: clamp(2rem, 5vw, 3rem); margin: .4rem 0; }
    h2 { margin-top: 0; font-size: 1.2rem; }
    p { color: #57535a; }
    label { display: block; font-weight: 700; margin: 1rem 0 .3rem; }
    input { width: 100%; padding: .7rem; font: inherit; border: 1px solid #81777c; border-radius: .3rem; }
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
  .login-subtitle, .login-home { text-align: center; font-size: .9rem; margin: 0; }
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
    <p class="login-home"><a href="/">Back to the website</a></p>
    </section>
  </main>`, false, true)
}

function sendPage(response, status, html) {
  const widget = html.includes('src="/assistant-widget.mjs"')
  const scripts = widget || html.includes('src="/student-dialog.mjs"') ? "script-src 'self'; " : ''
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

export async function handlePortal(pathname, request, response) {
  const billId = pathname.match(/^\/vehicle-bills\/([1-9][0-9]{0,17})\/$/)?.[1]
  const reportId = pathname.match(/^\/assistant-reports\/([a-f0-9]{32})\/$/)?.[1]
  if (!billId && !reportId && !['/login', '/dashboard', '/logout'].includes(pathname)) return false
  response.setHeader('Cache-Control', 'no-store')

  const now = Date.now()
  for (const [key, session] of sessions) {
    if (session.expiry <= now) sessions.delete(key)
  }
  const token = request.headers.cookie?.match(/(?:^|;\s*)sms_staff=([a-f0-9]{64})(?:;|$)/)?.[1]
  const session = sessions.get(token)
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
    const assistant = pathname === '/dashboard' && filters.get('assistant') === 'ask'
    const isInstructor = tab === 'instructors'
    const vehicle = pathname === '/dashboard' && tab === 'vehicles' ? vehicleAction(filters) : null
    const recordAction = isInstructor ? instructorAction : studentAction
    const target = pathname === '/dashboard' && ['students', 'instructors'].includes(tab) && recordAction(filters)
    const attendance = pathname === '/dashboard' && filters.get('tab') === 'attendance' ? attendanceFilters(filters) : null
    if (pathname === '/dashboard' && !assistant && ((!vehicle && !attendance && (!target || target.action === 'view')) || attendance?.period === 'month')) {
      response.writeHead(405, { Allow: 'GET' }).end()
      return true
    }
    if ((target || attendance || vehicle || assistant) && !session) {
      redirect(response, '/login')
      return true
    }

    let fields
    const multipart = vehicle?.section === 'maintenance' && request.headers['content-type']?.startsWith('multipart/form-data;')
    const bodyLimit = multipart ? 5 * 1024 * 1024 + 65_536 : target || vehicle ? 32768 : 8192
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
        const answer = await answerQuestion(question, api, branch, conversation.at(-1)?.question)
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
