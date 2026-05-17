import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getPublicAdminAffordanceState } from '@/lib/auth/public-admin'
import { getPublicRevalidationTagsForPaths, normalizePublicRevalidationPaths } from '@/lib/public-revalidation-paths'

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }

  try {
    const originUrl = new URL(origin)
    const candidateHosts = [
      request.headers.get('x-forwarded-host'),
      request.headers.get('host'),
    ].filter((value): value is string => Boolean(value))

    return candidateHosts.some((host) => {
      const forwardedUrl = new URL(`${originUrl.protocol}//${host}`)
      return originUrl.hostname === forwardedUrl.hostname
    })
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin revalidation is not allowed.' }, { status: 403 })
  }

  const { canShowAdminAffordances } = await getPublicAdminAffordanceState()
  if (!canShowAdminAffordances) {
    return NextResponse.json({ error: 'Only admins can revalidate public paths.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { paths?: unknown }
  const paths = Array.isArray(body.paths)
    ? normalizePublicRevalidationPaths(body.paths.filter((path): path is string => typeof path === 'string'))
    : []

  for (const path of paths) {
    revalidatePath(path)
  }

  const tags = getPublicRevalidationTagsForPaths(paths)
  for (const tag of tags) {
    revalidateTag(tag, 'max')
  }

  return NextResponse.json({ revalidated: paths, tags })
}
