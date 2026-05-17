import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RelatedContentList } from '@/components/content/RelatedContentList'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: '',
  pageSize: 2,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/blog/current',
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}))

vi.mock('@/hooks/useResponsivePageSize', () => ({
  useResponsivePageSize: () => mocks.pageSize,
}))

const items = [
  { id: 'post-1', slug: 'post-1', title: 'Post 1', excerpt: 'Excerpt 1', publishedAt: '2026-04-01T00:00:00.000Z' },
  { id: 'post-2', slug: 'post-2', title: 'Post 2', excerpt: 'Excerpt 2', publishedAt: '2026-04-02T00:00:00.000Z' },
  { id: 'post-3', slug: 'post-3', title: 'Post 3', excerpt: 'Excerpt 3', publishedAt: '2026-04-03T00:00:00.000Z' },
]

describe('RelatedContentList', () => {
  beforeEach(() => {
    mocks.replace.mockClear()
    mocks.searchParams = ''
    mocks.pageSize = 2
  })

  it('opens on the page containing the current item and highlights it without a link', () => {
    render(
      <RelatedContentList
        heading="More Studies"
        hrefBase="/blog"
        items={items}
        currentItemId="post-3"
        testIdBase="related-blog"
      />,
    )

    const currentCard = screen.getByTestId('related-blog-current-card')
    expect(currentCard).toHaveTextContent('Post 3')
    expect(currentCard).toHaveTextContent('Current')
    expect(currentCard.querySelector('a')).toBeNull()
    expect(screen.queryByText('Excerpt 3')).not.toBeInTheDocument()
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('1 visible')).toBeInTheDocument()
  })

  it('updates relatedPage while preserving navigation through router state', () => {
    render(
      <RelatedContentList
        heading="More Studies"
        hrefBase="/blog"
        items={items}
        currentItemId="post-1"
        testIdBase="related-blog"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }))

    expect(mocks.replace).toHaveBeenCalledWith('/blog/current?relatedPage=2', { scroll: false })
  })

  it('uses Previous for the front page and Next for the back page', () => {
    mocks.searchParams = 'relatedPage=2'

    render(
      <RelatedContentList
        heading="More Studies"
        hrefBase="/blog"
        items={items}
        currentItemId="post-1"
        testIdBase="related-blog"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go to previous related page' }))
    expect(mocks.replace).toHaveBeenCalledWith('/blog/current?relatedPage=1', { scroll: false })

    fireEvent.click(screen.getByRole('button', { name: 'Go to next related page' }))
    expect(mocks.replace).toHaveBeenCalledWith('/blog/current?relatedPage=2', { scroll: false })
  })

  it('centers the current item on mobile when centered window mode is enabled', () => {
    mocks.pageSize = 5
    const longItems = Array.from({ length: 7 }, (_, index) => ({
      id: `post-${index + 1}`,
      slug: `post-${index + 1}`,
      title: `Post ${index + 1}`,
      excerpt: `Excerpt ${index + 1}`,
      publishedAt: `2026-04-0${Math.min(index + 1, 9)}T00:00:00.000Z`,
    }))

    render(
      <RelatedContentList
        heading="More Studies"
        hrefBase="/blog"
        items={longItems}
        currentItemId="post-5"
        centerCurrentOnInitialPage
        testIdBase="related-blog"
      />,
    )

    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByTestId('related-blog-current-card')).toHaveTextContent('Post 5')
  })

  it('centers the current item for desktop-sized related windows and shows page numbers around it', () => {
    mocks.pageSize = 9
    const longItems = Array.from({ length: 25 }, (_, index) => ({
      id: `post-${index + 1}`,
      slug: `post-${index + 1}`,
      title: `Post ${index + 1}`,
      excerpt: `Excerpt ${index + 1}`,
      publishedAt: `2026-04-${String(Math.min(index + 1, 28)).padStart(2, '0')}T00:00:00.000Z`,
    }))

    render(
      <RelatedContentList
        heading="More Studies"
        hrefBase="/blog"
        items={longItems}
        currentItemId="post-13"
        centerCurrentOnInitialPage
        testIdBase="related-blog"
      />,
    )

    expect(screen.getByText('Page 9 of 17')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to page 7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to page 11' })).toBeInTheDocument()
    expect(screen.getByTestId('related-blog-current-card')).toHaveTextContent('Post 13')
    expect(screen.getByTestId('related-blog-grid')).toHaveTextContent('Post 9')
    expect(screen.getByTestId('related-blog-grid')).toHaveTextContent('Post 17')
  })

  it('renders fallback dates for invalid or missing related item dates', () => {
    const dateEdgeItems = [
      { id: 'post-invalid', slug: 'post-invalid', title: 'Malformed Date Post', excerpt: 'Excerpt', publishedAt: 'not-a-date' },
      { id: 'post-missing', slug: 'post-missing', title: 'Missing Date Post', excerpt: 'Excerpt', publishedAt: null },
    ]

    const { container } = render(
      <RelatedContentList
        heading="More Studies"
        hrefBase="/blog"
        items={dateEdgeItems}
        testIdBase="related-blog"
      />,
    )

    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError/i)
  })
})
