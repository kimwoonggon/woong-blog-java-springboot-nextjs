import { expect, test, type APIRequestContext, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function expectResponsiveTablePagination(
  page: Page,
  path: string,
  rowTestId: string,
  expectedMaxRows: number,
) {
  await page.goto(path)
  const rows = page.getByTestId(rowTestId)
  const counter = page.getByText(/^Page \d+ of \d+$/).first()

  await expect(rows.first()).toBeVisible()
  await expect(rows).toHaveCount(expectedMaxRows)
  const pageSizeParam = new URL(page.url()).searchParams.get('pageSize')
  if (pageSizeParam !== null) {
    expect(pageSizeParam).toBe(String(expectedMaxRows))
  }
  const readCounter = async () => ((await counter.textContent()) ?? '').trim()
  await expect.poll(readCounter).toMatch(/^Page 1 of \d+$/)
  const initialCounter = await readCounter()
  const initialMatch = initialCounter.match(/^Page\s+1\s+of\s+(\d+)$/)
  expect(Number(initialMatch?.[1] ?? '1')).toBeGreaterThan(1)

  await page.getByRole('button', { name: 'Next page' }).click()
  await expect.poll(readCounter).toMatch(/^Page 2 of \d+$/)
  await expect(rows.first()).toBeVisible()
  await expect(rows.count()).resolves.toBeLessThanOrEqual(expectedMaxRows)

  await page.getByRole('button', { name: 'Previous page' }).click()
  await expect.poll(readCounter).toMatch(/^Page 1 of \d+$/)
}

async function getCsrf(request: APIRequestContext) {
  const csrfResponse = await request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  return await csrfResponse.json() as { requestToken: string; headerName: string }
}

async function seedBlogs(request: APIRequestContext, count: number) {
  if (count <= 0) {
    return
  }

  const csrf = await getCsrf(request)
  for (let index = 0; index < count; index += 1) {
    const title = `Pagination Blog Seed ${Date.now()} ${index}`
    const response = await request.post('/api/admin/blogs', {
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.requestToken,
      },
      data: {
        title,
        excerpt: `Seeded excerpt for ${title}`,
        tags: ['playwright', 'pagination'],
        published: true,
        contentJson: JSON.stringify({ html: `<p>${title}</p>` }),
      },
    })
    expect(response.ok()).toBeTruthy()
  }
}

