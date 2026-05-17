import { join, resolve } from 'node:path'
import { importNotionDownloadDir } from './notion-downloads-import-lib.mjs'

const root = resolve(process.env.NOTION_EXPORT_DIR || join(process.cwd(), 'downloads', 'notion-connected-2026-03-27T03-08-20-083Z'))
await importNotionDownloadDir({ root })
