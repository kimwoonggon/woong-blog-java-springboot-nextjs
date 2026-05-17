import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlogListItem } from '@/lib/api/blogs'
import type { WorkListItem } from '@/lib/api/works'
import sitemap from '@/app/sitemap'
import { fetchAllPublicBlogs } from '@/lib/api/blogs'
import { fetchAllPublicWorks } from '@/lib/api/works'

vi.mock('@/lib/api/blogs', () => ({
  fetchAllPublicBlogs: vi.fn(),
}))

vi.mock('@/lib/api/works', () => ({
  fetchAllPublicWorks: vi.fn(),
}))

const mockFetchAllPublicBlogs = vi.mocked(fetchAllPublicBlogs)
const mockFetchAllPublicWorks = vi.mocked(fetchAllPublicWorks)

function blog(overrides: Partial<BlogListItem>): BlogListItem {
  return {
    id: 'blog-1',
    slug: 'blog-post',
    title: 'Blog post',
    excerpt: '',
    tags: [],
    publishedAt: null,
    ...overrides,
  }
}

function work(overrides: Partial<WorkListItem>): WorkListItem {
  return {
    id: 'work-1',
    slug: 'work-item',
    title: 'Work item',
    excerpt: '',
    category: 'Case study',
    tags: [],
    publishedAt: null,
    ...overrides,
  }
}

describe('public sitemap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-28T00:00:00.000Z'))
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test/')
    mockFetchAllPublicBlogs.mockReset()
    mockFetchAllPublicWorks.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('falls back to the current date for invalid or missing public content dates', async () => {
    mockFetchAllPublicBlogs.mockResolvedValue([
      blog({ slug: 'bad-date', publishedAt: 'not-a-date' }),
      blog({ slug: 'missing-date', publishedAt: null }),
    ])
    mockFetchAllPublicWorks.mockResolvedValue([
      work({ slug: 'valid-date', publishedAt: '2026-01-02T03:04:05.000Z' }),
    ])

    const entries = await sitemap()

    expect(entries.find((entry) => entry.url === 'https://example.test/blog/bad-date')?.lastModified)
      .toEqual(new Date('2026-04-28T00:00:00.000Z'))
    expect(entries.find((entry) => entry.url === 'https://example.test/blog/missing-date')?.lastModified)
      .toEqual(new Date('2026-04-28T00:00:00.000Z'))
    expect(entries.find((entry) => entry.url === 'https://example.test/works/valid-date')?.lastModified)
      .toEqual(new Date('2026-01-02T03:04:05.000Z'))
  })

  it('omits empty or nullish slugs while encoding valid unicode and unsafe-looking slugs', async () => {
    mockFetchAllPublicBlogs.mockResolvedValue([
      blog({ slug: '' }),
      blog({ slug: undefined as unknown as string }),
      blog({ slug: '한글 slug' }),
      blog({ slug: 'post<script>alert(1)' }),
    ])
    mockFetchAllPublicWorks.mockResolvedValue([
      work({ slug: null as unknown as string }),
      work({ slug: 'work<script>alert(1)' }),
    ])

    const urls = (await sitemap()).map((entry) => entry.url)
    const joinedUrls = urls.join(' ')

    expect(urls).toContain('https://example.test/blog/%ED%95%9C%EA%B8%80%20slug')
    expect(urls).toContain('https://example.test/blog/post%3Cscript%3Ealert(1)')
    expect(urls).toContain('https://example.test/works/work%3Cscript%3Ealert(1)')
    expect(joinedUrls).not.toMatch(/\/(?:blog|works)\/(?:undefined|null)(?:\s|$)/)
    expect(urls).not.toContain('https://example.test/blog/')
    expect(urls).not.toContain('https://example.test/works/')
  })
})
