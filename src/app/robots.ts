import type { MetadataRoute } from 'next'
import { getMetadataBaseUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/'],
    },
    sitemap: `${getMetadataBaseUrl()}/sitemap.xml`,
  }
}
