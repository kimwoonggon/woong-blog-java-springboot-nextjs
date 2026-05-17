import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BlogListItem, PagedBlogsPayload } from '@/lib/api/blogs'
import type { PagedWorksPayload, WorkListItem } from '@/lib/api/works'
import robots from '@/app/robots'
import { generateStaticParams as generateBlogStaticParams } from '@/app/(public)/blog/[slug]/page'
import { generateStaticParams as generateWorkStaticParams } from '@/app/(public)/works/[slug]/page'
import { fetchPublicBlogs } from '@/lib/api/blogs'
import { fetchPublicWorks } from '@/lib/api/works'

vi.mock('@/lib/api/blogs', () => ({
  fetchPublicBlogs: vi.fn(),
  fetchPublicBlogBySlug: vi.fn(),
  fetchPublicBlogContext: vi.fn(),
}))

vi.mock('@/lib/api/works', () => ({
  fetchPublicWorks: vi.fn(),
  fetchPublicWorkBySlug: vi.fn(),
  fetchPublicWorkContext: vi.fn(),
}))

const mockFetchPublicBlogs = vi.mocked(fetchPublicBlogs)
const mockFetchPublicWorks = vi.mocked(fetchPublicWorks)

function blog(slug: unknown): BlogListItem {
  return {
    id: `blog-${String(slug)}`,
    slug: slug as string,
    title: 'Blog post',
    excerpt: '',
    tags: [],
    publishedAt: null,
  }
}

function work(slug: unknown): WorkListItem {
  return {
    id: `work-${String(slug)}`,
    slug: slug as string,
    title: 'Work item',
    excerpt: '',
    category: 'Case study',
    tags: [],
    publishedAt: null,
  }
}

function blogPage(items: BlogListItem[], page = 1, totalPages = 1): PagedBlogsPayload {
  return {
    items,
    page,
    pageSize: 100,
    totalItems: items.length,
    totalPages,
  }
}

function workPage(items: WorkListItem[], page = 1, totalPages = 1): PagedWorksPayload {
  return {
    items,
    page,
    pageSize: 100,
    totalItems: items.length,
    totalPages,
  }
}

describe('public static route helpers', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('builds robots rules with a normalized sitemap URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test/')

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/'],
      },
      sitemap: 'https://example.test/sitemap.xml',
    })
  })

  it('builds blog static params from all paginated public blog pages and filters malformed slugs', async () => {
    mockFetchPublicBlogs
      .mockResolvedValueOnce(blogPage([
        blog('valid-post'),
        blog('  한글 slug  '),
        blog('post<script>alert(1)'),
        blog(''),
        blog(null),
        blog(undefined),
      ], 1, 2))
      .mockResolvedValueOnce(blogPage([
        blog('second-page-post'),
        blog('/admin'),
        blog('nested/slug'),
        blog('post?draft=1'),
        blog('post#section'),
      ], 2, 2))

    await expect(generateBlogStaticParams()).resolves.toEqual([
      { slug: 'valid-post' },
      { slug: '한글 slug' },
      { slug: 'post<script>alert(1)' },
      { slug: 'second-page-post' },
    ])
    expect(mockFetchPublicBlogs).toHaveBeenNthCalledWith(1, 1, 100)
    expect(mockFetchPublicBlogs).toHaveBeenNthCalledWith(2, 2, 100)
  })

  it('returns no blog static params when the first public blog page fails', async () => {
    mockFetchPublicBlogs.mockRejectedValueOnce(new Error('public blogs unavailable'))

    await expect(generateBlogStaticParams()).resolves.toEqual([])
    expect(mockFetchPublicBlogs).toHaveBeenCalledTimes(1)
  })

  it('keeps blog static params collected before a later public blog page fails', async () => {
    mockFetchPublicBlogs
      .mockResolvedValueOnce(blogPage([blog('first-page-post')], 1, 3))
      .mockRejectedValueOnce(new Error('second page unavailable'))

    await expect(generateBlogStaticParams()).resolves.toEqual([
      { slug: 'first-page-post' },
    ])
    expect(mockFetchPublicBlogs).toHaveBeenNthCalledWith(1, 1, 100)
    expect(mockFetchPublicBlogs).toHaveBeenNthCalledWith(2, 2, 100)
  })

  it('builds work static params from all paginated public work pages and filters malformed slugs', async () => {
    mockFetchPublicWorks
      .mockResolvedValueOnce(workPage([
        work('valid-work'),
        work('  작업 slug  '),
        work('work<script>alert(1)'),
        work(''),
        work(null),
        work(undefined),
      ], 1, 2))
      .mockResolvedValueOnce(workPage([
        work('second-page-work'),
        work('/admin'),
        work('nested/slug'),
        work('work?draft=1'),
        work('work#section'),
      ], 2, 2))

    await expect(generateWorkStaticParams()).resolves.toEqual([
      { slug: 'valid-work' },
      { slug: '작업 slug' },
      { slug: 'work<script>alert(1)' },
      { slug: 'second-page-work' },
    ])
    expect(mockFetchPublicWorks).toHaveBeenNthCalledWith(1, 1, 100)
    expect(mockFetchPublicWorks).toHaveBeenNthCalledWith(2, 2, 100)
  })

  it('returns no work static params when the first public work page fails', async () => {
    mockFetchPublicWorks.mockRejectedValueOnce(new Error('public works unavailable'))

    await expect(generateWorkStaticParams()).resolves.toEqual([])
    expect(mockFetchPublicWorks).toHaveBeenCalledTimes(1)
  })

  it('keeps work static params collected before a later public work page fails', async () => {
    mockFetchPublicWorks
      .mockResolvedValueOnce(workPage([work('first-page-work')], 1, 3))
      .mockRejectedValueOnce(new Error('second page unavailable'))

    await expect(generateWorkStaticParams()).resolves.toEqual([
      { slug: 'first-page-work' },
    ])
    expect(mockFetchPublicWorks).toHaveBeenNthCalledWith(1, 1, 100)
    expect(mockFetchPublicWorks).toHaveBeenNthCalledWith(2, 2, 100)
  })
})
