import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/(public)/page'
import { fetchPublicHome } from '@/lib/api/home'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => createElement('img', { src, alt, ...props }),
}))

vi.mock('@/components/content/LocalQaQueryBoundary', () => ({
  LocalQaNoImageBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/api/home', () => ({
  fetchPublicHome: vi.fn(),
}))

const mockFetchPublicHome = vi.mocked(fetchPublicHome)

function createHomeWork(index: number) {
  return {
    id: `work-${index}`,
    slug: `work-${index}`,
    title: `Work ${index}`,
    excerpt: `Work excerpt ${index}`,
    category: 'Platform',
    tags: [],
    thumbnailUrl: '',
    publishedAt: '2026-05-13T00:00:00Z',
  }
}

describe('public home date fallbacks', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders safe fallback labels for invalid featured work and recent post dates', async () => {
    mockFetchPublicHome.mockResolvedValueOnce({
      homePage: {
        title: 'Home',
        contentJson: JSON.stringify({ headline: 'Home headline', introText: 'Intro' }),
      },
      siteSettings: {
        ownerName: 'Owner',
        tagline: '',
        gitHubUrl: '',
        linkedInUrl: '',
        resumePublicUrl: '',
      },
      featuredWorks: [{
        id: 'work-1',
        slug: 'work-1',
        title: 'Work with malformed date',
        excerpt: 'Work excerpt',
        category: 'Platform',
        tags: [],
        thumbnailUrl: '',
        publishedAt: 'not-a-date',
      }],
      recentPosts: [{
        id: 'post-1',
        slug: 'post-1',
        title: 'Post with malformed date',
        excerpt: 'Post excerpt',
        tags: ['study'],
        coverUrl: '',
        publishedAt: 'not-a-date',
      }],
    })

    const { container } = render(await HomePage())

    expect(screen.getAllByText('Unknown Date')).toHaveLength(2)
    expect(container.textContent).not.toMatch(/Invalid Date|RangeError/i)
  })

  it('renders six featured works while keeping the fifth and sixth cards desktop-only below lg', async () => {
    mockFetchPublicHome.mockResolvedValueOnce({
      homePage: {
        title: 'Home',
        contentJson: JSON.stringify({ headline: 'Home headline', introText: 'Intro' }),
      },
      siteSettings: {
        ownerName: 'Owner',
        tagline: '',
        gitHubUrl: '',
        linkedInUrl: '',
        resumePublicUrl: '',
      },
      featuredWorks: Array.from({ length: 6 }, (_, index) => createHomeWork(index + 1)),
      recentPosts: [],
    })

    render(await HomePage())

    const featuredWorkCards = screen.getAllByTestId('featured-work-card')
    expect(featuredWorkCards).toHaveLength(6)
    expect(featuredWorkCards[0]).toHaveClass('block')
    expect(featuredWorkCards[3]).toHaveClass('block')
    expect(featuredWorkCards[4]).toHaveClass('hidden')
    expect(featuredWorkCards[4]).toHaveClass('lg:block')
    expect(featuredWorkCards[5]).toHaveClass('hidden')
    expect(featuredWorkCards[5]).toHaveClass('lg:block')
    expect(screen.getByTestId('featured-works-grid')).toHaveClass('lg:grid-cols-3')
  })
})
