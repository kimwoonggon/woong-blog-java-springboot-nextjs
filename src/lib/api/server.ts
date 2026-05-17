import { cookies, headers } from 'next/headers'

export interface ServerSession {
  authenticated: boolean
  name?: string
  email?: string
  role?: string
  profileId?: string
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

function getServerOriginFromHeaders(host: string | null, proto: string | null) {
  const resolvedHost = host ?? 'localhost'
  const resolvedProto = proto ?? 'http'
  return `${resolvedProto}://${resolvedHost}`
}

function shouldProxyToComposeHost(origin: string) {
  return /^(https?:\/\/)(localhost|127\.0\.0\.1):3000$/i.test(normalizeOrigin(origin))
}

export async function getServerApiBaseUrl() {
  if (process.env.INTERNAL_API_ORIGIN) {
    return `${normalizeOrigin(process.env.INTERNAL_API_ORIGIN)}/api`
  }

  const headerStore = await headers()
  const resolvedOrigin = getServerOriginFromHeaders(
    headerStore.get('x-forwarded-host') ?? headerStore.get('host'),
    headerStore.get('x-forwarded-proto')
  )

  if (shouldProxyToComposeHost(resolvedOrigin)) {
    return 'http://localhost/api'
  }

  return `${normalizeOrigin(resolvedOrigin)}/api`
}

export async function fetchServerSession() {
  const apiBaseUrl = await getServerApiBaseUrl()
  const cookieHeader = await getServerCookieHeader()
  const forwardedHeaders = await getServerForwardingHeaders()

  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    headers: {
      ...forwardedHeaders,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: 'no-store',
  })

  if (response.status === 401 || response.status === 403) {
    return { authenticated: false } satisfies ServerSession
  }

  if (!response.ok) {
    throw new Error(`Session endpoint failed with status ${response.status}.`)
  }

  return response.json() as Promise<ServerSession>
}

export async function getServerForwardingHeaders() {
  const headerStore = await headers()
  const forwardedHeaders: Record<string, string> = {}

  for (const name of ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'cf-connecting-ip']) {
    const value = headerStore.get(name)
    if (value) {
      forwardedHeaders[name] = value
    }
  }

  return forwardedHeaders
}

export async function getServerCookieHeader() {
  const cookieStore = await cookies()
  return cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ')
}
