import type { MetadataRoute } from 'next'
import { fetchAllPublicBlogs } from '@/lib/api/blogs'
import { fetchAllPublicWorks } from '@/lib/api/works'
import { getMetadataBaseUrl } from '@/lib/seo'

const staticPublicRoutes = [
  '/',
  '/blog',
  '/works',
  '/contact',
  '/introduction',
  '/resume',
]

function getSitemapSlug(slug: unknown) {
  if (typeof slug !== 'string') {
    return null
  }

  const trimmed = slug.trim()
  return trimmed || null
}

function getSitemapLastModified(value: string | null | undefined, fallback: Date) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getMetadataBaseUrl()
  const [blogs, works] = await Promise.all([
    fetchAllPublicBlogs().catch(() => []),
    fetchAllPublicWorks().catch(() => []),
  ])

  const now = new Date()

  return [
    ...staticPublicRoutes.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: path === '/' ? 'weekly' as const : 'monthly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...blogs.flatMap((blog) => {
      const slug = getSitemapSlug(blog.slug)
      return slug
        ? [{
            url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
            lastModified: getSitemapLastModified(blog.publishedAt, now),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          }]
        : []
    }),
    ...works.flatMap((work) => {
      const slug = getSitemapSlug(work.slug)
      return slug
        ? [{
            url: `${baseUrl}/works/${encodeURIComponent(slug)}`,
            lastModified: getSitemapLastModified(work.publishedAt, now),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          }]
        : []
    }),
  ]
}
