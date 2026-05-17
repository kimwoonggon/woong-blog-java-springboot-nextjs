export const PUBLIC_CONTENT_REVALIDATE_SECONDS = 60

export const PUBLIC_CONTENT_TAGS = {
  home: 'public-home',
  siteSettings: 'public-site-settings',
  resume: 'public-resume',
  blogs: 'public-blogs',
  works: 'public-works',
  page: (slug: string) => `public-page:${slug}`,
  blog: (slug: string) => `public-blog:${slug}`,
  work: (slug: string) => `public-work:${slug}`,
} as const

export function publicContentFetchInit(tags: string[] = []) {
  return {
    next: {
      revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
      tags,
    },
  } satisfies RequestInit
}
