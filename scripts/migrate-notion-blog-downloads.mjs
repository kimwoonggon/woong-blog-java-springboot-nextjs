import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { importNotionDownloadDir } from './notion-downloads-import-lib.mjs'

const defaultRoots = [
  join(process.cwd(), 'downloads', 'notion-connected-2026-03-27T10-24-20-364Z'),
  join(process.cwd(), 'downloads', 'notion-connected-2026-04-13T08-03-24-517Z'),
]

function parseRoots(argv) {
  if (argv.length > 0) {
    return argv.map((value) => resolve(value))
  }

  const envValue = process.env.NOTION_EXPORT_DIRS
  if (envValue) {
    return envValue
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => resolve(value))
  }

  return defaultRoots.map((value) => resolve(value))
}

async function ensureStatusDir(statusDir) {
  if (!existsSync(statusDir)) {
    await mkdir(statusDir, { recursive: true })
  }
}

async function main() {
  const roots = parseRoots(process.argv.slice(2))
  const statusDir = join(process.cwd(), 'db_status')
  const startedAt = new Date().toISOString()

  if (roots.length === 0) {
    throw new Error('No Notion export directories were provided.')
  }

  await ensureStatusDir(statusDir)

  const summaries = []
  for (let index = 0; index < roots.length; index += 1) {
    const root = roots[index]
    const statusFileName = `notion-migration-${String(index + 1).padStart(2, '0')}.json`
    const summary = await importNotionDownloadDir({
      root,
      statusDir,
      statusFileName,
      resumeFromResultsFiles: false,
    })
    summaries.push(summary)
  }

  const combined = {
    startedAt,
    completedAt: new Date().toISOString(),
    roots: summaries,
    totalRoots: summaries.length,
    totalPages: summaries.reduce((sum, item) => sum + item.totalPages, 0),
    imported: summaries.reduce((sum, item) => sum + item.imported, 0),
    skippedDuplicateTitles: summaries.reduce((sum, item) => sum + item.skippedDuplicateTitles, 0),
    failures: summaries.reduce((sum, item) => sum + item.failures, 0),
  }

  await writeFile(join(statusDir, 'notion-blog-migration-summary.json'), JSON.stringify(combined, null, 2))
  console.log(JSON.stringify(combined, null, 2))
}

await main()
