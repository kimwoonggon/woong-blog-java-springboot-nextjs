import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Matchers, PactV3, SpecificationVersion } from '@pact-foundation/pact'

const pactDirectory = path.resolve('tests/contracts/pacts')
const { atLeastLike, boolean, integer, like } = Matchers
const pactTestOptions = { retry: 2 } as const
const publicApiModules = [
  '@/lib/api/base',
  '@/lib/api/blogs',
  '@/lib/api/home',
  '@/lib/api/pages',
  '@/lib/api/public-server',
  '@/lib/api/site-settings',
  '@/lib/api/works',
]

function pact() {
  return new PactV3({
    consumer: 'WoongBlog Frontend',
    provider: 'WoongBlog API',
    dir: pactDirectory,
    spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
    logLevel: 'warn',
  })
}

function restorePactTestGlobals() {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
}

function restorePactTestModules() {
  for (const modulePath of publicApiModules) {
    vi.doUnmock(modulePath)
  }
}

async function withServerApi<T>(baseUrl: string, callback: () => Promise<T>) {
  restorePactTestGlobals()
  restorePactTestModules()
  vi.resetModules()
  vi.stubEnv('INTERNAL_API_ORIGIN', baseUrl)

  try {
    return await callback()
  } finally {
    restorePactTestGlobals()
    restorePactTestModules()
  }
}

async function withBrowserApi<T>(baseUrl: string, callback: () => Promise<T>) {
  restorePactTestGlobals()
  restorePactTestModules()
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', `${baseUrl}/api`)

  try {
    return await callback()
  } finally {
    restorePactTestGlobals()
    restorePactTestModules()
  }
}

