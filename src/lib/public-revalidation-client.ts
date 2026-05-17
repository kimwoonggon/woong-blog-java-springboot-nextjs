"use client"

import { fetchWithCsrf } from '@/lib/api/auth'
import { normalizePublicRevalidationPaths } from '@/lib/public-revalidation-paths'

export async function revalidatePublicPathsAfterMutation(paths: string[]) {
  const publicPaths = normalizePublicRevalidationPaths(paths)
  if (publicPaths.length === 0) {
    return
  }

  try {
    const response = await fetchWithCsrf('/revalidate-public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths: publicPaths }),
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }
  } catch (error) {
    console.warn('Public path revalidation failed after admin mutation.', error)
  }
}
