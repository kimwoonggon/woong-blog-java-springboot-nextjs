import { getServerApiBaseUrl, getServerCookieHeader } from '@/lib/api/server'

export interface AdminDashboardSummary {
  worksCount: number
  blogsCount: number
  viewsCount: number
}

export async function fetchAdminDashboardSummary() {
  const apiBaseUrl = await getServerApiBaseUrl()
  const cookieHeader = await getServerCookieHeader()
  const response = await fetch(`${apiBaseUrl}/admin/dashboard`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  })

  if (!response.ok) {
    throw new Error('Failed to load dashboard summary.')
  }

  return response.json() as Promise<AdminDashboardSummary>
}