describe('public API consumer Pact contracts', () => {
  beforeEach(() => {
    restorePactTestGlobals()
    restorePactTestModules()
  })

  afterEach(() => {
    restorePactTestGlobals()
    restorePactTestModules()
  })

  it('contracts public home payload', pactTestOptions, async () => {
    await pact()
      .given('public home exists')
      .uponReceiving('a public home request')
      .withRequest({ method: 'GET', path: '/api/public/home' })
      .willRespondWith({
        status: 200,
        body: like({
          homePage: {
            title: 'Home',
            contentJson: '{"headline":"Hello"}',
          },
          siteSettings: {
            ownerName: 'Owner',
            tagline: 'Tagline',
            gitHubUrl: 'https://github.com/owner',
            linkedInUrl: 'https://linkedin.com/in/owner',
            resumePublicUrl: '/media/resume.pdf',
          },
          featuredWorks: atLeastLike({
            id: '11111111-1111-1111-1111-111111111111',
            slug: 'seeded-work',
            title: 'Seeded Work',
            excerpt: 'Excerpt',
            category: 'platform',
            tags: ['platform'],
            thumbnailUrl: '/media/thumb.png',
            publishedAt: '2026-04-20T00:00:00Z',
          }, 1),
          recentPosts: atLeastLike({
            id: '22222222-2222-2222-2222-222222222222',
            slug: 'seeded-blog',
            title: 'Seeded Blog',
            excerpt: 'Excerpt',
            tags: ['study'],
            coverUrl: '/media/cover.png',
            publishedAt: '2026-04-20T00:00:00Z',
          }, 1),
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicHome } = await import('@/lib/api/home')
          await expect(fetchPublicHome()).resolves.toMatchObject({
            homePage: { title: 'Home' },
            siteSettings: { ownerName: 'Owner' },
          })
        })
      })
  })

  it('contracts public site settings payload', pactTestOptions, async () => {
    await pact()
      .given('public site settings exist')
      .uponReceiving('a public site settings request')
      .withRequest({ method: 'GET', path: '/api/public/site-settings' })
      .willRespondWith({
        status: 200,
        body: like({
          ownerName: 'Owner',
          tagline: 'Tagline',
          facebookUrl: '',
          instagramUrl: '',
          twitterUrl: '',
          linkedInUrl: 'https://linkedin.com/in/owner',
          gitHubUrl: 'https://github.com/owner',
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicSiteSettings } = await import('@/lib/api/site-settings')
          await expect(fetchPublicSiteSettings()).resolves.toMatchObject({ ownerName: 'Owner' })
        })
      })
  })

  it('contracts public page payload', pactTestOptions, async () => {
    await pact()
      .given('public page exists')
      .uponReceiving('a public page request')
      .withRequest({ method: 'GET', path: '/api/public/pages/introduction' })
      .willRespondWith({
        status: 200,
        body: like({
          id: '33333333-3333-3333-3333-333333333333',
          slug: 'introduction',
          title: 'Introduction',
          contentJson: '{"html":"<p>Hello</p>"}',
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicPageBySlug } = await import('@/lib/api/pages')
          await expect(fetchPublicPageBySlug('introduction')).resolves.toMatchObject({ slug: 'introduction' })
        })
      })
  })

  it('contracts public blog list and detail payloads', pactTestOptions, async () => {
    await pact()
      .given('published blogs exist')
      .uponReceiving('a public blog list request')
      .withRequest({
        method: 'GET',
        path: '/api/public/blogs',
        query: { page: '1', pageSize: '1' },
      })
      .willRespondWith({
        status: 200,
        body: like({
          items: atLeastLike({
            id: '44444444-4444-4444-4444-444444444444',
            slug: 'seeded-blog',
            title: 'Seeded Blog',
            excerpt: 'Excerpt',
            tags: ['study'],
            coverUrl: '/media/cover.png',
            publishedAt: '2026-04-20T00:00:00Z',
          }, 1),
          page: integer(1),
          pageSize: integer(1),
          totalItems: integer(1),
          totalPages: integer(1),
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicBlogs } = await import('@/lib/api/blogs')
          await expect(fetchPublicBlogs(1, 1)).resolves.toMatchObject({ page: 1 })
        })
      })

    await pact()
      .given('published blog detail exists')
      .uponReceiving('a public blog detail request')
      .withRequest({ method: 'GET', path: '/api/public/blogs/seeded-blog' })
      .willRespondWith({
        status: 200,
        body: like({
          id: '44444444-4444-4444-4444-444444444444',
          slug: 'seeded-blog',
          title: 'Seeded Blog',
          excerpt: 'Excerpt',
          tags: ['study'],
          coverUrl: '/media/cover.png',
          publishedAt: '2026-04-20T00:00:00Z',
          content: {
            html: '<p>Hello</p>',
          },
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicBlogBySlug } = await import('@/lib/api/blogs')
          await expect(fetchPublicBlogBySlug('seeded-blog')).resolves.toMatchObject({ slug: 'seeded-blog' })
        })
      })
  })

  it('contracts public work list and detail payloads', pactTestOptions, async () => {
    await pact()
      .given('published works exist')
      .uponReceiving('a public work list request')
      .withRequest({
        method: 'GET',
        path: '/api/public/works',
        query: { page: '1', pageSize: '1' },
      })
      .willRespondWith({
        status: 200,
        body: like({
          items: atLeastLike({
            id: '55555555-5555-5555-5555-555555555555',
            slug: 'seeded-work',
            title: 'Seeded Work',
            excerpt: 'Excerpt',
            category: 'platform',
            tags: ['platform'],
            thumbnailUrl: '/media/thumb.png',
            publishedAt: '2026-04-20T00:00:00Z',
          }, 1),
          page: integer(1),
          pageSize: integer(1),
          totalItems: integer(1),
          totalPages: integer(1),
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicWorks } = await import('@/lib/api/works')
          await expect(fetchPublicWorks(1, 1)).resolves.toMatchObject({ page: 1 })
        })
      })

    await pact()
      .given('published work detail exists')
      .uponReceiving('a public work detail request')
      .withRequest({ method: 'GET', path: '/api/public/works/seeded-work' })
      .willRespondWith({
        status: 200,
        body: like({
          id: '55555555-5555-5555-5555-555555555555',
          slug: 'seeded-work',
          title: 'Seeded Work',
          excerpt: 'Excerpt',
          content: {
            html: '<p>Hello</p>',
          },
          category: 'platform',
          period: '2026',
          tags: ['platform'],
          thumbnailUrl: '/media/thumb.png',
          publishedAt: '2026-04-20T00:00:00Z',
          videos_version: integer(0),
          videos: [],
        }),
      })
      .executeTest(async (mockServer) => {
        await withServerApi(mockServer.url, async () => {
          const { fetchPublicWorkBySlug } = await import('@/lib/api/works')
          await expect(fetchPublicWorkBySlug('seeded-work')).resolves.toMatchObject({ slug: 'seeded-work' })
        })
      })
  })

  it('contracts unauthenticated session payload', pactTestOptions, async () => {
    await pact()
      .given('visitor is anonymous')
      .uponReceiving('an auth session request without a session cookie')
      .withRequest({ method: 'GET', path: '/api/auth/session' })
      .willRespondWith({
        status: 200,
        body: like({
          authenticated: boolean(false),
        }),
      })
      .executeTest(async (mockServer) => {
        await withBrowserApi(mockServer.url, async () => {
          const { getApiBaseUrl } = await import('@/lib/api/base')
          const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
            credentials: 'include',
            cache: 'no-store',
          })
          expect(response.ok).toBe(true)
          await expect(response.json()).resolves.toMatchObject({ authenticated: false })
        })
      })
  })
})
