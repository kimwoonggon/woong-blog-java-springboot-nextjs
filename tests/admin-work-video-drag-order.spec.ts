import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('AF-062 saved work videos can be reordered by drag and drop and the public order updates', async ({ page }) => {
  const title = `Video Drag Order ${Date.now()}`
  const editor = page.locator('.tiptap.ProseMirror').first()

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await editor.fill('Drag reorder coverage.')

  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/9bZkp7q19f0')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json() as { id: string; slug: string }
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })

  const savedCards = page.getByTestId('saved-video-card')
  await expect(savedCards).toHaveCount(2)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/videos/order') && res.request().method() === 'PUT' && res.ok()),
    page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="saved-video-card"]')) as HTMLElement[]
      const source = cards[0]
      const target = cards[1]
      if (!source || !target) {
        throw new Error('Saved video cards not found for drag reorder test')
      }

      const dataTransfer = new DataTransfer()
      source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }))
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }))
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
    }),
  ])

  const embeds = page.locator('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]')
  await expect(embeds.first()).toHaveAttribute('src', /9bZkp7q19f0/)

  await page.goto(`/works/${created.slug}`)
  const publicEmbeds = page.locator('iframe[src*="youtube-nocookie.com/embed/"]')
  await expect(publicEmbeds.first()).toHaveAttribute('src', /9bZkp7q19f0/)
})
