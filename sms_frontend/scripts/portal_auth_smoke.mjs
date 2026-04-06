import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium } from 'playwright'

const HOST = process.env.PORTAL_AUTH_HOST ?? '127.0.0.1'
const PORT = Number(process.env.PORTAL_AUTH_PORT ?? '4173')
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? `http://${HOST}:${PORT}`
const PLAYWRIGHT_CHANNEL = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const START_TIMEOUT_MS = Number(process.env.PORTAL_AUTH_START_TIMEOUT_MS ?? '45000')
const FRONTEND_DIR = process.cwd()
const TENANT_ID = 'demo_school'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const previewArgs = ['run', 'preview', '--', '--host', HOST, '--port', String(PORT)]

const DEFAULT_VIEWPORT = { width: 1440, height: 960 }
const pageDiagnostics = new WeakMap()

const parentDashboardPayload = {
  kpis: {
    current_average_grade: 'A-',
    attendance_rate: 96,
    outstanding_fee_balance: 0,
    upcoming_events_count: 2,
  },
  alerts: [],
  recent_activity: [
    { type: 'Notice', message: 'Math CAT marks released.' },
  ],
}

const studentDashboardPayload = {
  student: {
    first_name: 'Sam',
    last_name: 'Learner',
    admission_number: 'STM2025001',
    class_section: 'Grade 8 East',
  },
  kpis: {
    attendance_rate: 98,
    current_average_grade: 'B+',
    pending_assignments: 1,
    upcoming_events: 2,
  },
  recent_grades: [
    { subject: 'Mathematics', grade: 'B+', assessment: 'Mid-term CAT' },
  ],
  upcoming_assignments: [
    { title: 'Essay Draft', due_date: '2026-04-10', subject: 'English' },
  ],
  announcements: [
    { title: 'Science Fair', created_at: '2026-03-20T08:00:00Z', content: 'Science fair on Friday.' },
  ],
}

const parentAssignmentsPayload = {
  assignments: [
    {
      id: 1,
      title: 'Algebra Worksheet',
      subject_name: 'Mathematics',
      class_name: 'Grade 8',
      due_date: '2026-04-05',
      total_marks: 20,
      description: 'Complete questions 1-10.',
    },
  ],
  events: [
    {
      id: 9,
      title: 'Parents Day',
      event_type: 'Event',
      start_date: '2026-04-12',
      end_date: null,
      description: 'Meet the class teachers.',
    },
  ],
}

function withLeadingSlash(pathname) {
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

function jsonResponse(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  })
}

async function handleApiRoute(route, role) {
  const url = new URL(route.request().url())
  const pathname = withLeadingSlash(url.pathname.replace(/^\/+/, ''))

  if (!pathname.startsWith('/api/')) {
    return route.continue()
  }

  if (pathname.endsWith('/api/auth/login/')) {
    const username = role === 'PARENT' ? 'parent_kamau' : 'STM2025001'
    return jsonResponse(route, {
      access: `${role.toLowerCase()}-access-token`,
      refresh: `${role.toLowerCase()}-refresh-token`,
      role,
      available_roles: [role],
      redirect_to: '/dashboard',
      tenant_id: TENANT_ID,
      user: username,
    })
  }

  if (pathname.endsWith('/api/dashboard/routing/')) {
    return jsonResponse(route, {
      user: role === 'PARENT' ? 'parent_kamau' : 'STM2025001',
      role,
      available_roles: [role],
      permissions: role === 'PARENT' ? ['parent-portal:access'] : ['student-portal:access'],
      target: role === 'PARENT' ? 'PARENT_PORTAL' : 'STUDENT_PORTAL',
      target_module: role === 'PARENT' ? 'PARENT_PORTAL' : 'STUDENT_PORTAL',
      redirect_path: role === 'PARENT' ? '/modules/parent-portal/dashboard' : '/student-portal',
    })
  }

  if (pathname.endsWith('/api/auth/me/')) {
    return jsonResponse(route, {
      role,
      assigned_module_keys: role === 'PARENT' ? ['PARENT_PORTAL'] : ['STUDENT_PORTAL'],
    })
  }

  if (pathname.endsWith('/api/parent-portal/dashboard/')) {
    return jsonResponse(route, parentDashboardPayload)
  }

  if (pathname.endsWith('/api/student-portal/dashboard/')) {
    return jsonResponse(route, studentDashboardPayload)
  }

  if (pathname.endsWith('/api/parent-portal/assignments/')) {
    return jsonResponse(route, { results: parentAssignmentsPayload.assignments })
  }

  if (pathname.endsWith('/api/parent-portal/events/')) {
    return jsonResponse(route, { results: parentAssignmentsPayload.events })
  }

  if (pathname.endsWith('/api/auth/refresh/')) {
    return jsonResponse(route, {
      access: `${role.toLowerCase()}-access-token-refreshed`,
      refresh: `${role.toLowerCase()}-refresh-token`,
    })
  }

  return jsonResponse(route, {})
}

