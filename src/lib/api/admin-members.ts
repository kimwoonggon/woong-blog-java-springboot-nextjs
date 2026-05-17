import { getServerApiBaseUrl, getServerCookieHeader } from '@/lib/api/server'

export interface AdminMemberItem {
  id: string
  displayName: string
  email: string
  role: string
  provider: string
  createdAt: string
  lastLoginAt?: string | null
  activeSessionCount: number
}

async function buildAdminHeaders(): Promise<Record<string, string>> {
  const cookieHeader = await getServerCookieHeader()
  if (!cookieHeader) {
    return {}
  }

  return { cookie: cookieHeader }
}

export async function fetchAdminMembers() {
  const apiBaseUrl = await getServerApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/admin/members`, {
    cache: 'no-store',
    headers: await buildAdminHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to load admin members.')
  }

  return response.json() as Promise<AdminMemberItem[]>
}
