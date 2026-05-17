import { getServerApiBaseUrl, getServerCookieHeader } from '@/lib/api/server'
import { getPublicServerApiBaseUrl } from '@/lib/api/public-server'
import { throwPublicApiError } from '@/lib/api/public-errors'
import { PUBLIC_CONTENT_TAGS, publicContentFetchInit } from '@/lib/api/public-cache'
import type { BlogContentPayload } from '@/lib/content/blog-content'

export interface BlogListItem {
  id: string
  slug: string
  title: string
  excerpt: string
  tags: string[]
  publishedAt?: string | null
  coverUrl?: string
}

export interface PagedBlogsPayload {
  items: BlogListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface BlogAdminItem extends BlogListItem {
  published: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BlogDetail extends BlogListItem {
  content?: BlogContentPayload
  contentJson?: string
}

export interface BlogDetailContext {
  newer: BlogListItem | null
  older: BlogListItem | null
  related: BlogListItem[]
}

export interface PublicBlogSearchOptions {
  query?: string | null
  legacySearchMode?: 'title' | 'content' | string | null
}

export interface AdminBlogDetail {
  id: string
  title: string
  slug: string
  excerpt: string
  tags: string[]
  published: boolean
  publishedAt?: string | null
  updatedAt?: string
  content: { html: string }
}

async function buildAdminHeaders(): Promise<Record<string, string>> {
  const cookieHeader = await getServerCookieHeader()
  if (!cookieHeader) {
    return {}
  }

  return { cookie: cookieHeader }
}

export async function fetchPublicBlogs(page = 1, pageSize = 10, searchOptions: PublicBlogSearchOptions = {}) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  const query = searchOptions.query?.trim()
  if (query) {
    params.set('query', query)
    if (searchOptions.legacySearchMode === 'content' || searchOptions.legacySearchMode === 'title') {
      params.set('searchMode', searchOptions.legacySearchMode)
    }
  }

  const response = await fetch(`${apiBaseUrl}/public/blogs?${params.toString()}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.blogs]),
  })
  if (!response.ok) {
    await throwPublicApiError(response, 'Failed to load public blog posts.')
  }
  return response.json() as Promise<PagedBlogsPayload>
}

export async function fetchAllPublicBlogs(pageSize = 100) {
  const firstPage = await fetchPublicBlogs(1, pageSize)
  const items = [...firstPage.items]

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await fetchPublicBlogs(page, pageSize)
    items.push(...nextPage.items)
  }

  return items
}

export async function fetchPublicBlogContext(slug: string, limit = 9) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await fetch(`${apiBaseUrl}/public/blogs/${encodeURIComponent(slug)}/context?${params.toString()}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.blogs, PUBLIC_CONTENT_TAGS.blog(slug)]),
  })
  if (response.status === 404) return null
  if (!response.ok) {
    await throwPublicApiError(response, `Failed to load public blog context '${slug}'.`)
  }
  return response.json() as Promise<BlogDetailContext>
}

export async function fetchPublicBlogBySlug(slug: string) {
  const apiBaseUrl = await getPublicServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/public/blogs/${encodeURIComponent(slug)}`, {
    ...publicContentFetchInit([PUBLIC_CONTENT_TAGS.blogs, PUBLIC_CONTENT_TAGS.blog(slug)]),
  })
  if (response.status === 404) return null
  if (!response.ok) {
    await throwPublicApiError(response, `Failed to load public blog '${slug}'.`)
  }
  return response.json() as Promise<BlogDetail>
}

export async function fetchAdminBlogs() {
  const apiBaseUrl = await getServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/admin/blogs`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })
  if (!response.ok) throw new Error('Failed to load admin blog posts.')
  return response.json() as Promise<BlogAdminItem[]>
}

export async function fetchAdminBlogById(id: string) {
  const apiBaseUrl = await getServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/admin/blogs/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to load the requested blog post.')
  return response.json() as Promise<AdminBlogDetail>
}