async function createPage(browser, role, session = null) {
  const context = await browser.newContext({ viewport: DEFAULT_VIEWPORT })
  if (session) {
    await context.addInitScript((payload) => {
      localStorage.setItem('sms_access_token', payload.accessToken)
      localStorage.setItem('sms_refresh_token', payload.refreshToken)
      localStorage.setItem('sms_tenant_id', payload.tenantId)
      localStorage.setItem('sms_auth_mode', payload.authMode)
      localStorage.setItem('sms_username', payload.username)
      localStorage.setItem('sms_role', payload.role)
      localStorage.setItem('sms_permissions', JSON.stringify(payload.permissions))
      localStorage.setItem('sms_assigned_modules', JSON.stringify(payload.assignedModules))
      localStorage.setItem('sms_available_roles', JSON.stringify(payload.availableRoles))
      localStorage.setItem('sms_user', JSON.stringify({
        username: payload.username,
        role: payload.role,
        tenant_id: payload.tenantId,
        permissions: payload.permissions,
      }))
    }, session)
  }
  const page = await context.newPage()
  const diagnostics = { console: [], pageErrors: [] }
  page.on('console', (message) => {
    if (message.type() === 'error') {
      diagnostics.console.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push(error.message)
  })
  pageDiagnostics.set(page, diagnostics)
  await page.route('**/api/**', (route) => handleApiRoute(route, role))
  return { context, page }
}

function tenantSession(role) {
  return {
    accessToken: `${role.toLowerCase()}-access-token`,
    refreshToken: `${role.toLowerCase()}-refresh-token`,
    tenantId: TENANT_ID,
    authMode: 'tenant',
    username: role === 'PARENT' ? 'parent_kamau' : 'STM2025001',
    role,
    permissions: role === 'PARENT' ? ['parent-portal:access'] : ['student-portal:access'],
    assignedModules: role === 'PARENT' ? ['PARENT_PORTAL'] : ['STUDENT_PORTAL'],
    availableRoles: [role],
  }
}

async function waitForFrontendReady(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' })
      if (response.ok) {
        return
      }
      lastError = new Error(`Unexpected status ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await delay(500)
  }

  throw lastError ?? new Error('Timed out waiting for frontend dev server.')
}

async function startFrontendServer() {
  const spawnConfig = {
    cwd: FRONTEND_DIR,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      BROWSER: 'none',
    },
  }

  const child = process.platform === 'win32'
    ? spawn(
      'cmd.exe',
      ['/d', '/s', '/c', `npm ${previewArgs.join(' ')}`],
      spawnConfig,
    )
    : spawn(
      npmCommand,
      previewArgs,
      spawnConfig,
    )

  const logs = []
  const captureLogs = (chunk) => {
    logs.push(String(chunk))
    if (logs.length > 50) logs.shift()
  }

  child.stdout.on('data', captureLogs)
  child.stderr.on('data', captureLogs)

  try {
    await waitForFrontendReady(FRONTEND_BASE_URL, START_TIMEOUT_MS)
  } catch (error) {
    child.kill()
    const joinedLogs = logs.join('')
    throw new Error(`Frontend dev server did not start.\n${joinedLogs}\n${error instanceof Error ? error.message : String(error)}`)
  }

  return child
}

async function stopFrontendServer(child) {
  if (!child || child.killed) return

  child.kill()
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(5000).then(() => {
      if (!child.killed) child.kill('SIGKILL')
    }),
  ])
}

async function loginThroughUi(page, role) {
  await page.goto(`${FRONTEND_BASE_URL}/login`, { waitUntil: 'commit' })

  if (role === 'PARENT') {
    await page.getByRole('button', { name: /Parent/i }).click()
    await page.getByPlaceholder('parent_kamau').fill('parent_kamau')
  } else {
    await page.getByRole('button', { name: /^Student/i }).click()
    await page.getByPlaceholder('STM2025001').fill('STM2025001')
  }

  await page.getByPlaceholder('demo_school').fill(TENANT_ID)
  await page.locator('input[autocomplete="current-password"]').fill(
    role === 'PARENT' ? 'parent123' : 'STM2025001',
  )
  await page.getByRole('button', { name: /Sign in to SmartCampus/i }).click()
}

async function runCase(name, fn) {
  try {
    await fn()
    console.log(`PASS ${name}`)
    return { name, status: 'PASS' }
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error instanceof Error ? error.stack : String(error))
    return { name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) }
  }
}

async function dumpPageState(page, label) {
  const diagnostics = pageDiagnostics.get(page) ?? { console: [], pageErrors: [] }
  let bodyText = ''
  try {
    bodyText = await page.locator('body').innerText()
  } catch {
    bodyText = ''
  }

  console.error(`DEBUG ${label} url=${page.url()}`)
  if (diagnostics.pageErrors.length > 0) {
    console.error(`DEBUG ${label} pageErrors=${JSON.stringify(diagnostics.pageErrors)}`)
  }
  if (diagnostics.console.length > 0) {
    console.error(`DEBUG ${label} consoleErrors=${JSON.stringify(diagnostics.console)}`)
  }
  if (bodyText.trim()) {
    console.error(`DEBUG ${label} body=${JSON.stringify(bodyText.slice(0, 1200))}`)
  }
}

async function main() {
  const server = process.env.FRONTEND_BASE_URL
    ? null
    : await startFrontendServer()

  if (!server) {
    await waitForFrontendReady(FRONTEND_BASE_URL, START_TIMEOUT_MS)
  }

  const browser = await chromium.launch({
    channel: PLAYWRIGHT_CHANNEL,
    headless: true,
  })

  const results = []

  try {
    results.push(await runCase('parent login lands on parent dashboard', async () => {
      const { context, page } = await createPage(browser, 'PARENT')
      try {
        await loginThroughUi(page, 'PARENT')
        await page.waitForURL('**/modules/parent-portal/dashboard', { timeout: 15000 })
        await expectVisible(page, 'PARENT PORTAL')
      } catch (error) {
        await dumpPageState(page, 'parent-login')
        throw error
      } finally {
        await context.close()
      }
    }))

    results.push(await runCase('parent dashboard quick links stay inside parent portal', async () => {
      const { context, page } = await createPage(browser, 'PARENT')
      try {
        await loginThroughUi(page, 'PARENT')
        await page.waitForURL('**/modules/parent-portal/dashboard', { timeout: 15000 })
        await page.getByRole('button', { name: /Assignments & Homework/i }).click()
        await page.waitForURL('**/modules/parent-portal/assignments', { timeout: 15000 })
        await expectVisible(page, 'Assignments & Events')
      } catch (error) {
        await dumpPageState(page, 'parent-quick-links')
        throw error
      } finally {
        await context.close()
      }
    }))

    results.push(await runCase('student login lands on student portal', async () => {
      const { context, page } = await createPage(browser, 'STUDENT')
      try {
        await loginThroughUi(page, 'STUDENT')
        await page.waitForURL('**/student-portal', { timeout: 15000 })
        await expectVisible(page, 'Student Portal')
        await expectVisible(page, 'My Grades')
      } catch (error) {
        await dumpPageState(page, 'student-login')
        throw error
      } finally {
        await context.close()
      }
    }))

    results.push(await runCase('parent session hitting /dashboard is redirected to parent portal', async () => {
      const { context, page } = await createPage(browser, 'PARENT', tenantSession('PARENT'))
      try {
        await page.goto(`${FRONTEND_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
        await page.waitForURL('**/modules/parent-portal/dashboard', { timeout: 15000 })
        await expectVisible(page, 'PARENT PORTAL')
      } catch (error) {
        await dumpPageState(page, 'parent-dashboard-redirect')
        throw error
      } finally {
        await context.close()
      }
    }))

    results.push(await runCase('student session hitting /dashboard is redirected to student portal', async () => {
      const { context, page } = await createPage(browser, 'STUDENT', tenantSession('STUDENT'))
      try {
        await page.goto(`${FRONTEND_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
        await page.waitForURL('**/student-portal', { timeout: 15000 })
        await expectVisible(page, 'Student Portal')
      } catch (error) {
        await dumpPageState(page, 'student-dashboard-redirect')
        throw error
      } finally {
        await context.close()
      }
    }))
  } finally {
    await browser.close()
    await stopFrontendServer(server)
  }

  const failures = results.filter((result) => result.status === 'FAIL')
  console.log(`Summary: ${results.length - failures.length}/${results.length} passed`)

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

async function expectVisible(page, text) {
  const locator = page.getByText(text, { exact: false }).first()
  await locator.waitFor({ state: 'visible', timeout: 15000 })
  assert(await locator.isVisible(), `Expected "${text}" to be visible.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
