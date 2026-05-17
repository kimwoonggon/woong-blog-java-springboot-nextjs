export class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly retryAfter: string | null = null,
  ) {
    super(message)
    this.name = 'PublicApiError'
  }
}

export async function throwPublicApiError(response: Response, fallbackMessage: string): Promise<never> {
  const body = await response.text().catch(() => '')
  const detail = body.trim() ? ` ${body.trim().slice(0, 240)}` : ''
  throw new PublicApiError(
    `${fallbackMessage} Status ${response.status}.${detail}`,
    response.status,
    response.url,
    response.headers.get('retry-after'),
  )
}
