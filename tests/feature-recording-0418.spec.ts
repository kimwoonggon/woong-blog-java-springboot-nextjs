import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type APIRequestContext, type Page } from './helpers/performance-test'

import { expectMermaidRendered } from './helpers/mermaid'

test.use({
  storageState: 'test-results/playwright/admin-storage-state.json',
  video: 'on',
})

test.setTimeout(120_000)

const videoTargets: Record<string, string> = {
  'recording search url stability': 'search-url-stability.webm',
  'recording search blog normalized': 'search-blog-normalized.webm',
  'recording search work normalized': 'search-work-normalized.webm',
  'recording search dashboard normalized': 'search-dashboard-normalized.webm',
  'recording admin pagination stability': 'admin-pagination-stability.webm',
  'recording admin return location stability': 'admin-return-location-stability.webm',
  'recording mermaid rendering': 'mermaid-rendering.webm',
  'recording mermaid editor preview': 'mermaid-editor-preview.webm',
  'recording mermaid work rendering': 'mermaid-work-rendering.webm',
  'recording image resize drag': 'image-resize-drag.webm',
  'recording image work resize': 'image-work-resize.webm',
  'recording image drag move': 'image-drag-move.webm',
}

async function waitForNonEmptyFile(filePath: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const stats = await stat(filePath).catch(() => null)
    if (stats && stats.size > 0) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video()
  if (!video) {
    return
  }

  await page.close()
  const sourcePath = await video.path()
  await waitForNonEmptyFile(sourcePath)
  const fileName = videoTargets[testInfo.title]
  if (!fileName) {
    return
  }

  const targetDir = path.resolve('tests/playwright/0418test')
  await mkdir(targetDir, { recursive: true })
  await copyFile(sourcePath, path.join(targetDir, fileName))
})

async function getCsrf(request: APIRequestContext) {
  const csrfResponse = await request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  return await csrfResponse.json() as { requestToken: string; headerName: string }
}

async function createBlog(request: APIRequestContext, title: string, html: string, tags: string[] = ['recording']) {
  const csrf = await getCsrf(request)
  const response = await request.post('/api/admin/blogs', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      title,
      excerpt: `Recording excerpt for ${title}`,
      tags,
      published: true,
      contentJson: JSON.stringify({ html }),
    },
  })
  expect(response.ok()).toBeTruthy()
  return await response.json() as { id: string; slug: string }
}

async function createWork(request: APIRequestContext, title: string, html: string, tags: string[] = ['recording']) {
  const csrf = await getCsrf(request)
  const response = await request.post('/api/admin/works', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      title,
      category: 'recording',
      period: '2026.04',
      tags,
      published: true,
      contentJson: JSON.stringify({ html }),
      allPropertiesJson: JSON.stringify({}),
      thumbnailAssetId: null,
      iconAssetId: null,
    },
  })
  expect(response.ok()).toBeTruthy()
  return await response.json() as { id: string; slug: string }
}

async function seedBlogsWithPrefix(request: APIRequestContext, prefix: string, count: number) {
  const created: Array<{ id: string; slug: string; title: string }> = []
  for (let index = 0; index < count; index += 1) {
    const title = `${prefix} ${String(index + 1).padStart(2, '0')}`
    const result = await createBlog(request, title, `<p>${title}</p>`, ['recording', prefix])
    created.push({ ...result, title })
  }
  return created
}

async function seedWorksWithPrefix(request: APIRequestContext, prefix: string, count: number) {
  const created: Array<{ id: string; slug: string; title: string }> = []
  for (let index = 0; index < count; index += 1) {
    const title = `${prefix} ${String(index + 1).padStart(2, '0')}`
    const result = await createWork(request, title, `<p>${title}</p>`, ['recording', prefix])
    created.push({ ...result, title })
  }
  return created
}

function mermaidBlockHtml(code: string) {
  return `<mermaid-block data-code="${code.replace(/\n/g, '&#10;')}"></mermaid-block>`
}

async function waitForEditorApi(page: Page) {
  await page.waitForFunction(() => Boolean((window as typeof window & { __WOONG_TIPTAP_EDITOR__?: unknown }).__WOONG_TIPTAP_EDITOR__))
}

async function setEditorHtml(page: Page, html: string) {
  await waitForEditorApi(page)
  await page.evaluate((nextHtml) => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: {
        commands: {
          setContent: (content: string) => void
        }
      }
    }
    target.__WOONG_TIPTAP_EDITOR__?.commands.setContent(nextHtml)
  }, html)
}

async function waitForPagedCounter(page: Page, pageNumber: number) {
  const counter = page.getByText(/^Page \d+ of \d+$/).first()
  await expect.poll(async () => ((await counter.textContent()) ?? '').trim()).toMatch(new RegExp(`^Page ${pageNumber} of [2-9]\\d*$`))
  return counter
}

