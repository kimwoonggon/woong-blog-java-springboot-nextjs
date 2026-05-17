import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BlogDetail } from '@/lib/api/blogs'
import type { WorkDetail } from '@/lib/api/works'
import { generateMetadata as generateBlogMetadata } from '@/app/(public)/blog/[slug]/page'
import { generateMetadata as generateWorkMetadata } from '@/app/(public)/works/[slug]/page'
import { fetchPublicBlogBySlug } from '@/lib/api/blogs'
import { fetchPublicWorkBySlug } from '@/lib/api/works'

vi.mock('@/lib/api/blogs', () => ({
  fetchAllPublicBlogs: vi.fn(),
  fetchPublicBlogBySlug: vi.fn(),
}))

vi.mock('@/lib/api/works', () => ({
  fetchAllPublicWorks: vi.fn(),
  fetchPublicWorkBySlug: vi.fn(),
}))

const mockFetchPublicBlogBySlug = vi.mocked(fetchPublicBlogBySlug)
const mockFetchPublicWorkBySlug = vi.mocked(fetchPublicWorkBySlug)

function blogDetail(overrides: Partial<BlogDetail>): BlogDetail {
  return {
    id: 'blog-1',
    slug: 'blog-post',
    title: 'Blog post',
    excerpt: 'Blog excerpt',
    tags: [],
    publishedAt: '2026-04-01T00:00:00.000Z',
    contentJson: JSON.stringify({ html: '<p>body</p>' }),
    ...overrides,
  }
}

function workDetail(overrides: Partial<WorkDetail>): WorkDetail {
  return {
    id: 'work-1',
    slug: 'work-item',
    title: 'Work item',
    excerpt: 'Work excerpt',
    socialShareMessage: null,
    category: 'platform',
    period: null,
    tags: [],
    publishedAt: '2026-04-01T00:00:00.000Z',
    contentJson: JSON.stringify({ html: '<p>body</p>' }),
    videosVersion: 0,
    videos: [],
    ...overrides,
  }
}

describe('public detail metadata fallbacks', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty blog metadata for malformed route slugs or fetch failures', async () => {
    await expect(generateBlogMetadata({ params: Promise.resolve({ slug: '%E0%A4%A' }) }))
      .resolves.toEqual({})
    expect(mockFetchPublicBlogBySlug).not.toHaveBeenCalled()

    mockFetchPublicBlogBySlug.mockRejectedValueOnce(new Error('API stack should not leak'))

    await expect(generateBlogMetadata({ params: Promise.resolve({ slug: 'safe-blog' }) }))
      .resolves.toEqual({})
    expect(mockFetchPublicBlogBySlug).toHaveBeenCalledWith('safe-blog')
  })

  it('encodes blog metadata canonical slugs from API payloads', async () => {
    mockFetchPublicBlogBySlug.mockResolvedValueOnce(blogDetail({
      slug: 'post<script>alert(1)',
      title: 'Unsafe-looking post',
      excerpt: 'Post excerpt',
    }))

    const metadata = await generateBlogMetadata({
      params: Promise.resolve({ slug: 'post%3Cscript%3Ealert(1)' }),
    })

    expect(metadata.alternates?.canonical).toBe('/blog/post%3Cscript%3Ealert(1)')
    expect(metadata.openGraph?.url).toBe('/blog/post%3Cscript%3Ealert(1)')
    expect(JSON.stringify(metadata)).not.toMatch(/<script|undefined|null/i)
  })

  it('returns empty work metadata for malformed route slugs or fetch failures', async () => {
    await expect(generateWorkMetadata({ params: Promise.resolve({ slug: '%E0%A4%A' }) }))
      .resolves.toEqual({})
    expect(mockFetchPublicWorkBySlug).not.toHaveBeenCalled()

    mockFetchPublicWorkBySlug.mockRejectedValueOnce(new Error('API stack should not leak'))

    await expect(generateWorkMetadata({ params: Promise.resolve({ slug: 'safe-work' }) }))
      .resolves.toEqual({})
    expect(mockFetchPublicWorkBySlug).toHaveBeenCalledWith('safe-work')
  })

  it('encodes work metadata canonical slugs from API payloads', async () => {
    mockFetchPublicWorkBySlug.mockResolvedValueOnce(workDetail({
      slug: 'work<script>alert(1)',
      title: 'Unsafe-looking work',
      excerpt: 'Work excerpt',
    }))

    const metadata = await generateWorkMetadata({
      params: Promise.resolve({ slug: 'work%3Cscript%3Ealert(1)' }),
    })

    expect(metadata.alternates?.canonical).toBe('/works/work%3Cscript%3Ealert(1)')
    expect(metadata.openGraph?.url).toBe('/works/work%3Cscript%3Ealert(1)')
    expect(JSON.stringify(metadata)).not.toMatch(/<script|undefined|null/i)
  })
})
