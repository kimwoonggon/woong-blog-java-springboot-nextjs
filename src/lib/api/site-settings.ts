import { getPublicServerApiBaseUrl } from '@/lib/api/public-server'
import { throwPublicApiError } from '@/lib/api/public-errors'
import { PUBLIC_CONTENT_TAGS, publicContentFetchInit } from '@/lib/api/public-cache'

export interface PublicSiteSettings {
  ownerName: string
  tagline: string
  facebookUrl: string
  instagramUrl: string
  twitterUrl: string
  linkedInUrl: string
  gitHubUrl: string
}

export interface ResumePayload {
  id: string
  publicUrl: string
  fileName: string
  path: string
}

export async function fetchPublicSiteSettings() {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/public/site-settings`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    await throwPublicApiError(response, 'Failed to load public site settings.')
  }

  return response.json() as Promise<PublicSiteSettings>
}

interface FetchResumeOptions {
  cache?: 'public' | 'no-store'
}

export async function fetchResume(options: FetchResumeOptions = {}) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/public/resume`, {
    ...(options.cache === 'no-store' ? { cache: 'no-store' as const } : publicContentFetchInit([PUBLIC_CONTENT_TAGS.resume])),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    await throwPublicApiError(response, 'Failed to load public resume.')
  }

  return response.json() as Promise<ResumePayload>
}
