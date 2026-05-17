import { expect, test, type Page } from './helpers/performance-test'

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

async function activeElementState(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement
    const text = active?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

    return {
      label: active?.getAttribute('aria-label')
        || active?.getAttribute('title')
        || text
        || active?.id
        || active?.tagName
        || '',
      inDialog: Boolean(active?.closest('[data-slot="dialog-content"]')),
    }
  })
}

test('mobile admin navigation exposes a labeled nav and supports sequential keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/dashboard')

  const nav = page.getByRole('navigation', { name: 'Admin navigation' })
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')

  const orderedLinks = ['Dashboard', 'Load Test', 'Works', 'Blog', 'Blog Notion View', 'Pages & Settings', 'Members']
  await nav.getByRole('link', { name: orderedLinks[0], exact: true }).focus()

  for (const name of orderedLinks) {
    const link = nav.getByRole('link', { name, exact: true })
    await expect(link).toBeFocused()

    if (name !== orderedLinks[orderedLinks.length - 1]) {
      await page.keyboard.press('Tab')
    }
  }
})

test('AI content dialog opens and closes by keyboard without invoking live AI', async ({ page }) => {
  await mockAiRuntimeConfig(page)
  await page.goto('/admin/blog/new')

  const trigger = page.getByRole('button', { name: 'AI Content Fixer' })
  await trigger.focus()
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/ai/runtime-config')
      && response.request().method() === 'GET'
      && response.ok(),
    ),
    page.keyboard.press('Enter'),
  ])

  const dialog = page.getByRole('dialog', { name: 'AI Content Fixer' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => activeElementState(page)).toMatchObject({ inDialog: true })
  await expect(page.locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Start AI Fix' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
