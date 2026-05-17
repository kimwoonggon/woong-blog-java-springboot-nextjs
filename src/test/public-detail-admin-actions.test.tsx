import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicBlogDetailAdminActions } from '@/components/admin/PublicBlogDetailAdminActions'
import { PublicWorkDetailAdminActions } from '@/components/admin/PublicWorkDetailAdminActions'
import { fetchWithCsrf } from '@/lib/api/auth'
import { deleteAdminBlog, deleteAdminWork } from '@/lib/api/admin-mutations'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: '',
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}))

vi.mock('@/components/admin/PublicAdminClientGate', () => ({
  PublicAdminClientGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/admin/BlogEditor', () => ({
  BlogEditor: ({ initialBlog }: { initialBlog?: { title?: string } }) => (
    <p>Mock blog editor: {initialBlog?.title ?? 'Untitled blog'}</p>
  ),
}))

vi.mock('@/components/admin/WorkEditor', () => ({
  WorkEditor: ({ initialWork }: { initialWork?: { title?: string } }) => (
    <p>Mock work editor: {initialWork?.title ?? 'Untitled work'}</p>
  ),
}))

vi.mock('@/lib/api/auth', () => ({
  fetchWithCsrf: vi.fn(),
}))

vi.mock('@/lib/api/browser', () => ({
  getBrowserApiBaseUrl: () => '/api',
}))

vi.mock('@/lib/api/admin-mutations', () => ({
  deleteAdminBlog: vi.fn(),
  deleteAdminWork: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: mocks.toast,
}))

function okJson<T>(payload: T) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response
}

function errorResponse(status = 500) {
  return {
    ok: false,
    status,
  } as Response
}

function loadedBlog() {
  return {
    id: 'blog-1',
    title: 'Loaded Blog',
    slug: 'loaded-blog',
    excerpt: '',
    tags: [],
    published: true,
    content: { html: '<p>Loaded</p>' },
    publishedAt: null,
    updatedAt: null,
  }
}

function loadedWork() {
  return {
    id: 'work-1',
    title: 'Loaded Work',
    slug: 'loaded-work',
    excerpt: '',
    tags: [],
    published: true,
    category: 'Case study',
    content: { html: '<p>Loaded</p>' },
    publishedAt: null,
    updatedAt: null,
    videos: [],
  }
}

