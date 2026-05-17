import { describe, expect, it } from 'vitest'
import {
  buildYouTubeThumbnailUrl,
  extractFirstContentImageUrl,
  normalizeYouTubeVideoId,
  resolveDraftThumbnailSource,
  resolveWorkThumbnailSource,
  shouldReplaceWorkThumbnailSource,
} from '@/lib/content/work-thumbnail-resolution'

describe('work thumbnail resolution', () => {
  it('prefers an explicit thumbnail asset over every fallback', () => {
    expect(
      resolveWorkThumbnailSource({
        thumbnailAssetId: 'thumb-1',
        videos: [
          { id: 'video-1', sourceType: 'youtube', sourceKey: 'dQw4w9WgXcQ', sortOrder: 0 },
        ],
        html: '<p><img src="/media/content.png" /></p>',
      }),
    ).toEqual({ kind: 'manual' })
  })

  it('prefers uploaded videos over youtube and content images', () => {
    const result = resolveWorkThumbnailSource({
      videos: [
        { id: 'video-1', sourceType: 'youtube', sourceKey: 'dQw4w9WgXcQ', sortOrder: 0 },
        { id: 'video-2', sourceType: 'r2', sourceKey: 'videos/work-1/demo.mp4', sortOrder: 1 },
      ],
      html: '<p><img src="/media/content.png" /></p>',
    })

    expect(result.kind).toBe('uploaded-video')
    expect(result.video?.id).toBe('video-2')
  })

  it('falls back to the first content image when there are no videos', () => {
    expect(extractFirstContentImageUrl('<p>Body <img src="/media/content.png" alt="content" /></p>')).toBe('/media/content.png')
    expect(
      resolveWorkThumbnailSource({
        html: '<p>Body <img src="/media/content.png" alt="content" /></p>',
      }),
    ).toEqual({
      kind: 'content-image',
      imageUrl: '/media/content.png',
    })
  })

  it('resolves staged draft priority and youtube thumbnail urls', () => {
    expect(buildYouTubeThumbnailUrl('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(
      resolveDraftThumbnailSource([
        { kind: 'youtube', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' },
        { kind: 'file', file: new File(['video'], 'demo.mp4', { type: 'video/mp4' }) },
      ]),
    ).toMatchObject({ kind: 'uploaded-video' })
  })

  it.each([
    ['direct id', 'dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['short URL', 'https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['watch URL with v first', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s', 'dQw4w9WgXcQ'],
    ['watch URL with v later', 'https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['embed URL', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['shorts URL', 'https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['whitespace', '   ', null],
    ['invalid id length', 'dQw4w9WgX', null],
    ['non-youtube URL', 'https://example.com/watch?v=dQw4w9WgXcQ', null],
  ])('normalizes YouTube ID from %s', (_label, value, expected) => {
    expect(normalizeYouTubeVideoId(value)).toBe(expected)
  })

  it('replaces lower-priority automatic thumbnails but never replaces manual ones', () => {
    expect(shouldReplaceWorkThumbnailSource('youtube', 'uploaded-video')).toBe(true)
    expect(shouldReplaceWorkThumbnailSource('content-image', 'youtube')).toBe(true)
    expect(shouldReplaceWorkThumbnailSource('manual', 'uploaded-video')).toBe(false)
  })
})
