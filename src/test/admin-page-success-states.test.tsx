import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/admin/blog',
  useSearchParams: () => new URLSearchParams(),
}))

describe('admin page success and not-found states', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders dashboard stats and collections when every dependency succeeds', async () => {
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => ({
        worksCount: 3,
        blogsCount: 4,
        viewsCount: 99,
      })),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => [{ id: 'work-1', title: 'Work', slug: 'work', published: true, category: 'platform', tags: [] }]),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => [{ id: 'blog-1', title: 'Blog', slug: 'blog', published: false, excerpt: 'excerpt', tags: [] }]),
    }))
    vi.doMock('@/components/admin/AdminDashboardCollections', () => ({
      AdminDashboardCollections: ({ works, blogs }: { works: unknown[]; blogs: unknown[] }) => (
        <div data-testid="dashboard-collections">{works.length}:{blogs.length}</div>
      ),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    render(await DashboardPage({}))

    expect(screen.getByText('99')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-collections')).toHaveTextContent('1:1')
  }, 30000)

  it('renders dashboard zero stats and empty collections without treating them as errors', async () => {
    vi.doMock('@/components/admin/AdminDashboardCollections', async () => (
      await vi.importActual<typeof import('@/components/admin/AdminDashboardCollections')>('@/components/admin/AdminDashboardCollections')
    ))
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => ({
        worksCount: 0,
        blogsCount: 0,
        viewsCount: 0,
      })),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => []),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => []),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    const { container } = render(await DashboardPage({}))

    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('No works found.')).toBeInTheDocument()
    expect(screen.getByText('No blog posts found.')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard data is unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard content lists are unavailable')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 15000)

  it('renders safe dashboard stat fallbacks for malformed summary counts', async () => {
    vi.doMock('@/components/admin/AdminDashboardCollections', () => ({
      AdminDashboardCollections: ({ works, blogs }: { works: unknown[]; blogs: unknown[] }) => (
        <div data-testid="dashboard-collections">{works.length}:{blogs.length}</div>
      ),
    }))
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => ({
        worksCount: Number.NaN,
        blogsCount: undefined,
        viewsCount: -12,
      })),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => []),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => []),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    const { container } = render(await DashboardPage({}))

    expect(screen.getByText('Total Views')).toBeInTheDocument()
    expect(screen.getByText('Total Works')).toBeInTheDocument()
    expect(screen.getByText('Total Blog Posts')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.queryByText('Dashboard data is unavailable')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-collections')).toHaveTextContent('0:0')
    expect(container.textContent).not.toMatch(/NaN|-12|undefined|null|stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 15000)

  it('renders the dashboard list error when content collections fail to load', async () => {
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => ({
        worksCount: 1,
        blogsCount: 1,
        viewsCount: 1,
      })),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => {
        throw new Error('failed')
      }),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => {
        throw new Error('failed')
      }),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    render(await DashboardPage({}))

    expect(screen.getAllByText('Dashboard content lists are unavailable')[0]).toBeInTheDocument()
  }, 15000)

  it('keeps loaded dashboard blog content and safe navigation when works fail to load', async () => {
    vi.doMock('@/components/admin/AdminDashboardCollections', async () => (
      await vi.importActual<typeof import('@/components/admin/AdminDashboardCollections')>('@/components/admin/AdminDashboardCollections')
    ))
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => ({
        worksCount: 1,
        blogsCount: 1,
        viewsCount: 7,
      })),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => {
        throw new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')
      }),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => [{
        id: 'blog-1',
        title: 'Loaded Blog',
        slug: 'loaded-blog',
        published: true,
        publishedAt: '2024-01-02T00:00:00.000Z',
        tags: ['safe'],
        excerpt: 'Loaded blog excerpt',
      }]),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    const { container } = render(await DashboardPage({}))

    expect(screen.getByText('Dashboard content lists are partially unavailable')).toBeInTheDocument()
    expect(screen.getByText('Works could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText('Loaded Blog')).toBeInTheDocument()
    expect(screen.getByText('safe')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Site' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/admin/members')
    expect(screen.getByRole('link', { name: 'Blog Notion View' })).toHaveAttribute('href', '/admin/blog/notion')
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 30000)

  it('keeps loaded dashboard work content when blogs fail to load', async () => {
    vi.doMock('@/components/admin/AdminDashboardCollections', async () => (
      await vi.importActual<typeof import('@/components/admin/AdminDashboardCollections')>('@/components/admin/AdminDashboardCollections')
    ))
    vi.doMock('@/lib/api/admin-dashboard', () => ({
      fetchAdminDashboardSummary: vi.fn(async () => ({
        worksCount: 1,
        blogsCount: 1,
        viewsCount: 7,
      })),
    }))
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => [{
        id: 'work-1',
        title: 'Loaded Work',
        slug: 'loaded-work',
        published: true,
        publishedAt: '2024-01-01T00:00:00.000Z',
        category: 'platform',
        tags: [],
      }]),
    }))
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => {
        throw new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')
      }),
    }))

    const DashboardPage = (await import('@/app/admin/dashboard/page')).default
    const { container } = render(await DashboardPage({}))

    expect(screen.getByText('Dashboard content lists are partially unavailable')).toBeInTheDocument()
    expect(screen.getByText('Blog posts could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText('Loaded Work')).toBeInTheDocument()
    expect(screen.getByText('platform')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 30000)

  it('renders a populated admin blog table when blogs load successfully', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => [{
        id: 'blog-1',
        title: 'First blog',
        slug: 'first-blog',
        published: true,
        publishedAt: '2024-01-01T00:00:00.000Z',
        tags: ['tag-a', 'tag-b'],
        excerpt: 'excerpt',
      }]),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => <button type="button">Delete</button>,
    }))
    vi.doMock('@/app/admin/blog/actions', () => ({
      deleteBlog: vi.fn(),
    }))

    const AdminBlogPage = (await import('@/app/admin/blog/page')).default
    render(await AdminBlogPage())

    expect(screen.getByText('First blog')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('tag-a')).toBeInTheDocument()
    expect(screen.getByText('tag-b')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select all blogs' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select First blog' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View public post: First blog' })).toHaveAttribute('href', '/blog/first-blog')
    expect(screen.getByRole('link', { name: 'Edit post: First blog' })).toHaveAttribute('href', expect.stringContaining('/admin/blog/blog-1'))
    expect(screen.getByRole('button', { name: 'Delete post: First blog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Batch AI Fix/i })).toBeInTheDocument()
  }, 30000)

  it('renders draft blog rows without published dates or tags', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => [{
        id: 'blog-1',
        title: 'Draft blog',
        slug: 'draft-blog',
        published: false,
        publishedAt: null,
        tags: [],
        excerpt: 'excerpt',
      }]),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => <button type="button">Delete</button>,
    }))
    vi.doMock('@/app/admin/blog/actions', () => ({
      deleteBlog: vi.fn(),
    }))

    const AdminBlogPage = (await import('@/app/admin/blog/page')).default
    render(await AdminBlogPage())

    expect(screen.getByText('Draft blog')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  }, 30000)

  it('renders an empty-state admin blog table when no blog posts exist', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => []),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => <button type="button">Delete</button>,
    }))
    vi.doMock('@/app/admin/blog/actions', () => ({
      deleteBlog: vi.fn(),
    }))

    const AdminBlogPage = (await import('@/app/admin/blog/page')).default
    const { container } = render(await AdminBlogPage())

    expect(screen.getByText('No blog posts found.')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'No blog posts found.' })).toHaveAttribute('colspan', '6')
    expect(screen.queryByTestId('admin-blog-row')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 30000)

  it('renders a safe admin blog list failure panel when blog fetch fails', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogs: vi.fn(async () => {
        throw new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')
      }),
    }))

    const AdminBlogPage = (await import('@/app/admin/blog/page')).default
    const { container } = render(await AdminBlogPage())

    expect(screen.getByText('Blog administration is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/Blog posts could not be loaded from the backend/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-blog-row')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 30000)

  it('renders a populated admin members table when members load successfully', async () => {
    vi.doMock('@/lib/api/admin-members', () => ({
      fetchAdminMembers: vi.fn(async () => [{
        id: 'member-1',
        displayName: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        provider: 'google',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLoginAt: '2024-01-02T00:00:00.000Z',
        activeSessionCount: 1,
      }]),
    }))

    const AdminMembersPage = (await import('@/app/admin/members/page')).default
    render(await AdminMembersPage())

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('google')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  }, 15000)

  it('renders an empty-state admin members table when no members exist', async () => {
    vi.doMock('@/lib/api/admin-members', () => ({
      fetchAdminMembers: vi.fn(async () => []),
    }))

    const AdminMembersPage = (await import('@/app/admin/members/page')).default
    const { container } = render(await AdminMembersPage())

    expect(screen.getByText('No members found.')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'No members found.' })).toHaveAttribute('colspan', '6')
    expect(screen.queryByTestId('member-row')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 15000)

  it('renders safe member row fallbacks for malformed member values', async () => {
    vi.doMock('@/lib/api/admin-members', () => ({
      fetchAdminMembers: vi.fn(async () => [{
        id: null,
        displayName: '',
        email: undefined,
        role: null,
        provider: '',
        createdAt: 'not-a-date',
        lastLoginAt: null,
        activeSessionCount: Number.NaN,
      }]),
    }))

    const AdminMembersPage = (await import('@/app/admin/members/page')).default
    const { container } = render(await AdminMembersPage())

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByTestId('member-row')).toBeInTheDocument()
    expect(screen.getByText('Unknown member')).toBeInTheDocument()
    expect(screen.getByText('No email provided')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
    expect(screen.getByText('unknown')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(container.textContent).not.toMatch(/Invalid Date|NaN|undefined|null|stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  }, 15000)

  it('renders an empty-state admin works table when no works exist', async () => {
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => []),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => <button type="button">Delete</button>,
    }))
    vi.doMock('@/app/admin/works/actions', () => ({
      deleteWork: vi.fn(),
    }))

    const AdminWorksPage = (await import('@/app/admin/works/page')).default
    const { container } = render(await AdminWorksPage())

    expect(screen.getByText('No works found.')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'No works found.' })).toHaveAttribute('colspan', '7')
    expect(screen.queryByTestId('admin-work-row')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('renders a safe admin works list failure panel when works fetch fails', async () => {
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => {
        throw new Error('SQLSTATE 08006 stack trace from WoongBlog.Api status 500')
      }),
    }))

    const AdminWorksPage = (await import('@/app/admin/works/page')).default
    const { container } = render(await AdminWorksPage())

    expect(screen.getByText('Work administration is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/Works could not be loaded from the backend/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-work-row')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('renders populated admin works rows for published and draft items', async () => {
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorks: vi.fn(async () => [
        {
          id: 'work-1',
          title: 'Published work',
          slug: 'published-work',
          published: true,
          publishedAt: '2024-01-01T00:00:00.000Z',
          category: 'platform',
          tags: [],
        },
        {
          id: 'work-2',
          title: 'Draft work',
          slug: 'draft-work',
          published: false,
          publishedAt: null,
          category: 'experiment',
          tags: [],
        },
      ]),
    }))
    vi.doMock('@/components/admin/DeleteButton', () => ({
      DeleteButton: () => <button type="button">Delete</button>,
    }))
    vi.doMock('@/app/admin/works/actions', () => ({
      deleteWork: vi.fn(),
    }))

    const AdminWorksPage = (await import('@/app/admin/works/page')).default
    render(await AdminWorksPage())

    expect(screen.getByText('Published work')).toBeInTheDocument()
    expect(screen.getByText('Draft work')).toBeInTheDocument()
    expect(screen.getByText('platform')).toBeInTheDocument()
    expect(screen.getByText('experiment')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select all works' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Published work' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View public work: Published work' })).toHaveAttribute('href', '/works/published-work')
    expect(screen.getByRole('link', { name: 'Edit work: Published work' })).toHaveAttribute('href', expect.stringContaining('/admin/works/work-1'))
    expect(screen.getByRole('button', { name: 'Delete work: Published work' })).toBeInTheDocument()
  })

  it('renders all admin page editors when pages and settings load', async () => {
    vi.doMock('@/lib/api/admin-pages', () => ({
      fetchAdminSiteSettings: vi.fn(async () => ({
        owner_name: 'Owner',
        tagline: 'Tagline',
        facebook_url: '',
        instagram_url: '',
        twitter_url: '',
        linkedin_url: '',
        github_url: '',
        resume_asset_id: 'resume-1',
      })),
      fetchAdminPages: vi.fn(async () => [
        { id: 'page-home', title: 'Home', slug: 'home', content: { headline: 'Hi' } },
        { id: 'page-intro', title: 'Introduction', slug: 'introduction', content: { html: '<p>Intro</p>' } },
        { id: 'page-contact', title: 'Contact', slug: 'contact', content: { html: '<p>Contact</p>' } },
      ]),
    }))
    vi.doMock('@/lib/api/site-settings', () => ({
      fetchResume: vi.fn(async () => ({
        id: 'resume-1',
        publicUrl: '/media/public-resume/resume.pdf',
        fileName: 'resume.pdf',
        path: 'public-resume/resume.pdf',
      })),
    }))
    vi.doMock('@/components/admin/SiteSettingsEditor', () => ({
      SiteSettingsEditor: ({ initialSettings }: { initialSettings: { owner_name: string } }) => (
        <div>Site settings for {initialSettings.owner_name}</div>
      ),
    }))
    vi.doMock('@/components/admin/HomePageEditor', () => ({
      HomePageEditor: ({ pageTitle }: { pageTitle: string }) => <div>Home editor: {pageTitle}</div>,
    }))
    vi.doMock('@/components/admin/PageEditor', () => ({
      PageEditor: ({ page }: { page: { title: string } }) => <div>Page editor: {page.title}</div>,
    }))
    vi.doMock('@/components/admin/ResumeEditor', () => ({
      ResumeEditor: ({ resumeAsset }: { resumeAsset: { id: string } | null }) => (
        <div>Resume editor: {resumeAsset?.id ?? 'none'}</div>
      ),
    }))

    const AdminPagesPage = (await import('@/app/admin/pages/page')).default
    render(await AdminPagesPage())

    expect(screen.getByText('Site settings for Owner')).toBeInTheDocument()
    expect(screen.getByText('Home editor: Home')).toBeInTheDocument()
    expect(screen.getByText('Page editor: Introduction')).toBeInTheDocument()
    expect(screen.getByText('Page editor: Contact')).toBeInTheDocument()
    expect(screen.getByText('Resume editor: resume-1')).toBeInTheDocument()
  })

  it('renders only the available sections when optional admin pages are missing', async () => {
    vi.doMock('@/lib/api/admin-pages', () => ({
      fetchAdminSiteSettings: vi.fn(async () => ({
        owner_name: '',
        tagline: '',
        facebook_url: '',
        instagram_url: '',
        twitter_url: '',
        linkedin_url: '',
        github_url: '',
        resume_asset_id: null,
      })),
      fetchAdminPages: vi.fn(async () => []),
    }))
    vi.doMock('@/lib/api/site-settings', () => ({
      fetchResume: vi.fn(async () => null),
    }))
    vi.doMock('@/components/admin/SiteSettingsEditor', () => ({
      SiteSettingsEditor: ({ initialSettings }: { initialSettings: { owner_name: string; tagline: string } }) => (
        <div>Site settings fallback: {initialSettings.owner_name}/{initialSettings.tagline}</div>
      ),
    }))
    vi.doMock('@/components/admin/HomePageEditor', () => ({
      HomePageEditor: () => <div>unused home editor</div>,
    }))
    vi.doMock('@/components/admin/PageEditor', () => ({
      PageEditor: () => <div>unused page editor</div>,
    }))
    vi.doMock('@/components/admin/ResumeEditor', () => ({
      ResumeEditor: ({ resumeAsset }: { resumeAsset: { id: string } | null }) => (
        <div>Resume editor: {resumeAsset?.id ?? 'none'}</div>
      ),
    }))

    const AdminPagesPage = (await import('@/app/admin/pages/page')).default
    render(await AdminPagesPage())

    expect(screen.getByText('Site settings fallback: John Doe/Creative Technologist')).toBeInTheDocument()
    expect(screen.getByText('Resume editor: none')).toBeInTheDocument()
    expect(screen.queryByText('unused home editor')).not.toBeInTheDocument()
    expect(screen.queryByText('unused page editor')).not.toBeInTheDocument()
  })

  it('renders safe admin page editor titles for malformed page records', async () => {
    vi.doMock('@/lib/api/admin-pages', () => ({
      fetchAdminSiteSettings: vi.fn(async () => ({
        owner_name: 'Owner',
        tagline: 'Tagline',
        facebook_url: '',
        instagram_url: '',
        twitter_url: '',
        linkedin_url: '',
        github_url: '',
        resume_asset_id: null,
      })),
      fetchAdminPages: vi.fn(async () => [
        { id: 'page-home', title: null, slug: 'home', content: { headline: null } },
        { id: 'page-intro', title: '', slug: 'introduction', content: { html: null } },
        { id: 'page-contact', title: undefined, slug: 'contact', content: { html: '<p>Contact</p>' } },
      ]),
    }))
    vi.doMock('@/lib/api/site-settings', () => ({
      fetchResume: vi.fn(async () => null),
    }))
    vi.doMock('@/components/admin/SiteSettingsEditor', () => ({
      SiteSettingsEditor: () => <div>Site settings ready</div>,
    }))
    vi.doMock('@/components/admin/HomePageEditor', () => ({
      HomePageEditor: ({ pageTitle }: { pageTitle: string }) => <div>Home editor: {pageTitle}</div>,
    }))
    vi.doMock('@/components/admin/PageEditor', () => ({
      PageEditor: ({ page }: { page: { title: string } }) => <div>Page editor: {page.title}</div>,
    }))
    vi.doMock('@/components/admin/ResumeEditor', () => ({
      ResumeEditor: () => <div>Resume editor: none</div>,
    }))

    const AdminPagesPage = (await import('@/app/admin/pages/page')).default
    const { container } = render(await AdminPagesPage())

    expect(screen.getByText('Home editor: Home')).toBeInTheDocument()
    expect(screen.getByText('Page editor: Introduction')).toBeInTheDocument()
    expect(screen.getByText('Page editor: Contact')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/undefined|null|Invalid Date|NaN|stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('renders the blog editor when an admin blog is found', async () => {
    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogById: vi.fn(async () => ({ id: 'blog-1', title: 'Blog title' })),
    }))
    vi.doMock('@/components/admin/BlogEditor', () => ({
      BlogEditor: ({ initialBlog }: { initialBlog: { title: string } }) => (
        <div>Blog editor: {initialBlog.title}</div>
      ),
    }))

    const EditBlogPage = (await import('@/app/admin/blog/[id]/page')).default
    render(await EditBlogPage({ params: Promise.resolve({ id: 'blog-1' }) }))

    expect(screen.getByText('Blog editor: Blog title')).toBeInTheDocument()
  })

  it('calls notFound when the admin blog does not exist', async () => {
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND')
    })

    vi.doMock('@/lib/api/blogs', () => ({
      fetchAdminBlogById: vi.fn(async () => null),
    }))
    vi.doMock('next/navigation', () => ({
      notFound,
    }))
    vi.doMock('@/components/admin/BlogEditor', () => ({
      BlogEditor: () => <div>unused</div>,
    }))

    const EditBlogPage = (await import('@/app/admin/blog/[id]/page')).default

    await expect(EditBlogPage({ params: Promise.resolve({ id: 'missing-blog' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('renders the work editor when an admin work is found', async () => {
    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorkById: vi.fn(async () => ({ id: 'work-1', title: 'Work title' })),
    }))
    vi.doMock('@/components/admin/WorkEditor', () => ({
      WorkEditor: ({ initialWork }: { initialWork: { title: string } }) => (
        <div>Work editor: {initialWork.title}</div>
      ),
    }))

    const EditWorkPage = (await import('@/app/admin/works/[id]/page')).default
    render(await EditWorkPage({ params: Promise.resolve({ id: 'work-1' }) }))

    expect(screen.getByText('Work editor: Work title')).toBeInTheDocument()
  })

  it('calls notFound when the admin work does not exist', async () => {
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND')
    })

    vi.doMock('@/lib/api/works', () => ({
      fetchAdminWorkById: vi.fn(async () => null),
    }))
    vi.doMock('next/navigation', () => ({
      notFound,
    }))
    vi.doMock('@/components/admin/WorkEditor', () => ({
      WorkEditor: () => <div>unused</div>,
    }))

    const EditWorkPage = (await import('@/app/admin/works/[id]/page')).default

    await expect(EditWorkPage({ params: Promise.resolve({ id: 'missing-work' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
