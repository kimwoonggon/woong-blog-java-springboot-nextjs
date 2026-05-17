import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type APIRequestContext } from './helpers/performance-test'

test.use({
  storageState: 'test-results/playwright/admin-storage-state.json',
  video: 'on',
})

test.setTimeout(90_000)

const OUTPUT_DIR = path.resolve('tests/playwright/0418test/plain-baseline-0419')
const COUNT = 20
const generated: Array<{ id: string; slug: string; title: string }> = []
let suiteKey = ''

async function waitForNonEmptyFile(filePath: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const stats = await stat(filePath).catch(() => null)
    if (stats && stats.size > 0) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function copyVideo(testTitle: string, sourcePath: string) {
  await waitForNonEmptyFile(sourcePath)
  const match = testTitle.match(/#(\d+)/)
  if (!match) {
    return
  }

  const index = match[1].padStart(2, '0')
  const kind = testTitle.includes('admin') ? 'admin' : 'public'
  await copyFile(sourcePath, path.join(OUTPUT_DIR, `${kind}-plain-blog-${index}.webm`))
}

async function getCsrf(request: APIRequestContext) {
  const csrfResponse = await request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  return await csrfResponse.json() as { requestToken: string; headerName: string }
}

async function createBlog(request: APIRequestContext, index: number) {
  const csrf = await getCsrf(request)
  const title = `Plain Baseline Blog ${suiteKey} #${String(index).padStart(2, '0')}`
  const html = [
    `<h2>${suiteKey} Plain Note ${index}</h2>`,
    `<p>This is a plain baseline technical note ${index} without Mermaid content.</p>`,
    `<pre><code>const sample${index} = "plain baseline";</code></pre>`,
    `<p>The goal is to compare admin/public page reads against Mermaid-heavy pages.</p>`,
  ].join('')
  const response = await request.post('/api/admin/blogs', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      title,
      excerpt: `Plain baseline excerpt ${suiteKey} ${index}`,
      tags: ['plain-baseline', suiteKey],
      published: true,
      contentJson: JSON.stringify({ html }),
    },
  })
  expect(response.ok()).toBeTruthy()
  const payload = await response.json() as { id: string; slug: string }
  return { ...payload, title }
}

test.beforeAll(async ({ request }) => {
  suiteKey = `plain-baseline-${Date.now()}`
  await mkdir(OUTPUT_DIR, { recursive: true })
  for (let index = 1; index <= COUNT; index += 1) {
    generated.push(await createBlog(request, index))
  }
  await writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ suiteKey, generated }, null, 2),
    'utf8',
  )
})

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video()
  if (!video) {
    return
  }

  await page.close()
  await copyVideo(testInfo.title, await video.path())
})

for (let index = 1; index <= COUNT; index += 1) {
  test(`admin plain blog #${String(index).padStart(2, '0')}`, async ({ page }) => {
    const blog = generated[index - 1]
    await page.goto(`/admin/blog/${blog.id}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Title')).toHaveValue(blog.title)
    await expect(page.getByTestId('tiptap-editor-shell')).toBeVisible()
    await expect(page.getByTestId('tiptap-editor-shell')).not.toContainText('Mermaid Diagram')
  })
}

for (let index = 1; index <= COUNT; index += 1) {
  test(`public plain blog #${String(index).padStart(2, '0')}`, async ({ page }) => {
    const blog = generated[index - 1]
    await page.goto(`/blog/${blog.slug}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main h1', { hasText: blog.title })).toBeVisible()
    await expect(page.locator('main')).toContainText(`plain baseline technical note ${index}`)
    await expect(page.locator('main')).not.toContainText('Mermaid Diagram')
    await expect(page.locator('main')).not.toContainText('sequenceDiagram')
    await expect(page.locator('main')).not.toContainText('data-code')
  })
}
