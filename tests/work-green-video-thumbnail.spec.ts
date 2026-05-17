import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('uploaded green-only mp4 generates and persists an automatic thumbnail', async ({ page }) => {
  const title = `Green Video Thumb ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Green-only video thumbnail verification')

  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/green-only.mp4'))
  await expect(page.getByText('green-only.mp4')).toBeVisible()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)

  await page.goto('/works')
  await expect(page.locator(`img[alt="${title}"]`).first()).toHaveAttribute('src', /\/media\/work-thumbnails\//)
})

test('uploaded green-only mp4 thumbnail is green at the pixel level', async ({ page }) => {
  const title = `Green Pixel Thumb ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Green-only pixel verification')

  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/green-only.mp4'))

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  const thumbnail = page.getByAltText('Work thumbnail preview')
  await expect(thumbnail).toBeVisible()

  const sampledPixel = await thumbnail.evaluate(async (img) => {
    const target = img as HTMLImageElement
    const loadedImage = new Image()
    loadedImage.crossOrigin = 'anonymous'
    loadedImage.src = target.currentSrc || target.src

    await new Promise<void>((resolve, reject) => {
      loadedImage.onload = () => resolve()
      loadedImage.onerror = () => reject(new Error('Failed to load thumbnail image'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = loadedImage.naturalWidth
    canvas.height = loadedImage.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('2d canvas context unavailable')
    }

    context.drawImage(loadedImage, 0, 0)
    const pixel = context.getImageData(
      Math.max(0, Math.floor(canvas.width / 2)),
      Math.max(0, Math.floor(canvas.height / 2)),
      1,
      1,
    ).data

    return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] }
  })

  expect(sampledPixel.g).toBeGreaterThan(80)
  expect(sampledPixel.g).toBeGreaterThan(sampledPixel.r * 1.5)
  expect(sampledPixel.g).toBeGreaterThan(sampledPixel.b * 1.5)
})
