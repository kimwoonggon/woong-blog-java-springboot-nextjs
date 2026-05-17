import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/server', () => ({
  getServerApiBaseUrl: vi.fn(async () => 'http://localhost/api'),
  getServerCookieHeader: vi.fn(async () => 'session=test'),
  getServerForwardingHeaders: vi.fn(async () => ({})),
}))

function mockDefaultServerApi() {
  vi.doMock('@/lib/api/server', () => ({
    getServerApiBaseUrl: vi.fn(async () => 'http://localhost/api'),
    getServerCookieHeader: vi.fn(async () => 'session=test'),
    getServerForwardingHeaders: vi.fn(async () => ({})),
  }))
}

describe('public/admin api clients', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    mockDefaultServerApi()
  })

  it('fetchPublicPageBySlug returns null only for 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404 })) as typeof fetch)

    const { fetchPublicPageBySlug } = await import('@/lib/api/pages')

    await expect(fetchPublicPageBySlug('contact')).resolves.toBeNull()
  })

  it('fetchPublicBlogs and fetchPublicWorks throw explicit errors on non-ok responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('missing', { status: 503 }))
      .mockResolvedValueOnce(new Response('missing', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchPublicBlogs } = await import('@/lib/api/blogs')
    const { fetchPublicWorks } = await import('@/lib/api/works')

    await expect(fetchPublicBlogs(3, 7)).rejects.toThrow('Failed to load public blog posts.')
    await expect(fetchPublicWorks(2, 8)).rejects.toThrow('Failed to load public works.')
  })

  it('public detail, page, and resume clients throw explicit public errors on 500 responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('database stack trace', { status: 500 }))
      .mockResolvedValueOnce(new Response('work upstream failed', { status: 502 }))
      .mockResolvedValueOnce(new Response('page upstream failed', { status: 503 }))
      .mockResolvedValueOnce(new Response('resume upstream failed', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchPublicBlogBySlug } = await import('@/lib/api/blogs')
    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')
    const { fetchPublicPageBySlug } = await import('@/lib/api/pages')
    const { fetchResume } = await import('@/lib/api/site-settings')

    await expect(fetchPublicBlogBySlug('broken-blog')).rejects.toThrow('Failed to load public blog')
    await expect(fetchPublicWorkBySlug('broken-work')).rejects.toThrow('Failed to load public work')
    await expect(fetchPublicPageBySlug('introduction')).rejects.toThrow('Failed to load public page')
    await expect(fetchResume()).rejects.toThrow('Failed to load public resume.')
  })

  it('public server API base uses the public site URL without reading request headers', async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://woonglab.com/')

    const getServerApiBaseUrl = vi.fn(async () => {
      throw new Error('request headers should not be read for public API origin')
    })
    vi.doMock('@/lib/api/server', () => ({
      getServerApiBaseUrl,
      getServerCookieHeader: vi.fn(async () => 'session=test'),
      getServerForwardingHeaders: vi.fn(async () => ({})),
    }))

    const { getPublicServerApiBaseUrl } = await import('@/lib/api/public-server')

    await expect(getPublicServerApiBaseUrl()).resolves.toBe('https://woonglab.com/api')
    expect(getServerApiBaseUrl).not.toHaveBeenCalled()
  })

  it('fetchPublicBlogs sends query-only params by default and preserves legacy searchMode when requested', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchPublicBlogs } = await import('@/lib/api/blogs')

    await fetchPublicBlogs(1, 12, { query: 'server components' })
    await fetchPublicBlogs(1, 12, { query: 'renderable html', legacySearchMode: 'content' })

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost/api/public/blogs?page=1&pageSize=12&query=server+components', { next: { revalidate: 60, tags: ['public-blogs'] } })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost/api/public/blogs?page=1&pageSize=12&query=renderable+html&searchMode=content', { next: { revalidate: 60, tags: ['public-blogs'] } })
  })

  it('fetchPublicWorks sends query-only params by default and preserves legacy searchMode when requested', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchPublicWorks } = await import('@/lib/api/works')

    await fetchPublicWorks(1, 8, { query: 'portfolio platform' })
    await fetchPublicWorks(1, 8, { query: 'migration details', legacySearchMode: 'content' })

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost/api/public/works?page=1&pageSize=8&query=portfolio+platform', { next: { revalidate: 60, tags: ['public-works'] } })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost/api/public/works?page=1&pageSize=8&query=migration+details&searchMode=content', { next: { revalidate: 60, tags: ['public-works'] } })
  })

  it('fetchPublicBlogBySlug requests the backend slug endpoint and fetchPublicWorkBySlug returns null on 404', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '1', slug: 'seeded-blog', title: 'Seeded Blog', excerpt: 'excerpt', tags: [], contentJson: '{}' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchPublicBlogBySlug } = await import('@/lib/api/blogs')
    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')

    const result = await fetchPublicBlogBySlug('seeded-blog')

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost/api/public/blogs/seeded-blog', { next: { revalidate: 60, tags: ['public-blogs', 'public-blog:seeded-blog'] } })
    expect(result?.slug).toBe('seeded-blog')
    await expect(fetchPublicWorkBySlug('missing-work')).resolves.toBeNull()
  })

  it('fetches bounded public detail context for blog and work detail pages', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          newer: { id: 'newer-blog', slug: 'newer-blog', title: 'Newer Blog', excerpt: 'newer', tags: [] },
          older: null,
          related: [{ id: 'related-blog', slug: 'related-blog', title: 'Related Blog', excerpt: 'related', tags: [] }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          newer: null,
          older: { id: 'older-work', slug: 'older-work', title: 'Older Work', excerpt: 'older', category: 'platform', tags: [] },
          related: [{ id: 'related-work', slug: 'related-work', title: 'Related Work', excerpt: 'related', category: 'platform', tags: [] }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchPublicBlogContext } = await import('@/lib/api/blogs')
    const { fetchPublicWorkContext } = await import('@/lib/api/works')

    await expect(fetchPublicBlogContext('seeded blog', 9)).resolves.toMatchObject({
      newer: { slug: 'newer-blog' },
      related: [{ slug: 'related-blog' }],
    })
    await expect(fetchPublicWorkContext('seeded work', 9)).resolves.toMatchObject({
      older: { slug: 'older-work' },
      related: [{ slug: 'related-work' }],
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost/api/public/blogs/seeded%20blog/context?limit=9', { next: { revalidate: 60, tags: ['public-blogs', 'public-blog:seeded blog'] } })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost/api/public/works/seeded%20work/context?limit=9', { next: { revalidate: 60, tags: ['public-works', 'public-work:seeded work'] } })
  })

  it('fetchPublicWorkBySlug parses socialShareMessage when present', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        id: 'work-1',
        slug: 'seeded-work',
        title: 'Seeded Work',
        excerpt: 'Excerpt fallback',
        socialShareMessage: 'Preferred share copy',
        contentJson: '{}',
        category: 'platform',
        tags: [],
        videos: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ) as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')
    const payload = await fetchPublicWorkBySlug('seeded-work')

    expect(payload?.socialShareMessage).toBe('Preferred share copy')
  })

  it('fetchPublicWorkBySlug parses timeline preview fields', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        id: 'work-2',
        slug: 'preview-work',
        title: 'Preview Work',
        excerpt: 'Excerpt',
        contentJson: '{}',
        category: 'platform',
        tags: [],
        videos: [
          {
            id: 'video-1',
            sourceType: 'hls',
            sourceKey: 'local:videos/work-2/video-1/hls/master.m3u8',
            sortOrder: 0,
            timeline_preview_vtt_url: '/media/videos/work-2/video-1/hls/timeline.vtt',
            timeline_preview_sprite_url: '/media/videos/work-2/video-1/hls/timeline-sprite.jpg',
          },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ) as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')
    const payload = await fetchPublicWorkBySlug('preview-work')

    expect(payload?.videos[0]?.timelinePreviewVttUrl).toBe('/media/videos/work-2/video-1/hls/timeline.vtt')
    expect(payload?.videos[0]?.timelinePreviewSpriteUrl).toBe('/media/videos/work-2/video-1/hls/timeline-sprite.jpg')
  })

  it('fetchAdminWorks forwards the cookie header for authenticated admin fetches', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ id: '1', slug: 'seeded-work', title: 'Seeded Work', excerpt: 'excerpt', category: 'platform', tags: [], published: true }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchAdminWorks } = await import('@/lib/api/works')

    const result = await fetchAdminWorks()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/admin/works', {
      cache: 'no-store',
      headers: { cookie: 'session=test' },
    })
    expect(result).toHaveLength(1)
  })

  it('fetchAdminBlogs forwards the cookie header for authenticated admin fetches', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ id: '1', slug: 'seeded-blog', title: 'Seeded Blog', excerpt: 'excerpt', tags: [], published: true }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchAdminBlogs } = await import('@/lib/api/blogs')

    const result = await fetchAdminBlogs()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/admin/blogs', {
      cache: 'no-store',
      headers: { cookie: 'session=test' },
    })
    expect(result).toHaveLength(1)
  })

  it('fetchAdminBlogs and fetchAdminWorks throw when admin list requests fail', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('bad blogs', { status: 500 }))
      .mockResolvedValueOnce(new Response('bad works', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchAdminBlogs } = await import('@/lib/api/blogs')
    const { fetchAdminWorks } = await import('@/lib/api/works')

    await expect(fetchAdminBlogs()).rejects.toThrow('Failed to load admin blog posts.')
    await expect(fetchAdminWorks()).rejects.toThrow('Failed to load admin works.')
  })

  it('fetchResume returns null when no resume is configured and fetchPublicSiteSettings returns parsed data on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          ownerName: 'Owner',
          tagline: 'Tagline',
          facebookUrl: '',
          instagramUrl: '',
          twitterUrl: '',
          linkedInUrl: '',
          gitHubUrl: 'https://github.com/owner',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchResume, fetchPublicSiteSettings } = await import('@/lib/api/site-settings')

    await expect(fetchResume()).resolves.toBeNull()
    await expect(fetchPublicSiteSettings()).resolves.toMatchObject({ ownerName: 'Owner', gitHubUrl: 'https://github.com/owner' })
  })

  it('fetchAllPublicBlogs and fetchAllPublicWorks aggregate every paged response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: '1', slug: 'a', title: 'A', excerpt: 'a', tags: [] }], page: 1, pageSize: 1, totalItems: 2, totalPages: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: '2', slug: 'b', title: 'B', excerpt: 'b', tags: [] }], page: 2, pageSize: 1, totalItems: 2, totalPages: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: '1', slug: 'a', title: 'A', excerpt: 'a', category: 'cat', tags: [] }], page: 1, pageSize: 1, totalItems: 2, totalPages: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: '2', slug: 'b', title: 'B', excerpt: 'b', category: 'cat', tags: [] }], page: 2, pageSize: 1, totalItems: 2, totalPages: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchAllPublicBlogs } = await import('@/lib/api/blogs')
    const { fetchAllPublicWorks } = await import('@/lib/api/works')

    await expect(fetchAllPublicBlogs(1)).resolves.toHaveLength(2)
    await expect(fetchAllPublicWorks(1)).resolves.toHaveLength(2)
  })

  it('admin detail helpers return null on 404 and throw on other failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 404, ok: false })
      .mockResolvedValueOnce({ status: 500, ok: false })
      .mockResolvedValueOnce({ status: 404, ok: false })
      .mockResolvedValueOnce({ status: 500, ok: false })
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchAdminBlogById } = await import('@/lib/api/blogs')
    const { fetchAdminWorkById } = await import('@/lib/api/works')

    await expect(fetchAdminBlogById('missing')).resolves.toBeNull()
    await expect(fetchAdminBlogById('broken')).rejects.toThrow('Failed to load the requested blog post.')
    await expect(fetchAdminWorkById('missing')).resolves.toBeNull()
    await expect(fetchAdminWorkById('broken')).rejects.toThrow('Failed to load the requested work item.')
  })

  it('returns parsed admin detail payloads on successful fetches', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: 'blog-1',
          title: 'Blog title',
          slug: 'blog-title',
          excerpt: 'excerpt',
          tags: ['alpha'],
          published: true,
          content: { html: '<p>Hello</p>' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: 'work-1',
          title: 'Work title',
          slug: 'work-title',
          excerpt: 'excerpt',
          category: 'platform',
          tags: ['beta'],
          published: true,
          content: { html: '<p>World</p>' },
          all_properties: {},
          videos_version: 2,
          videos: [{
            id: 'video-1',
            sourceType: 'youtube',
            sourceKey: 'dQw4w9WgXcQ',
            sortOrder: 0,
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
    vi.stubGlobal('fetch', fetchMock as typeof fetch)

    const { fetchAdminBlogById } = await import('@/lib/api/blogs')
    const { fetchAdminWorkById } = await import('@/lib/api/works')

    await expect(fetchAdminBlogById('blog-1')).resolves.toMatchObject({ slug: 'blog-title' })
    await expect(fetchAdminWorkById('work-1')).resolves.toMatchObject({
      slug: 'work-title',
      category: 'platform',
      videos_version: 2,
      videos: [{ sourceKey: 'dQw4w9WgXcQ' }],
    })
  })

  it('throws when a work detail payload contains malformed videos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        id: 'work-1',
        slug: 'work-title',
        title: 'Work title',
        excerpt: 'excerpt',
        contentJson: '{}',
        category: 'platform',
        tags: [],
        videos: {},
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ) as typeof fetch)

    const { fetchPublicWorkBySlug } = await import('@/lib/api/works')

    await expect(fetchPublicWorkBySlug('work-title')).rejects.toThrow('Work videos payload must be an array when present.')
  })
})
