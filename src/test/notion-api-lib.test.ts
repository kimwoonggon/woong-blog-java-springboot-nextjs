import { describe, expect, it, vi } from 'vitest'
import { getAllBlocks, getAllPages, notionRequest } from '../../scripts/notion-api-lib.mjs'

describe('notion api helpers', () => {
  it('retries rate-limited requests before succeeding', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => '{"code":"rate_limited"}',
        headers: {
          get: (name: string) => (name === 'retry-after' ? '0' : null),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '{"results":[{"id":"page-1"}]}',
      })
    const sleepFn = vi.fn(async () => undefined)

    const payload = await notionRequest('/search', { method: 'POST', body: '{}' }, {
      fetchFn,
      sleepFn,
      notionApiBase: 'https://api.notion.com/v1',
      notionToken: 'token',
      notionVersion: '2026-03-11',
      maxRetries: 2,
      retryBaseMs: 10,
    })

    expect(payload.results).toEqual([{ id: 'page-1' }])
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(sleepFn).toHaveBeenCalledWith(0)
  })

  it('collects all pages across cursors and applies page limits', async () => {
    const notionRequestFn = vi
      .fn()
      .mockResolvedValueOnce({
        results: [{ id: 'page-1' }, { id: 'page-2' }],
        has_more: true,
        next_cursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        results: [{ id: 'page-3' }, { id: 'page-4' }],
        has_more: false,
        next_cursor: null,
      })

    const pages = await getAllPages({ notionRequestFn, pageLimit: 3 })

    expect(pages).toEqual([{ id: 'page-1' }, { id: 'page-2' }, { id: 'page-3' }])
    expect(notionRequestFn).toHaveBeenCalledTimes(2)
  })

  it('collects nested blocks recursively', async () => {
    const notionRequestFn = vi
      .fn()
      .mockResolvedValueOnce({
        results: [
          { id: 'block-1', has_children: true },
          { id: 'block-2', has_children: false },
        ],
        has_more: false,
        next_cursor: null,
      })
      .mockResolvedValueOnce({
        results: [{ id: 'child-1', has_children: false }],
        has_more: false,
        next_cursor: null,
      })

    const blocks = await getAllBlocks('page-1', { notionRequestFn })

    expect(blocks).toHaveLength(2)
    expect(blocks[0].children).toEqual([{ id: 'child-1', has_children: false }])
    expect(notionRequestFn).toHaveBeenCalledTimes(2)
  })
})
