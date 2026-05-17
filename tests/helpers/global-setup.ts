import { request, type APIRequestContext, type FullConfig } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

function shouldIgnoreHttpsErrors(baseURL: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseURL)
}

function resolveAuthBaseUrl(baseURL: string) {
  if (process.env.PLAYWRIGHT_AUTH_BASE_URL) {
    return process.env.PLAYWRIGHT_AUTH_BASE_URL
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseURL)) {
    return baseURL
  }

  return baseURL
}

function shouldRelaxSecureCookiesForBaseUrl(baseURL: string) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseURL)
}

async function relaxLocalhostSecureCookies(storageStatePath: string) {
  const raw = await fs.readFile(storageStatePath, 'utf8')
  const state = JSON.parse(raw) as {
    cookies?: Array<{ domain?: string; secure?: boolean }>
  }

  state.cookies = (state.cookies ?? []).map((cookie) =>
    /^(localhost|127\.0\.0\.1)$/i.test(cookie.domain ?? '')
      ? { ...cookie, secure: false }
      : cookie,
  )

  await fs.writeFile(storageStatePath, JSON.stringify(state, null, 2))
}

async function getReadyLoginPage(apiContext: APIRequestContext) {
  const response = await apiContext.get('/login')
  const body = await response.text()

  return {
    ok: response.ok() && body.includes('Sign in with Google'),
    status: response.status(),
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL as string | undefined
  if (!baseURL) {
    return
  }

  const skipAuthBootstrap = process.env.PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP === '1'

  const ignoreHTTPSErrors = shouldIgnoreHttpsErrors(baseURL)
  const deadline = Date.now() + 60_000
  let lastError: unknown = null

  while (Date.now() < deadline) {
    let uiContext: APIRequestContext | null = null
    let authContext: APIRequestContext | null = null

    try {
      uiContext = await request.newContext({ baseURL, ignoreHTTPSErrors })
      const readiness = await getReadyLoginPage(uiContext)
      if (!readiness.ok) {
        throw new Error(`Unexpected login readiness response: ${readiness.status}`)
      }

      if (skipAuthBootstrap) {
        await uiContext.dispose()
        return
      }

      const authBaseURL = resolveAuthBaseUrl(baseURL)
      authContext = await request.newContext({
        baseURL: authBaseURL,
        ignoreHTTPSErrors: shouldIgnoreHttpsErrors(authBaseURL),
      })

      await authContext.get('/api/auth/test-login?email=admin@example.com&returnUrl=%2Fadmin%2Fdashboard')
      const sessionResponse = await authContext.get('/api/auth/session')
      const sessionPayload = await sessionResponse.json() as { authenticated?: boolean }
      if (!sessionPayload.authenticated) {
        throw new Error('Admin storage state bootstrap did not yield an authenticated session.')
      }

      const storageStatePath = path.resolve('test-results/playwright/admin-storage-state.json')
      await fs.mkdir(path.dirname(storageStatePath), { recursive: true })
      await authContext.storageState({ path: storageStatePath })
      if (shouldRelaxSecureCookiesForBaseUrl(baseURL)) {
        await relaxLocalhostSecureCookies(storageStatePath)
      }
      await authContext.dispose()
      await uiContext.dispose()
      return
    } catch (error) {
      lastError = error
      if (authContext) {
        await authContext.dispose()
      }
      if (uiContext) {
        await uiContext.dispose()
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Playwright global setup could not reach ${baseURL}/login within 60 seconds. Last error: ${String(lastError)}`)
}
