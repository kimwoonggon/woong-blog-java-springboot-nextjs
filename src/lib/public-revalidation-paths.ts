import { PUBLIC_CONTENT_TAGS } from '@/lib/api/public-cache'

const ROOT_PATH = '/'

function cleanDetailPath(base: '/blog' | '/works', slug?: string | null) {
  const cleanedSlug = slug?.trim()
  if (!cleanedSlug || cleanedSlug.includes('/') || cleanedSlug.includes('?') || cleanedSlug.includes('#')) {
    return null
  }

  return `${base}/${encodeURIComponent(cleanedSlug)}`
}

function uniquePaths(paths: Array<string | null>) {
  return [...new Set(paths.filter((path): path is string => Boolean(path)))]
}

function safeDecodeDetailSegment(value: string) {
  try {
    const decoded = decodeURIComponent(value)
    return decoded && !decoded.includes('/') && !decoded.includes('?') && !decoded.includes('#')
      ? decoded
      : null
  } catch {
    return null
  }
}

export function getBlogPublicRevalidationPaths(nextSlug?: string | null, previousSlug?: string | null) {
  return uniquePaths([
    ROOT_PATH,
    '/blog',
    cleanDetailPath('/blog', nextSlug),
    cleanDetailPath('/blog', previousSlug),
  ])
}

export function getWorkPublicRevalidationPaths(nextSlug?: string | null, previousSlug?: string | null) {
  return uniquePaths([
    ROOT_PATH,
    '/works',
    cleanDetailPath('/works', nextSlug),
    cleanDetailPath('/works', previousSlug),
  ])
}

export function getPagePublicRevalidationPaths(slug: string) {
  switch (slug) {
    case 'contact':
      return ['/contact']
    case 'introduction':
      return ['/introduction']
    case 'home':
      return [ROOT_PATH]
    default:
      return []
  }
}

export function getResumePublicRevalidationPaths() {
  return ['/resume']
}

export function getSiteSettingsPublicRevalidationPaths() {
  return ['/', '/blog', '/works', '/contact', '/introduction', '/resume']
}

export function normalizePublicRevalidationPaths(paths: string[]) {
  return uniquePaths(paths.map((path) => {
    if (path === ROOT_PATH || path === '/blog' || path === '/works' || path === '/contact' || path === '/introduction' || path === '/resume') {
      return path
    }

    const blogMatch = /^\/blog\/([^/?#]+)$/.exec(path)
    if (blogMatch) {
      return safeDecodeDetailSegment(blogMatch[1]) ? path : null
    }

    const workMatch = /^\/works\/([^/?#]+)$/.exec(path)
    if (workMatch) {
      return safeDecodeDetailSegment(workMatch[1]) ? path : null
    }

    return null
  }))
}

export function getPublicRevalidationTagsForPaths(paths: string[]) {
  const tags = new Set<string>()

  for (const path of normalizePublicRevalidationPaths(paths)) {
    if (path === '/') {
      tags.add(PUBLIC_CONTENT_TAGS.home)
      tags.add(PUBLIC_CONTENT_TAGS.siteSettings)
      tags.add(PUBLIC_CONTENT_TAGS.blogs)
      tags.add(PUBLIC_CONTENT_TAGS.works)
      continue
    }

    if (path === '/blog') {
      tags.add(PUBLIC_CONTENT_TAGS.blogs)
      tags.add(PUBLIC_CONTENT_TAGS.home)
      continue
    }

    if (path.startsWith('/blog/')) {
      tags.add(PUBLIC_CONTENT_TAGS.blogs)
      const slug = safeDecodeDetailSegment(path.slice('/blog/'.length))
      if (slug) {
        tags.add(PUBLIC_CONTENT_TAGS.blog(slug))
      }
      continue
    }

    if (path === '/works') {
      tags.add(PUBLIC_CONTENT_TAGS.works)
      tags.add(PUBLIC_CONTENT_TAGS.home)
      continue
    }

    if (path.startsWith('/works/')) {
      tags.add(PUBLIC_CONTENT_TAGS.works)
      const slug = safeDecodeDetailSegment(path.slice('/works/'.length))
      if (slug) {
        tags.add(PUBLIC_CONTENT_TAGS.work(slug))
      }
      continue
    }

    if (path === '/contact') {
      tags.add(PUBLIC_CONTENT_TAGS.page('contact'))
      tags.add(PUBLIC_CONTENT_TAGS.siteSettings)
      continue
    }

    if (path === '/introduction') {
      tags.add(PUBLIC_CONTENT_TAGS.page('introduction'))
      tags.add(PUBLIC_CONTENT_TAGS.siteSettings)
      continue
    }

    if (path === '/resume') {
      tags.add(PUBLIC_CONTENT_TAGS.resume)
      tags.add(PUBLIC_CONTENT_TAGS.siteSettings)
    }
  }

  return [...tags]
}
