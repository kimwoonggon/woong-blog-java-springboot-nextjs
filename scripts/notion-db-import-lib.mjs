import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'

function parseDelimitedEnv(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildDockerComposeArgs(commandArgs = []) {
  const args = ['compose']
  const envFile = process.env.DOCKER_COMPOSE_ENV_FILE?.trim()
  const composeFiles = parseDelimitedEnv(process.env.DOCKER_COMPOSE_FILES || process.env.DOCKER_COMPOSE_FILE)
  const projectName = process.env.DOCKER_COMPOSE_PROJECT_NAME?.trim()

  if (envFile) {
    args.push('--env-file', envFile)
  }

  for (const composeFile of composeFiles) {
    args.push('-f', composeFile)
  }

  if (projectName) {
    args.push('-p', projectName)
  }

  args.push(...commandArgs)
  return args
}

function dockerCommand() {
  return process.env.DOCKER_BIN || 'docker'
}

export function slugify(value, fallback = 'post') {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || `${fallback}-${Date.now()}`
}

export function normalizeTitle(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function generateExcerpt(html) {
  if (!html || !html.trim()) {
    return ''
  }

  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length <= 160 ? text : `${text.slice(0, 160).trim()}...`
}

export function buildBlogContentSqlExpressions(html) {
  const publicContentHtmlExpr = sqlText(html)
  return {
    contentJsonExpr: `jsonb_build_object('html', ${publicContentHtmlExpr})`,
    publicContentHtmlExpr,
    publicContentMarkdownExpr: sqlText(''),
  }
}

export function extractTitle(page) {
  if (!page || typeof page !== 'object') {
    return 'Untitled'
  }
  const properties = page.properties || {}
  for (const property of Object.values(properties)) {
    if (property?.type === 'title') {
      return (property.title || []).map((item) => item.plain_text || '').join('').trim() || 'Untitled'
    }
  }
  return 'Untitled'
}

export function extractTags(page) {
  if (!page || typeof page !== 'object') {
    return []
  }
  const properties = page.properties || {}
  const tags = []

  for (const [name, property] of Object.entries(properties)) {
    if (property?.type !== 'multi_select') {
      continue
    }
    if (!name.toLowerCase().includes('tag') && !name.includes('태그')) {
      continue
    }
    for (const option of property.multi_select || []) {
      if (option?.name) {
        tags.push(option.name)
      }
    }
  }

  return [...new Set(tags)]
}

export function blocksToHtml(blocks) {
  let html = ''

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const type = block.type || ''
    const value = block[type] || {}

    if (type === 'bulleted_list_item' || type === 'numbered_list_item') {
      const listTag = type === 'bulleted_list_item' ? 'ul' : 'ol'
      html += `<${listTag}>`
      while (i < blocks.length && blocks[i].type === type) {
        const item = blocks[i]
        const itemValue = item[type] || {}
        html += `<li>${renderRichText(itemValue.rich_text || [])}${item.children ? blocksToHtml(item.children) : ''}</li>`
        i += 1
      }
      html += `</${listTag}>`
      i -= 1
      continue
    }

    html += renderBlock(type, value, block.children || [])
  }

  return html
}

function renderBlock(type, value, children) {
  switch (type) {
    case 'paragraph':
      return `<p>${renderRichText(value.rich_text || [])}</p>`
    case 'heading_1':
      return `<h1>${renderRichText(value.rich_text || [])}</h1>`
    case 'heading_2':
      return `<h2>${renderRichText(value.rich_text || [])}</h2>`
    case 'heading_3':
      return `<h3>${renderRichText(value.rich_text || [])}</h3>`
    case 'quote':
      return `<blockquote>${renderRichText(value.rich_text || [])}</blockquote>`
    case 'code': {
      const language = value.language || 'plaintext'
      return `<pre><code class="language-${language}">${renderPlainRichText(value.rich_text || [])}</code></pre>`
    }
    case 'divider':
      return '<hr />'
    case 'callout':
      return `<blockquote>${renderRichText(value.rich_text || [])}</blockquote>`
    case 'to_do':
      return `<p>${value.checked ? '[x]' : '[ ]'} ${renderRichText(value.rich_text || [])}</p>`
    case 'toggle':
      return `<details><summary>${renderRichText(value.rich_text || [])}</summary>${blocksToHtml(children)}</details>`
    case 'image': {
      const url = value.file?.url || value.external?.url || ''
      return url ? `<img src="${url}" alt="" />` : ''
    }
    default:
      return children.length > 0 ? blocksToHtml(children) : ''
  }
}

function renderRichText(items) {
  let html = ''
  for (const item of items) {
    let text = escapeHtml(item.plain_text || '')
    const annotations = item.annotations || {}
    if (annotations.code) text = `<code>${text}</code>`
    if (annotations.bold) text = `<strong>${text}</strong>`
    if (annotations.italic) text = `<em>${text}</em>`
    if (annotations.strikethrough) text = `<s>${text}</s>`
    if (item.href) text = `<a href="${escapeHtml(item.href)}">${text}</a>`
    html += text
  }
  return html
}

function renderPlainRichText(items) {
  return items.map((item) => escapeHtml(item.plain_text || '')).join('')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function rewriteHtmlWithAssetManifest(html, assetsManifest, slug) {
  let nextHtml = html
  const copiedAssets = []

  for (let index = 0; index < assetsManifest.length; index += 1) {
    const asset = assetsManifest[index]
    if (asset.status !== 'downloaded') {
      continue
    }

    const extension = extname(asset.path) || '.bin'
    const fileName = `${slug}-${String(index + 1).padStart(3, '0')}${extension}`
    const relativePath = `blogs/notion/${fileName}`
    const publicUrl = `/media/${relativePath}`
    nextHtml = nextHtml.split(asset.url).join(publicUrl)
    copiedAssets.push({
      ...asset,
      relativePath,
      publicUrl,
      fileName,
    })
  }

  return { html: nextHtml, copiedAssets }
}

export async function copyAssetIntoBackendMedia(localPath, relativePath) {
  const resizedAsset = await resizeImageForBackendMedia(localPath, relativePath)
  const sourcePath = resizedAsset?.path || localPath

  await withRetry(() => runCommand(dockerCommand(), buildDockerComposeArgs(['exec', '-T', 'backend', 'mkdir', '-p', `/app/media/${dirnameOf(relativePath)}`])))
  await withRetry(() => runCommand(dockerCommand(), buildDockerComposeArgs(['cp', sourcePath, `backend:/app/media/${relativePath}`])))

  if (resizedAsset?.tempDir) {
    await rm(resizedAsset.tempDir, { recursive: true, force: true })
  }
}

async function resizeImageForBackendMedia(localPath, relativePath) {
  const extension = extname(relativePath).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return null
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'notion-image-resize-'))
  const outputPath = join(tempDir, basename(relativePath))

  try {
    await runCommand('ffmpeg', [
      '-y',
      '-i',
      localPath,
      '-vf',
      'scale=if(gt(iw\\,1600)\\,1600\\,iw):-2',
      '-q:v',
      '5',
      outputPath,
    ])
    return { path: outputPath, tempDir }
  } catch {
    await rm(tempDir, { recursive: true, force: true })
    return null
  }
}

