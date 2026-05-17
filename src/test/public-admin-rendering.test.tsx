import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`)
  }),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
  useRouter: () => ({ replace: navigationMocks.replace }),
  usePathname: () => '/blog',
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ host: 'localhost' })),
}))

vi.mock('@/components/layout/ResponsivePageSizeSync', () => ({
  ResponsivePageSizeSync: () => null,
}))

vi.mock('@/components/layout/EdgePaginationNav', () => ({
  EdgePaginationNav: () => null,
}))

vi.mock('@/components/layout/PublicPagination', () => ({
  PublicPagination: () => <nav aria-label="Mock pagination" />,
}))

vi.mock('@/components/content/InteractiveRenderer', () => ({
  InteractiveRenderer: ({ html }: { html: string }) => <div>{html.replace(/<[^>]*>/g, '')}</div>,
}))

vi.mock('@/components/content/BlockRenderer', () => ({
  BlockRenderer: () => <div data-testid="mock-block-renderer" />,
}))

vi.mock('@/components/admin/InlinePageEditorSection', () => ({
  InlinePageEditorSection: () => <div data-testid="inline-page-editor" />,
}))

vi.mock('@/components/admin/InlineBlogEditorSection', () => ({
  InlineBlogEditorSection: () => <div data-testid="inline-blog-editor" />,
}))

vi.mock('@/components/admin/PublicWorksInlineCreateShell', () => ({
  PublicWorksInlineCreateShell: () => <div data-testid="inline-work-create" />,
}))

describe('public admin rendering', () => {
  beforeEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the public layout without fetching a session for the navbar', async () => {
    const fetchServerSession = vi.fn(async () => ({ authenticated: true, role: 'admin' }))

    vi.doMock('@/lib/api/server', () => ({
      fetchServerSession,
    }))

    vi.doMock('@/lib/api/public-site-settings-fallback', () => ({
      fetchPublicSiteSettingsOrFallback: vi.fn(async () => ({
        ownerName: 'Woong',
        tagline: 'Creative Technologist',
        facebookUrl: '',
        instagramUrl: '',
        twitterUrl: '',
        linkedInUrl: '',
        gitHubUrl: '',
      })),
    }))

    vi.doMock('@/components/layout/Navbar', () => ({
      Navbar: ({ ownerName }: { ownerName: string }) => <nav>{ownerName}</nav>,
    }))

    vi.doMock('@/components/layout/Footer', () => ({
      Footer: ({ ownerName }: { ownerName: string }) => <footer>{ownerName}</footer>,
    }))

    vi.doMock('@/components/layout/SkipToMainLink', () => ({
      SkipToMainLink: () => <a href="#main-content">Skip</a>,
    }))

    const PublicLayout = (await import('@/app/(public)/layout')).default
    render(await PublicLayout({ children: <div>Public body</div> }))

    expect(screen.getByText('Public body')).toBeInTheDocument()
    expect(fetchServerSession).not.toHaveBeenCalled()
  })

  it('uses the shared public admin gate to show and hide admin affordance links', async () => {
    const { canShowPublicAdminAffordances } = await import('@/lib/auth/public-admin')
    const { PublicAdminLink } = await import('@/components/admin/PublicAdminLink')

    expect(canShowPublicAdminAffordances({ authenticated: false })).toBe(false)
    expect(canShowPublicAdminAffordances({ authenticated: true, role: 'author' })).toBe(false)
    expect(canShowPublicAdminAffordances({ authenticated: true, role: 'admin' })).toBe(true)

    const { rerender } = render(
      <PublicAdminLink href="/admin/blog" label="글 관리" canShow={false} variant="manage" />,
    )

    expect(screen.queryByRole('link', { name: /글 관리/ })).not.toBeInTheDocument()

    rerender(<PublicAdminLink href="/admin/blog" label="글 관리" canShow variant="manage" />)

    expect(screen.getByRole('link', { name: /글 관리/ })).toHaveAttribute('href', '/admin/blog')
  })

  it('resolves the async shared public admin state from the server session', async () => {
    const fetchServerSession = vi.fn(async () => ({ authenticated: true, role: 'admin' }))

    vi.doMock('@/lib/api/server', () => ({
      fetchServerSession,
    }))

    const { getPublicAdminAffordanceState } = await import('@/lib/auth/public-admin')
    await expect(getPublicAdminAffordanceState()).resolves.toEqual({
      session: { authenticated: true, role: 'admin' },
      canShowAdminAffordances: true,
    })

    expect(fetchServerSession).toHaveBeenCalledTimes(1)
  })

  it('shows page inline editor affordances only for authenticated admins', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: true, role: 'admin' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => ({
        id: 'page-contact',
        title: 'Contact',
        slug: 'contact',
        contentJson: JSON.stringify({ html: '<p>Authored contact content.</p>' }),
      })),
    }))

    const ContactPage = (await import('@/app/(public)/contact/page')).default
    const { unmount } = render(await ContactPage())

    expect(await screen.findByTestId('inline-page-editor')).toBeInTheDocument()

    unmount()
    cleanup()
    vi.resetModules()
    vi.unstubAllGlobals()

    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => ({
        id: 'page-contact',
        title: 'Contact',
        slug: 'contact',
        contentJson: JSON.stringify({ html: '<p>Authored contact content.</p>' }),
      })),
    }))

    const AnonymousContactPage = (await import('@/app/(public)/contact/page')).default
    render(await AnonymousContactPage())

    expect(screen.queryByTestId('inline-page-editor')).not.toBeInTheDocument()
  })

  it('keeps authored page content visible when admin affordance session fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')
    }) as typeof fetch)

    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => ({
        id: 'page-introduction',
        title: 'Introduction',
        slug: 'introduction',
        contentJson: JSON.stringify({ html: '<p>Authored introduction content.</p>' }),
      })),
    }))

    const IntroductionPage = (await import('@/app/(public)/introduction/page')).default
    const { container } = render(await IntroductionPage())

    expect(screen.getByText('Authored introduction content.')).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    }))
    expect(screen.queryByTestId('inline-page-editor')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack trace|WoongBlog\.Api|status 500|undefined|null/i)
  })

  it('renders Study and Works lists without server-side session checks blocking pagination', async () => {
    const fetchServerSession = vi.fn(async () => ({ authenticated: true, role: 'admin' }))
    const fetchPublicBlogs = vi.fn(async () => ({
      items: [{
        id: 'blog-1',
        slug: 'cached-study',
        title: 'Cached Study',
        excerpt: 'Study excerpt',
        tags: [],
      }],
      page: 2,
      pageSize: 12,
      totalItems: 24,
      totalPages: 2,
    }))
    const fetchPublicWorks = vi.fn(async () => ({
      items: [{
        id: 'work-1',
        slug: 'cached-work',
        title: 'Cached Work',
        excerpt: 'Work excerpt',
        category: 'platform',
        tags: [],
      }],
      page: 2,
      pageSize: 8,
      totalItems: 16,
      totalPages: 2,
    }))

    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    vi.doMock('@/lib/api/server', () => ({
      fetchServerSession,
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchPublicBlogs,
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchPublicWorks,
    }))

    const BlogPage = (await import('@/app/(public)/blog/page')).default
    const WorksPage = (await import('@/app/(public)/works/page')).default

    const { unmount } = render(await BlogPage({
      searchParams: Promise.resolve({ page: '2', pageSize: '12' }),
    }))
    expect(screen.getByText('Cached Study')).toBeInTheDocument()
    unmount()

    render(await WorksPage({
      searchParams: Promise.resolve({ page: '2', pageSize: '8' }),
    }))
    expect(screen.getByText('Cached Work')).toBeInTheDocument()
    expect(fetchPublicBlogs).toHaveBeenNthCalledWith(1, 2, 12, undefined)
    expect(fetchPublicBlogs).toHaveBeenNthCalledWith(2, 1, 10, undefined)
    expect(fetchPublicWorks).toHaveBeenNthCalledWith(1, 2, 8, undefined)
    expect(fetchPublicWorks).toHaveBeenNthCalledWith(2, 1, 10, undefined)
    expect(fetchServerSession).not.toHaveBeenCalled()
  }, 15_000)

  it('respects authored contact content without injecting fallback direct email UI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch)

    vi.doMock('@/lib/api/pages', () => ({
      fetchPublicPageBySlug: vi.fn(async () => ({
        id: 'page-contact',
        title: 'Contact',
        slug: 'contact',
        contentJson: JSON.stringify({ html: '<p>Use the project form in the authored page.</p>' }),
      })),
    }))

    const ContactPage = (await import('@/app/(public)/contact/page')).default
    render(await ContactPage())

    expect(screen.getByText('Use the project form in the authored page.')).toBeInTheDocument()
    expect(screen.queryByText('Direct email')).not.toBeInTheDocument()
    expect(screen.queryByText('woong@example.com')).not.toBeInTheDocument()
  })
})
