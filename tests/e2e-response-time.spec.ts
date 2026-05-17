import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'
import type { Page } from '@playwright/test'

function isPublicRevalidationResponse(response: { url(): string; request(): { method(): string }; ok(): boolean }) {
  return response.url().includes('/revalidate-public')
    && response.request().method() === 'POST'
    && response.ok()
}

async function clickHeaderLink(page: Page, name: string) {
  const header = page.locator('header')
  const link = header.getByRole('link', { name, exact: true }).first()
  await expect(link).toBeVisible()
  await link.click()
}

test('response time: Study list direct load meets budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 })

  await measureStep(
    testInfo,
    'Study list direct load to primary content visible',
    'publicRouteLoad',
    async () => {
      await page.goto('/blog?page=1&pageSize=12&__qaTagged=1')
    },
    async () => {
      await expect(page.getByRole('heading', { name: 'Study' })).toBeVisible()
      await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1')
      await expect(page.getByTestId('blog-card').first()).toBeVisible()
    },
  )
})

test('response time: Works list direct load meets budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 })

  await measureStep(
    testInfo,
    'Works list direct load to primary content visible',
    'publicRouteLoad',
    async () => {
      await page.goto('/works?page=1&pageSize=8')
    },
    async () => {
      await expect(page.getByRole('heading', { name: 'Works' })).toBeVisible()
      await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1')
      await expect(page.getByTestId('work-card').first()).toBeVisible()
    },
  )
})

test('response time: desktop public nav clicks meet budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await expect(page.getByTestId('navbar-brand')).toBeVisible()

  await measureStep(
    testInfo,
    'Public nav click to Works',
    'publicNavClick',
    async () => {
      await clickHeaderLink(page, 'Works')
    },
    async () => {
      await expect(page).toHaveURL(/\/works(?:\?|$)/)
      await expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible()
      await expect(page.getByTestId('work-card').first()).toBeVisible()
    },
  )

  await measureStep(
    testInfo,
    'Public nav click to Study',
    'publicNavClick',
    async () => {
      await clickHeaderLink(page, 'Study')
    },
    async () => {
      await expect(page).toHaveURL(/\/blog(?:\?|$)/)
      await expect(page.getByRole('heading', { name: 'Study', exact: true })).toBeVisible()
      await expect(page.getByTestId('blog-card').first()).toBeVisible()
    },
  )

  await measureStep(
    testInfo,
    'Public nav click to Introduction',
    'publicNavClick',
    async () => {
      await clickHeaderLink(page, 'Introduction')
    },
    async () => {
      await expect(page).toHaveURL(/\/introduction(?:\?|$)/)
      await expect(page.locator('main h1').first()).toBeVisible()
    },
  )

  await measureStep(
    testInfo,
    'Public nav click to Contact',
    'publicNavClick',
    async () => {
      await clickHeaderLink(page, 'Contact')
    },
    async () => {
      await expect(page).toHaveURL(/\/contact(?:\?|$)/)
      await expect(page.getByRole('heading', { name: 'Contact', exact: true })).toBeVisible()
    },
  )
})

test('response time: public detail card opens meet budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  await page.goto('/works?page=1&pageSize=8')
  await expect(page.getByTestId('work-card').first()).toBeVisible()

  await measureStep(
    testInfo,
    'Public Work card opens detail',
    'publicDetailOpen',
    async () => {
      await page.getByTestId('work-card').first().click()
    },
    async () => {
      await expect(page).toHaveURL(/\/works\/.+/)
      await expect(page.locator('main article, main').first()).toBeVisible()
    },
  )

  await page.goto('/blog?page=1&pageSize=12')
  await expect(page.getByTestId('blog-card').first()).toBeVisible()

  await measureStep(
    testInfo,
    'Public Study card opens detail',
    'publicDetailOpen',
    async () => {
      await page.getByTestId('blog-card').first().click()
    },
    async () => {
      await expect(page).toHaveURL(/\/blog\/.+/)
      await expect(page.locator('main article, main').first()).toBeVisible()
    },
  )
})

test('response time: Study mobile append next page meets budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')
  await expect(page.getByTestId('blog-card')).toHaveCount(10)

  await measureStep(
    testInfo,
    'Study mobile auto-append',
    'publicPagination',
    async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    },
    async () => {
      await expect.poll(() => page.getByTestId('blog-card').count()).toBeGreaterThan(10)
    },
  )
})

test('response time: Works mobile append next page meets budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/works')
  await expect(page.getByTestId('work-card')).toHaveCount(10)

  await measureStep(
    testInfo,
    'Works mobile auto-append',
    'publicPagination',
    async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    },
    async () => {
      await expect.poll(() => page.getByTestId('work-card').count()).toBeGreaterThan(10)
    },
  )
})

test('response time: unified public search submit meets budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  await page.goto('/blog')
  await expect.poll(() => new URL(page.url()).searchParams.get('pageSize')).not.toBeNull()

  const studySearchForm = page.getByRole('search')
  const studySearchInput = studySearchForm.getByRole('textbox', { name: 'Search studies' })
  await studySearchInput.fill('seeded')
  await expect(studySearchInput).toHaveValue('seeded')

  await measureStep(
    testInfo,
    'Study unified search submit response-time path',
    'publicSearch',
    async () => {
      await studySearchForm.getByRole('button', { name: 'Search studies' }).click()
    },
    async () => {
      await expect.poll(() => new URL(page.url()).searchParams.get('query')).toBe('seeded')
      await expect.poll(() => new URL(page.url()).searchParams.get('searchMode')).toBeNull()
      await expect(page.getByTestId('blog-card').first()).toBeVisible()
    },
  )
})

test.describe('authenticated response-time paths', () => {
  test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

  test('response time: AI Fix provider dropdown is ready within budget', async ({ page }, testInfo) => {
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
        }),
      })
    })

    await page.goto('/admin/blog/new')
    await page.getByLabel('Title').fill(`Response Time AI ${Date.now()}`)
    await page.locator('form .tiptap.ProseMirror').first().click()
    await page.keyboard.type('draft for response time dialog')

    await measureStep(
      testInfo,
      'AI Fix provider dropdown response-time path',
      'aiDialogOpen',
      async () => {
        await Promise.all([
          page.waitForResponse((response) => response.url().includes('/api/admin/ai/runtime-config') && response.ok()),
          page.getByRole('button', { name: 'AI Content Fixer' }).click(),
        ])
      },
      async () => {
        await expect(page.getByLabel('AI provider')).toBeVisible()
        await expect(page.getByRole('option', { name: 'OPENAI' })).toBeAttached()
        await expect(page.getByRole('option', { name: 'CODEX' })).toBeAttached()
      },
    )
  })

  test('response time: admin site settings save refreshes public home within budget', async ({ page }, testInfo) => {
    const ownerName = `Woonggon RT ${Date.now()}`

    page.on('dialog', (dialog) => {
      void dialog.accept().catch(() => {})
    })

    await page.goto('/admin/pages')
    await page.locator('#ownerName').fill(ownerName)

    await measureStep(
      testInfo,
      'Admin site settings save response-time path',
      'adminMutationPublicRefresh',
      async () => {
        await Promise.all([
          page.waitForResponse((response) =>
            response.url().includes('/api/admin/site-settings') && response.request().method() === 'PUT' && response.ok(),
          ),
          page.waitForResponse(isPublicRevalidationResponse),
          page.getByRole('button', { name: 'Save Changes' }).first().click(),
        ])
      },
      async () => {
        await page.goto('/')
        await expect(page.getByRole('link', { name: ownerName }).first()).toBeVisible()
      },
    )
  })
})