export async function psqlQuery(sql) {
  return withRetry(() =>
    runCommand(
      dockerCommand(),
      buildDockerComposeArgs([
        'exec',
        '-T',
        'db',
        'psql',
        '-U',
        process.env.POSTGRES_USER || 'portfolio',
        '-d',
        process.env.POSTGRES_DB || 'portfolio',
        '-X',
        '-qAt',
        '-F',
        '\t',
      ]),
      sql,
    ),
  )
}

export async function findExistingBlogId(marker, slug) {
  const sql = `
    SELECT "Id"
    FROM "Blogs"
    WHERE position(${sqlText(marker)} in CAST("ContentJson" AS text)) > 0
       OR "Slug" = ${sqlText(slug)}
    LIMIT 1;
  `
  const output = await psqlQuery(sql)
  return output.trim() || null
}

export async function findExistingBlogIdByTitle(title) {
  const normalizedTitle = normalizeTitle(title)
  if (!normalizedTitle) {
    return null
  }

  const sql = `
    SELECT "Id"
    FROM "Blogs"
    WHERE lower(btrim("Title")) = lower(${sqlText(normalizedTitle)})
    LIMIT 1;
  `
  const output = await psqlQuery(sql)
  return output.trim() || null
}

export async function findAssetIdByPath(path) {
  const output = await psqlQuery(`SELECT "Id" FROM "Assets" WHERE "Path" = ${sqlText(path)} LIMIT 1;`)
  return output.trim() || null
}

export async function upsertAsset(asset) {
  const existingId = await findAssetIdByPath(asset.relativePath)
  if (existingId) {
    return existingId
  }

  const assetId = randomUUID()
  const sql = `
    INSERT INTO "Assets" ("Id","Bucket","Path","PublicUrl","MimeType","Size","Kind","CreatedBy","CreatedAt")
    VALUES (
      '${assetId}',
      ${sqlText('blogs/notion')},
      ${sqlText(asset.relativePath)},
      ${sqlText(asset.publicUrl)},
      ${sqlText(asset.mimeType || mimeTypeFromExt(asset.fileName))},
      ${asset.size ?? 'NULL'},
      ${sqlText(kindFromExt(asset.fileName))},
      NULL,
      ${sqlText(asset.createdAt)}
    );
  `
  await psqlQuery(sql)
  return assetId
}

