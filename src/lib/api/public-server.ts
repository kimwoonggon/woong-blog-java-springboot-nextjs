function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

function normalizeApiBaseUrl(originOrApiBase: string) {
  const normalized = normalizeOrigin(originOrApiBase)
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

export async function getPublicServerApiBaseUrl() {
  if (process.env.INTERNAL_API_ORIGIN) {
    return normalizeApiBaseUrl(process.env.INTERNAL_API_ORIGIN)
  }

  if (process.env.NEXT_PUBLIC_SITE_URL && /^https?:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL)) {
    return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_SITE_URL)
  }

  if (process.env.NEXT_PUBLIC_API_BASE_URL && /^https?:\/\//i.test(process.env.NEXT_PUBLIC_API_BASE_URL)) {
    return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL)
  }

  const { getServerApiBaseUrl } = await import('@/lib/api/server')
  return getServerApiBaseUrl()
}
