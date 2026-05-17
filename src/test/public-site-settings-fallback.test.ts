import { afterEach, describe, expect, it, vi } from 'vitest'

describe('public site settings fallback', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns safe defaults when public site settings cannot be fetched during prerender', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.doMock('@/lib/api/site-settings', () => ({
      fetchPublicSiteSettings: vi.fn(async () => {
        throw new Error('public settings API unavailable')
      }),
    }))

    const { fetchPublicSiteSettingsOrFallback } = await import('@/lib/api/public-site-settings-fallback')

    await expect(fetchPublicSiteSettingsOrFallback()).resolves.toMatchObject({
      ownerName: 'Woonggon Kim',
      tagline: 'Creative Technologist',
      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',
      linkedInUrl: '',
      gitHubUrl: '',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load public site settings.', expect.any(Error))
  })

  it('does not emit expected fallback errors during the production build phase', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubEnv('npm_lifecycle_event', 'build')

    vi.doMock('@/lib/api/site-settings', () => ({
      fetchPublicSiteSettings: vi.fn(async () => {
        throw new Error('public settings API unavailable')
      }),
    }))

    const { fetchPublicSiteSettingsOrFallback } = await import('@/lib/api/public-site-settings-fallback')

    await expect(fetchPublicSiteSettingsOrFallback()).resolves.toMatchObject({
      ownerName: 'Woonggon Kim',
    })
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
