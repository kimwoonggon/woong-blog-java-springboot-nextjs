export function isLocalQaBaseUrl(baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000') {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export const LOCAL_QA_FLAG_SKIP_REASON = 'Local QA query flags are only enabled for localhost and 127.0.0.1.'
