import { fetchPublicSiteSettings, type PublicSiteSettings } from '@/lib/api/site-settings'

export const FALLBACK_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  ownerName: 'Woonggon Kim',
  tagline: 'Creative Technologist',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  linkedInUrl: '',
  gitHubUrl: '',
}

function shouldLogPublicSettingsFallback() {
  return process.env.NEXT_PHASE !== 'phase-production-build'
    && process.env.npm_lifecycle_event !== 'build'
}

export async function fetchPublicSiteSettingsOrFallback() {
  try {
    return await fetchPublicSiteSettings()
  } catch (error) {
    if (shouldLogPublicSettingsFallback()) {
      console.error('Failed to load public site settings.', error)
    }
    return FALLBACK_PUBLIC_SITE_SETTINGS
  }
}
