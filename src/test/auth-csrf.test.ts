import { beforeEach, describe, expect, it, vi } from 'vitest'

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    redirected: false,
    url: 'http://localhost/api/mock',
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('auth csrf helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_API_BASE_URL
    vi.unstubAllGlobals()
  })

  it('caches the csrf token and configured header name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ requestToken: 'token-1', headerName: 'X-CUSTOM-CSRF' }))
    vi.stubGlobal('fetch', fetchMock)

    const { getCsrfToken } = await import('@/lib/api/auth')
    const first = await getCsrfToken()
    const second = await getCsrfToken()

    expect(first).toEqual({ requestToken: 'token-1', headerName: 'X-CUSTOM-CSRF' })
    expect(second).toEqual({ requestToken: 'token-1', headerName: 'X-CUSTOM-CSRF' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('builds login urls with encoded defaults and fallback header names', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ requestToken: 'token-1' }))
    vi.stubGlobal('fetch', fetchMock)

    const { getLoginUrl, getLocalAdminLoginUrl, getCsrfToken } = await import('@/lib/api/auth')

    expect(getLoginUrl()).toBe('/api/auth/login?returnUrl=%2Fadmin')
    expect(getLocalAdminLoginUrl('/admin/dashboard', 'admin+test@example.com')).toBe(
      '/api/auth/test-login?email=admin%2Btest%40example.com&returnUrl=%2Fadmin%2Fdashboard',
    )
    await expect(getCsrfToken()).resolves.toEqual({
      requestToken: 'token-1',
      headerName: 'X-CSRF-TOKEN',
    })
  })

  it('retries mutation requests with a refreshed csrf token after a 400 response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ authenticated: true }))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'token-1', headerName: 'X-CSRF-1' }))
      .mockResolvedValueOnce(mockJsonResponse({}, 400))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'token-2', headerName: 'X-CSRF-2' }))
      .mockResolvedValueOnce(mockJsonResponse({}, 200))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchWithCsrf } = await import('@/lib/api/auth')
    const response = await fetchWithCsrf('/api/admin/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'retry' }),
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls[2][1]?.headers).toBeInstanceOf(Headers)
    expect((fetchMock.mock.calls[2][1]?.headers as Headers).get('X-CSRF-1')).toBe('token-1')
    expect((fetchMock.mock.calls[4][1]?.headers as Headers).get('X-CSRF-2')).toBe('token-2')
  })

  it('adds csrf headers to PATCH requests without retrying when retry is disabled', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ authenticated: true }))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'token-1', headerName: 'X-CSRF-1' }))
      .mockResolvedValueOnce(mockJsonResponse({}, 400))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchWithCsrf } = await import('@/lib/api/auth')
    const response = await fetchWithCsrf('/api/admin/site-settings', {
      method: 'PATCH',
      body: JSON.stringify({ ownerName: 'patched' }),
    }, false)

    expect(response.status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect((fetchMock.mock.calls[2][1]?.headers as Headers).get('X-CSRF-1')).toBe('token-1')
  })

  it('reuses the authenticated session check across consecutive mutations within the ttl window', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ authenticated: true }))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'token-1', headerName: 'X-CSRF-1' }))
      .mockResolvedValueOnce(mockJsonResponse({}, 200))
      .mockResolvedValueOnce(mockJsonResponse({}, 200))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchWithCsrf } = await import('@/lib/api/auth')

    await fetchWithCsrf('/api/admin/site-settings', { method: 'PUT' })
    await fetchWithCsrf('/api/admin/site-settings', { method: 'PATCH' })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[0][0]).toContain('/api/auth/session')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/auth/csrf')
    expect((fetchMock.mock.calls[2][1]?.headers as Headers).get('X-CSRF-1')).toBe('token-1')
    expect((fetchMock.mock.calls[3][1]?.headers as Headers).get('X-CSRF-1')).toBe('token-1')
  })

  it('posts logout with csrf and returns redirect url', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ authenticated: true }))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'logout-token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(mockJsonResponse({ redirectUrl: '/signed-out' }))
    vi.stubGlobal('fetch', fetchMock)

    const { logoutWithCsrf } = await import('@/lib/api/auth')
    const redirectUrl = await logoutWithCsrf('/signed-out')

    expect(redirectUrl).toBe('/signed-out')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][0]).toContain('/api/auth/logout?returnUrl=%2Fsigned-out')
    expect(fetchMock.mock.calls[2][1]?.method).toBe('POST')
  })

  it('throws when csrf token bootstrap fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    vi.stubGlobal('fetch', fetchMock)

    const { getCsrfToken } = await import('@/lib/api/auth')

    await expect(getCsrfToken()).rejects.toThrow('Failed to obtain CSRF token.')
  })

  it('throws when csrf token response is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ headerName: 'X-CSRF-TOKEN' }))
    vi.stubGlobal('fetch', fetchMock)

    const { getCsrfToken } = await import('@/lib/api/auth')

    await expect(getCsrfToken()).rejects.toThrow('CSRF token response was empty.')
  })

  it('does not add csrf headers to non-mutation requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchWithCsrf } = await import('@/lib/api/auth')
    await fetchWithCsrf('/api/public/works', { method: 'GET' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).has('X-CSRF-TOKEN')).toBe(false)
  })

  it('throws when logout request fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ authenticated: true }))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'logout-token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(mockJsonResponse({}, 500))
    vi.stubGlobal('fetch', fetchMock)

    const { logoutWithCsrf } = await import('@/lib/api/auth')

    await expect(logoutWithCsrf('/signed-out')).rejects.toThrow('Failed to sign out.')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][0]).toContain('/api/auth/logout?returnUrl=%2Fsigned-out')
  })

  it('falls back to the requested logout return url when response json parsing fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ authenticated: true }))
      .mockResolvedValueOnce(mockJsonResponse({ requestToken: 'logout-token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        redirected: false,
        url: 'http://localhost/api/mock',
        json: vi.fn().mockRejectedValue(new Error('bad json')),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { logoutWithCsrf } = await import('@/lib/api/auth')

    await expect(logoutWithCsrf('/fallback')).resolves.toBe('/fallback')
  })
})
