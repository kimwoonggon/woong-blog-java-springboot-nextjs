import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('api clients without server cookies', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('omits cookie headers when admin blog and work requests run without an incoming session', async () => {
    vi.doMock('@/lib/api/server', () => ({
      getServerApiBaseUrl: vi.fn(async () => 'http://localhost/api'),
      getServerCookieHeader: vi.fn(async () => ''),
    }))

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchAdminBlogs } = await import('@/lib/api/blogs')
    const { fetchAdminWorks } = await import('@/lib/api/works')

    await fetchAdminBlogs()
    await fetchAdminWorks()

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost/api/admin/blogs', {
      cache: 'no-store',
      headers: {},
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost/api/admin/works', {
      cache: 'no-store',
      headers: {},
    })
  })
})
