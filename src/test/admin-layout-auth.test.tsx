import { render, screen } from '@testing-library/react'
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

vi.mock('@/app/admin/AdminLogoutButton', () => ({
  AdminLogoutButton: () => <button type="button">Logout</button>,
}))

vi.mock('@/components/admin/AdminSidebarNav', () => ({
  AdminSidebarNav: () => <nav aria-label="Admin sidebar">Admin navigation</nav>,
}))

describe('AdminLayout auth protection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    serverMocks.fetchServerSession.mockResolvedValue({ authenticated: true, role: 'admin' })
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('redirects anonymous sessions to login before rendering admin chrome', async () => {
    serverMocks.fetchServerSession.mockResolvedValue({ authenticated: false })

    const AdminLayout = (await import('@/app/admin/layout')).default

    await expect(AdminLayout({ children: <div>Protected admin content</div> })).rejects.toThrow('redirect:/login')
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/login')
  }, 30000)

  it('redirects non-admin authenticated sessions home before rendering sidebar or content', async () => {
    serverMocks.fetchServerSession.mockResolvedValue({ authenticated: true, role: 'author' })

    const AdminLayout = (await import('@/app/admin/layout')).default

    await expect(AdminLayout({ children: <div>Protected admin content</div> })).rejects.toThrow('redirect:/')
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/')
  }, 30000)

  it('redirects authenticated sessions without an admin role home before rendering admin chrome', async () => {
    serverMocks.fetchServerSession.mockResolvedValue({ authenticated: true })

    const AdminLayout = (await import('@/app/admin/layout')).default

    await expect(AdminLayout({ children: <div>Protected admin content</div> })).rejects.toThrow('redirect:/')
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/')
  }, 30000)

  it('does not render admin chrome when the session check fails before layout render', async () => {
    serverMocks.fetchServerSession.mockRejectedValue(new Error('SQLSTATE 08006 stack trace from session status 500'))

    const AdminLayout = (await import('@/app/admin/layout')).default

    await expect(AdminLayout({ children: <div>Protected admin content</div> })).rejects.toThrow('SQLSTATE 08006')
    expect(navigationMocks.redirect).not.toHaveBeenCalled()
  }, 30000)

  it('renders admin navigation and protected content for admin sessions', async () => {
    const AdminLayout = (await import('@/app/admin/layout')).default
    render(await AdminLayout({ children: <div>Protected admin content</div> }))

    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Admin sidebar' })).toBeInTheDocument()
    expect(screen.getByText('Protected admin content')).toBeInTheDocument()
  }, 30000)
})
