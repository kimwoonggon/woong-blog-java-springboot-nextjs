import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function collectImageUrls(blocks, collected = []) {
  for (const block of blocks) {
    const type = block.type
    if (type === 'image') {
      const image = block.image || {}
      const url = image.file?.url || image.external?.url
      if (url) {
        collected.push(url)
      }
    }
    if (Array.isArray(block.children) && block.children.length > 0) {
      collectImageUrls(block.children, collected)
    }
  }
  return collected
}

export async function downloadFile(url, targetPath, deps = {}) {
  const fetchFn = deps.fetchFn || fetch
  const mkdirFn = deps.mkdirFn || mkdir
  const writeFileFn = deps.writeFileFn || writeFile
  const timeoutMs = deps.timeoutMs || 15000

  const response = await fetchFn(url, {
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`)
  }

  await mkdirFn(join(targetPath, '..'), { recursive: true })
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFileFn(targetPath, buffer)
}
