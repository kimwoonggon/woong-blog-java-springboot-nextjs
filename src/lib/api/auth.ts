import { getApiBaseUrl } from '@/lib/api/base'

export function getLoginUrl(returnUrl = '/admin') {
  return `${getApiBaseUrl()}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
}

export function getLocalAdminLoginUrl(returnUrl = '/admin', email = 'admin@example.com') {
  return `${getApiBaseUrl()}/auth/test-login?email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent(returnUrl)}`
}

let csrfTokenCache: string | null = null
let csrfHeaderNameCache = 'X-CSRF-TOKEN'
const SESSION_CACHE_TTL_MS = 10_000
let authenticatedSessionCacheUntil = 0
let authenticatedSessionPromise: Promise<boolean> | null = null

function redirectToLoginForAuthFailure() {
  if (typeof window === 'undefined') {
    return
  }

  const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
}

async function ensureBrowserAuthenticatedSession() {
  if (typeof window === 'undefined') {
    return true
  }

  if (authenticatedSessionCacheUntil > Date.now()) {
    return true
  }

  if (authenticatedSessionPromise) {
    return authenticatedSessionPromise
  }

  authenticatedSessionPromise = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401 || response.status === 403) {
        authenticatedSessionCacheUntil = 0
        redirectToLoginForAuthFailure()
        return false
      }

      if (!response.ok) {
        throw new Error(`Session check failed with status ${response.status}.`)
      }

      const payload = await response.json() as { authenticated?: boolean }
      if (payload.authenticated === true) {
        authenticatedSessionCacheUntil = Date.now() + SESSION_CACHE_TTL_MS
        return true
      }

      authenticatedSessionCacheUntil = 0
      redirectToLoginForAuthFailure()
      return false
    } catch {
      throw new Error('Session check failed. Please retry after the server is healthy.')
    } finally {
      authenticatedSessionPromise = null
    }
  })()

  return authenticatedSessionPromise
}

function shouldRedirectToLogin(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return true
  }

  if (response.status === 302 || response.status === 307 || response.status === 308) {
    return true
  }

  const location = response.headers.get('location') ?? ''
  if (location.includes('/login')) {
    return true
  }

  return response.redirected && response.url.includes('/login')
}

function isMutationMethod(method?: string) {
  const normalizedMethod = (method ?? 'GET').toUpperCase()
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)
}

export async function getCsrfToken(forceRefresh = false) {
  if (csrfTokenCache && !forceRefresh) {
    return { requestToken: csrfTokenCache, headerName: csrfHeaderNameCache }
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/csrf`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to obtain CSRF token.')
  }

  const payload = await response.json() as { requestToken?: string; headerName?: string }
  csrfTokenCache = payload.requestToken ?? null
  csrfHeaderNameCache = payload.headerName ?? 'X-CSRF-TOKEN'

  if (!csrfTokenCache) {
    throw new Error('CSRF token response was empty.')
  }

  return { requestToken: csrfTokenCache, headerName: csrfHeaderNameCache }
}

export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}, retry = true) {
  const headers = new Headers(init.headers)
  const mutationRequest = isMutationMethod(init.method)
  const requestInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers,
  }

  if (mutationRequest) {
    const sessionIsValid = await ensureBrowserAuthenticatedSession()
    if (!sessionIsValid) {
      return new Response('', { status: 401, statusText: 'Session expired' })
    }
  }

  if (mutationRequest) {
    const csrf = await getCsrfToken()
    headers.set(csrf.headerName, csrf.requestToken)
  }

  const response = await fetch(input, requestInit)

  if (retry && response.status === 400 && mutationRequest) {
    const csrf = await getCsrfToken(true)
    headers.set(csrf.headerName, csrf.requestToken)
    const retriedResponse = await fetch(input, requestInit)
    if (mutationRequest && shouldRedirectToLogin(retriedResponse)) {
      authenticatedSessionCacheUntil = 0
      redirectToLoginForAuthFailure()
    }
    return retriedResponse
  }

  if (mutationRequest && shouldRedirectToLogin(response)) {
    authenticatedSessionCacheUntil = 0
    redirectToLoginForAuthFailure()
  }

  return response
}

export async function logoutWithCsrf(returnUrl = '/') {
  const response = await fetchWithCsrf(
    `${getApiBaseUrl()}/auth/logout?returnUrl=${encodeURIComponent(returnUrl)}`,
    { method: 'POST' },
  )

  if (!response.ok) {
    throw new Error('Failed to sign out.')
  }

  csrfTokenCache = null
  authenticatedSessionCacheUntil = 0

  const payload = await response.json().catch(() => ({ redirectUrl: returnUrl })) as { redirectUrl?: string }
  return payload.redirectUrl ?? returnUrl
}
