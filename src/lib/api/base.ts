export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL
  }

  if (typeof window !== 'undefined') {
    return '/api'
  }

  return '/api'
}
