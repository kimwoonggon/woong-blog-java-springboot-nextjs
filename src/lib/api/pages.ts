import { getPublicServerApiBaseUrl } from '@/lib/api/public-server'
import { throwPublicApiError } from '@/lib/api/public-errors'
import { PUBLIC_CONTENT_TAGS, publicContentFetchInit } from '@/lib/api/public-cache'

export async function fetchPublicPageBySlug(slug: string) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/public/pages/${encodeURIComponent(slug)}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.page(slug)]),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    await throwPublicApiError(response, `Failed to load public page '${slug}'.`)
  }

  return response.json() as Promise<{
    id: string
    slug: string
    title: string
    contentJson: string
  }>
}