export async function upsertBlogRow({ page, html, slug, tags, coverAssetId, coverPublicUrl = '', marker }) {
  const blogId = await findExistingBlogId(marker, slug)
  const title = extractTitle(page)
  const createdAt = page.created_time
  const excerpt = generateExcerpt(html)
  const tagArrayExpr = sqlTextArray(tags.length ? tags : ['notion-import'])
  const { contentJsonExpr, publicContentHtmlExpr, publicContentMarkdownExpr } = buildBlogContentSqlExpressions(html)
  const finalSlug = await generateUniqueBlogSlug(slug, blogId)

  if (blogId) {
    const sql = `
      UPDATE "Blogs"
      SET
        "Title" = ${sqlText(title)},
        "Slug" = ${sqlText(finalSlug)},
        "Excerpt" = ${sqlText(excerpt)},
        "ContentJson" = ${contentJsonExpr},
        "PublicContentHtml" = ${publicContentHtmlExpr},
        "PublicContentMarkdown" = ${publicContentMarkdownExpr},
        "CoverAssetId" = ${coverAssetId ? `'${coverAssetId}'` : 'NULL'},
        "PublicCoverUrl" = ${sqlText(coverPublicUrl)},
        "Tags" = ${tagArrayExpr},
        "Published" = TRUE,
        "PublishedAt" = ${sqlText(createdAt)}::timestamptz,
        "CreatedAt" = ${sqlText(createdAt)}::timestamptz,
        "UpdatedAt" = now()
      WHERE "Id" = '${blogId}';
    `
    await psqlQuery(sql)
    return { blogId, status: 'updated' }
  }

  const newId = randomUUID()
  const sql = `
    INSERT INTO "Blogs" ("Id","Slug","Title","Excerpt","ContentJson","PublicContentHtml","PublicContentMarkdown","CoverAssetId","PublicCoverUrl","Tags","Published","PublishedAt","CreatedAt","UpdatedAt")
    VALUES (
      '${newId}',
      ${sqlText(finalSlug)},
      ${sqlText(title)},
      ${sqlText(excerpt)},
      ${contentJsonExpr},
      ${publicContentHtmlExpr},
      ${publicContentMarkdownExpr},
      ${coverAssetId ? `'${coverAssetId}'` : 'NULL'},
      ${sqlText(coverPublicUrl)},
      ${tagArrayExpr},
      TRUE,
      ${sqlText(createdAt)}::timestamptz,
      ${sqlText(createdAt)}::timestamptz,
      now()
    );
  `
  await psqlQuery(sql)
  return { blogId: newId, status: 'created' }
}

export async function buildImportPayload(page, blocks, assetsManifest) {
  const title = extractTitle(page)
  const slug = slugify(title, `page-${page.id.slice(0, 8)}`)
  const marker = `<!-- notion-page-id:${page.id} -->`
  const htmlFromBlocks = blocksToHtml(blocks)
  const rewritten = rewriteHtmlWithAssetManifest(`${marker}\n${htmlFromBlocks}`, assetsManifest, slug)
  const copiedAssets = []

  for (const asset of rewritten.copiedAssets) {
    const size = (await readFile(asset.path)).byteLength
    await copyAssetIntoBackendMedia(asset.path, asset.relativePath)
    copiedAssets.push({ ...asset, size, createdAt: page.created_time })
  }

  let coverAssetId = null
  let coverPublicUrl = ''
  if (copiedAssets.length > 0) {
    coverAssetId = await upsertAsset(copiedAssets[0])
    coverPublicUrl = copiedAssets[0].publicUrl
    for (const extra of copiedAssets.slice(1)) {
      await upsertAsset(extra)
    }
  }

  return {
    title,
    slug,
    marker,
    html: rewritten.html,
    tags: extractTags(page),
    coverAssetId,
    coverPublicUrl,
  }
}

export async function generateUniqueBlogSlug(baseSlug, currentBlogId = null) {
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const sql = `
      SELECT "Id"
      FROM "Blogs"
      WHERE "Slug" = ${sqlText(slug)}
      LIMIT 1;
    `
    const existingId = (await psqlQuery(sql)).trim()
    if (!existingId || (currentBlogId && existingId === currentBlogId)) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

function sqlText(value) {
  const safe = String(value ?? '').replaceAll("'", "''")
  return `'${safe}'`
}

function sqlTextArray(values) {
  return `ARRAY[${values.map((value) => sqlText(value)).join(', ')}]::text[]`
}

function dirnameOf(path) {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/')
}

function mimeTypeFromExt(fileName) {
  const ext = extname(fileName).toLowerCase()
  return ({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  })[ext] || 'application/octet-stream'
}

function kindFromExt(fileName) {
  const mimeType = mimeTypeFromExt(fileName)
  return mimeType.startsWith('image/') ? 'image' : 'other'
}

function runCommand(command, args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    if (input) {
      child.stdin.write(input)
    }
    child.stdin.end()
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr || stdout || `${command} exited with code ${code}`))
    })
  })
}

async function withRetry(fn, attempts = 5, delayMs = 1000) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === attempts) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw lastError
}
