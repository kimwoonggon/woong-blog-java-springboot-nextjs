import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/server', () => ({
  getServerApiBaseUrl: vi.fn(async () => 'http://localhost/api'),
  getServerCookieHeader: vi.fn(async () => 'auth=1'),
  getServerForwardingHeaders: vi.fn(async () => ({})),
}))

describe('public API helper contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchPublicPageBySlug encodes slugs and returns null only on 404 responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ slug: '한글 slug', title: 'Title' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    vi.stubGlobal('fetch', fetchMock)
    const { fetchPublicPageBySlug } = await import('@/lib/api/pages')

    await expect(fetchPublicPageBySlug('missing page')).resolves.toBeNull()
    await expect(fetchPublicPageBySlug('한글 slug')).resolves.toMatchObject({ title: 'Title' })
    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost/api/public/pages/%ED%95%9C%EA%B8%80%20slug', { next: { revalidate: 60, tags: ['public-page:한글 slug'] } })
  })

  it('site settings helpers throw on server failure and surface parsed payload on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('server down', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ownerName: 'Woong', tagline: 'Creative Technologist' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          id: 'resume-1',
          publicUrl: '/media/public-resume/resume.pdf',
          fileName: 'resume.pdf',
          path: 'public-resume/resume.pdf',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ))

    vi.stubGlobal('fetch', fetchMock)
    const { fetchPublicSiteSettings, fetchResume } = await import('@/lib/api/site-settings')

    await expect(fetchPublicSiteSettings()).rejects.toThrow('Failed to load public site settings.')
    await expect(fetchPublicSiteSettings()).resolves.toMatchObject({ ownerName: 'Woong' })
    await expect(fetchResume()).resolves.toMatchObject({
      id: 'resume-1',
      fileName: 'resume.pdf',
      path: 'public-resume/resume.pdf',
    })
  })

  it('blog and work detail helpers preserve encoded paths and null semantics', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ slug: 'seeded-work', title: 'Work', contentJson: '{}', category: 'platform', excerpt: 'excerpt', tags: [], videos: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ slug: 'seeded-blog', title: 'Blog' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    vi.stubGlobal('fetch', fetchMock)
    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')
    const { fetchPublicBlogBySlug } = await import('@/lib/api/blogs')

    await expect(fetchPublicWorkBySlug('seeded-work')).resolves.toMatchObject({ title: 'Work' })
    await expect(fetchPublicBlogBySlug('missing-blog')).resolves.toBeNull()
    await expect(fetchPublicBlogBySlug('seeded-blog')).resolves.toMatchObject({ title: 'Blog' })

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost/api/public/works/seeded-work', { next: { revalidate: 60, tags: ['public-works', 'public-work:seeded-work'] } })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost/api/public/blogs/missing-blog', { next: { revalidate: 60, tags: ['public-blogs', 'public-blog:missing-blog'] } })
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://localhost/api/public/blogs/seeded-blog', { next: { revalidate: 60, tags: ['public-blogs', 'public-blog:seeded-blog'] } })
  })

  it('accepts missing videos fields but rejects malformed video arrays', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'seeded-work', title: 'Work', contentJson: '{}', category: 'platform', excerpt: 'excerpt', tags: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'broken-work', title: 'Broken', contentJson: '{}', category: 'platform', excerpt: 'excerpt', tags: [], videos: { nope: true } }),
      })

    vi.stubGlobal('fetch', fetchMock)
    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')

    await expect(fetchPublicWorkBySlug('seeded-work')).resolves.toMatchObject({ videos: [] })
    await expect(fetchPublicWorkBySlug('broken-work')).rejects.toThrow('Work videos payload must be an array when present.')
  })

  it('keeps incomplete but renderable work video records safe for public detail rendering', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        slug: 'processing-work',
        title: 'Processing Work',
        contentJson: '{}',
        category: 'platform',
        excerpt: 'excerpt',
        tags: [],
        videos: [
          {
            id: 'video-processing',
            sourceType: 'hls',
            sourceKey: 'local:videos/work-1/video-processing/hls/master.m3u8',
            playbackUrl: null,
            sortOrder: 0,
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)
    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')

    await expect(fetchPublicWorkBySlug('processing-work')).resolves.toMatchObject({
      slug: 'processing-work',
      videos: [
        expect.objectContaining({
          id: 'video-processing',
          playbackUrl: null,
        }),
      ],
    })
  })
})
