import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildImportPayload, extractTitle, findExistingBlogIdByTitle, normalizeTitle, upsertBlogRow } from './notion-db-import-lib.mjs'

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

async function ensureStatusDir(statusDir) {
  if (!existsSync(statusDir)) {
    await mkdir(statusDir, { recursive: true })
    await writeFile(join(statusDir, '.gitkeep'), '')
  }
}

function resolveFolderPath(rootDir, index, page) {
  const title = extractTitle(page)
  const slugBase = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `page-${page.id.slice(0, 8)}`

  return join(rootDir, `${String(index + 1).padStart(4, '0')}-${slugBase}`)
}

function upsertByPageId(rows, nextRow) {
  const index = rows.findIndex((row) => row.pageId === nextRow.pageId)
  if (index === -1) {
    rows.push(nextRow)
    return
  }

  rows[index] = nextRow
}

function removeByPageId(rows, pageId) {
  const index = rows.findIndex((row) => row.pageId === pageId)
  if (index !== -1) {
    rows.splice(index, 1)
  }
}

function countImported(rows) {
  return rows.filter((row) => row?.status !== 'skipped_duplicate_title').length
}

function countSkippedDuplicateTitles(rows) {
  return rows.filter((row) => row?.status === 'skipped_duplicate_title').length
}

