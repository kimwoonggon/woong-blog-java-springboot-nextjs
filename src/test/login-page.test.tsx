import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`)
  }),
}))

const serverMocks = vi.hoisted(() => ({
  fetchServerSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}))

vi.mock('@/lib/api/server', () => ({
  fetchServerSession: serverMocks.fetchServerSession,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
    serverMocks.fetchServerSession.mockResolvedValue({ authenticated: false })
    delete process.env.ENABLE_LOCAL_ADMIN_SHORTCUT
    delete process.env.NEXT_PUBLIC_API_BASE_URL
  })

  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.ENABLE_LOCAL_ADMIN_SHORTCUT
    delete process.env.NEXT_PUBLIC_API_BASE_URL
  })

  it('renders the anonymous login UI with the default backend auth launcher', async () => {
    const LoginPage = (await import('@/app/login/page')).default
    render(await LoginPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
      'href',
      '/api/auth/login?returnUrl=%2Fadmin',
    )
  }, 30000)

  it('preserves a safe returnUrl for OAuth and local admin launcher links', async () => {
    process.env.ENABLE_LOCAL_ADMIN_SHORTCUT = 'true'

    const LoginPage = (await import('@/app/login/page')).default
    render(await LoginPage({ searchParams: Promise.resolve({ returnUrl: '/admin/blog?draft=1' }) }))

    expect(screen.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
      'href',
      '/api/auth/login?returnUrl=%2Fadmin%2Fblog%3Fdraft%3D1',
    )
    expect(screen.getByRole('link', { name: 'Continue as Local Admin' })).toHaveAttribute(
      'href',
      '/api/auth/test-login?email=admin%40example.com&returnUrl=%2Fadmin%2Fblog%3Fdraft%3D1',
    )
  }, 30000)

  it('falls back to admin when returnUrl is unsafe', async () => {
    const LoginPage = (await import('@/app/login/page')).default
    render(await LoginPage({ searchParams: Promise.resolve({ returnUrl: '//evil.example/admin' }) }))

    expect(screen.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
      'href',
      '/api/auth/login?returnUrl=%2Fadmin',
    )
  }, 30000)

  it('renders known and unknown login errors without echoing query text', async () => {
    const LoginPage = (await import('@/app/login/page')).default
    const { rerender } = render(await LoginPage({ searchParams: Promise.resolve({ error: 'admin_only' }) }))

    expect(screen.getByText(/restricted to accounts explicitly allowed/i)).toBeInTheDocument()

    rerender(await LoginPage({ searchParams: Promise.resolve({ error: '<script>alert(1)</script>' }) }))

    expect(screen.getByText('Sign-in could not be completed. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText(/script/i)).not.toBeInTheDocument()
  }, 30000)

  it('hides the local admin shortcut unless the environment explicitly enables it', async () => {
    const LoginPage = (await import('@/app/login/page')).default
    const { rerender } = render(await LoginPage({ searchParams: Promise.resolve({}) }))

    expect(screen.queryByRole('link', { name: 'Continue as Local Admin' })).not.toBeInTheDocument()

    process.env.ENABLE_LOCAL_ADMIN_SHORTCUT = 'true'
    rerender(await LoginPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole('link', { name: 'Continue as Local Admin' })).toHaveAttribute(
      'href',
      expect.stringContaining('/api/auth/test-login?'),
    )
    expect(screen.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
      'href',
      expect.stringContaining('/api/auth/login?'),
    )
  }, 30000)

  it('redirects authenticated admins away from login using the safe return target', async () => {
    serverMocks.fetchServerSession.mockResolvedValue({ authenticated: true, role: 'admin' })

    const LoginPage = (await import('@/app/login/page')).default

    await expect(LoginPage({ searchParams: Promise.resolve({ returnUrl: '/admin/pages' }) })).rejects.toThrow(
      'redirect:/admin/pages',
    )
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/admin/pages')
  }, 30000)
})
