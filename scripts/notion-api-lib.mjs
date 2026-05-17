import { readFile } from 'node:fs/promises'

export async function loadDotEnv(path) {
  try {
    const text = await readFile(path, 'utf8')
    const result = {}
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.trimStart().startsWith('#') || !line.includes('=')) {
        continue
      }

      const index = line.indexOf('=')
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1)
      result[key] = value
    }

    return result
  } catch {
    return {}
  }
}

export function extractTitle(page) {
  const properties = page?.properties || {}
  for (const property of Object.values(properties)) {
    if (property?.type === 'title') {
      return (property.title || []).map((item) => item.plain_text || '').join('').trim() || 'Untitled'
    }
  }

  return 'Untitled'
}

export async function notionRequest(path, init = {}, config = {}) {
  const {
    fetchFn = fetch,
    sleepFn = sleep,
    notionApiBase = 'https://api.notion.com/v1',
    notionToken,
    notionVersion = '2026-03-11',
    timeoutMs = 30000,
    maxRetries = 5,
    retryBaseMs = 1000,
  } = config

  if (!notionToken) {
    throw new Error('Notion token is required')
  }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchFn(`${notionApiBase}${path}`, {
        ...init,
        signal: init.signal || AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${notionToken}`,
          'Notion-Version': notionVersion,
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      })

      const text = await response.text()
      if (response.ok) {
        return text ? JSON.parse(text) : {}
      }

      if (!shouldRetryStatus(response.status) || attempt === maxRetries) {
        throw new Error(`Notion request failed for ${path}: ${text}`)
      }

      await sleepFn(resolveRetryDelayMs(response, attempt, retryBaseMs))
    } catch (error) {
      if (!shouldRetryError(error) || attempt === maxRetries) {
        throw error
      }

      await sleepFn(retryBaseMs * (2 ** attempt))
    }
  }

  throw new Error(`Notion request failed for ${path}`)
}

export async function getAllPages({ notionRequestFn, pageLimit = 0 }) {
  const pages = []
  let cursor = null

  while (true) {
    const body = {
      filter: { property: 'object', value: 'page' },
      page_size: 100,
      sort: { timestamp: 'last_edited_time', direction: 'descending' },
    }
    if (cursor) {
      body.start_cursor = cursor
    }

    const payload = await notionRequestFn('/search', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    pages.push(...payload.results)
    if (!payload.has_more || !payload.next_cursor) {
      break
    }

    cursor = payload.next_cursor
    if (pageLimit > 0 && pages.length >= pageLimit) {
      return pages.slice(0, pageLimit)
    }
  }

  return pageLimit > 0 ? pages.slice(0, pageLimit) : pages
}

export async function getAllBlocks(blockId, { notionRequestFn }) {
  const blocks = []
  let cursor = null

  while (true) {
    const query = new URLSearchParams({ page_size: '100' })
    if (cursor) {
      query.set('start_cursor', cursor)
    }

    const payload = await notionRequestFn(`/blocks/${blockId}/children?${query.toString()}`)
    for (const block of payload.results) {
      if (block.has_children) {
        block.children = await getAllBlocks(block.id, { notionRequestFn })
      }
      blocks.push(block)
    }

    if (!payload.has_more || !payload.next_cursor) {
      break
    }

    cursor = payload.next_cursor
  }

  return blocks
}

function shouldRetryStatus(status) {
  return status === 408 || status === 429 || status >= 500
}

function shouldRetryError(error) {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === 'AbortError' || error.name === 'TimeoutError' || /fetch failed/i.test(error.message)
}

function resolveRetryDelayMs(response, attempt, retryBaseMs) {
  const retryAfter = response.headers.get('retry-after')
  const parsed = Number(retryAfter)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed * 1000
  }

  return retryBaseMs * (2 ** attempt)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