export async function importNotionDownloadDir({
  root,
  statusDir = join(process.cwd(), 'db_status'),
  concurrency = Math.max(1, Number(process.env.NOTION_IMPORT_CONCURRENCY || '4')),
  singleThread = String(process.env.NOTION_IMPORT_SINGLE_THREAD || 'false').toLowerCase() === 'true',
  skipExistingTitles = String(process.env.NOTION_IMPORT_SKIP_EXISTING_TITLES || 'false').toLowerCase() === 'true',
  resumeFromResultsFiles = true,
  statusFileName = 'current.json',
} = {}) {
  if (!existsSync(join(root, 'pages.json'))) {
    throw new Error(`pages.json not found under ${root}`)
  }

  const workerCount = singleThread ? 1 : concurrency
  const startedAt = new Date().toISOString()

  await ensureStatusDir(statusDir)

  const pages = await readJson(join(root, 'pages.json'), [])
  const exportManifest = await readJson(join(root, 'manifest.json'), [])
  const legacyResults = resumeFromResultsFiles ? await readJson(join(root, 'db-import-results.json'), []) : []
  const legacyManifest = resumeFromResultsFiles ? await readJson(join(root, 'db-import-manifest.json'), []) : []
  const resultsPath = join(root, 'db-import-direct-results.json')
  const failuresPath = join(root, 'db-import-direct-failures.json')
  const results = resumeFromResultsFiles ? await readJson(resultsPath, []) : []
  const failures = resumeFromResultsFiles ? await readJson(failuresPath, []) : []
  const exportManifestByPageId = new Map(exportManifest.map((item) => [item.pageId, item]))
  const done = new Set([...legacyResults, ...legacyManifest, ...results].map((item) => item.pageId))
  let nextIndex = 0
  let writeQueue = Promise.resolve()

  async function writeStatus(status) {
    const payload = {
      ...status,
      updatedAt: new Date().toISOString(),
    }

    await writeFile(join(statusDir, statusFileName), JSON.stringify(payload, null, 2))
  }

  console.log(`Importing ${pages.length} downloaded pages from ${root} with ${workerCount} worker(s)`)
  await writeStatus({
    mode: 'running',
    root,
    startedAt,
    totalPages: pages.length,
    imported: countImported(results),
    failed: failures.length,
    skipped: done.size,
    skippedDuplicateTitles: countSkippedDuplicateTitles(results),
    currentIndex: 0,
    currentTitle: null,
    concurrency: workerCount,
    skipExistingTitles,
    resumeFromResultsFiles,
  })

  async function enqueuePersist(updateStatus) {
    writeQueue = writeQueue.then(async () => {
      await writeFile(resultsPath, JSON.stringify(results, null, 2))
      await writeFile(failuresPath, JSON.stringify(failures, null, 2))
      await writeStatus({
        mode: 'running',
        root,
        startedAt,
        totalPages: pages.length,
        imported: countImported(results),
        failed: failures.length,
        skipped: done.size,
        skippedDuplicateTitles: countSkippedDuplicateTitles(results),
        concurrency: workerCount,
        skipExistingTitles,
        resumeFromResultsFiles,
        ...updateStatus,
      })
    })
    await writeQueue
  }

  async function processPage(i) {
    const page = pages[i]
    const title = extractTitle(page)
    if (done.has(page.id)) {
      await enqueuePersist({
        currentIndex: i + 1,
        currentTitle: title,
        lastEvent: 'skip',
      })
      console.log(`[${i + 1}/${pages.length}] ${title} (skip: already imported)`)
      return
    }

    await enqueuePersist({
      currentIndex: i + 1,
      currentTitle: title,
      lastEvent: 'processing',
    })
    console.log(`[${i + 1}/${pages.length}] ${title}`)

    try {
      if (skipExistingTitles) {
        const existingBlogId = await findExistingBlogIdByTitle(normalizeTitle(title))
        if (existingBlogId) {
          upsertByPageId(results, {
            pageId: page.id,
            title,
            status: 'skipped_duplicate_title',
            existingBlogId,
          })
          removeByPageId(failures, page.id)
          done.add(page.id)
          await enqueuePersist({
            currentIndex: i + 1,
            currentTitle: title,
            lastEvent: 'skip_duplicate_title',
          })
          console.log(`[${i + 1}/${pages.length}] ${title} (skip: existing title in blog ${existingBlogId})`)
          return
        }
      }

      const folderPath = exportManifestByPageId.get(page.id)?.folder || resolveFolderPath(root, i, page)
      const blocks = await readJson(join(folderPath, 'blocks.json'), [])
      const assetsManifest = await readJson(join(folderPath, 'assets-manifest.json'), [])
      const payload = await buildImportPayload(page, blocks, assetsManifest)
      const imported = await upsertBlogRow({ ...payload, page })

      upsertByPageId(results, {
        pageId: page.id,
        title,
        importedBlogId: imported.blogId,
        slug: payload.slug,
        status: imported.status,
      })
      removeByPageId(failures, page.id)
      done.add(page.id)
      await enqueuePersist({
        currentIndex: i + 1,
        currentTitle: title,
        lastEvent: 'imported',
        lastImportedSlug: payload.slug,
      })
    } catch (error) {
      upsertByPageId(failures, {
        pageId: page.id,
        title,
        error: error instanceof Error ? error.message : String(error),
      })
      await enqueuePersist({
        currentIndex: i + 1,
        currentTitle: title,
        lastEvent: 'failed',
        lastError: error instanceof Error ? error.message : String(error),
      })
      console.error(`[${i + 1}/${pages.length}] FAILED ${title}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function worker() {
    while (nextIndex < pages.length) {
      const current = nextIndex
      nextIndex += 1
      await processPage(current)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  const summary = {
    root,
    totalPages: pages.length,
    imported: countImported(results),
    skippedDuplicateTitles: countSkippedDuplicateTitles(results),
    failures: failures.length,
  }

  await writeStatus({
    mode: 'completed',
    root,
    startedAt,
    totalPages: pages.length,
    imported: summary.imported,
    failed: failures.length,
    skipped: done.size,
    skippedDuplicateTitles: summary.skippedDuplicateTitles,
    currentIndex: pages.length,
    currentTitle: null,
    lastEvent: 'completed',
    concurrency: workerCount,
    skipExistingTitles,
    resumeFromResultsFiles,
  })

  console.log(JSON.stringify(summary, null, 2))
  return summary
}