async function resizeFirstEditorImage(page: Page) {
  const imageNode = page.getByTestId('tiptap-resizable-image').first()
  await expect(imageNode).toBeVisible()
  await imageNode.click()

  const handle = page.getByTestId('tiptap-image-resize-handle').first()
  await expect(handle).toBeVisible()
  const handleBox = await handle.boundingBox()
  expect(handleBox).toBeTruthy()

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleBox!.x + 160, handleBox!.y + 20, { steps: 8 })
  await page.mouse.up()

  await expect.poll(async () => {
    const width = await imageNode.locator('img').getAttribute('width')
    return Number(width ?? '0')
  }).toBeGreaterThan(300)
}

async function insertRecordingImage(page: Page, title: string, fields: 'blog' | 'work') {
  const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
  if (fields === 'blog') {
    await page.goto('/admin/blog/new', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Tags (comma separated)').fill('recording, image')
  } else {
    await page.goto('/admin/works/new', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Category').fill('recording')
    await page.getByLabel('Tags (comma separated)').fill('recording, image')
  }

  await setEditorHtml(page, `<p>Image before</p><img src="${transparentPixel}" alt="Resizable recording image" width="300" height="150" /><p>Image after</p>`)
}

test('recording search url stability', async ({ page, request }) => {
  const suffix = Date.now()
  const blogTitle = `T,B,N 안녕하세요 Recording Blog ${suffix}`
  const workTitle = `T,B,N 안녕하세요 Recording Work ${suffix}`
  await createBlog(request, blogTitle, `<p>${blogTitle}</p>`, ['recording', 'T,B,N'])
  await createWork(request, workTitle, `<p>${workTitle}</p>`, ['recording', 'T,B,N'])

  await page.goto('/admin/blog')
  await expect(page.getByTestId('admin-blog-row').first()).toBeVisible()
  const blogSearch = page.getByLabel('Search blog titles')
  await blogSearch.fill('tbn')
  await expect(blogSearch).toHaveValue('tbn')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: blogTitle }).first()).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('query')).toBe('tbn')

  await page.goto('/admin/works')
  await expect(page.getByTestId('admin-work-row').first()).toBeVisible()
  const workSearch = page.getByLabel('Search work titles')
  await workSearch.fill('TBN')
  await expect(workSearch).toHaveValue('TBN')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: workTitle }).first()).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('query')).toBe('TBN')
})

test('recording search blog normalized', async ({ page, request }) => {
  const title = `T,B,N 안녕하세요 Blog Search ${Date.now()}`
  await createBlog(request, title, `<p>${title}</p>`, ['recording', 'T,B,N'])

  await page.goto('/admin/blog')
  await expect(page.getByTestId('admin-blog-row').first()).toBeVisible()
  await page.getByLabel('Search blog titles').fill('tb')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: title }).first()).toBeVisible()
  await page.getByLabel('Search blog titles').fill('TBN')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: title }).first()).toBeVisible()
  await page.getByLabel('Search blog titles').fill('t,b,n')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: title }).first()).toBeVisible()
})

test('recording search work normalized', async ({ page, request }) => {
  const title = `T,B,N 안녕하세요 Work Search ${Date.now()}`
  await createWork(request, title, `<p>${title}</p>`, ['recording', 'T,B,N'])

  await page.goto('/admin/works')
  await expect(page.getByTestId('admin-work-row').first()).toBeVisible()
  await page.getByLabel('Search work titles').fill('tb')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: title }).first()).toBeVisible()
  await page.getByLabel('Search work titles').fill('TBN')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: title }).first()).toBeVisible()
  await page.getByLabel('Search work titles').fill('t,b,n')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: title }).first()).toBeVisible()
})

test('recording search dashboard normalized', async ({ page, request }) => {
  const suffix = Date.now()
  const blogTitle = `T,B,N 안녕하세요 Dashboard Blog ${suffix}`
  const workTitle = `T,B,N 안녕하세요 Dashboard Work ${suffix}`
  await createBlog(request, blogTitle, `<p>${blogTitle}</p>`, ['recording', 'T,B,N'])
  await createWork(request, workTitle, `<p>${workTitle}</p>`, ['recording', 'T,B,N'])

  await page.goto('/admin/dashboard')
  const worksSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Works' }) }).first()
  const blogsSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Blog Posts' }) }).first()
  await expect(worksSection.getByTestId('works-card-link').first()).toBeVisible()
  await expect(blogsSection.getByTestId('blog-posts-card-link').first()).toBeVisible()

  await worksSection.getByLabel('Works title search').fill('tbn')
  await expect(worksSection.getByRole('heading', { name: workTitle })).toBeVisible()
  await blogsSection.getByLabel('Blog Posts title search').fill('TB')
  await expect(blogsSection.getByRole('heading', { name: blogTitle })).toBeVisible()
})

test('recording admin pagination stability', async ({ page, request }) => {
  const prefix = `Recording Pagination ${Date.now()}`
  await seedWorksWithPrefix(request, prefix, 24)

  await page.goto('/admin/works')
  await expect(page.getByTestId('admin-work-row').first()).toBeVisible()
  await page.getByLabel('Search work titles').fill(prefix)
  await waitForPagedCounter(page, 1)
  await page.getByRole('button', { name: 'Next page' }).click()
  await waitForPagedCounter(page, 2)
  await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2')
  await page.getByRole('button', { name: 'Previous page' }).click()
  await waitForPagedCounter(page, 1)
})

