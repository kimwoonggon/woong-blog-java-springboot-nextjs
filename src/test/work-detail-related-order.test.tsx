import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
  useSearchParams: () => new URLSearchParams(''),
}))

describe('public work detail related content ordering', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('sorts bounded work context around the current work before rendering related content', async () => {
    const fetchAllPublicWorks = vi.fn(async () => {
      throw new Error('work detail page render must not fetch all public works')
    })
    const fetchPublicWorkContext = vi.fn(async () => ({
      newer: { id: 'newer', slug: 'newer-work', title: 'Newer Valid Work', excerpt: '', category: 'Platform', tags: [], publishedAt: '2026-03-30T00:00:00.000Z' },
      older: { id: 'older', slug: 'older-work', title: 'Older Valid Work', excerpt: '', category: 'Platform', tags: [], publishedAt: '2026-03-10T00:00:00.000Z' },
      related: [
        { id: 'older', slug: 'older-work', title: 'Older Valid Work', excerpt: '', category: 'Platform', tags: [], publishedAt: '2026-03-10T00:00:00.000Z' },
        { id: 'newer', slug: 'newer-work', title: 'Newer Valid Work', excerpt: '', category: 'Platform', tags: [], publishedAt: '2026-03-30T00:00:00.000Z' },
      ],
    }))

    vi.doMock('@/lib/api/works', () => ({
      fetchPublicWorkBySlug: vi.fn(async () => ({
        id: 'current',
        slug: 'current-work',
        title: 'Current Work',
        excerpt: 'excerpt',
        category: 'Platform',
        period: null,
        tags: [],
        publishedAt: '2026-03-20T00:00:00.000Z',
        contentJson: JSON.stringify({ html: '<p>Hello</p>' }),
        socialShareMessage: null,
        videosVersion: 0,
        videos: [],
      })),
      fetchPublicWorkContext,
      fetchAllPublicWorks,
    }))

    vi.doMock('@/lib/api/server', () => ({
      fetchServerSession: vi.fn(async () => ({ authenticated: false, role: 'guest' })),
    }))

    vi.doMock('@/components/content/InteractiveRenderer', () => ({
      InteractiveRenderer: () => <div data-testid="render-html" />,
    }))

    vi.doMock('@/components/content/WorkVideoPlayer', () => ({
      WorkVideoPlayer: () => <div data-testid="work-video" />,
    }))

    vi.doMock('@/components/content/WorkTableOfContentsRail', () => ({
      WorkTableOfContentsRail: () => <div data-testid="toc" />,
    }))

    vi.doMock('@/components/content/RelatedContentList', () => ({
      RelatedContentList: ({ items }: { items: Array<{ title: string }> }) => (
        <ol data-testid="related-order">
          {items.map((item) => <li key={item.title}>{item.title}</li>)}
        </ol>
      ),
    }))

    vi.doMock('@/components/ui/badge', () => ({
      Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }))

    const WorkDetailPage = (await import('@/app/(public)/works/[slug]/page')).default
    render(await WorkDetailPage({ params: Promise.resolve({ slug: 'current-work' }) }))

    expect(screen.getByTestId('related-order')).toHaveTextContent([
      'Newer Valid Work',
      'Current Work',
      'Older Valid Work',
    ].join(''))
    expect(fetchPublicWorkContext).toHaveBeenCalledWith('current-work', 24)
    expect(fetchAllPublicWorks).not.toHaveBeenCalled()
  }, 120000)
})
