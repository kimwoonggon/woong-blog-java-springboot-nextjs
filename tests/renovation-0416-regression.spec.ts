import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('0416 public copy, light default, and Study navigation are visible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => window.localStorage.removeItem('theme'))
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')

  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByText('Creative portfolio')).toHaveCount(0)

  const banner = page.getByRole('banner')
  await expect(banner.getByRole('link', { name: 'Study', exact: true })).toBeVisible()
  await expect(banner.getByRole('link', { name: 'Blog', exact: true })).toHaveCount(0)
  await expect(banner.getByText('Portfolio')).toHaveCount(0)
  await expect(banner.getByText(/Works, writing, and experiments/i)).toHaveCount(0)

  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('menuitemradio')).toHaveCount(0)
})

test('0416 public detail pages hide excerpt callouts and keep current related items', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  await expect(page.locator('article header p')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'More Studies' })).toBeVisible()
  await expect(page.getByTestId('related-blog-current-card')).toContainText('Current')
  await expect(page.getByTestId('blog-prev-next')).toBeVisible()
  await expect(page.getByTestId('blog-prev-next').getByText('Previous').or(page.getByTestId('blog-prev-next').getByText('Next')).first()).toBeVisible()

  await page.goto('/works/seeded-work')

  await expect(page.locator('article header p')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'More Works' })).toBeVisible()
  await expect(page.getByTestId('related-work-current-card')).toContainText('Current')
  await expect(page.getByTestId('work-prev-next')).toBeVisible()
  await expect(page.getByTestId('work-prev-next').getByText('Previous').or(page.getByTestId('work-prev-next').getByText('Next')).first()).toBeVisible()
})

test('0416 detail and related navigation keep requested next/previous semantics', async ({ page }) => {
  await page.goto('/blog?page=2&pageSize=1')
  await page.getByTestId('blog-card').first().click()

  const blogNavLinks = page.getByTestId('blog-prev-next').getByRole('link')
  if (await blogNavLinks.count() >= 2) {
    await expect(blogNavLinks.nth(0)).toContainText('Next')
    await expect(blogNavLinks.nth(1)).toContainText('Previous')
  }

  const blogRelated = page.locator('section').filter({ has: page.getByRole('heading', { name: 'More Studies' }) })
  await expect(blogRelated.getByText(/\d+ visible/)).toBeVisible()
  await blogRelated.getByRole('button', { name: 'Go to previous related page' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('relatedPage')).toBe('1')
  await blogRelated.getByRole('button', { name: 'Go to next related page' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('relatedPage')).toBe('2')

  await page.goto('/works?page=2&pageSize=1')
  await page.getByTestId('work-card').first().click()

  const workNavLinks = page.getByTestId('work-prev-next').getByRole('link')
  if (await workNavLinks.count() >= 2) {
    await expect(workNavLinks.nth(0)).toContainText('Next')
    await expect(workNavLinks.nth(1)).toContainText('Previous')
  }
})

test('0416 Study search supports title and content modes through the URL', async ({ page }) => {
  const suffix = Date.now()
  const title = `Search Title Study ${suffix}`
  const contentToken = `content-token-${suffix}`

  await page.goto('/admin/blog')
  await page.evaluate(async ({ postTitle, token }) => {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'include' })
    if (!csrfResponse.ok) {
      throw new Error(`Failed to fetch CSRF token: ${csrfResponse.status}`)
    }

    const csrf = await csrfResponse.json() as { requestToken: string; headerName: string }
    const response = await fetch('/api/admin/blogs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.requestToken,
      },
      body: JSON.stringify({
        title: postTitle,
        excerpt: `Excerpt with ${token}`,
        tags: ['search'],
        published: true,
        contentJson: JSON.stringify({ html: `<p>Body text with ${token}</p>` }),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create searchable post: ${response.status} ${await response.text()}`)
    }
  }, { postTitle: title, token: contentToken })

  await page.goto(`/blog?query=${encodeURIComponent(title)}&searchMode=title&page=1&pageSize=12`)
  await expect(page.getByRole('textbox', { name: 'Search studies' })).toHaveValue(title)
  await expect.poll(() => new URL(page.url()).searchParams.get('searchMode')).toBe('title')
  await expect(page.getByTestId('blog-card')).toHaveCount(1)
  await expect(page.getByTestId('blog-card').first()).toContainText(title)

  await page.goto(`/blog?query=${encodeURIComponent(contentToken)}&searchMode=content&page=1&pageSize=12`)
  await expect(page.getByRole('textbox', { name: 'Search studies' })).toHaveValue(contentToken)
  await expect.poll(() => new URL(page.url()).searchParams.get('searchMode')).toBe('content')
  await expect(page.getByTestId('blog-card')).toHaveCount(1)
  await expect(page.getByTestId('blog-card').first()).toContainText(title)
})

test('0416 admin home edits read back in admin and public home', async ({ page }) => {
  const suffix = Date.now()
  const headline = `0416 headline ${suffix}`
  const intro = `0416 intro ${suffix}`
  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => {})
  })

  await page.goto('/admin/pages')
  await page.locator('#headline').fill(headline)
  await page.locator('#introText').fill(intro)

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/pages')
      && response.request().method() === 'PUT'
      && response.ok(),
    ),
    page.locator('#home-page-editor').getByRole('button', { name: 'Save Changes' }).click(),
  ])

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('#headline')).toHaveValue(headline)
  await expect(page.locator('#introText')).toHaveValue(intro)

  await page.goto('/')
  await expect.poll(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    const visibleHeadline = await page.getByRole('heading').first().textContent()
    const mainText = await page.locator('main').textContent()
    return (visibleHeadline?.includes(headline) ?? false) && (mainText?.includes(intro) ?? false)
  }, { timeout: 30_000 }).toBe(true)
})

test('0416 batch AI jobs refresh only on explicit user action', async ({ page }) => {
  let listCalls = 0

  await page.route('**/api/admin/ai/runtime-config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'codex',
        availableProviders: ['codex'],
        defaultModel: 'gpt-5.4',
        codexModel: 'gpt-5.4',
        codexReasoningEffort: 'medium',
        allowedCodexModels: ['gpt-5.4'],
        allowedCodexReasoningEfforts: ['medium'],
        batchConcurrency: 2,
        batchCompletedRetentionDays: 7,
      }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs') {
      await route.fallback()
      return
    }

    listCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [],
        runningCount: 0,
        queuedCount: 0,
        completedCount: 0,
        failedCount: 0,
        cancelledCount: 0,
      }),
    })
  })

  await page.goto('/admin/blog')
  await page.getByRole('button', { name: 'Batch AI Fix' }).click()
  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toBeVisible()
  await expect.poll(() => listCalls).toBe(1)

  await page.waitForTimeout(2500)
  expect(listCalls).toBe(1)

  await page.getByRole('button', { name: 'Refresh jobs' }).click()
  await expect.poll(() => listCalls).toBe(2)
})
