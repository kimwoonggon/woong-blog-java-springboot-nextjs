import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlogEditor } from '@/components/admin/BlogEditor'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  pathname: '/blog',
  searchParams: '',
  fetchWithCsrf: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh, back: mocks.back }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

vi.mock('@/lib/api/browser', () => ({
  getBrowserApiBaseUrl: () => '/api',
}))

vi.mock('@/lib/api/auth', () => ({
  fetchWithCsrf: mocks.fetchWithCsrf,
}))

vi.mock('@/components/admin/AIFixDialog', () => ({
  AIFixDialog: () => null,
}))

vi.mock('@/components/admin/AuthoringCapabilityHints', () => ({
  AuthoringCapabilityHints: () => null,
}))

vi.mock('@/components/admin/TiptapEditor', () => ({
  TiptapEditor: ({ content, onChange }: { content: string; onChange: (value: string) => void }) => (
    <textarea aria-label="Mock blog content" value={content} onChange={(event) => onChange(event.target.value)} />
  ),
}))

describe('BlogEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pathname = '/blog'
    mocks.searchParams = ''
    mocks.fetchWithCsrf.mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => '',
    })
  })

  it('normalizes wrapped markdown into html before create save', async () => {
    render(<BlogEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Markdown Blog' } })
    fireEvent.change(screen.getByLabelText('Mock blog content'), {
      target: { value: '<p>## 저장 제목</p><p>- 첫 번째</p><p>- 두 번째</p>' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/blogs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Markdown Blog',
            excerpt: '',
            tags: [],
            published: true,
            contentJson: JSON.stringify({
              html: '<h2>저장 제목</h2>\n<ul><li>첫 번째</li><li>두 번째</li></ul>',
            }),
          }),
        }),
      )
    })
  })

  it('refreshes the router after an inline save outside the public blog routes', async () => {
    mocks.pathname = '/admin/blog/new'

    render(<BlogEditor inlineMode />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Inline Blog' } })
    fireEvent.change(screen.getByLabelText('Mock blog content'), {
      target: { value: '<p>Inline body</p>' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/blogs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Inline Blog',
            excerpt: '',
            tags: [],
            published: true,
            contentJson: JSON.stringify({
              html: '<p>Inline body</p>',
            }),
          }),
        }),
      )
    })

    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('returns to a safe inline returnTo path after save', async () => {
    mocks.pathname = '/blog'
    mocks.searchParams = 'returnTo=%2Fblog%3Fpage%3D2%26pageSize%3D12&relatedPage=2'

    render(<BlogEditor inlineMode />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Inline Return' } })
    fireEvent.change(screen.getByLabelText('Mock blog content'), {
      target: { value: '<p>Inline return body</p>' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalled()
    })

    expect(mocks.push).toHaveBeenCalledWith('/blog?page=2&pageSize=12')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('returns public inline creates to the first blog page with the current page size', async () => {
    mocks.pathname = '/blog'
    mocks.searchParams = 'page=3&pageSize=2'
    const onSaved = vi.fn()

    render(<BlogEditor inlineMode onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Inline Create Return' } })
    fireEvent.change(screen.getByLabelText('Mock blog content'), {
      target: { value: '<p>Inline create return body</p>' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalled()
    })

    expect(onSaved).toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith('/blog?page=1&pageSize=2')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('ignores an unsafe returnTo path and falls back to the admin list', async () => {
    mocks.pathname = '/admin/blog/123'
    mocks.searchParams = 'returnTo=%2F%2Fevil.example'

    render(
      <BlogEditor
        initialBlog={{
          id: 'blog-1',
          slug: 'safe-slug',
          title: 'Existing title',
          content: { html: '<p>Old body</p>' },
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } })
    fireEvent.click(screen.getByRole('button', { name: /Update Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalled()
    })

    expect(mocks.push).toHaveBeenCalledWith('/admin/blog')
    expect(mocks.push).not.toHaveBeenCalledWith('//evil.example')
  })

  it('preserves excerpt when updating from the bottom submit action', async () => {
    mocks.pathname = '/admin/blog/blog-1'

    render(
      <BlogEditor
        initialBlog={{
          id: 'blog-1',
          slug: 'existing-post',
          title: 'Existing title',
          excerpt: 'Old excerpt',
          tags: ['admin'],
          published: true,
          content: { html: '<p>Old body</p>' },
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Updated excerpt' } })
    fireEvent.click(screen.getByRole('button', { name: /Update Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/blogs/blog-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            title: 'Existing title',
            excerpt: 'Updated excerpt',
            tags: ['admin'],
            published: true,
            contentJson: JSON.stringify({
              html: '<p>Old body</p>',
            }),
          }),
        }),
      )
    })
  })

  it.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
  ])('shows a safe save failure for %i responses without clearing user input', async (status, message) => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({}),
      text: async () => message,
    })

    render(<BlogEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft that should stay' } })
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Excerpt should stay' } })
    fireEvent.change(screen.getByLabelText('Mock blog content'), {
      target: { value: '<p>Body should stay</p>' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Create Post/i }))

    expect(await screen.findByTestId('admin-blog-form-error')).toHaveTextContent(message)
    expect(mocks.toast.error).toHaveBeenCalledWith(message)
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Draft that should stay')
    expect(screen.getByLabelText('Excerpt')).toHaveValue('Excerpt should stay')
    expect(screen.getByLabelText('Mock blog content')).toHaveValue('<p>Body should stay</p>')
  })

  it('sanitizes technical save failures without clearing blog input', async () => {
    mocks.fetchWithCsrf.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'SQLSTATE 08006 stack trace from WoongBlog.Api status 500',
    })

    render(<BlogEditor />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft that should stay' } })
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Excerpt should stay' } })
    fireEvent.change(screen.getByLabelText('Mock blog content'), {
      target: { value: '<p>Body should stay</p>' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Create Post/i }))

    expect(await screen.findByTestId('admin-blog-form-error')).toHaveTextContent(
      'Blog post could not be saved. Please retry after the backend is healthy.',
    )
    expect(mocks.toast.error).toHaveBeenCalledWith('Blog post could not be saved. Please retry after the backend is healthy.')
    expect(screen.getByLabelText('Title')).toHaveValue('Draft that should stay')
    expect(screen.getByLabelText('Excerpt')).toHaveValue('Excerpt should stay')
    expect(screen.getByLabelText('Mock blog content')).toHaveValue('<p>Body should stay</p>')
  })

  it('keeps inline update saves excerpt-aware while returning to the public detail route', async () => {
    mocks.pathname = '/blog/existing-post'
    mocks.searchParams = 'relatedPage=2'
    mocks.fetchWithCsrf.mockResolvedValue({
      ok: true,
      json: async () => ({ slug: 'updated-post' }),
      text: async () => '',
    })

    render(
      <BlogEditor
        inlineMode
        initialBlog={{
          id: 'blog-1',
          slug: 'existing-post',
          title: 'Existing title',
          excerpt: 'Old excerpt',
          tags: ['inline'],
          published: true,
          content: { html: '<p>Old body</p>' },
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Inline excerpt update' } })
    fireEvent.click(screen.getByRole('button', { name: /Update Post/i }))

    await waitFor(() => {
      expect(mocks.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/admin/blogs/blog-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            title: 'Existing title',
            excerpt: 'Inline excerpt update',
            tags: ['inline'],
            published: true,
            contentJson: JSON.stringify({
              html: '<p>Old body</p>',
            }),
          }),
        }),
      )
    })

    expect(mocks.replace).toHaveBeenCalledWith('/blog/updated-post?relatedPage=2')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('renders a horizontally resizable editor workspace while keeping the bottom submit action', () => {
    render(<BlogEditor />)

    expect(screen.getByTestId('blog-editor-workspace')).toHaveClass('resize-x')
    expect(screen.getByRole('button', { name: /Create Post/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save changes from top action bar/i })).not.toBeInTheDocument()
  })
})
