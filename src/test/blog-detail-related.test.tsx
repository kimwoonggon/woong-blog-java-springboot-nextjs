import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
  useSearchParams: () => new URLSearchParams(''),
}))

describe('public blog detail related content', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('passes bounded blog context including the current post to the related content section', async () => {
    const relatedItems = Array.from({ length: 24 }, (_, index) => ({
      id: `related-${index + 1}`,
      slug: `related-${index + 1}`,
      title: `Related ${index + 1}`,
      excerpt: `Excerpt ${index + 1}`,
      tags: [],
      publishedAt: '2026-03-29T00:00:00.000Z',
    }))
    const fetchAllPublicBlogs = vi.fn(async () => {
      throw new Error('blog detail page render must not fetch all public blogs')
    })
    const fetchPublicBlogContext = vi.fn(async () => ({
      newer: null,
      older: null,
      related: relatedItems,
    }))

    vi.doMock('@/lib/api/blogs', () => ({
      fetchPublicBlogBySlug: vi.fn(async () => ({
        id: 'blog-1',
        slug: 'current-post',
        title: 'Current Post',
        excerpt: 'excerpt',
        tags: [],
        publishedAt: '2026-03-29T00:00:00.000Z',
        contentJson: JSON.stringify({ html: '<p>Hello</p>' }),
      })),
      fetchPublicBlogContext,
      fetchAllPublicBlogs,
      fetchAdminBlogById: vi.fn(async () => null),
    }))

    vi.doMock('@/lib/api/server', () => ({
      fetchServerSession: vi.fn(async () => ({ authenticated: false, role: 'guest' })),
    }))

    vi.doMock('@/components/content/InteractiveRenderer', () => ({
      InteractiveRenderer: () => <div data-testid="render-html" />,
    }))

    vi.doMock('@/components/content/RelatedContentList', () => ({
      RelatedContentList: ({ items }: { items: Array<{ id: string }> }) => (
        <div data-testid="related-count">{items.length}</div>
      ),
    }))

    vi.doMock('@/components/ui/badge', () => ({
      Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }))

    const BlogDetailPage = (await import('@/app/(public)/blog/[slug]/page')).default
    render(await BlogDetailPage({ params: Promise.resolve({ slug: 'current-post' }) }))

    expect(screen.getByTestId('related-count')).toHaveTextContent('25')
    expect(fetchPublicBlogContext).toHaveBeenCalledWith('current-post', 24)
    expect(fetchAllPublicBlogs).not.toHaveBeenCalled()
  }, 120000)

  it('sorts bounded blog context around the current post before rendering related content', async () => {
    const fetchAllPublicBlogs = vi.fn(async () => {
      throw new Error('blog detail page render must not fetch all public blogs')
    })
    const fetchPublicBlogContext = vi.fn(async () => ({
      newer: { id: 'newer', slug: 'newer-post', title: 'Newer Valid Post', excerpt: '', tags: [], publishedAt: '2026-03-30T00:00:00.000Z' },
      older: { id: 'older', slug: 'older-post', title: 'Older Valid Post', excerpt: '', tags: [], publishedAt: '2026-03-10T00:00:00.000Z' },
      related: [
        { id: 'older', slug: 'older-post', title: 'Older Valid Post', excerpt: '', tags: [], publishedAt: '2026-03-10T00:00:00.000Z' },
        { id: 'newer', slug: 'newer-post', title: 'Newer Valid Post', excerpt: '', tags: [], publishedAt: '2026-03-30T00:00:00.000Z' },
      ],
    }))

    vi.doMock('@/lib/api/blogs', () => ({
      fetchPublicBlogBySlug: vi.fn(async () => ({
        id: 'current',
        slug: 'current-post',
        title: 'Current Post',
        excerpt: 'excerpt',
        tags: [],
        publishedAt: '2026-03-20T00:00:00.000Z',
        contentJson: JSON.stringify({ html: '<p>Hello</p>' }),
      })),
      fetchPublicBlogContext,
      fetchAllPublicBlogs,
      fetchAdminBlogById: vi.fn(async () => null),
    }))

    vi.doMock('@/lib/api/server', () => ({
      fetchServerSession: vi.fn(async () => ({ authenticated: false, role: 'guest' })),
    }))

    vi.doMock('@/components/content/InteractiveRenderer', () => ({
      InteractiveRenderer: () => <div data-testid="render-html" />,
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

    const BlogDetailPage = (await import('@/app/(public)/blog/[slug]/page')).default
    render(await BlogDetailPage({ params: Promise.resolve({ slug: 'current-post' }) }))

    expect(screen.getByTestId('related-order')).toHaveTextContent([
      'Newer Valid Post',
      'Current Post',
      'Older Valid Post',
    ].join(''))
    expect(fetchPublicBlogContext).toHaveBeenCalledWith('current-post', 24)
    expect(fetchAllPublicBlogs).not.toHaveBeenCalled()
  }, 120000)
})
