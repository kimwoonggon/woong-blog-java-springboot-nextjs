import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from './helpers/performance-test'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.floor(Math.random() * 1000)}`
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fillEditor(page: Page, value: string) {
  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await editor.fill(value)
  return editor
}

async function setEditorHtml(page: Page, html: string) {
  await page.waitForFunction(() => {
    const target = window as typeof window & { __WOONG_TIPTAP_EDITOR__?: { commands?: { setContent?: (value: string) => void } } }
    return Boolean(target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent)
  })

  await page.evaluate((nextHtml) => {
    const target = window as typeof window & { __WOONG_TIPTAP_EDITOR__?: { commands: { setContent: (value: string) => void } } }
    target.__WOONG_TIPTAP_EDITOR__?.commands.setContent(nextHtml)
  }, html)
}

async function publishBlogWithHtml(page: Page, title: string, html: string) {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await setEditorHtml(page, html)

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  return await saveResponse.json() as { id: string; slug: string }
}

async function createBlog(page: Page, title: string, body: string, tags = 'playwright, qa') {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill(tags)
  const editor = await fillEditor(page, body)

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  const payload = await response.json() as { id: string; slug: string }
  return { editor, ...payload }
}

async function expectInlineEditorImageReady(page: Page) {
  await expect(page.locator('.tiptap.ProseMirror img[src*="/media/blogs/inline/"]').first()).toBeVisible()
  await page.getByLabel('Title').click()
  await expect(page.getByRole('button', { name: /Create Post/i })).toBeEnabled()
}

async function createWork(page: Page, title: string, body: string, category = 'qa') {
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill(category)
  await fillEditor(page, body)

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const payload = await response.json() as { id: string; slug: string }
  return payload
}

async function confirmDialog(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()
}

async function dispatchEditorFileEvent(
  page: Page,
  type: 'drop' | 'paste',
  selector: string,
  fixturePath: string,
  name: string,
  mimeType: string,
) {
  const filePath = path.resolve(fixturePath)
  const bytes = [...fs.readFileSync(filePath)]

  await page.evaluate(({ eventType, targetSelector, fileBytes, fileName, fileType }) => {
    const target = document.querySelector(targetSelector) as HTMLElement | null
    if (!target) {
      throw new Error(`Editor target not found for ${targetSelector}`)
    }

    const dataTransfer = new DataTransfer()
    const file = new File([new Uint8Array(fileBytes)], fileName, { type: fileType })
    dataTransfer.items.add(file)

    if (eventType === 'drop') {
      target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }))
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }))
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
      return
    }

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(pasteEvent, 'clipboardData', { value: dataTransfer })
    target.dispatchEvent(pasteEvent)
  }, {
    eventType: type,
    targetSelector: selector,
    fileBytes: bytes,
    fileName: name,
    fileType: mimeType,
  })
}

async function buildDataTransferHandle(
  page: Page,
  fixturePath: string,
  name: string,
  mimeType: string,
) {
  const filePath = path.resolve(fixturePath)
  const bytes = [...fs.readFileSync(filePath)]

  return await page.evaluateHandle(({ fileBytes, fileName, fileType }) => {
    const dataTransfer = new DataTransfer()
    const file = new File([new Uint8Array(fileBytes)], fileName, { type: fileType })
    dataTransfer.items.add(file)
    return dataTransfer
  }, {
    fileBytes: bytes,
    fileName: name,
    fileType: mimeType,
  })
}

test('A-6 reorder saved work videos changes public playback order', async ({ page }) => {
  const title = uniqueLabel('QA Reorder Work')
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await fillEditor(page, 'Reorder coverage body')

  await page.getByLabel('YouTube URL or ID').fill('dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.getByLabel('YouTube URL or ID').fill('9bZkp7q19f0')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json() as { id: string; slug: string }
  await expect(page).toHaveURL(new RegExp(`/admin/works/${created.id}`))
  await expect(page.getByText(/Saved videos version/i)).toBeVisible()
  await expect(page.getByTitle('Move Down').first()).toBeEnabled()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/videos/order') && res.request().method() === 'PUT'),
    page.getByTitle('Move Down').first().click(),
  ])

  await page.goto(`/works/${created.slug}`)
  const frames = page.locator('iframe[src*="youtube-nocookie.com/embed/"]')
  await expect(frames).toHaveCount(2)
  await expect(frames.first()).toHaveAttribute('src', /9bZkp7q19f0/)
})

test('A-12 single work delete removes the work from admin and public lists', async ({ page }) => {
  const title = uniqueLabel('QA Single Delete Work')
  const created = await createWork(page, title, 'Single delete work body')

  await page.goto('/admin/works')
  const row = page.getByTestId('admin-work-row').filter({ hasText: title }).first()
  await expect(row).toBeVisible()
  await row.getByTitle('Delete').click()
  await confirmDialog(page)
  await expect(row).toHaveCount(0)

  await page.goto('/works')
  await expect(page.getByText(title)).toHaveCount(0)
  await page.goto(`/works/${created.slug}`)
  await expect(page.getByText('404')).toBeVisible()
})

test('B-5 single blog delete removes the post from admin and public lists', async ({ page }) => {
  const title = uniqueLabel('QA Single Delete Blog')
  const created = await createBlog(page, title, 'Single delete blog body')

  await page.goto('/admin/blog')
  const row = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(row).toBeVisible()
  await row.getByTitle('Delete').click()
  await confirmDialog(page)
  await expect(row).toHaveCount(0)

  await page.goto('/blog')
  await expect(page.getByText(title)).toHaveCount(0)
  await page.goto(`/blog/${created.slug}`)
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
})

test('C-1 basic formatting renders publicly after save', async ({ page }) => {
  const payload = await publishBlogWithHtml(
    page,
    uniqueLabel('QA Basic Formatting'),
    '<h1>QA Heading 1</h1><p><strong>Bold text</strong></p><p><em>Italic text</em></p><blockquote><p>Quoted text</p></blockquote><ul><li>List item</li></ul>',
  )

  await page.goto(`/blog/${payload.slug}`)
  await expect(page.locator('h1, h2, h3').getByText('QA Heading 1')).toBeVisible()
  await expect(page.locator('strong').getByText('Bold text')).toBeVisible()
  await expect(page.locator('em').getByText('Italic text')).toBeVisible()
  await expect(page.locator('blockquote').getByText('Quoted text')).toBeVisible()
  await expect(page.locator('li').getByText('List item')).toBeVisible()
})

test('C-2 link insertion renders publicly after save', async ({ page }) => {
  const payload = await publishBlogWithHtml(
    page,
    uniqueLabel('QA Link Insertion'),
    '<p><a href="https://example.com/docs">Link text</a></p>',
  )

  await page.goto(`/blog/${payload.slug}`)
  await expect(page.locator('a[href="https://example.com/docs"]').first()).toBeVisible()
})

test('C-7 code block renders publicly after save', async ({ page }) => {
  const payload = await publishBlogWithHtml(
    page,
    uniqueLabel('QA Code Block'),
    '<pre><code>const playwrightAnswer = 42;</code></pre>',
  )

  await page.goto(`/blog/${payload.slug}`)
  await expect(page.locator('pre code')).toContainText('const playwrightAnswer = 42;')
})

test('C-10 selecting editor text reveals the bubble menu', async ({ page }) => {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(uniqueLabel('QA Bubble Menu'))
  await fillEditor(page, 'Bubble menu text')
  await page.evaluate(() => {
    const editorNode = document.querySelector('.tiptap.ProseMirror')
    if (!editorNode) {
      throw new Error('Editor node not found')
    }

    const selection = window.getSelection()
    if (!selection) {
      throw new Error('Selection API unavailable')
    }

    const range = document.createRange()
    range.selectNodeContents(editorNode)
    selection.removeAllRanges()
    selection.addRange(range)
    editorNode.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await expect(page.getByTestId('editor-formatting-bubble')).toBeVisible()
})

test('C-3 drag-drop image upload inserts an image into blog content', async ({ page }) => {
  const title = uniqueLabel('QA Drag Drop Image')
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  const editor = await fillEditor(page, 'Drag drop image body')
  const dataTransfer = await buildDataTransferHandle(page, 'tests/fixtures/avatar.png', 'avatar.png', 'image/png')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
    editor.dispatchEvent('dragenter', { dataTransfer }),
    editor.dispatchEvent('dragover', { dataTransfer }),
    editor.dispatchEvent('drop', { dataTransfer }),
  ])

  await expectInlineEditorImageReady(page)

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  if (!saveResponse.ok()) {
    throw new Error(`Failed to save drag-drop image blog: ${saveResponse.status()} ${await saveResponse.text()}`)
  }

  const payload = await saveResponse.json() as { slug: string }
  await page.goto(`/blog/${payload.slug}`)
  await expect(page.locator('article img').first()).toBeVisible()
})

test('C-4 paste image upload inserts an image into blog content', async ({ page }) => {
  const title = uniqueLabel('QA Paste Image')
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await fillEditor(page, 'Paste image body')
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
    dispatchEditorFileEvent(page, 'paste', '.tiptap.ProseMirror', 'tests/fixtures/avatar.png', 'avatar.png', 'image/png'),
  ])

  await expectInlineEditorImageReady(page)

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  if (!saveResponse.ok()) {
    throw new Error(`Failed to save pasted image blog: ${saveResponse.status()} ${await saveResponse.text()}`)
  }

  const payload = await saveResponse.json() as { slug: string }
  await page.goto(`/blog/${payload.slug}`)
  await expect(page.locator('article img').first()).toBeVisible()
})

test('C-5 duplicate work video embed insertion is prevented', async ({ page }) => {
  const title = uniqueLabel('QA Duplicate Video Embed')
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await fillEditor(page, 'Video embed body')
  await page.getByLabel('YouTube URL or ID').fill('dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json() as { id: string; slug: string }
  await expect(page).toHaveURL(new RegExp(`/admin/works/${created.id}`))

  await expect(page.getByRole('button', { name: 'Insert Into Body' }).first()).toBeEnabled()
  await page.getByRole('button', { name: 'Insert Into Body' }).first().click()
  await expect(page.getByRole('button', { name: 'Insert Into Body' }).first()).toBeDisabled()

  await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === `/api/admin/works/${created.id}` && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Work' }).click(),
  ])

  await page.goto(`/works/${created.slug}`)
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1)
})

test('C-6 slash command inserts a heading block that renders publicly', async ({ page }) => {
  const title = uniqueLabel('QA Slash Command')
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await fillEditor(page, '/h2')
  await expect(page.getByText('Heading 2')).toBeVisible()
  await page.getByText('Heading 2').click()
  await page.keyboard.type('Slash Heading')

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  const payload = await saveResponse.json() as { slug: string }
  await page.goto(`/blog/${payload.slug}`)
  await expect(page.locator('h2').getByText('Slash Heading')).toBeVisible()
})

test('C-8 HTML widget renders through the public interactive renderer', async ({ page }) => {
  const title = uniqueLabel('QA HTML Widget')
  const slug = slugify(title)
  await page.goto('/admin/works/new')

  await page.evaluate(async ({ nextTitle }) => {
    const csrfResponse = await fetch('/api/auth/csrf', {
      credentials: 'include',
      cache: 'no-store',
    })
    const csrf = await csrfResponse.json() as { requestToken: string; headerName: string }

    const response = await fetch('/api/admin/works', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.requestToken,
      },
      body: JSON.stringify({
        title: nextTitle,
        category: 'widget',
        period: '',
        tags: [],
        published: true,
        contentJson: JSON.stringify({
          html: '<p>HTML widget body</p><html-snippet html=\"&lt;div class=&quot;qa-html-widget&quot;&gt;QA HTML Widget&lt;/div&gt;\"></html-snippet>',
        }),
        allPropertiesJson: '{}',
        thumbnailAssetId: null,
        iconAssetId: null,
      }),
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }
  }, { nextTitle: title })

  await page.goto(`/works/${slug}`)
  await expect(page.locator('.qa-html-widget')).toContainText('QA HTML Widget')
})

test('C-9 Three.js block renders a canvas publicly', async ({ page }) => {
  const title = uniqueLabel('QA Three Block')
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('3d')
  await fillEditor(page, 'Three block body')
  await page.locator('[title="Insert 3D Model"]').click()

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const payload = await saveResponse.json() as { slug: string }
  await page.goto(`/works/${payload.slug}`)
  await expect(page.locator('canvas').first()).toBeVisible()
})

test('C-11 editor content persists and reloads into the edit surface', async ({ page }) => {
  const title = uniqueLabel('QA Editor Sync')
  const created = await createBlog(page, title, 'Initial sync body')

  await page.goto(`/admin/blog/${created.id}`)
  const editor = page.locator('.tiptap.ProseMirror').first()
  await expect(editor).toContainText('Initial sync body')
  await editor.fill('Updated sync body')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/admin/blogs/${created.id}`) && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: /Update Post/i }).click(),
  ])

  await page.reload()
  await expect(page.locator('.tiptap.ProseMirror').first()).toContainText('Updated sync body')
})

