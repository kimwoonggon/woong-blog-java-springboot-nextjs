import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type APIRequestContext } from './helpers/performance-test'

import { expectMermaidRendered } from './helpers/mermaid'

test.use({
  storageState: 'test-results/playwright/admin-storage-state.json',
  video: 'on',
})

test.setTimeout(120_000)

const OUTPUT_DIR = path.resolve('tests/playwright/0418test/mermaid-batch-prompt-0419')
const COUNT = 20
const generated: Array<{ id: string; slug: string; title: string }> = []
let suiteKey = ''

const BATCH_AI_PROMPT = `You are a technical note editor and learning-focused writing assistant.

Your role is not to rewrite the input into a polished, audience-first developer article.
Instead, your role is to help turn fragmented study notes, pasted explanations, cropped images, question-and-answer collections, and partially written technical drafts into a more complete, readable, and coherent record of what the author was trying to understand.

Rules:
1. Preserve the original meaning, technical depth, and core intent.
2. Keep revisions minimal where possible.
3. Preserve code blocks, inline code, commands, filenames, configuration snippets, technical terms, and API names.
4. Do not emit markdown fences, JSON, explanations, commentary, or wrapper text outside the final HTML.
5. Only add Mermaid diagrams when they genuinely help explain structure or flow.
6. Do not use markdown fences such as \`\`\`mermaid.
7. Instead, place Mermaid source directly inside an HTML container such as <div class="mermaid">...</div>.
8. Keep the title grounded in the actual material and aligned with the note-taking purpose.`

function mermaidCode(index: number) {
  return `sequenceDiagram
    participant User${index}
    participant Frontend
    participant Backend
    User${index}->>Frontend: Batch prompt saved ${index}
    Frontend->>Backend: Read Mermaid blog ${index}
    Backend-->>Frontend: HTML payload ${index}
    Frontend-->>User${index}: Stable rendered page ${index}`
}

function mermaidBlockHtml(code: string) {
  return `<mermaid-block data-code="${code.replace(/\n/g, '&#10;')}"></mermaid-block>`
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

async function copyVideo(testTitle: string, sourcePath: string) {
  await waitForNonEmptyFile(sourcePath)
  const match = testTitle.match(/#(\d+)/)
  if (!match) {
    return
  }

  const index = match[1].padStart(2, '0')
  const kind = testTitle.includes('admin') ? 'admin' : 'public'
  await copyFile(sourcePath, path.join(OUTPUT_DIR, `${kind}-batch-prompt-mermaid-blog-${index}.webm`))
}

async function getCsrf(request: APIRequestContext) {
  const csrfResponse = await request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  return await csrfResponse.json() as { requestToken: string; headerName: string }
}

async function createBlog(request: APIRequestContext, index: number) {
  const csrf = await getCsrf(request)
  const title = `Batch Prompt Mermaid Blog ${suiteKey} #${String(index).padStart(2, '0')}`
  const html = [
    `<p>${suiteKey} batch prompt before ${index}</p>`,
    mermaidBlockHtml(mermaidCode(index)),
    `<p>${suiteKey} batch prompt after ${index}</p>`,
  ].join('')
  const response = await request.post('/api/admin/blogs', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      title,
      excerpt: `Batch prompt Mermaid excerpt ${suiteKey} ${index}`,
      tags: ['batch-prompt-mermaid', suiteKey],
      published: true,
      contentJson: JSON.stringify({ html }),
    },
  })
  expect(response.ok()).toBeTruthy()
  const payload = await response.json() as { id: string; slug: string }
  return { ...payload, title }
}

test.beforeAll(async ({ request }) => {
  suiteKey = `batch-prompt-${Date.now()}`
  await mkdir(OUTPUT_DIR, { recursive: true })
  for (let index = 1; index <= COUNT; index += 1) {
    generated.push(await createBlog(request, index))
  }
  await writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ suiteKey, promptLength: BATCH_AI_PROMPT.length, generated }, null, 2),
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

test('save batch ai prompt before reading mermaid posts', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.localStorage.removeItem('admin-ai-blog-batch-system-prompt'))
  await page.goto('/admin/blog', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('admin-blog-row').first()).toBeVisible()
  await page.getByRole('button', { name: /^Batch AI Fix/ }).click()
  const panel = page.getByTestId('admin-blog-batch-ai-panel')
  await expect(panel).toBeVisible()
  const prompt = panel.getByLabel('Batch AI system prompt')
  await expect.poll(async () => (await prompt.inputValue()).length).toBeGreaterThan(0)
  await prompt.fill(BATCH_AI_PROMPT)
  await expect(prompt).toHaveValue(BATCH_AI_PROMPT)
  await expect(panel.getByText('Unsaved')).toBeVisible()
  await panel.getByRole('button', { name: 'Save prompt' }).click()
  await expect(panel.getByText('Unsaved')).toHaveCount(0)
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('admin-ai-blog-batch-system-prompt') ?? '')).toBe(BATCH_AI_PROMPT)
})

for (let index = 1; index <= COUNT; index += 1) {
  test(`admin batch-prompt mermaid blog #${String(index).padStart(2, '0')}`, async ({ page }) => {
    const blog = generated[index - 1]
    await page.goto(`/admin/blog/${blog.id}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Title')).toHaveValue(blog.title)
    await expect(page.getByTestId('tiptap-editor-shell')).toContainText('Mermaid Diagram')
    await expectMermaidRendered(page, page.getByTestId('tiptap-editor-shell'))
  })
}

for (let index = 1; index <= COUNT; index += 1) {
  test(`public batch-prompt mermaid blog #${String(index).padStart(2, '0')}`, async ({ page }) => {
    const blog = generated[index - 1]
    await page.goto(`/blog/${blog.slug}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main h1', { hasText: blog.title })).toBeVisible()
    await expectMermaidRendered(page)
    await expect(page.locator('main')).toContainText(`${suiteKey} batch prompt before ${index}`)
    await expect(page.locator('main')).toContainText(`${suiteKey} batch prompt after ${index}`)
  })
}
