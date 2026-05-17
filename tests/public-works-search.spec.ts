import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'
import { createBlogFixture, createWorkFixture } from './helpers/content-fixtures'

test('public study search updates query while typing without searchMode', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Searchable Study',
    html: '<p>Searchable study fixture body.</p>',
    tags: ['search-fixture'],
  })

  await page.goto('/blog')
  await expect.poll(() => new URL(page.url()).searchParams.get('pageSize')).not.toBeNull()

  const studySearchForm = page.getByRole('search')
  const studySearchInput = studySearchForm.getByRole('textbox', { name: 'Search studies' })

  await measureStep(
    testInfo,
    'Study live search debounce',
    'publicSearch',
    async () => {
      await studySearchInput.fill(blog.title)
    },
    async () => {
      await expect.poll(() => new URL(page.url()).searchParams.get('query')).toBe(blog.title)
      await expect.poll(() => new URL(page.url()).searchParams.get('searchMode')).toBeNull()
      await expect(studySearchInput).toHaveValue(blog.title)
      await expect(page.getByTestId('blog-card').first()).toContainText(blog.title)
    },
  )
})

test('public works search updates query while typing without searchMode', async ({ page, request }, testInfo) => {
  const work = await createWorkFixture(request, testInfo, {
    titlePrefix: 'Searchable Work',
    html: '<p>Searchable work fixture body.</p>',
    category: 'Search Fixture',
    tags: ['search-fixture'],
  })

  await page.goto('/works')
  await expect.poll(() => new URL(page.url()).searchParams.get('pageSize')).not.toBeNull()

  const worksSearchForm = page.getByRole('search')
  const worksSearchInput = worksSearchForm.getByRole('textbox', { name: 'Search work' })

  await measureStep(
    testInfo,
    'Works live search debounce',
    'publicSearch',
    async () => {
      await worksSearchInput.fill(work.title)
    },
    async () => {
      await expect.poll(() => new URL(page.url()).searchParams.get('query')).toBe(work.title)
      await expect.poll(() => new URL(page.url()).searchParams.get('searchMode')).toBeNull()
      await expect(worksSearchInput).toHaveValue(work.title)
      await expect(page.getByTestId('work-card').first()).toContainText(work.title)
    },
  )
})
