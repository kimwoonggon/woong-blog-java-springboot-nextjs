import { expect, test } from './helpers/performance-test'

import { expectMermaidRendered } from './helpers/mermaid'
import { createBlogFixture, createWorkFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

function mermaidBlockHtml(code: string) {
  return `<mermaid-block data-code="${code.replace(/\n/g, '&#10;')}"></mermaid-block>`
}

test('public blog and work pages stay stable when mermaid content exists', async ({ page, request }, testInfo) => {
  const suffix = Date.now()
  const tag = `mermaid-independence-${suffix}`
  const mermaidCode = `sequenceDiagram
    participant User
    participant Frontend
    User->>Frontend: 로그인 클릭
    Frontend-->>User: 데이터 표시`
  const mermaidBlogTitle = `Mermaid Independent Blog ${suffix}`
  const plainBlogTitle = `Plain Independent Blog ${suffix}`
  const mermaidWorkTitle = `Mermaid Independent Work ${suffix}`
  const plainWorkTitle = `Plain Independent Work ${suffix}`

  const mermaidBlog = await createBlogFixture(request, testInfo, {
    titlePrefix: mermaidBlogTitle,
    html: `<p>${tag} Blog before diagram</p>${mermaidBlockHtml(mermaidCode)}<p>Blog after diagram</p>`,
    tags: [tag, 'mermaid'],
  })
  const plainBlog = await createBlogFixture(request, testInfo, {
    titlePrefix: plainBlogTitle,
    html: `<p>${tag} Plain blog body</p>`,
    tags: [tag, 'plain'],
  })
  const mermaidWork = await createWorkFixture(request, testInfo, {
    titlePrefix: mermaidWorkTitle,
    html: `<p>${tag} Work before diagram</p>${mermaidBlockHtml(mermaidCode)}<p>Work after diagram</p>`,
    tags: [tag, 'mermaid'],
    category: 'mermaid-independent',
  })
  const plainWork = await createWorkFixture(request, testInfo, {
    titlePrefix: plainWorkTitle,
    html: `<p>${tag} Plain work body</p>`,
    tags: [tag, 'plain'],
    category: 'mermaid-independent',
  })

  await page.goto(`/blog?query=${encodeURIComponent(tag)}&searchMode=content`)
  const blogGrid = page.getByTestId('blog-grid')
  await expect(page.getByTestId('blog-card').filter({ hasText: mermaidBlog.title }).first()).toBeVisible()
  await expect(page.getByTestId('blog-card').filter({ hasText: plainBlog.title }).first()).toBeVisible()
  await expect(blogGrid).not.toContainText('sequenceDiagram')
  await expect(blogGrid).not.toContainText('User->>Frontend')
  await expect(blogGrid).not.toContainText('data-code')

  await page.goto(`/works?query=${encodeURIComponent(tag)}&searchMode=content`)
  await expect(page.getByTestId('work-card').filter({ hasText: mermaidWork.title }).first()).toBeVisible()
  await expect(page.getByTestId('work-card').filter({ hasText: plainWork.title }).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText('sequenceDiagram')
  await expect(page.locator('main')).not.toContainText('User->>Frontend')
  await expect(page.locator('main')).not.toContainText('data-code')

  await page.goto(`/blog/${mermaidBlog.slug}`)
  await expect(page.getByTestId('blog-detail-title')).toHaveText(mermaidBlog.title)
  await expectMermaidRendered(page)
  const blogBody = page.getByTestId('blog-detail-body')
  await expect(blogBody.getByText(`${tag} Blog before diagram`)).toBeVisible()
  await expect(blogBody.getByText('Blog after diagram')).toBeVisible()
  await page.goto(`/blog/${plainBlog.slug}`)
  await expect(page.getByTestId('blog-detail-title')).toHaveText(plainBlog.title)
  await expect(page.getByText('Plain blog body')).toBeVisible()

  await page.goto(`/works/${mermaidWork.slug}`)
  await expect(page.getByTestId('work-detail-title')).toHaveText(mermaidWork.title)
  await expectMermaidRendered(page)
  const workBody = page.getByTestId('work-detail-body')
  await expect(workBody.getByText(`${tag} Work before diagram`)).toBeVisible()
  await expect(workBody.getByText('Work after diagram')).toBeVisible()
  const relatedNext = page.getByRole('button', { name: 'Go to next related page' })
  if (await relatedNext.isEnabled()) {
    await relatedNext.click()
    await expect(page).toHaveURL(/relatedPage=\d+/)
  }
  const relatedCard = page.getByTestId('related-work-card').first()
  if (await relatedCard.count()) {
    await relatedCard.click()
    await expect(page).toHaveURL(/\/works\/.+/)
  }

  await page.goto(`/works/${plainWork.slug}`)
  await expect(page.getByTestId('work-detail-title')).toHaveText(plainWork.title)
  await expect(page.getByTestId('work-detail-body').getByText(`${tag} Plain work body`)).toBeVisible()
})
