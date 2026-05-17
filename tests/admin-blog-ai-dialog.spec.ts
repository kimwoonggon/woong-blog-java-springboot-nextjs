import { expect, test, type Page } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function mockAiRuntimeConfig(page: Page) {
  await page.route('**/api/admin/ai/runtime-config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'codex',
        availableProviders: ['openai', 'codex'],
        defaultModel: 'gpt-5.4',
        codexModel: 'gpt-5.4',
        codexReasoningEffort: 'medium',
        allowedCodexModels: ['gpt-5.4', 'gpt-5.4-mini'],
        allowedCodexReasoningEfforts: ['low', 'medium', 'high'],
        batchConcurrency: 2,
        batchCompletedRetentionDays: 7,
        defaultSystemPrompt: 'Default AI system prompt',
        defaultBlogFixPrompt: 'Default blog fix prompt',
        defaultWorkEnrichPrompt: 'Enrich the work named {title}.',
      }),
    })
  })
}

test('blog AI fix dialog loads runtime config, applies a fixed draft, and keeps editing local', async ({ page }, testInfo) => {
  await mockAiRuntimeConfig(page)

  await page.route('**/api/admin/ai/blog-fix', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fixedHtml: '<h2>AI polished body</h2><p>Applied from mocked AI response.</p>',
      }),
    })
  })

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`AI Fix Coverage ${Date.now()}`)
  await page.locator('form .tiptap.ProseMirror').first().click()
  await page.keyboard.type('rough draft before ai fix')

  await measureStep(
    testInfo,
    'AI Fix dialog open to provider dropdown ready',
    'aiDialogOpen',
    async () => {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/ai/runtime-config') && res.request().method() === 'GET' && res.ok()),
        page.getByRole('button', { name: 'AI Content Fixer' }).click(),
      ])
    },
    async () => {
      await expect(page.getByRole('heading', { name: 'AI Content Fixer' })).toBeVisible()
      await expect(page.getByLabel('AI provider')).toBeVisible()
      await expect(page.getByRole('option', { name: 'OPENAI' })).toBeAttached()
      await expect(page.getByRole('option', { name: 'CODEX' })).toBeAttached()
      await expect(page.locator('#codex-model')).toHaveValue('gpt-5.4')
      await expect(page.locator('#codex-reasoning')).toHaveValue('medium')
    },
  )

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/blog-fix') && res.request().method() === 'POST' && res.ok()),
    page.locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Start AI Fix' }).dispatchEvent('click'),
  ])

  const dialogContent = page.locator('[data-slot="dialog-content"]')
  await expect(dialogContent.getByText('AI polished body')).toBeVisible()
  await expect(dialogContent.getByRole('button', { name: 'Apply Changes' })).toBeVisible()

  await dialogContent.getByRole('button', { name: 'Apply Changes' }).dispatchEvent('click')

  await expect(dialogContent).toHaveCount(0)

  await expect(page.locator('form .tiptap.ProseMirror').first()).toContainText('AI polished body')
  await expect(page.locator('form .tiptap.ProseMirror').first()).toContainText('Applied from mocked AI response.')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)
})

test('blog AI fix failure preserves the draft and can retry with mocked routes', async ({ page }) => {
  await mockAiRuntimeConfig(page)
  let fixAttempts = 0

  await page.route('**/api/admin/ai/blog-fix', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    fixAttempts += 1
    if (fixAttempts === 1) {
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Timed out in mocked AI route' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fixedHtml: '<h2>Recovered AI body</h2><p>Generated after retry.</p>',
      }),
    })
  })

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`AI Fix Failure Coverage ${Date.now()}`)
  const editor = page.locator('form .tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type('rough draft before failed ai fix')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/runtime-config') && res.request().method() === 'GET' && res.ok()),
    page.getByRole('button', { name: 'AI Content Fixer' }).click(),
  ])

  const dialogContent = page.locator('[data-slot="dialog-content"]')
  await expect(dialogContent.getByRole('heading', { name: 'AI Content Fixer' })).toBeVisible()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/blog-fix') && res.request().method() === 'POST' && res.status() === 504),
    dialogContent.getByRole('button', { name: 'Start AI Fix' }).dispatchEvent('click'),
  ])

  await expect(page.getByText('AI fix timed out while waiting for the backend response. Please retry.')).toBeVisible()
  await expect(dialogContent.getByRole('button', { name: 'Apply Changes' })).toHaveCount(0)
  await expect(editor).toContainText('rough draft before failed ai fix')
  await expect(page.getByText('AI changes applied successfully')).toHaveCount(0)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/blog-fix') && res.request().method() === 'POST' && res.ok()),
    dialogContent.getByRole('button', { name: 'Start AI Fix' }).dispatchEvent('click'),
  ])

  await expect(dialogContent.getByText('Recovered AI body')).toBeVisible()
  await dialogContent.getByRole('button', { name: 'Apply Changes' }).dispatchEvent('click')
  await expect(dialogContent).toHaveCount(0)
  await expect(editor).toContainText('Recovered AI body')
  await expect(editor).toContainText('Generated after retry.')
  expect(fixAttempts).toBe(2)
})

test('work AI enrich uses mocked failure and success responses without live AI', async ({ page }) => {
  await mockAiRuntimeConfig(page)
  let enrichAttempts = 0
  const requestBodies: Array<Record<string, unknown>> = []

  await page.route('**/api/admin/ai/work-enrich', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    enrichAttempts += 1
    requestBodies.push(JSON.parse(route.request().postData() || '{}') as Record<string, unknown>)

    if (enrichAttempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Mocked work enrich failure' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fixedHtml: '<h2>Mocked enriched work</h2><p>Safe retry content.</p>',
      }),
    })
  })

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill('Mocked Work Enrich Coverage')
  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.fill('work draft before mocked enrich')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/runtime-config') && res.request().method() === 'GET' && res.ok()),
    page.getByRole('button', { name: 'AI Enrich' }).click(),
  ])

  const dialogContent = page.locator('[data-slot="dialog-content"]')
  await expect(dialogContent.getByRole('heading', { name: 'AI Enrich' })).toBeVisible()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/work-enrich') && res.request().method() === 'POST' && res.status() === 500),
    dialogContent.getByRole('button', { name: 'Start AI Fix' }).dispatchEvent('click'),
  ])

  await expect(page.getByText('Mocked work enrich failure')).toBeVisible()
  await expect(dialogContent.getByRole('button', { name: 'Apply Changes' })).toHaveCount(0)
  await expect(editor).toContainText('work draft before mocked enrich')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/ai/work-enrich') && res.request().method() === 'POST' && res.ok()),
    dialogContent.getByRole('button', { name: 'Start AI Fix' }).dispatchEvent('click'),
  ])

  await expect(dialogContent.getByText('Mocked enriched work')).toBeVisible()
  await dialogContent.getByRole('button', { name: 'Apply Changes' }).dispatchEvent('click')
  await expect(dialogContent).toHaveCount(0)
  await expect(editor).toContainText('Mocked enriched work')
  await expect(editor).toContainText('Safe retry content.')
  expect(enrichAttempts).toBe(2)
  expect(requestBodies[0]).toMatchObject({
    html: expect.stringContaining('work draft before mocked enrich'),
    title: 'Mocked Work Enrich Coverage',
    provider: 'codex',
  })
})
