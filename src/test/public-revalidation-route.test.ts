import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const revalidatePath = vi.hoisted(() => vi.fn())
const revalidateTag = vi.hoisted(() => vi.fn())
const getPublicAdminAffordanceState = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({
  revalidatePath,
  revalidateTag,
}))

vi.mock('@/lib/auth/public-admin', () => ({
  getPublicAdminAffordanceState,
}))

function makeRequest(paths: string[], init: RequestInit = {}) {
  return new NextRequest('http://localhost/revalidate-public', {
    method: 'POST',
    headers: {
      host: 'localhost',
      origin: 'http://localhost',
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: JSON.stringify({ paths }),
  })
}

describe('public revalidation route', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('revalidates only allowed public paths for admins', async () => {
    getPublicAdminAffordanceState.mockResolvedValue({ canShowAdminAffordances: true })
    const { POST } = await import('@/app/revalidate-public/route')

    const response = await POST(makeRequest(['/', '/blog', '/blog/post', '/admin', '/works/work']))

    await expect(response.json()).resolves.toEqual({
      revalidated: ['/', '/blog', '/blog/post', '/works/work'],
      tags: ['public-home', 'public-site-settings', 'public-blogs', 'public-works', 'public-blog:post', 'public-work:work'],
    })
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, '/')
    expect(revalidatePath).toHaveBeenNthCalledWith(2, '/blog')
    expect(revalidatePath).toHaveBeenNthCalledWith(3, '/blog/post')
    expect(revalidatePath).toHaveBeenNthCalledWith(4, '/works/work')
    expect(revalidateTag).toHaveBeenCalledTimes(6)
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'public-home', 'max')
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'public-site-settings', 'max')
    expect(revalidateTag).toHaveBeenNthCalledWith(3, 'public-blogs', 'max')
    expect(revalidateTag).toHaveBeenNthCalledWith(4, 'public-works', 'max')
    expect(revalidateTag).toHaveBeenNthCalledWith(5, 'public-blog:post', 'max')
    expect(revalidateTag).toHaveBeenNthCalledWith(6, 'public-work:work', 'max')
  })

  it('rejects non-admin requests', async () => {
    getPublicAdminAffordanceState.mockResolvedValue({ canShowAdminAffordances: false })
    const { POST } = await import('@/app/revalidate-public/route')

    const response = await POST(makeRequest(['/']))

    expect(response.status).toBe(403)
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects cross-origin requests', async () => {
    getPublicAdminAffordanceState.mockResolvedValue({ canShowAdminAffordances: true })
    const { POST } = await import('@/app/revalidate-public/route')

    const response = await POST(makeRequest(['/'], { headers: { origin: 'https://evil.example' } }))

    expect(response.status).toBe(403)
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('allows same-host forwarded requests when the proxy omits the origin port', async () => {
    getPublicAdminAffordanceState.mockResolvedValue({ canShowAdminAffordances: true })
    const { POST } = await import('@/app/revalidate-public/route')

    const response = await POST(makeRequest(['/'], {
      headers: {
        host: '127.0.0.1',
        origin: 'http://127.0.0.1:3000',
        'x-forwarded-host': '127.0.0.1',
      },
    }))

    expect(response.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidateTag).toHaveBeenCalledWith('public-home', 'max')
  })
})
