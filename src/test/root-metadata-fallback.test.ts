import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Archivo: () => ({ variable: '--font-archivo' }),
  Space_Grotesk: () => ({ variable: '--font-space-grotesk' }),
}))

vi.mock('@/components/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: unknown }) => children,
}))

vi.mock('sonner', () => ({
  Toaster: () => null,
}))

describe('root metadata fallback', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('generates metadata from fallback public settings when the API is unavailable at build time', async () => {
    vi.doMock('@/lib/api/public-site-settings-fallback', () => ({
      fetchPublicSiteSettingsOrFallback: vi.fn(async () => ({
        ownerName: 'Woonggon Kim',
        tagline: 'Creative Technologist',
        facebookUrl: '',
        instagramUrl: '',
        twitterUrl: '',
        linkedInUrl: '',
        gitHubUrl: '',
      })),
    }))

    const { generateMetadata } = await import('@/app/layout')

    await expect(generateMetadata()).resolves.toMatchObject({
      title: {
        default: 'Woonggon Kim | Creative Technologist',
        template: '%s | Woonggon Kim',
      },
      description: 'Personal portfolio of Woonggon Kim, showcasing works and thoughts.',
    })
  })
})
