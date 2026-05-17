import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { collectImageUrls, downloadFile } from './notion-export-lib.mjs'
import { extractTitle, getAllBlocks, getAllPages, loadDotEnv, notionRequest } from './notion-api-lib.mjs'

const envFile = await loadDotEnv(join(process.cwd(), '.env'))

const notionToken = process.env.NOTION_TOKEN || process.env.NOTIONAPI || envFile.NOTION_TOKEN || envFile.NOTIONAPI
const notionApiBase = process.env.NOTION_API_BASE_URL || envFile.NOTION_API_BASE_URL || 'https://api.notion.com/v1'
const notionVersion = process.env.NOTION_API_VERSION || envFile.NOTION_API_VERSION || '2026-03-11'
const exportRoot = resolve(process.env.NOTION_EXPORT_DIR || envFile.NOTION_EXPORT_DIR || join(process.cwd(), 'downloads', `notion-connected-${new Date().toISOString().replace(/[:.]/g, '-')}`))
const pageLimit = Number(process.env.NOTION_EXPORT_LIMIT || envFile.NOTION_EXPORT_LIMIT || '0')
const shouldImport = String(
  process.env.NOTION_EXPORT_DIRECT_IMPORT
  || process.env.NOTION_EXPORT_IMPORT
  || envFile.NOTION_EXPORT_DIRECT_IMPORT
  || envFile.NOTION_EXPORT_IMPORT
  || 'false',
).toLowerCase() === 'true'
const retryBaseMs = Number(process.env.NOTION_API_RETRY_BASE_MS || envFile.NOTION_API_RETRY_BASE_MS || '1000')
const maxRetries = Number(process.env.NOTION_API_MAX_RETRIES || envFile.NOTION_API_MAX_RETRIES || '5')

if (!notionToken) {
  throw new Error('NOTION_TOKEN or NOTIONAPI is required')
}

function slugify(value, fallback) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || fallback
}

async function main() {
  await mkdir(exportRoot, { recursive: true })
  const notionRequestFn = (path, init = {}) => notionRequest(path, init, {
    notionApiBase,
    notionToken,
    notionVersion,
    maxRetries,
    retryBaseMs,
  })
  const pages = dedupeByPageId(await getAllPages({ notionRequestFn, pageLimit }))
  const manifestPath = join(exportRoot, 'manifest.json')
  const failuresPath = join(exportRoot, 'failures.json')
  const manifest = dedupeRowsByPageId(await readJsonFile(manifestPath, []))
  const failures = dedupeRowsByPageId(await readJsonFile(failuresPath, []))
  const completedPageIds = new Set(manifest.map((item) => item.pageId))

  await writeFile(join(exportRoot, 'pages.json'), JSON.stringify(pages, null, 2))
  console.log(`Discovered ${pages.length} connected pages. Export root: ${exportRoot}`)

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]
    const title = extractTitle(page)
    const slug = slugify(title, `page-${page.id.slice(0, 8)}`)
    const pageDir = join(exportRoot, `${String(index + 1).padStart(4, '0')}-${slug}`)
    if (completedPageIds.has(page.id)) {
      console.log(`[${index + 1}/${pages.length}] ${title} (skip: already exported)`)
      continue
    }

    console.log(`[${index + 1}/${pages.length}] ${title}`)
    try {
      await mkdir(pageDir, { recursive: true })
      await writeFile(join(pageDir, 'page.json'), JSON.stringify(page, null, 2))

      console.log(`  - blocks`)
      const blocks = await getAllBlocks(page.id, { notionRequestFn })
      await writeFile(join(pageDir, 'blocks.json'), JSON.stringify(blocks, null, 2))
      const imageUrls = collectImageUrls(blocks, [])
      const downloadedAssets = []

      console.log(`  - assets (${imageUrls.length})`)
      for (let assetIndex = 0; assetIndex < imageUrls.length; assetIndex += 1) {
        const url = imageUrls[assetIndex]
        const extension = (() => {
          try {
            const pathname = new URL(url).pathname
            const match = pathname.match(/\.[a-zA-Z0-9]{2,5}$/)
            return match ? match[0] : '.bin'
          } catch {
            return '.bin'
          }
        })()

        const assetPath = join(pageDir, 'assets', `${String(assetIndex + 1).padStart(3, '0')}${extension}`)
        try {
          await downloadFile(url, assetPath)
          downloadedAssets.push({ url, path: assetPath, status: 'downloaded' })
        } catch (error) {
          downloadedAssets.push({ url, path: assetPath, status: 'failed', error: error instanceof Error ? error.message : String(error) })
        }
      }

      await writeFile(join(pageDir, 'assets-manifest.json'), JSON.stringify(downloadedAssets, null, 2))

      upsertByPageId(manifest, {
        pageId: page.id,
        title,
        slug,
        notionUrl: page.url,
        imageCount: imageUrls.length,
        assetDownloadFailures: downloadedAssets.filter((item) => item.status !== 'downloaded').length,
        folder: pageDir,
      })
      removeByPageId(failures, page.id)
      completedPageIds.add(page.id)
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
      await writeFile(failuresPath, JSON.stringify(failures, null, 2))
    } catch (error) {
      upsertByPageId(failures, {
        pageId: page.id,
        title,
        slug,
        notionUrl: page.url,
        error: error instanceof Error ? error.message : String(error),
      })
      await writeFile(failuresPath, JSON.stringify(failures, null, 2))
      console.error(`[${index + 1}/${pages.length}] FAILED ${title}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const exportSummary = {
    exportRoot,
    exportedPages: manifest.length,
    downloadFailures: manifest.reduce((sum, item) => sum + item.assetDownloadFailures, 0),
  }
  console.log(JSON.stringify(exportSummary, null, 2))

  if (shouldImport) {
    await runDirectImport(exportRoot)
  }
}

async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

async function runDirectImport(root) {
  console.log(`Running backend-free direct import from ${root}`)

  const scriptPath = join(process.cwd(), 'scripts', 'import-notion-downloads-to-db.mjs')
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        NOTION_EXPORT_DIR: root,
      },
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Direct import failed with exit code ${code ?? 1}`))
        return
      }

      resolve()
    })
  })
}

function dedupeByPageId(pages) {
  const seen = new Set()
  const deduped = []

  for (const page of pages) {
    if (!page?.id || seen.has(page.id)) {
      continue
    }

    seen.add(page.id)
    deduped.push(page)
  }

  return deduped
}

function dedupeRowsByPageId(rows) {
  const deduped = []
  for (const row of rows) {
    if (!row?.pageId) {
      deduped.push(row)
      continue
    }

    upsertByPageId(deduped, row)
  }

  return deduped
}

function upsertByPageId(rows, nextRow) {
  const index = rows.findIndex((row) => row?.pageId && row.pageId === nextRow.pageId)
  if (index === -1) {
    rows.push(nextRow)
    return
  }

  rows[index] = nextRow
}

function removeByPageId(rows, pageId) {
  const index = rows.findIndex((row) => row?.pageId && row.pageId === pageId)
  if (index !== -1) {
    rows.splice(index, 1)
  }
}

await main()
