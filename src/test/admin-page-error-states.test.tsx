import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('admin page error states', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders an explicit error when dashboard summary loading fails', async () => {
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => []),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => []),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    render(await DashboardPage({}))

    expect(await screen.findByText('Dashboard data is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  }, 30000)

  it('renders an explicit error when admin blog list loading fails', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => null,
    }))
    vi.doMock('@/app/admin/blog/actions', () => ({
      deleteBlog: vi.fn(),
    }))

    const AdminBlogPage = (await import('@/app/admin/blog/page')).default
    render(await AdminBlogPage())

    expect(screen.getByText('Blog administration is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/blog posts could not be loaded from the backend/i)).toBeInTheDocument()
  }, 15000)

  it('renders an explicit error when admin works loading fails', async () => {
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => null,
    }))
    vi.doMock('@/app/admin/works/actions', () => ({
      deleteWork: vi.fn(),
    }))

    const AdminWorksPage = (await import('@/app/admin/works/page')).default
    render(await AdminWorksPage())

    expect(screen.getByText('Work administration is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/works could not be loaded from the backend/i)).toBeInTheDocument()
  }, 15000)

  it('renders an explicit error when admin pages/settings loading fails', async () => {
    vi.doMock('@/lib/api/admin-pages', () => ({
      fetchAdminPages: vi.fn(async () => {
        throw new Error('backend failure')
      }),
      fetchAdminSiteSettings: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))

    const AdminPagesPage = (await import('@/app/admin/pages/page')).default
    render(await AdminPagesPage())

    expect(screen.getByText('Pages and settings are unavailable')).toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  }, 15000)

  it('renders an explicit error when blog editor loading fails', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogById: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))
    vi.doMock('@/components/admin/BlogEditor', () => ({
      BlogEditor: () => null,
    }))

    const EditBlogPage = (await import('@/app/admin/blog/[id]/page')).default
    render(await EditBlogPage({ params: Promise.resolve({ id: 'blog-id' }) }))

    expect(screen.getByText('Blog editor is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  }, 15000)

  it('renders an explicit error when work editor loading fails', async () => {
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorkById: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))
    vi.doMock('@/components/admin/WorkEditor', () => ({
      WorkEditor: () => null,
    }))

    const EditWorkPage = (await import('@/app/admin/works/[id]/page')).default
    render(await EditWorkPage({ params: Promise.resolve({ id: 'work-id' }) }))

    expect(screen.getByText('Work editor is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  }, 15000)

  it('renders an explicit error when members loading fails', async () => {
    vi.doMock('@/lib/api/admin-members', () => ({
      fetchAdminMembers: vi.fn(async () => {
        throw new Error('backend failure')
      }),
    }))

    const AdminMembersPage = (await import('@/app/admin/members/page')).default
    render(await AdminMembersPage())

    expect(screen.getByText('Members are unavailable')).toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
  }, 15000)
})
