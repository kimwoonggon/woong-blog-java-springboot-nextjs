import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const root = process.env.NOTION_EXPORT_DIR || join(process.cwd(), 'downloads', 'notion-connected-2026-03-27T03-08-20-083Z')
const outputPath = join(process.cwd(), 'db_status', 'year-audit.json')

const pages = JSON.parse(await readFile(join(root, 'pages.json'), 'utf8'))
const snapshotRows = pages.filter((page) => {
  const year = Number((page.created_time || '').slice(0, 4))
  return year === 2025 || year === 2026
}).map((page) => ({
  pageId: page.id,
  title: ((page.properties?.title?.title) || []).map((item) => item.plain_text || '').join('').trim() || 'Untitled',
  createdTime: page.created_time,
}))

const dbRows = await psqlJson(`
  SELECT json_build_object(
    'slug', "Slug",
    'title', "Title",
    'createdAt', "CreatedAt",
    'publishedAt', "PublishedAt",
    'contentJson', CAST("ContentJson" AS text)
  )
  FROM "Blogs"
  WHERE EXTRACT(YEAR FROM "CreatedAt") IN (2025, 2026)
  ORDER BY "CreatedAt" DESC;
`)

const snapshotByYear = countByYear(snapshotRows, (row) => row.createdTime)
const notionDbRows = dbRows
  .map((row) => ({
    ...row,
    pageId: extractMarkerPageId(row.contentJson),
  }))
  .filter((row) => row.pageId)
const notionDbByYear = countByYear(notionDbRows, (row) => row.createdAt)
const snapshotPageIds = new Set(snapshotRows.map((row) => row.pageId))
const notionDbPageIds = new Set(notionDbRows.map((row) => row.pageId))
const missingFromDb = snapshotRows.filter((row) => !notionDbPageIds.has(row.pageId))
const extraDbRows = notionDbRows.filter((row) => !snapshotPageIds.has(row.pageId))

const payload = {
  root,
  snapshotCount: snapshotRows.length,
  dbCount: dbRows.length,
  snapshotByYear,
  notionImportedCount: notionDbRows.length,
  notionImportedByYear: notionDbByYear,
  missingFromDbCount: missingFromDb.length,
  missingFromDbSample: missingFromDb.slice(0, 20),
  extraDbRowsCount: extraDbRows.length,
  extraDbRowsSample: extraDbRows.slice(0, 20).map(({ slug, title, createdAt, publishedAt, pageId }) => ({
    slug,
    title,
    createdAt,
    publishedAt,
    pageId,
  })),
  snapshotSample: snapshotRows.slice(0, 20),
  dbSample: dbRows.slice(0, 20).map(({ slug, title, createdAt, publishedAt, pageId }) => ({
    slug,
    title,
    createdAt,
    publishedAt,
    pageId,
  })),
  updatedAt: new Date().toISOString(),
}

await mkdir(join(process.cwd(), 'db_status'), { recursive: true })
await writeFile(outputPath, JSON.stringify(payload, null, 2))
console.log(JSON.stringify(payload, null, 2))

function psqlJson(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'portfolio', '-d', 'portfolio', '-X', '-qAt', '-F', '\t', '-c', sql], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `psql exited with ${code}`))
        return
      }

      const rows = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
      resolve(rows)
    })
  })
}

function countByYear(rows, getValue) {
  return rows.reduce((acc, row) => {
    const year = String(getValue(row) || '').slice(0, 4) || 'unknown'
    acc[year] = (acc[year] || 0) + 1
    return acc
  }, {})
}

function extractMarkerPageId(contentJson) {
  const match = String(contentJson || '').match(/notion-page-id:([0-9a-f-]+)/i)
  return match?.[1] || null
}
