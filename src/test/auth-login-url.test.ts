import { describe, expect, it, vi } from 'vitest'

describe('getLoginUrl', () => {
  it('builds a same-origin auth launcher url for admin by default', async () => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_API_BASE_URL

    const { getLoginUrl } = await import('@/lib/api/auth')

    expect(getLoginUrl()).toBe('/api/auth/login?returnUrl=%2Fadmin')
  })

  it('encodes custom return urls', async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost/api'

    const { getLoginUrl } = await import('@/lib/api/auth')

    expect(getLoginUrl('/admin/blog')).toBe('http://localhost/api/auth/login?returnUrl=%2Fadmin%2Fblog')
  })

  it('builds a local admin shortcut url for development review', async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost/api'

    const { getLocalAdminLoginUrl } = await import('@/lib/api/auth')

    expect(getLocalAdminLoginUrl('/admin')).toBe('http://localhost/api/auth/test-login?email=admin%40example.com&returnUrl=%2Fadmin')
  })
})
