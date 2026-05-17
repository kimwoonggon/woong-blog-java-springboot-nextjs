import { describe, expect, it } from 'vitest'
import {
  getBlogPublicRevalidationPaths,
  getPagePublicRevalidationPaths,
  getResumePublicRevalidationPaths,
  getSiteSettingsPublicRevalidationPaths,
  getPublicRevalidationTagsForPaths,
  getWorkPublicRevalidationPaths,
  normalizePublicRevalidationPaths,
} from '@/lib/public-revalidation-paths'

describe('public revalidation path helpers', () => {
  it('returns public blog paths including home, list, next slug, and previous slug', () => {
    expect(getBlogPublicRevalidationPaths('next-post', 'old-post')).toEqual([
      '/',
      '/blog',
      '/blog/next-post',
      '/blog/old-post',
    ])
  })

  it('normalizes detail slugs without unsafe or nullish path segments', () => {
    expect(getBlogPublicRevalidationPaths('  한글 slug  ', null)).toEqual([
      '/',
      '/blog',
      '/blog/%ED%95%9C%EA%B8%80%20slug',
    ])
    expect(getWorkPublicRevalidationPaths('post<script>alert(1)', undefined)).toEqual([
      '/',
      '/works',
      '/works/post%3Cscript%3Ealert(1)',
    ])
    expect(getBlogPublicRevalidationPaths('', undefined).join(' ')).not.toMatch(/undefined|null/)
    expect(getWorkPublicRevalidationPaths('/leading-slash', 'trailing/slash')).toEqual(['/', '/works'])
  })

  it('returns public work paths including home, list, next slug, and previous slug', () => {
    expect(getWorkPublicRevalidationPaths('next-work', 'old-work')).toEqual([
      '/',
      '/works',
      '/works/next-work',
      '/works/old-work',
    ])
  })

  it('maps page and resume mutations to their public routes', () => {
    expect(getPagePublicRevalidationPaths('contact')).toEqual(['/contact'])
    expect(getPagePublicRevalidationPaths('introduction')).toEqual(['/introduction'])
    expect(getPagePublicRevalidationPaths('home')).toEqual(['/'])
    expect(getPagePublicRevalidationPaths('unknown')).toEqual([])
    expect(getResumePublicRevalidationPaths()).toEqual(['/resume'])
    expect(getSiteSettingsPublicRevalidationPaths()).toEqual(['/', '/blog', '/works', '/contact', '/introduction', '/resume'])
  })

  it('filters unsupported or unsafe paths before revalidation', () => {
    expect(normalizePublicRevalidationPaths([
      '/',
      '/blog',
      '/blog/post',
      '/blog/post?draft=1',
      '/admin',
      '//evil',
      '/blog//double',
      '/works/%ED%95%9C%EA%B8%80',
      '/works/work',
    ])).toEqual(['/', '/blog', '/blog/post', '/works/%ED%95%9C%EA%B8%80', '/works/work'])
  })

  it('maps public paths to data cache tags for immediate fetch invalidation', () => {
    expect(getPublicRevalidationTagsForPaths([
      '/',
      '/blog',
      '/blog/post',
      '/works/work',
      '/contact',
      '/introduction',
      '/resume',
    ])).toEqual([
      'public-home',
      'public-site-settings',
      'public-blogs',
      'public-works',
      'public-blog:post',
      'public-work:work',
      'public-page:contact',
      'public-page:introduction',
      'public-resume',
    ])
  })

  it('ignores malformed encoded detail paths while preserving valid unicode tags', () => {
    expect(getPublicRevalidationTagsForPaths([
      '/blog/%ED%95%9C%EA%B8%80',
      '/works/%E0%A4%A',
      '/works/%2Fadmin',
    ])).toEqual([
      'public-blogs',
      'public-blog:한글',
    ])
  })
})
