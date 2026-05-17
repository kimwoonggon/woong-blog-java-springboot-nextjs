import { describe, expect, it, vi } from 'vitest'
import { collectImageUrls, downloadFile } from '../../scripts/notion-export-lib.mjs'

describe('notion export helpers', () => {
  it('collects nested image urls from notion-style blocks', () => {
    const blocks = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'image',
            image: {
              file: { url: 'https://example.com/a.png' },
            },
          },
        ],
      },
      {
        type: 'image',
        image: {
          external: { url: 'https://example.com/b.webp' },
        },
      },
    ]

    expect(collectImageUrls(blocks)).toEqual([
      'https://example.com/a.png',
      'https://example.com/b.webp',
    ])
  })

  it('downloads binary content and writes it to disk dependencies', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }))
    const mkdirFn = vi.fn(async () => undefined)
    const writeFileFn = vi.fn(async () => undefined)

    await downloadFile('https://example.com/file.bin', '/tmp/test/file.bin', {
      fetchFn,
      mkdirFn,
      writeFileFn,
      timeoutMs: 500,
    })

    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.com/file.bin',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    )
    expect(mkdirFn).toHaveBeenCalled()
    expect(writeFileFn).toHaveBeenCalledWith('/tmp/test/file.bin', Buffer.from([1, 2, 3]))
  })

  it('throws when download response is not ok', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 400,
    }))

    await expect(downloadFile('https://example.com/bad.png', '/tmp/test/bad.png', { fetchFn }))
      .rejects
      .toThrow('Download failed: 400 https://example.com/bad.png')
  })
})
