import { describe, expect, it } from 'vitest'
import {
  buildWorkVideoEmbedMarkup,
  extractWorkVideoEmbedIds,
  getWorkVideoDisplayLabel,
  hasWorkVideoEmbeds,
  removeWorkVideoEmbedReferences,
  splitWorkVideoEmbedContent,
} from '@/lib/content/work-video-embeds'

describe('work video embeds helpers', () => {
  it('extracts and splits inline video embeds from html', () => {
    const html = `<p>Before</p>${buildWorkVideoEmbedMarkup('video-1')}<p>After</p>`

    expect(hasWorkVideoEmbeds(html)).toBe(true)
    expect(extractWorkVideoEmbedIds(html)).toEqual(['video-1'])
    expect(splitWorkVideoEmbedContent(html)).toEqual([
      { type: 'html', html: '<p>Before</p>' },
      { type: 'video', videoId: 'video-1' },
      { type: 'html', html: '<p>After</p>' },
    ])
  })

  it('removes only the matching embedded video reference', () => {
    const html = `<p>Before</p>${buildWorkVideoEmbedMarkup('video-1')}${buildWorkVideoEmbedMarkup('video-2')}`

    expect(removeWorkVideoEmbedReferences(html, 'video-1')).toContain('video-2')
    expect(removeWorkVideoEmbedReferences(html, 'video-1')).not.toContain('video-1')
  })

  it('escapes video IDs in generated embed markup and ignores empty IDs while splitting', () => {
    const markup = `${buildWorkVideoEmbedMarkup('video"1')}<work-video-embed data-video-id=""></work-video-embed>`

    expect(markup).toContain('data-video-id="video&quot;1"')
    expect(extractWorkVideoEmbedIds(markup)).toEqual(['video&quot;1'])
    expect(splitWorkVideoEmbedContent(markup)).toEqual([
      { type: 'video', videoId: 'video&quot;1' },
    ])
  })

  it('falls back to source keys for video display labels without leaking null text', () => {
    expect(getWorkVideoDisplayLabel({
      sourceType: 'youtube',
      sourceKey: 'dQw4w9WgXcQ',
      originalFileName: null,
    })).toBe('YouTube dQw4w9WgXcQ')
    expect(getWorkVideoDisplayLabel({
      sourceType: 'hls',
      sourceKey: 'local:videos/work-1/hls/master.m3u8',
      originalFileName: '',
    })).toBe('local:videos/work-1/hls/master.m3u8')
  })
})
