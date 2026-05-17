import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { BlogNotionWorkspace } from '@/components/admin/BlogNotionWorkspace'
import { fetchWithCsrf } from '@/lib/api/auth'

const refreshMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/api/auth', () => ({
  fetchWithCsrf: vi.fn(),
}))

vi.mock('@/lib/api/browser', () => ({
  getBrowserApiBaseUrl: () => 'http://localhost/api',
}))

vi.mock('@/lib/public-revalidation-client', () => ({
  revalidatePublicPathsAfterMutation: vi.fn(async () => undefined),
}))

vi.mock('@/lib/api/admin-ai', () => ({
  fetchAdminAiRuntimeConfigBrowser: vi.fn(async () => ({
    provider: 'codex',
    availableProviders: ['openai', 'codex'],
    defaultModel: 'gpt-5.4',
    codexModel: 'gpt-5.4',
    codexReasoningEffort: 'medium',
    allowedCodexModels: ['gpt-5.4'],
    allowedCodexReasoningEfforts: ['low', 'medium', 'high', 'xhigh'],
    batchConcurrency: 2,
    batchCompletedRetentionDays: 3,
    defaultSystemPrompt: 'Default blog system prompt',
  })),
  listBlogAiBatchJobsBrowser: vi.fn(async () => ({
    jobs: [],
    runningCount: 0,
    queuedCount: 0,
    completedCount: 0,
    failedCount: 0,
    cancelledCount: 0,
  })),
  getBlogAiBatchJobBrowser: vi.fn(async () => ({
    jobId: 'job-1',
    status: 'completed',
    selectionMode: 'selected',
    selectionLabel: '1 selected',
    selectionKey: 'selected:job-1',
    totalCount: 0,
    processedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    provider: 'codex',
    model: 'gpt-5.4',
    reasoningEffort: 'medium',
    createdAt: '2026-03-27T00:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    cancelRequested: false,
    items: [],
  })),
}))

vi.mock('@/components/admin/TiptapEditor', () => ({
  TiptapEditor: ({
    content,
    onChange,
  }: {
    content: string
    onChange: (value: string) => void
  }) => (
    <textarea
      data-testid="mock-tiptap-editor"
      value={content}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

describe('BlogNotionWorkspace selection state', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  const blogs = [
    {
      id: 'blog-1',
      title: 'First blog',
      slug: 'first-blog',
      published: true,
      publishedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      tags: ['tag-a'],
      excerpt: 'excerpt',
      content: { html: '<p>First</p>' },
    },
    {
      id: 'blog-2',
      title: 'Second blog',
      slug: 'second-blog',
      published: false,
      publishedAt: null,
      updatedAt: '2024-01-03T00:00:00.000Z',
      tags: ['tag-b'],
      excerpt: 'excerpt',
      content: { html: '<p>Second</p>' },
    },
  ]

  it('keeps the active editor intact and does not expose batch controls in notion view', () => {
    render(
      <BlogNotionWorkspace
        blogs={blogs}
        activeBlog={blogs[0]}
      />,
    )

    expect(screen.getByTestId('mock-tiptap-editor')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /generate ai fix job/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /AI Content Fixer/i })).toBeInTheDocument()
  })

  it('renders safe list and document fallbacks for malformed blog values', () => {
    const malformedBlogs = [
      {
        id: '',
        title: '',
        slug: '',
        published: null,
        publishedAt: 'not-a-date',
        updatedAt: undefined,
        tags: [null, 'safe', ''],
        excerpt: 'excerpt',
        content: { html: '<p>Malformed</p>' },
      },
    ] as never

    const { container } = render(
      <BlogNotionWorkspace
        blogs={malformedBlogs}
        activeBlog={malformedBlogs[0]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Library/i }))

    expect(screen.getAllByText('Untitled post').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('link', { name: 'Untitled post' })).toHaveAttribute('href', '/admin/blog/notion')
    expect(container.querySelector('a[href="/admin/blog"]')).not.toBeNull()
    expect(screen.getByText('safe')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
    expect(document.body.textContent).not.toMatch(/Invalid Date|NaN|undefined|null|trace|exception|status 500|sqlstate|npgsql|woongblog\.api/i)
  })

  it('still supports metadata save in notion view', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue({
      ok: true,
      text: async () => '',
    } as Response)

    render(
      <BlogNotionWorkspace
        blogs={blogs}
        activeBlog={blogs[0]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } })
    fireEvent.click(screen.getByRole('button', { name: /save post settings/i }))

    expect(fetchWithCsrf).toHaveBeenCalledWith(
      'http://localhost/api/admin/blogs/blog-1',
      expect.objectContaining({
        method: 'PUT',
      }),
    )
  })

  it('waits for the autosave interval before saving notion content', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchWithCsrf).mockResolvedValue({
      ok: true,
      text: async () => '',
    } as Response)

    render(
      <BlogNotionWorkspace
        blogs={blogs}
        activeBlog={blogs[0]}
      />,
    )

    await act(async () => {
      fireEvent.change(screen.getByTestId('mock-tiptap-editor'), { target: { value: '<p>Updated body</p>' } })
    })

    expect(screen.getByTestId('notion-save-state')).toHaveTextContent('Waiting')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(fetchWithCsrf).not.toHaveBeenCalled()
    expect(screen.getByTestId('notion-save-state')).toHaveTextContent('Waiting')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(fetchWithCsrf).toHaveBeenCalledWith(
      'http://localhost/api/admin/blogs/blog-1',
      expect.objectContaining({
        method: 'PUT',
      }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('notion-save-state')).toHaveTextContent(/Saving...|Saved/)
  })

  it('saves immediately when Ctrl+S is pressed', async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue({
      ok: true,
      text: async () => '',
    } as Response)

    render(
      <BlogNotionWorkspace
        blogs={blogs}
        activeBlog={blogs[0]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Saved with shortcut' } })
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })

    expect(fetchWithCsrf).toHaveBeenCalledWith(
      'http://localhost/api/admin/blogs/blog-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('Saved with shortcut'),
      }),
    )
  })
})
