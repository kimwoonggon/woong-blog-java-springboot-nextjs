import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminBlogTableClient } from '@/components/admin/AdminBlogTableClient'
import { AdminWorksTableClient } from '@/components/admin/AdminWorksTableClient'
import type { BlogAdminItem } from '@/lib/api/blogs'
import type { WorkAdminItem } from '@/lib/api/works'
import {
  deleteAdminBlog,
  deleteAdminWork,
  deleteManyAdminBlogs,
  deleteManyAdminWorks,
} from '@/lib/api/admin-mutations'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  prompt: vi.fn(() => 'yes'),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
  usePathname: () => '/admin/blog',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    prefetch?: boolean
  }) => {
    const { prefetch, ...anchorProps } = props
    void prefetch
    return <a href={href} {...anchorProps}>{children}</a>
  },
}))

vi.mock('@/lib/api/admin-mutations', () => ({
  deleteAdminBlog: vi.fn(async () => undefined),
  deleteManyAdminBlogs: vi.fn(async () => undefined),
  deleteAdminWork: vi.fn(async () => undefined),
  deleteManyAdminWorks: vi.fn(async () => undefined),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/hooks/useResponsivePageSize', () => ({
  useResponsivePageSize: () => 12,
}))

function expectSelectionSummary(itemCount: number, selectedCount: number) {
  expect(
    screen.getByText((_, element) =>
      element?.tagName.toLowerCase() === 'p'
      && element.textContent === `${itemCount} shown · ${selectedCount} selected`,
    ),
  ).toBeInTheDocument()
}

function expectNoSelectionSummary(itemCount: number) {
  expect(
    screen.getByText((_, element) =>
      element?.tagName.toLowerCase() === 'p'
      && element.textContent === `${itemCount} shown · Select rows to enable bulk delete.`,
    ),
  ).toBeInTheDocument()
}