async function seedBlogsWithPrefix(page: Page, prefix: string, count: number) {
  await page.evaluate(async ({ seedPrefix, seedCount }) => {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'include' })
    if (!csrfResponse.ok) {
      throw new Error(`Failed to fetch CSRF token: ${csrfResponse.status}`)
    }

    const csrf = await csrfResponse.json() as { requestToken: string; headerName: string }

    for (let index = 0; index < seedCount; index += 1) {
      const title = `${seedPrefix} ${String(index + 1).padStart(2, '0')}`
      const response = await fetch('/api/admin/blogs', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [csrf.headerName]: csrf.requestToken,
        },
        body: JSON.stringify({
          title,
          excerpt: `Seeded excerpt for ${title}`,
          tags: ['playwright', 'pagination', seedPrefix],
          published: true,
          contentJson: JSON.stringify({ html: `<p>${title}</p>` }),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to seed blog "${title}": ${response.status} ${await response.text()}`)
      }
    }
  }, { seedPrefix: prefix, seedCount: count })
}

async function seedWorks(request: APIRequestContext, count: number) {
  if (count <= 0) {
    return
  }

  const csrf = await getCsrf(request)
  for (let index = 0; index < count; index += 1) {
    const title = `Pagination Work Seed ${Date.now()} ${index}`
    const response = await request.post('/api/admin/works', {
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.requestToken,
      },
      data: {
        title,
        category: 'pagination',
        period: '2026.04',
        tags: ['playwright', 'pagination'],
        published: true,
        contentJson: JSON.stringify({ html: `<p>${title}</p>` }),
        allPropertiesJson: JSON.stringify({}),
        thumbnailAssetId: null,
        iconAssetId: null,
      },
    })
    expect(response.ok()).toBeTruthy()
  }
}

function normalizedSearchIncludes(value: string, query: string) {
  const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  return normalize(value).includes(normalize(query))
}

async function seedNormalizedSearchFixtures(request: APIRequestContext) {
  const csrf = await getCsrf(request)
  const suffix = Date.now()
  const blogTitle = `T,B,N 안녕하세요 Blog ${suffix}`
  const workTitle = `T,B,N 안녕하세요 Work ${suffix}`

  const blogResponse = await request.post('/api/admin/blogs', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      title: blogTitle,
      excerpt: `Seeded excerpt for ${blogTitle}`,
      tags: ['normalized-search', 'T,B,N'],
      published: true,
      contentJson: JSON.stringify({ html: `<p>${blogTitle}</p>` }),
    },
  })
  expect(blogResponse.ok()).toBeTruthy()

  const workResponse = await request.post('/api/admin/works', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      title: workTitle,
      category: 'normalized-search',
      period: '2026.04',
      tags: ['normalized-search', 'T,B,N'],
      published: true,
      contentJson: JSON.stringify({ html: `<p>${workTitle}</p>` }),
      allPropertiesJson: JSON.stringify({}),
      thumbnailAssetId: null,
      iconAssetId: null,
    },
  })
  expect(workResponse.ok()).toBeTruthy()

  return { blogTitle, workTitle }
}

test('admin blog page supports title search and compact pagination controls', async ({ page }) => {
  await page.goto('/admin/blog')

  const rows = page.getByTestId('admin-blog-row')
  await expect(rows.first()).toBeVisible()

  const titles = await rows.locator('td:nth-child(2) a').allTextContents()
  const searchTitle = titles.find(Boolean)?.trim() ?? ''
  const hiddenTitle = titles.find((title) => title.trim() && title.trim() !== searchTitle)?.trim() ?? ''

  await page.getByLabel('Search blog titles').fill(searchTitle)
  await expect(rows.locator('td:nth-child(2) a', { hasText: searchTitle }).first()).toBeVisible()
  if (hiddenTitle && !normalizedSearchIncludes(hiddenTitle, searchTitle)) {
    await expect(rows.locator('td:nth-child(2) a', { hasText: hiddenTitle })).toHaveCount(0)
  }

  await page.getByLabel('Search blog titles').clear()

  const counter = page.getByText(/^Page \d+ of \d+$/).first()
  const initialCounter = (await counter.textContent())?.trim() ?? 'Page 1 of 1'
  const match = initialCounter.match(/^Page\s+(\d+)\s+of\s+(\d+)$/)
  const initialTotal = Number(match?.[2] ?? '1')

  await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible()

  if (initialTotal > 1) {
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(counter).not.toHaveText(initialCounter)
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(counter).toHaveText(/Page 1 of \d+/)
  }
})

test('admin blog pagination adapts the row count across desktop, tablet, and mobile widths', async ({ page }) => {
  await page.goto('/admin/blog')
  const existingBlogCount = await page.getByTestId('admin-blog-row').count()
  await seedBlogs(page.context().request, Math.max(0, 15 - existingBlogCount))

  await page.setViewportSize({ width: 1440, height: 1200 })
  await expectResponsiveTablePagination(page, '/admin/blog', 'admin-blog-row', 12)

  await page.setViewportSize({ width: 900, height: 1800 })
  await expectResponsiveTablePagination(page, '/admin/blog', 'admin-blog-row', 8)

  await page.setViewportSize({ width: 600, height: 1200 })
  await expectResponsiveTablePagination(page, '/admin/blog', 'admin-blog-row', 6)
})

test('admin blog edit and delete keep the current filtered page location', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })

  const prefix = `Playwright ReturnTo ${Date.now()}`
  const expectedPathname = '/admin/blog'
  await page.goto(expectedPathname)
  await seedBlogsWithPrefix(page, prefix, 14)
  await page.goto(expectedPathname)

  await page.getByLabel('Search blog titles').fill(prefix)

  const counter = page.getByText(/^Page \d+ of \d+$/).first()
  await expect(counter).toHaveText('Page 1 of 2')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(counter).toHaveText('Page 2 of 2')

  const rows = page.getByTestId('admin-blog-row')
  await expect(rows).toHaveCount(2)

  const targetRow = rows.first()
  const originalTitle = (await targetRow.locator('td:nth-child(2) a').textContent())?.trim()
  expect(originalTitle).toBeTruthy()
  const updatedTitle = `${originalTitle} updated`

  await targetRow.getByTitle('Edit').click()
  await expect(page).toHaveURL(/\/admin\/blog\/.+/)
  await page.getByLabel('Title').fill(updatedTitle)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Post' }).click(),
  ])

  await expect.poll(() => {
    const url = new URL(page.url())
    return JSON.stringify({
      pathname: url.pathname,
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
      query: url.searchParams.get('query'),
    })
  }).toBe(JSON.stringify({
    pathname: expectedPathname,
    page: '2',
    pageSize: '12',
    query: prefix,
  }))
  await expect(counter).toHaveText('Page 2 of 2')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: updatedTitle }).first()).toBeVisible()

  const deleteRow = page.getByTestId('admin-blog-row').filter({ hasText: updatedTitle }).first()
  await deleteRow.getByTitle('Delete').click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/blogs/')
      && response.request().method() === 'DELETE'
      && response.ok(),
    ),
    page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click(),
  ])

  await expect.poll(() => {
    const url = new URL(page.url())
    return JSON.stringify({
      pathname: url.pathname,
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
      query: url.searchParams.get('query'),
    })
  }).toBe(JSON.stringify({
    pathname: expectedPathname,
    page: '2',
    pageSize: '12',
    query: prefix,
  }))
  await expect(counter).toHaveText('Page 2 of 2')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: updatedTitle })).toHaveCount(0)
})

test('admin works page supports title search and compact pagination controls', async ({ page }) => {
  await page.goto('/admin/works')

  const rows = page.getByTestId('admin-work-row')
  await expect(rows.first()).toBeVisible()

  const titles = await rows.locator('td:nth-child(3) a').allTextContents()
  const searchTitle = titles.find(Boolean)?.trim() ?? ''
  const hiddenTitle = titles.find((title) => title.trim() && title.trim() !== searchTitle)?.trim() ?? ''

  await page.getByLabel('Search work titles').fill(searchTitle)
  await expect(rows.locator('td:nth-child(3) a', { hasText: searchTitle }).first()).toBeVisible()
  if (hiddenTitle && !normalizedSearchIncludes(hiddenTitle, searchTitle)) {
    await expect(rows.locator('td:nth-child(3) a', { hasText: hiddenTitle })).toHaveCount(0)
  }

  await page.getByLabel('Search work titles').clear()

  const counter = page.getByText(/^Page \d+ of \d+$/).first()
  const initialCounter = (await counter.textContent())?.trim() ?? 'Page 1 of 1'
  const match = initialCounter.match(/^Page\s+(\d+)\s+of\s+(\d+)$/)
  const initialTotal = Number(match?.[2] ?? '1')

  await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'First' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Last' })).toHaveCount(0)

  if (initialTotal > 1) {
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(counter).not.toHaveText(initialCounter)
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(counter).toHaveText(/Page 1 of \d+/)
  }
})

test('admin search ignores punctuation, spacing, and case without resetting typed input', async ({ page }) => {
  const { blogTitle, workTitle } = await seedNormalizedSearchFixtures(page.context().request)

  await page.goto('/admin/blog')
  const blogSearch = page.getByLabel('Search blog titles')
  await expect(blogSearch).toBeEnabled()
  await blogSearch.pressSequentially('tbn')
  await expect(blogSearch).toHaveValue('tbn')
  await expect(page.getByTestId('admin-blog-row').filter({ hasText: blogTitle }).first()).toBeVisible()
  await expect.poll(() => {
    const url = new URL(page.url())
    return url.searchParams.get('query')
  }).toBe('tbn')

  await page.goto('/admin/works')
  const workSearch = page.getByLabel('Search work titles')
  await expect(workSearch).toBeEnabled()
  await workSearch.pressSequentially('TBN')
  await expect(workSearch).toHaveValue('TBN')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: workTitle }).first()).toBeVisible()
  await expect.poll(() => {
    const url = new URL(page.url())
    return url.searchParams.get('query')
  }).toBe('TBN')

  await page.goto('/admin/dashboard')
  const worksSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Works' }) }).first()
  const blogsSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Blog Posts' }) }).first()

  await worksSection.getByLabel('Works title search').fill('tbn')
  await expect(worksSection.getByRole('heading', { name: workTitle })).toBeVisible()
  await blogsSection.getByLabel('Blog Posts title search').fill('TB')
  await expect(blogsSection.getByRole('heading', { name: blogTitle })).toBeVisible()
})

test('admin works pagination adapts the row count across desktop, tablet, and mobile widths', async ({ page }) => {
  await page.goto('/admin/works')
  const existingWorkCount = await page.getByTestId('admin-work-row').count()
  await seedWorks(page.context().request, Math.max(0, 15 - existingWorkCount))

  await page.setViewportSize({ width: 1440, height: 1200 })
  await expectResponsiveTablePagination(page, '/admin/works', 'admin-work-row', 12)

  await page.setViewportSize({ width: 900, height: 1800 })
  await expectResponsiveTablePagination(page, '/admin/works', 'admin-work-row', 8)

  await page.setViewportSize({ width: 600, height: 1200 })
  await expectResponsiveTablePagination(page, '/admin/works', 'admin-work-row', 6)
})

test('admin work edit and delete keep the current filtered page location', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })

  const prefix = `Playwright Work ReturnTo ${Date.now()}`
  const expectedPathname = '/admin/works'
  await page.goto(expectedPathname)

  const csrfResponse = await page.request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  const csrf = await csrfResponse.json() as { requestToken: string; headerName: string }
  for (let index = 0; index < 14; index += 1) {
    const title = `${prefix} ${String(index + 1).padStart(2, '0')}`
    const response = await page.request.post('/api/admin/works', {
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.requestToken,
      },
      data: {
        title,
        category: 'pagination',
        period: '2026.04',
        tags: ['playwright', 'pagination', prefix],
        published: true,
        contentJson: JSON.stringify({ html: `<p>${title}</p>` }),
        allPropertiesJson: JSON.stringify({}),
        thumbnailAssetId: null,
        iconAssetId: null,
      },
    })
    expect(response.ok()).toBeTruthy()
  }

  await page.goto(expectedPathname)
  await page.getByLabel('Search work titles').fill(prefix)

  const counter = page.getByText(/^Page \d+ of \d+$/).first()
  await expect(counter).toHaveText('Page 1 of 2')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(counter).toHaveText('Page 2 of 2')

  const rows = page.getByTestId('admin-work-row')
  await expect(rows).toHaveCount(2)

  const targetRow = rows.first()
  const originalTitle = (await targetRow.locator('td:nth-child(3) a').textContent())?.trim()
  expect(originalTitle).toBeTruthy()
  const updatedTitle = `${originalTitle} updated`

  await targetRow.getByTitle('Edit').click()
  await expect(page).toHaveURL(/\/admin\/works\/.+/)
  await page.getByLabel('Title').fill(updatedTitle)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Work' }).click(),
  ])

  await expect.poll(() => {
    const url = new URL(page.url())
    return JSON.stringify({
      pathname: url.pathname,
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
      query: url.searchParams.get('query'),
    })
  }).toBe(JSON.stringify({
    pathname: expectedPathname,
    page: '2',
    pageSize: '12',
    query: prefix,
  }))
  await expect(counter).toHaveText('Page 2 of 2')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: updatedTitle }).first()).toBeVisible()

  const deleteRow = page.getByTestId('admin-work-row').filter({ hasText: updatedTitle }).first()
  await deleteRow.getByTitle('Delete').click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/works/')
      && response.request().method() === 'DELETE'
      && response.ok(),
    ),
    page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click(),
  ])

  await expect.poll(() => {
    const url = new URL(page.url())
    return JSON.stringify({
      pathname: url.pathname,
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
      query: url.searchParams.get('query'),
    })
  }).toBe(JSON.stringify({
    pathname: expectedPathname,
    page: '2',
    pageSize: '12',
    query: prefix,
  }))
  await expect(counter).toHaveText('Page 2 of 2')
  await expect(page.getByTestId('admin-work-row').filter({ hasText: updatedTitle })).toHaveCount(0)
})

test('admin dashboard supports independent title search for works and blog collections', async ({ page }) => {
  await page.goto('/admin/dashboard')

  const worksSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Works' }) }).first()
  const blogsSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Blog Posts' }) }).first()

  const workCards = worksSection.locator('[data-testid="works-card-link"] h3')
  const blogCards = blogsSection.locator('[data-testid="blog-posts-card-link"] h3')

  await expect(workCards.first()).toBeVisible()
  await expect(blogCards.first()).toBeVisible()

  const workTitles = await workCards.allTextContents()
  const searchWorkTitle = workTitles.find(Boolean)?.trim() ?? ''
  const hiddenWorkTitle = workTitles.find((title) => title.trim() && title.trim() !== searchWorkTitle)?.trim() ?? ''
  await worksSection.getByLabel('Works title search').fill(searchWorkTitle)
  await expect(worksSection.getByRole('heading', { name: searchWorkTitle })).toBeVisible()
  if (hiddenWorkTitle) {
    await expect(worksSection.getByRole('heading', { name: hiddenWorkTitle })).toHaveCount(0)
  }

  const blogTitles = await blogCards.allTextContents()
  const searchBlogTitle = blogTitles.find(Boolean)?.trim() ?? ''
  const hiddenBlogTitle = blogTitles.find((title) => title.trim() && title.trim() !== searchBlogTitle)?.trim() ?? ''
  await blogsSection.getByLabel('Blog Posts title search').fill(searchBlogTitle)
  await expect(blogsSection.getByRole('heading', { name: searchBlogTitle })).toBeVisible()
  if (hiddenBlogTitle) {
    await expect(blogsSection.getByRole('heading', { name: hiddenBlogTitle })).toHaveCount(0)
  }
})
