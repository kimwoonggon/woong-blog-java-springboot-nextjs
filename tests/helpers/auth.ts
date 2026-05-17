import { expect, type APIRequestContext, type Page } from '@playwright/test'

type AdminSessionPayload = {
  authenticated?: boolean
  role?: string | null
}

const ADMIN_EMAIL = 'admin@example.com'

async function gotoStable(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 })
      return
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED') || attempt === 1) {
        throw error
      }
    }
  }
}

function resolvePlaywrightBaseUrl() {
  return (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function normalizeReturnPath(returnPath: string) {
  const baseUrl = resolvePlaywrightBaseUrl()
  const url = new URL(returnPath, baseUrl)
  return `${url.pathname}${url.search}${url.hash}` || '/'
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl
  }

  const baseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return `${baseUrl}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

async function readAdminSession(request: APIRequestContext) {
  const response = await request.get('/api/auth/session', {
    failOnStatusCode: false,
    headers: {
      'Cache-Control': 'no-store',
    },
  })

  if (!response.ok()) {
    return { authenticated: false, role: null } satisfies AdminSessionPayload
  }

  return await response.json() as AdminSessionPayload
}

function isAdminSession(session: AdminSessionPayload) {
  return session.authenticated === true && session.role === 'admin'
}

async function ensureAdminApiLogin(request: APIRequestContext, returnPath: string) {
  const normalizedReturnPath = normalizeReturnPath(returnPath)
  const loginResponse = await request.get(
    `/api/auth/test-login?email=${encodeURIComponent(ADMIN_EMAIL)}&returnUrl=${encodeURIComponent(normalizedReturnPath)}`,
    { failOnStatusCode: false },
  )

  if (!loginResponse.ok()) {
    throw new Error(`Failed to create admin test-login session: ${loginResponse.status()} ${await loginResponse.text()}`)
  }

  const session = await readAdminSession(request)
  if (!isAdminSession(session)) {
    throw new Error('Admin test-login did not yield an authenticated admin session.')
  }
}

export async function ensureAdminApiContext(request: APIRequestContext, returnPath = '/admin/dashboard') {
  const existingSession = await readAdminSession(request)
  if (!isAdminSession(existingSession)) {
    await ensureAdminApiLogin(request, returnPath)
  }

  return request
}

export async function ensureAdminSession(page: Page, returnPath = '/admin/dashboard') {
  await ensureAdminApiContext(page.request, returnPath)
}

export async function loginAsLocalAdmin(page: Page, returnPath = '/') {
  await ensureAdminSession(page, returnPath)
  await gotoStable(page, toAbsoluteUrl(normalizeReturnPath(returnPath)))

  if (normalizeReturnPath(returnPath).startsWith('/admin')) {
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15000 })
  }
}