test('recording admin return location stability', async ({ page, request }) => {
  const prefix = `Recording ReturnTo ${Date.now()}`
  await seedBlogsWithPrefix(request, prefix, 24)

  await page.goto('/admin/blog')
  await expect(page.getByTestId('admin-blog-row').first()).toBeVisible()
  await page.getByLabel('Search blog titles').fill(prefix)
  await waitForPagedCounter(page, 1)
  await page.getByRole('button', { name: 'Next page' }).click()
  await waitForPagedCounter(page, 2)

  const row = page.getByTestId('admin-blog-row').first()
  const title = (await row.locator('td:nth-child(2) a').textContent())?.trim() ?? prefix
  await row.getByTitle('Edit').click()
  await expect(page).toHaveURL(/\/admin\/blog\/.+/)
  await page.getByLabel('Title').fill(`${title} updated`)
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/admin/blogs/') && response.request().method() === 'PUT' && response.ok()),
    page.getByRole('button', { name: 'Update Post' }).click(),
  ])

  await expect(page).toHaveURL(/\/admin\/blog/)
  await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2')
  await expect.poll(() => new URL(page.url()).searchParams.get('query')).toBe(prefix)
})

test('recording mermaid rendering', async ({ page }) => {
  const title = `Recording Mermaid ${Date.now()}`
  const mermaidCode = 'flowchart TD\n  A[Start] --> B[Render Mermaid]\n  B --> C[Public SVG]'

  await page.goto('/admin/blog/new', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('recording, mermaid')
  await setEditorHtml(page, `<p>Before diagram</p>${mermaidBlockHtml(mermaidCode)}<p>After diagram</p>`)
  await expect(page.getByTestId('tiptap-editor-shell')).toContainText('Mermaid Diagram')
  await expect(page.getByPlaceholder(/graph TD/)).toHaveValue(mermaidCode)

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/admin/blogs') && response.request().method() === 'POST' && response.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])
  const created = await createResponse.json() as { slug: string }

  await page.goto(`/blog/${created.slug}`)
  await expect(page.locator('main h1', { hasText: title })).toBeVisible()
  await expectMermaidRendered(page)
  await expect(page.getByText('Before diagram')).toBeVisible()
  await expect(page.getByText('After diagram')).toBeVisible()
})

test('recording mermaid editor preview', async ({ page }) => {
  const title = `Recording Mermaid Preview ${Date.now()}`
  const mermaidCode = 'flowchart LR\n  Left[Editor] --> Right[Preview]'

  await page.goto('/admin/blog/new', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('recording, mermaid')
  await setEditorHtml(page, `<p>Editor preview</p>${mermaidBlockHtml(mermaidCode)}`)
  await expect(page.getByTestId('tiptap-editor-shell')).toContainText('Mermaid Diagram')
  await expect(page.getByPlaceholder(/graph TD/)).toHaveValue(mermaidCode)
  await expectMermaidRendered(page, page.getByTestId('tiptap-editor-shell'))
})

test('recording mermaid work rendering', async ({ page }) => {
  const title = `Recording Work Mermaid ${Date.now()}`
  const mermaidCode = 'flowchart TD\n  Work[Work Editor] --> Diagram[Mermaid Preview]'

  await page.goto('/admin/works/new', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('recording')
  await page.getByLabel('Tags (comma separated)').fill('recording, mermaid')
  await setEditorHtml(page, `<p>Work editor diagram</p>${mermaidBlockHtml(mermaidCode)}`)
  await expect(page.getByTestId('tiptap-editor-shell')).toContainText('Mermaid Diagram')
  await expect(page.getByPlaceholder(/graph TD/)).toHaveValue(mermaidCode)
  await expectMermaidRendered(page, page.getByTestId('tiptap-editor-shell'))
})

test('recording image resize drag', async ({ page }) => {
  const title = `Recording Image Resize ${Date.now()}`
  await insertRecordingImage(page, title, 'blog')
  await resizeFirstEditorImage(page)
})

test('recording image work resize', async ({ page }) => {
  const title = `Recording Work Image Resize ${Date.now()}`
  await insertRecordingImage(page, title, 'work')
  await resizeFirstEditorImage(page)
})

test('recording image drag move', async ({ page }) => {
  const title = `Recording Image Move ${Date.now()}`
  await insertRecordingImage(page, title, 'blog')

  const imageNode = page.getByTestId('tiptap-resizable-image').first()
  await expect(imageNode).toBeVisible()
  const editor = page.locator('.tiptap.ProseMirror').first()
  const imageBox = await imageNode.boundingBox()
  const editorBox = await editor.boundingBox()
  expect(imageBox).toBeTruthy()
  expect(editorBox).toBeTruthy()

  await page.mouse.move(imageBox!.x + imageBox!.width / 2, imageBox!.y + imageBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(editorBox!.x + 80, editorBox!.y + editorBox!.height - 40, { steps: 12 })
  await page.mouse.up()
  await expect(imageNode).toBeVisible()
})