test('F-3 and F-4 inline page editors can save introduction and contact content in place', async ({ page }) => {
  const introText = uniqueLabel('Inline intro text')
  const contactText = uniqueLabel('Inline contact text')

  await page.goto('/introduction')
  await page.getByRole('button', { name: '소개글 수정' }).click()
  await page.getByLabel('Content (HTML/Text)').fill(`<p>${introText}</p>`)
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/pages') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Save Changes' }).click(),
  ])
  await expect(page.locator('main .prose').getByText(introText, { exact: true })).toBeVisible()

  await page.goto('/contact')
  await page.getByRole('button', { name: '문의글 수정' }).click()
  await page.getByLabel('Content (HTML/Text)').fill(`<p>${contactText}</p>`)
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/pages') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Save Changes' }).click(),
  ])
  await expect(page.locator('main .prose').getByText(contactText, { exact: true })).toBeVisible()
})

test('F-5 and F-6 inline create flows can create works and blog posts from public pages', async ({ page }) => {
  const workTitle = uniqueLabel('Inline Work Create')
  const blogTitle = uniqueLabel('Inline Blog Create')

  await page.goto('/works')
  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await page.getByLabel('Title').fill(workTitle)
  await page.getByLabel('Category').fill('inline')
  await fillEditor(page, 'Inline work create body')
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])
  await expect(page.getByText(workTitle)).toBeVisible()

  await page.goto('/blog')
  await page.getByRole('button', { name: '새 글 쓰기' }).click()
  await page.getByLabel('Title').fill(blogTitle)
  await fillEditor(page, 'Inline blog create body')
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])
  await expect(page).toHaveURL(/\/blog(?:\?|$)/)
  await expect(page.getByText(blogTitle)).toBeVisible()
})

test('G-5 mobile navigation hamburger opens and routes across public pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle Menu' }).click()
  await expect(page.locator('[role="dialog"], [data-slot="sheet-content"]').first()).toBeVisible()
  await page.getByRole('link', { name: 'Works' }).click()
  await expect(page).toHaveURL(/\/works/)
  await page.getByRole('button', { name: 'Toggle Menu' }).click()
  await page.getByRole('link', { name: 'Contact' }).click()
  await expect(page).toHaveURL(/\/contact/)
})

test('H-5 very long body content saves and renders correctly', async ({ page }) => {
  const title = uniqueLabel('QA Long Body')
  const longText = `${'긴 본문 '.repeat(900)}END-MARKER`
  const created = await createBlog(page, title, longText)

  await page.goto(`/blog/${created.slug}`)
  await expect(page.getByText('END-MARKER')).toBeVisible()
})

test('H-4 public works empty state renders without an error', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/works?__qaEmpty=1')
  await expect(page.getByText('No works found.')).toBeVisible()
  await expect(page.getByText('404')).toHaveCount(0)
})