describe('public detail admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = ''
    vi.mocked(fetchWithCsrf).mockReset()
    vi.mocked(deleteAdminBlog).mockResolvedValue(undefined)
    vi.mocked(deleteAdminWork).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a safe Blog detail editor load failure panel without raw backend details', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(errorResponse(500))

    const { container } = render(<PublicBlogDetailAdminActions blogId="blog-1" />)

    fireEvent.click(screen.getByRole('button', { name: '글 수정' }))

    expect(await screen.findByText('Inline blog editor is unavailable')).toBeInTheDocument()
    expect(screen.getByText('The public blog view loaded, but the admin edit payload could not be loaded. Please retry after the backend is healthy.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack trace|WoongBlog\.Api|status 500|undefined|null/i)
    expect(deleteAdminBlog).not.toHaveBeenCalled()
  })

  it('sanitizes Blog detail delete failures and preserves the public page', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(okJson(loadedBlog()))
    vi.mocked(deleteAdminBlog).mockRejectedValueOnce(
      new Error('SQLSTATE 23503 stack trace at WoongBlog.Api.Modules.Blogs status 500'),
    )

    render(<PublicBlogDetailAdminActions blogId="blog-1" />)

    fireEvent.click(screen.getByRole('button', { name: '글 수정' }))
    expect(await screen.findByText('Mock blog editor: Loaded Blog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteAdminBlog).toHaveBeenCalledWith('blog-1', 'loaded-blog')
    })
    expect(mocks.toast.error).toHaveBeenCalledWith('Study could not be deleted. Please retry after the backend is healthy.')
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/SQLSTATE|stack trace|WoongBlog\.Api|status 500/i))
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled()
    })
  })

  it('uses only safe local Blog return paths after a successful detail delete', async () => {
    mocks.searchParams = 'returnTo=%2Fblog%3Fpage%3D5%26pageSize%3D12'
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(okJson(loadedBlog()))

    render(<PublicBlogDetailAdminActions blogId="blog-1" />)

    fireEvent.click(screen.getByRole('button', { name: '글 수정' }))
    expect(await screen.findByText('Mock blog editor: Loaded Blog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/blog?page=5&pageSize=12')
    })
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/\//))
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.toast.success).toHaveBeenCalledWith('Study deleted')
  })

  it('falls back to the related Blog page when detail delete returnTo is unsafe', async () => {
    mocks.searchParams = 'returnTo=%2F%2Fevil.example%2Fadmin&relatedPage=4'
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(okJson(loadedBlog()))

    render(<PublicBlogDetailAdminActions blogId="blog-1" />)

    fireEvent.click(screen.getByRole('button', { name: '글 수정' }))
    expect(await screen.findByText('Mock blog editor: Loaded Blog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/blog?page=4&pageSize=12')
    })
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/\//))
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('renders a safe Work detail editor load failure panel without raw backend details', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(errorResponse(500))

    const { container } = render(<PublicWorkDetailAdminActions workId="work-1" />)

    fireEvent.click(screen.getByRole('button', { name: '작업 수정' }))

    expect(await screen.findByText('Inline work editor is unavailable')).toBeInTheDocument()
    expect(screen.getByText('The public work view loaded, but the admin edit payload could not be loaded. Please retry after the backend is healthy.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/SQLSTATE|stack trace|WoongBlog\.Api|status 500|undefined|null/i)
    expect(deleteAdminWork).not.toHaveBeenCalled()
  })

  it('sanitizes Work detail delete failures and preserves the public page', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(okJson(loadedWork()))
    vi.mocked(deleteAdminWork).mockRejectedValueOnce(
      new Error('Npgsql.PostgresException stack trace at WoongBlog.Api.Modules.Works status 500'),
    )

    render(<PublicWorkDetailAdminActions workId="work-1" />)

    fireEvent.click(screen.getByRole('button', { name: '작업 수정' }))
    expect(await screen.findByText('Mock work editor: Loaded Work')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteAdminWork).toHaveBeenCalledWith('work-1', 'loaded-work')
    })
    expect(mocks.toast.error).toHaveBeenCalledWith('Work could not be deleted. Please retry after the backend is healthy.')
    expect(mocks.toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/Npgsql|stack trace|WoongBlog\.Api|status 500/i))
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled()
    })
  })

  it('uses only safe local Work return paths after a successful detail delete', async () => {
    mocks.searchParams = 'returnTo=%2Fworks%3Fpage%3D6%26pageSize%3D8'
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(okJson(loadedWork()))

    render(<PublicWorkDetailAdminActions workId="work-1" />)

    fireEvent.click(screen.getByRole('button', { name: '작업 수정' }))
    expect(await screen.findByText('Mock work editor: Loaded Work')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/works?page=6&pageSize=8')
    })
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/\//))
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.toast.success).toHaveBeenCalledWith('Work deleted')
  })

  it('falls back to the related Work page when detail delete returnTo is unsafe', async () => {
    mocks.searchParams = 'returnTo=%2F%2Fevil.example%2Fworks&relatedPage=3'
    vi.mocked(fetchWithCsrf).mockResolvedValueOnce(okJson(loadedWork()))

    render(<PublicWorkDetailAdminActions workId="work-1" />)

    fireEvent.click(screen.getByRole('button', { name: '작업 수정' }))
    expect(await screen.findByText('Mock work editor: Loaded Work')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/works?page=3&pageSize=8')
    })
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/\//))
    expect(mocks.refresh).toHaveBeenCalled()
  })
})
