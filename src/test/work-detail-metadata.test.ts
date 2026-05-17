import { describe, expect, it } from 'vitest'
import type { WorkDetail } from '@/lib/api/works'
import { buildWorkDetailMetadata } from '@/app/(public)/works/[slug]/work-detail-metadata'

function workDetail(overrides: Partial<WorkDetail>): WorkDetail {
  return {
    id: 'work-1',
    slug: 'work-1',
    title: 'Work 1',
    excerpt: 'Excerpt fallback',
    socialShareMessage: null,
    category: 'platform',
    period: null,
    tags: [],
    thumbnailUrl: '/media/thumb.jpg',
    publishedAt: '2026-04-01T00:00:00.000Z',
    contentJson: JSON.stringify({ html: '<p>body</p>' }),
    videosVersion: 0,
    videos: [],
    ...overrides,
  }
}

describe('work detail metadata description priority', () => {
  it('prefers socialShareMessage over excerpt when building metadata', () => {
    const metadata = buildWorkDetailMetadata(workDetail({
      socialShareMessage: 'Use this share message',
    }))

    expect(metadata.description).toBe('Use this share message')
    expect(metadata.openGraph?.description).toBe('Use this share message')
    expect(metadata.twitter?.description).toBe('Use this share message')
  })

  it('falls back to excerpt when socialShareMessage is missing', () => {
    const metadata = buildWorkDetailMetadata(workDetail({
      id: 'work-2',
      slug: 'work-2',
      title: 'Work 2',
      excerpt: 'Excerpt fallback only',
      socialShareMessage: null,
    }))

    expect(metadata.description).toBe('Excerpt fallback only')
    expect(metadata.openGraph?.description).toBe('Excerpt fallback only')
    expect(metadata.twitter?.description).toBe('Excerpt fallback only')
  })

  it('encodes canonical slugs and filters unsafe thumbnail images', () => {
    const metadata = buildWorkDetailMetadata(workDetail({
      slug: 'work<script>alert(1)',
      thumbnailUrl: 'javascript:alert(1)',
    }))

    expect(metadata.alternates?.canonical).toBe('/works/work%3Cscript%3Ealert(1)')
    expect(metadata.openGraph?.url).toBe('/works/work%3Cscript%3Ealert(1)')
    expect(metadata.openGraph?.images).toBeUndefined()
    expect(JSON.stringify(metadata)).not.toMatch(/<script|javascript:/i)
  })

  it('normalizes YouTube URL variants before deriving social thumbnails', () => {
    const metadata = buildWorkDetailMetadata(workDetail({
      thumbnailUrl: '',
      videos: [{
        id: 'video-1',
        sourceType: 'youtube',
        sourceKey: 'https://www.youtube.com/watch?t=1&v=dQw4w9WgXcQ',
        playbackUrl: null,
        originalFileName: null,
        mimeType: null,
        fileSize: null,
        width: null,
        height: null,
        durationSeconds: null,
        timelinePreviewVttUrl: null,
        timelinePreviewSpriteUrl: null,
        sortOrder: 0,
      }],
    }))

    expect(metadata.openGraph?.images).toEqual([
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    ])
    expect(metadata.twitter).toMatchObject({
      images: ['https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'],
    })
  })
})
