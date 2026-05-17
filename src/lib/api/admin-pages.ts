import { getServerApiBaseUrl, getServerCookieHeader } from '@/lib/api/server'

export interface AdminPageRecord {
  id: string
  slug: string
  title: string
  content: unknown
}

export interface AdminSiteSettings {
  owner_name: string
  tagline: string
  facebook_url: string
  instagram_url: string
  twitter_url: string
  linkedin_url: string
  github_url: string
  resume_asset_id?: string | null
}

async function buildAdminHeaders(): Promise<Record<string, string>> {
  const cookieHeader = await getServerCookieHeader()
  if (!cookieHeader) {
    return {}
  }

  return { cookie: cookieHeader }
}

export async function fetchAdminPages(slugs: string[]) {
  const apiBaseUrl = await getServerApiBaseUrl()
  const params = new URLSearchParams()
  for (const slug of slugs) {
    params.append('slugs', slug)
  }

  const response = await fetch(`${apiBaseUrl}/admin/pages?${params.toString()}`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to load admin pages.')
  }

  return response.json() as Promise<AdminPageRecord[]>
}

export async function fetchAdminSiteSettings() {
  const apiBaseUrl = await getServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/admin/site-settings`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to load site settings.')
  }

  return response.json() as Promise<AdminSiteSettings>
}