describe('admin bulk selection tables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('prompt', mocks.prompt)
    vi.mocked(deleteAdminBlog).mockResolvedValue(undefined)
    vi.mocked(deleteAdminWork).mockResolvedValue(undefined)
    vi.mocked(deleteManyAdminBlogs).mockResolvedValue(undefined)
    vi.mocked(deleteManyAdminWorks).mockResolvedValue(undefined)
  })

  it('keeps the active admin blog page in edit links and URL state', async () => {
    render(
      <AdminBlogTableClient
        blogs={Array.from({ length: 13 }, (_, index) => ({
          id: `b${index + 1}`,
          title: `Blog ${index + 1}`,
          slug: `blog-${index + 1}`,
          excerpt: '',
          tags: [],
          published: true,
          publishedAt: null,
        }))}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(mocks.replace).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/admin/blog')
    expect(window.location.search).toBe('?page=2&pageSize=12')
    expect(screen.getByLabelText('Edit post: Blog 13')).toHaveAttribute(
      'href',
      '/admin/blog/b13?returnTo=%2Fadmin%2Fblog%3Fpage%3D2%26pageSize%3D12',
    )
  })

  it('shows blog bulk delete button when rows are selected', async () => {
    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Blog 1', slug: 'blog-1', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Blog 2', slug: 'blog-2', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Select Blog 1'))
    expect(screen.getByText('Delete Selected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate AI Fix job' })).not.toBeInTheDocument()
  })

  it('filters blog rows by title and exposes previous/next pagination controls', async () => {
    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Alpha Blog', slug: 'alpha-blog', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Beta Blog', slug: 'beta-blog', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search blog titles'), { target: { value: 'beta' } })
    expect(screen.getByText('Beta Blog')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Blog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })

  it('renders a distinct admin blog empty-search row with table semantics', () => {
    const { container } = render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Alpha Blog', slug: 'alpha-blog', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Beta Blog', slug: 'beta-blog', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search blog titles'), { target: { value: 'no-result' } })

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'No matching blog posts found.' })).toHaveAttribute('colspan', '6')
    expect(screen.queryByTestId('admin-blog-row')).not.toBeInTheDocument()
    expectNoSelectionSummary(0)
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('renders fallback dates for malformed admin blog table dates', () => {
    const { container } = render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Malformed Blog Date', slug: 'malformed-blog-date', excerpt: '', tags: [], published: true, publishedAt: 'not-a-date' },
        ]}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError|undefined|null/i)
  })

  it('renders safe blog text and links for malformed admin blog values', () => {
    const malformedBlog = {
      id: null,
      title: null,
      slug: '//evil.test/<script>',
      excerpt: '',
      tags: null,
      published: true,
      publishedAt: null,
    } as unknown as BlogAdminItem

    const { container } = render(<AdminBlogTableClient blogs={[malformedBlog]} />)

    expect(screen.getByText('Untitled blog post')).toBeInTheDocument()
    expect(screen.getByText('No tags')).toBeInTheDocument()
    expect(screen.getByLabelText('View public post: Untitled blog post')).toHaveAttribute(
      'href',
      '/blog/%2F%2Fevil.test%2F%3Cscript%3E',
    )
    expect(screen.getByLabelText('Edit post: Untitled blog post')).toHaveAttribute(
      'href',
      '/admin/blog?returnTo=%2Fadmin%2Fblog%3FpageSize%3D12',
    )
    expect(container.textContent).not.toMatch(/undefined|null/i)
  })

  it('disables blog mutation controls when an admin blog id is missing', () => {
    const malformedBlog = {
      id: null,
      title: 'Missing Id Blog',
      slug: 'missing-id-blog',
      excerpt: '',
      tags: [],
      published: true,
      publishedAt: null,
    } as unknown as BlogAdminItem

    render(<AdminBlogTableClient blogs={[malformedBlog]} />)

    expect(screen.getByRole('checkbox', { name: 'Select all blogs' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Select Missing Id Blog' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete post: Missing Id Blog' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete post: Missing Id Blog' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    expect(deleteAdminBlog).not.toHaveBeenCalled()
  })

  it('clears blog bulk selection when the search query changes', () => {
    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Alpha Blog', slug: 'alpha-blog', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Beta Blog', slug: 'beta-blog', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Alpha Blog'))
    expectSelectionSummary(2, 1)

    fireEvent.change(screen.getByLabelText('Search blog titles'), { target: { value: 'alpha' } })

    expect(screen.getByText('Alpha Blog')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Alpha Blog')).not.toBeChecked()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    expectNoSelectionSummary(1)
  })

  it('clears blog bulk selection when moving to another page', () => {
    render(
      <AdminBlogTableClient
        blogs={Array.from({ length: 13 }, (_, index) => ({
          id: `b${index + 1}`,
          title: `Paged Blog ${index + 1}`,
          slug: `paged-blog-${index + 1}`,
          excerpt: '',
          tags: [],
          published: true,
          publishedAt: null,
        }))}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Paged Blog 1'))
    expectSelectionSummary(13, 1)

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getByText('Paged Blog 13')).toBeInTheDocument()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    expectNoSelectionSummary(13)
  })

  it('shows works bulk delete button when rows are selected', async () => {
    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Work 1', slug: 'work-1', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Work 1'))
    expect(screen.getByText('Delete Selected')).toBeInTheDocument()
    await waitFor(() => {
      expect(mocks.refresh).not.toHaveBeenCalled()
    })
  })

  it('filters works by title and exposes previous/next pagination controls', () => {
    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Alpha Work', slug: 'alpha-work', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
          { id: 'w2', title: 'Beta Work', slug: 'beta-work', excerpt: '', tags: [], published: false, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search work titles'), { target: { value: 'beta' } })
    expect(screen.getByText('Beta Work')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Work')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })

  it('renders a distinct admin works empty-search row with table semantics', () => {
    const { container } = render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Alpha Work', slug: 'alpha-work', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
          { id: 'w2', title: 'Beta Work', slug: 'beta-work', excerpt: '', tags: [], published: false, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search work titles'), { target: { value: 'no-result' } })

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'No matching works found.' })).toHaveAttribute('colspan', '7')
    expect(screen.queryByTestId('admin-work-row')).not.toBeInTheDocument()
    expectNoSelectionSummary(0)
    expect(container.textContent).not.toMatch(/stack|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('renders fallback dates for malformed admin works table dates', () => {
    const { container } = render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Malformed Work Date', slug: 'malformed-work-date', excerpt: '', tags: [], published: true, publishedAt: 'not-a-date', category: 'cat' },
        ]}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError|undefined|null/i)
  })

  it('renders safe work text and links for malformed admin work values', () => {
    const malformedWork = {
      id: null,
      title: null,
      slug: 'javascript:alert(1)',
      excerpt: '',
      tags: null,
      published: true,
      publishedAt: null,
      category: null,
      thumbnailUrl: null,
    } as unknown as WorkAdminItem

    const { container } = render(<AdminWorksTableClient works={[malformedWork]} />)

    expect(screen.getByText('Untitled work')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    expect(screen.getByLabelText('View public work: Untitled work')).toHaveAttribute(
      'href',
      '/works/javascript%3Aalert(1)',
    )
    expect(screen.getByLabelText('Edit work: Untitled work')).toHaveAttribute(
      'href',
      '/admin/works?returnTo=%2Fadmin%2Fblog%3FpageSize%3D12',
    )
    expect(container.textContent).not.toMatch(/undefined|null/i)
  })

  it('disables work mutation controls when an admin work id is missing', () => {
    const malformedWork = {
      id: null,
      title: 'Missing Id Work',
      slug: 'missing-id-work',
      excerpt: '',
      tags: [],
      published: true,
      publishedAt: null,
      category: 'ops',
    } as unknown as WorkAdminItem

    render(<AdminWorksTableClient works={[malformedWork]} />)

    expect(screen.getByRole('checkbox', { name: 'Select all works' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Select Missing Id Work' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete work: Missing Id Work' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete work: Missing Id Work' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    expect(deleteAdminWork).not.toHaveBeenCalled()
  })

  it('clears works bulk selection when the search query changes', () => {
    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Alpha Work', slug: 'alpha-work', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
          { id: 'w2', title: 'Beta Work', slug: 'beta-work', excerpt: '', tags: [], published: false, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Alpha Work'))
    expectSelectionSummary(2, 1)

    fireEvent.change(screen.getByLabelText('Search work titles'), { target: { value: 'alpha' } })

    expect(screen.getByText('Alpha Work')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Alpha Work')).not.toBeChecked()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    expectNoSelectionSummary(1)
  })

  it('clears works bulk selection when moving to another page', () => {
    render(
      <AdminWorksTableClient
        works={Array.from({ length: 13 }, (_, index) => ({
          id: `w${index + 1}`,
          title: `Paged Work ${index + 1}`,
          slug: `paged-work-${index + 1}`,
          excerpt: '',
          tags: [],
          published: true,
          publishedAt: null,
          category: 'cat',
        }))}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Paged Work 1'))
    expectSelectionSummary(13, 1)

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getByText('Paged Work 13')).toBeInTheDocument()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    expectNoSelectionSummary(13)
  })

  it('opens and cancels a blog single delete without calling the delete API or hiding the row', async () => {
    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Keep Blog', slug: 'keep-blog', excerpt: '', tags: [], published: true, publishedAt: null },
        ]}
      />,
    )

    const row = screen.getByTestId('admin-blog-row')
    fireEvent.click(screen.getByRole('button', { name: 'Delete post: Keep Blog' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeVisible()
    expect(deleteAdminBlog).not.toHaveBeenCalled()
    expect(dialog.querySelector('[data-variant="destructive"]')).toHaveTextContent('Delete')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(row).toBeInTheDocument()
    expect(screen.getByText('Keep Blog')).toBeInTheDocument()
    expect(deleteAdminBlog).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('keeps a blog row visible and retryable when a single delete fails', async () => {
    vi.mocked(deleteAdminBlog)
      .mockRejectedValueOnce(new Error('Delete blocked by test'))
      .mockResolvedValueOnce(undefined)

    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Failing Blog', slug: 'failing-blog', excerpt: '', tags: [], published: true, publishedAt: null },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete post: Failing Blog' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Delete blocked by test'))
    expect(screen.getByText('Failing Blog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteAdminBlog).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('sanitizes technical blog delete failures without losing the row or retry dialog', async () => {
    vi.mocked(deleteAdminBlog).mockRejectedValueOnce(
      new Error('SQLSTATE 23503 stack trace at WoongBlog.Api.Modules.Blogs status 500'),
    )

    const { container } = render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Technical Blog Failure', slug: 'technical-blog-failure', excerpt: '', tags: [], published: true, publishedAt: null },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete post: Technical Blog Failure' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Blog posts could not be deleted. Please retry after the backend is healthy.')
    })
    expect(mocks.toastError).not.toHaveBeenCalledWith(expect.stringMatching(/SQLSTATE|stack trace|WoongBlog\.Api|status 500/i))
    expect(screen.getByText('Technical Blog Failure')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack trace|WoongBlog\.Api|undefined|null/i)
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it.each([
    ['401', new Error('Session expired')],
    ['403', new Error('Forbidden')],
  ])('keeps a work row visible and does not claim success after a %s single delete failure', async (_status, error) => {
    vi.mocked(deleteAdminWork).mockRejectedValueOnce(error)

    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Protected Work', slug: 'protected-work', excerpt: '', tags: [], published: true, publishedAt: null, category: 'secure' },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete work: Protected Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(error.message))
    expect(screen.getByText('Protected Work')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('sanitizes technical work delete failures without losing the row or retry dialog', async () => {
    vi.mocked(deleteAdminWork).mockRejectedValueOnce(
      new Error('Npgsql.PostgresException stack trace at WoongBlog.Api.Modules.Works status 500'),
    )

    const { container } = render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Technical Work Failure', slug: 'technical-work-failure', excerpt: '', tags: [], published: true, publishedAt: null, category: 'ops' },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete work: Technical Work Failure' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Works could not be deleted. Please retry after the backend is healthy.')
    })
    expect(mocks.toastError).not.toHaveBeenCalledWith(expect.stringMatching(/Npgsql|stack trace|WoongBlog\.Api|status 500/i))
    expect(screen.getByText('Technical Work Failure')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(container.textContent).not.toMatch(/Npgsql|stack trace|WoongBlog\.Api|undefined|null/i)
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('opens and cancels a blog bulk delete without deleting rows and preserves selection', async () => {
    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Bulk Blog 1', slug: 'bulk-blog-1', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Bulk Blog 2', slug: 'bulk-blog-2', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Bulk Blog 1'))
    fireEvent.click(screen.getByLabelText('Select Bulk Blog 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }))

    expect(screen.getByRole('dialog')).toBeVisible()
    expect(deleteManyAdminBlogs).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Bulk Blog 1')).toBeInTheDocument()
    expect(screen.getByText('Bulk Blog 2')).toBeInTheDocument()
    expectSelectionSummary(2, 2)
    expect(screen.getByLabelText('Select Bulk Blog 1')).toBeChecked()
    expect(screen.getByLabelText('Select Bulk Blog 2')).toBeChecked()
    expect(deleteManyAdminBlogs).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('does not claim full success or remove rows when blog bulk delete fails', async () => {
    vi.mocked(deleteManyAdminBlogs).mockRejectedValueOnce(new Error('One selected blog could not be deleted'))

    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Bulk Fail Blog 1', slug: 'bulk-fail-blog-1', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Bulk Fail Blog 2', slug: 'bulk-fail-blog-2', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Bulk Fail Blog 1'))
    fireEvent.click(screen.getByLabelText('Select Bulk Fail Blog 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('One selected blog could not be deleted'))
    expect(screen.getByText('Bulk Fail Blog 1')).toBeInTheDocument()
    expect(screen.getByText('Bulk Fail Blog 2')).toBeInTheDocument()
    expectSelectionSummary(2, 2)
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('sanitizes technical blog bulk delete failures while preserving selected rows', async () => {
    vi.mocked(deleteManyAdminBlogs).mockRejectedValueOnce(
      new Error('System.InvalidOperationException stack trace SQLSTATE 40001 status 500'),
    )

    render(
      <AdminBlogTableClient
        blogs={[
          { id: 'b1', title: 'Bulk Technical Blog 1', slug: 'bulk-technical-blog-1', excerpt: '', tags: [], published: true, publishedAt: null },
          { id: 'b2', title: 'Bulk Technical Blog 2', slug: 'bulk-technical-blog-2', excerpt: '', tags: [], published: false, publishedAt: null },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Bulk Technical Blog 1'))
    fireEvent.click(screen.getByLabelText('Select Bulk Technical Blog 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Blog posts could not be deleted. Please retry after the backend is healthy.')
    })
    expect(mocks.toastError).not.toHaveBeenCalledWith(expect.stringMatching(/System\.InvalidOperationException|stack trace|SQLSTATE|status 500/i))
    expect(screen.getByText('Bulk Technical Blog 1')).toBeInTheDocument()
    expect(screen.getByText('Bulk Technical Blog 2')).toBeInTheDocument()
    expectSelectionSummary(2, 2)
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('opens and cancels a works bulk delete without deleting rows and preserves selection', async () => {
    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Bulk Work 1', slug: 'bulk-work-1', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
          { id: 'w2', title: 'Bulk Work 2', slug: 'bulk-work-2', excerpt: '', tags: [], published: false, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Bulk Work 1'))
    fireEvent.click(screen.getByLabelText('Select Bulk Work 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }))

    expect(screen.getByRole('dialog')).toBeVisible()
    expect(deleteManyAdminWorks).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Bulk Work 1')).toBeInTheDocument()
    expect(screen.getByText('Bulk Work 2')).toBeInTheDocument()
    expectSelectionSummary(2, 2)
    expect(screen.getByLabelText('Select Bulk Work 1')).toBeChecked()
    expect(screen.getByLabelText('Select Bulk Work 2')).toBeChecked()
    expect(deleteManyAdminWorks).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('does not claim full success or remove rows when works bulk delete fails', async () => {
    vi.mocked(deleteManyAdminWorks).mockRejectedValueOnce(new Error('One selected work could not be deleted'))

    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Bulk Fail Work 1', slug: 'bulk-fail-work-1', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
          { id: 'w2', title: 'Bulk Fail Work 2', slug: 'bulk-fail-work-2', excerpt: '', tags: [], published: false, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Bulk Fail Work 1'))
    fireEvent.click(screen.getByLabelText('Select Bulk Fail Work 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('One selected work could not be deleted'))
    expect(screen.getByText('Bulk Fail Work 1')).toBeInTheDocument()
    expect(screen.getByText('Bulk Fail Work 2')).toBeInTheDocument()
    expectSelectionSummary(2, 2)
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('sanitizes technical works bulk delete failures while preserving selected rows', async () => {
    vi.mocked(deleteManyAdminWorks).mockRejectedValueOnce(
      new Error('Cloudflare R2 storage exception stack trace status 503'),
    )

    render(
      <AdminWorksTableClient
        works={[
          { id: 'w1', title: 'Bulk Technical Work 1', slug: 'bulk-technical-work-1', excerpt: '', tags: [], published: true, publishedAt: null, category: 'cat' },
          { id: 'w2', title: 'Bulk Technical Work 2', slug: 'bulk-technical-work-2', excerpt: '', tags: [], published: false, publishedAt: null, category: 'cat' },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Select Bulk Technical Work 1'))
    fireEvent.click(screen.getByLabelText('Select Bulk Technical Work 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Works could not be deleted. Please retry after the backend is healthy.')
    })
    expect(mocks.toastError).not.toHaveBeenCalledWith(expect.stringMatching(/Cloudflare|R2|storage|stack trace|status 503/i))
    expect(screen.getByText('Bulk Technical Work 1')).toBeInTheDocument()
    expect(screen.getByText('Bulk Technical Work 2')).toBeInTheDocument()
    expectSelectionSummary(2, 2)
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
