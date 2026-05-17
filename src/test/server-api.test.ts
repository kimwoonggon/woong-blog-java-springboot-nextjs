import { beforeEach, describe, expect, it, vi } from 'vitest'

const headersMock = vi.fn()
const cookiesMock = vi.fn()

vi.mock('next/headers', () => ({
  headers: headersMock,
  cookies: cookiesMock,
}))

describe('server api helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.INTERNAL_API_ORIGIN
    headersMock.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === 'host') return 'localhost:3000'
        if (name === 'x-forwarded-host') return null
        if (name === 'x-forwarded-proto') return 'http'
        return null
      }),
    })
    cookiesMock.mockResolvedValue({
      getAll: () => [],
    })
  })

  it('prefers INTERNAL_API_ORIGIN when configured', async () => {
    process.env.INTERNAL_API_ORIGIN = 'https://internal.example.com/'
    const { getServerApiBaseUrl } = await import('@/lib/api/server')

    await expect(getServerApiBaseUrl()).resolves.toBe('https://internal.example.com/api')
  })

  it('maps localhost:3000 requests to the compose proxy origin', async () => {
    const { getServerApiBaseUrl } = await import('@/lib/api/server')

    await expect(getServerApiBaseUrl()).resolves.toBe('http://localhost/api')
  })

  it('uses forwarded host/proto for non-local origins', async () => {
    headersMock.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === 'x-forwarded-host') return 'example.com'
        if (name === 'x-forwarded-proto') return 'https'
        if (name === 'host') return 'backend:8080'
        return null
      }),
    })

    const { getServerApiBaseUrl } = await import('@/lib/api/server')

    await expect(getServerApiBaseUrl()).resolves.toBe('https://example.com/api')
  })

  it('falls back to localhost/http when the incoming headers are missing', async () => {
    headersMock.mockResolvedValue({
      get: vi.fn(() => null),
    })

    const { getServerApiBaseUrl } = await import('@/lib/api/server')

    await expect(getServerApiBaseUrl()).resolves.toBe('http://localhost/api')
  })

  it('uses same-origin localhost hosts without forcing the compose proxy override', async () => {
    headersMock.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === 'host') return 'localhost'
        if (name === 'x-forwarded-host') return null
        if (name === 'x-forwarded-proto') return 'http'
        return null
      }),
    })

    const { getServerApiBaseUrl } = await import('@/lib/api/server')

    await expect(getServerApiBaseUrl()).resolves.toBe('http://localhost/api')
  })

  it('throws when the backend session call fails instead of hiding the failure as logout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch)
    const { fetchServerSession } = await import('@/lib/api/server')

    await expect(fetchServerSession()).rejects.toThrow('Session endpoint failed with status 500.')
  })

  it('omits the cookie header when the incoming request has no cookies', async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [],
    })
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchServerSession } = await import('@/lib/api/server')
    await fetchServerSession()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/auth/session', {
      headers: { 'x-forwarded-proto': 'http' },
      cache: 'no-store',
    })
  })

  it('forwards cookies and returns the parsed session payload on success', async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [
        { name: 'cookie-a', value: '1' },
        { name: 'cookie-b', value: '2' },
      ],
    })
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: 'admin' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchServerSession } = await import('@/lib/api/server')
    const result = await fetchServerSession()

    expect(result).toEqual({ authenticated: true, role: 'admin' })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/auth/session', {
      headers: { cookie: 'cookie-a=1; cookie-b=2', 'x-forwarded-proto': 'http' },
      cache: 'no-store',
    })
  })

  it('requests the backend session without a cookie header when no cookies exist', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchServerSession } = await import('@/lib/api/server')

    await expect(fetchServerSession()).resolves.toEqual({ authenticated: true })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/auth/session', {
      headers: { 'x-forwarded-proto': 'http' },
      cache: 'no-store',
    })
  })

  it('joins cookie values into a single header string', async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [
        { name: 'first', value: 'one' },
        { name: 'second', value: 'two' },
      ],
    })

    const { getServerCookieHeader } = await import('@/lib/api/server')

    await expect(getServerCookieHeader()).resolves.toBe('first=one; second=two')
  })
})
