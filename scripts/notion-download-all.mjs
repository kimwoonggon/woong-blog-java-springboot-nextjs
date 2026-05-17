import process from 'node:process'

// Force download-only mode. The underlying script still reads .env for
// NOTION_TOKEN, export directory, retry settings, and page limits.
process.env.NOTION_EXPORT_IMPORT = 'false'
process.env.NOTION_EXPORT_DIRECT_IMPORT = 'false'

await import('./notion-export-and-import-all.mjs')
