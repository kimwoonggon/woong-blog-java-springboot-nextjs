import { getPublicServerApiBaseUrl } from '@/lib/api/public-server'
import { throwPublicApiError } from '@/lib/api/public-errors'
import { PUBLIC_CONTENT_TAGS, publicContentFetchInit } from '@/lib/api/public-cache'

export interface HomePagePayload {
  title: string
  contentJson: string
}

export interface HomeSiteSettingsPayload {
  ownerName: string
  tagline: string
  gitHubUrl: string
  linkedInUrl: string
  resumePublicUrl: string
}

export interface HomeFeaturedWork {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  thumbnailUrl?: string
  publishedAt?: string | null
}

export interface HomeRecentPost {
  id: string
  slug: string
  title: string
  excerpt: string
  tags: string[]
  coverUrl?: string
  publishedAt?: string | null
}

export interface HomePayload {
  homePage: HomePagePayload
  siteSettings: HomeSiteSettingsPayload
  featuredWorks: HomeFeaturedWork[]
  recentPosts: HomeRecentPost[]
}

export async function fetchPublicHome() {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/public/home`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.home, PUBLIC_CONTENT_TAGS.siteSettings, PUBLIC_CONTENT_TAGS.blogs, PUBLIC_CONTENT_TAGS.works]),
  })

  if (!response.ok) {
    await throwPublicApiError(response, 'Failed to load public home.')
  }

  return response.json() as Promise<HomePayload>
}
