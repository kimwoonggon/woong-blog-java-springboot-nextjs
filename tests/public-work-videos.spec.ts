import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('public work detail renders uploaded and youtube videos when present', async ({ page }) => {
  const title = `Public Video Flow ${Date.now()}`
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Public video work')
  await page.getByLabel('YouTube URL or ID').fill('dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/sample-video.mp4'))

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })

  await page.goto(`/works/${created.slug}`)
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toBeVisible()
  await expect(page.locator('video')).toHaveCount(1, { timeout: 20000 })
})

test('PF-041 public work detail lets visitors play and pause an uploaded video', async ({ page }) => {
  const title = `Public Video Playback ${Date.now()}`
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Playback coverage for an uploaded public video')
  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/sample-video.mp4'))

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create with 1 Video|Create with Videos/ }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })

  await page.goto(`/works/${created.slug}`)
  const video = page.locator('video').first()
  await expect(video).toBeVisible()

  await video.evaluate((node) => {
    const media = node as HTMLVideoElement
    media.muted = true
    media.playsInline = true
    void media.play().catch(() => undefined)
  })

  await expect
    .poll(async () => {
      return video.evaluate((node) => {
        const media = node as HTMLVideoElement
        return {
          paused: media.paused,
          currentTime: media.currentTime,
          readyState: media.readyState,
        }
      })
    }, { timeout: 20000 })
    .toMatchObject({
      paused: false,
      readyState: expect.any(Number),
    })

  await expect
    .poll(async () => video.evaluate((node) => (node as HTMLVideoElement).currentTime), { timeout: 20000 })
    .toBeGreaterThan(0)

  await video.evaluate((node) => {
    ;(node as HTMLVideoElement).pause()
  })
  await expect.poll(async () => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true)
})

test('PF-043 public work detail keeps public video render order aligned with saved sort order', async ({ page }) => {
  const title = `Public Video Order ${Date.now()}`
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Render order coverage for public work videos')

  await page.getByLabel('YouTube URL or ID').fill('dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/sample-video.mp4'))
  await page.getByLabel('YouTube URL or ID').fill('9bZkp7q19f0')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create with 3 Videos|Create with Videos/ }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })

  await page.goto(`/works/${created.slug}`)

  const leadVideo = page.getByTestId('work-lead-video')
  await expect(leadVideo).toBeVisible()
  await expect(leadVideo.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toBeVisible()

  const moreVideos = page.getByTestId('work-more-videos')
  await moreVideos.getByText(/More videos \(2\)/).click()

  const orderedMedia = moreVideos.locator('iframe, video')
  await expect(orderedMedia).toHaveCount(2)
  await expect(orderedMedia.nth(0)).toHaveJSProperty('tagName', 'VIDEO')
  await expect(orderedMedia.nth(1)).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/9bZkp7q19f0/)
})

test('PF-044 public work detail exposes hover preview near the native progress region and desktop resize modes for uploaded videos', async ({ page }) => {
  const title = `Public Video Preview ${Date.now()}`
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Preview coverage for public work videos')
  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/sample-video.mp4'))

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create with 1 Video|Create with Videos/ }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })

  await expect
    .poll(async () => {
      const apiResponse = await page.request.get(`/api/public/works/${created.slug}`)
      if (!apiResponse.ok()) {
        return false
      }

      const payload = await apiResponse.json() as {
        videos?: Array<{
          timelinePreviewSpriteUrl?: string | null
          timelinePreviewVttUrl?: string | null
          timeline_preview_sprite_url?: string | null
          timeline_preview_vtt_url?: string | null
        }>
      }

      return payload.videos?.some((video) => (
        (video.timelinePreviewSpriteUrl ?? video.timeline_preview_sprite_url)
        && (video.timelinePreviewVttUrl ?? video.timeline_preview_vtt_url)
      )) ?? false
    }, {
      timeout: 60_000,
      message: 'Expected uploaded work video preview assets to finish processing',
    })
    .toBe(true)

  await page.goto(`/works/${created.slug}`)

  const player = page.getByTestId('work-video-player').first()
  const video = page.locator('video').first()
  await expect(player).toHaveAttribute('data-size-mode', 'wide')
  await expect(player).toHaveAttribute('data-preview-ready', 'true')
  await expect(video).toHaveAttribute('controls', '')
  await expect(page.getByTestId('work-video-preview-region')).toHaveCount(0)
  await expect.poll(async () => video.evaluate((node) => Number.isFinite((node as HTMLVideoElement).duration) && (node as HTMLVideoElement).duration > 0)).toBe(true)
  await expect(page.getByTestId('work-video-center-play').first()).toBeVisible()

  await page.getByTestId('work-video-size-fit').first().click()
  await expect(player).toHaveAttribute('data-size-mode', 'fit')
  await page.getByTestId('work-video-size-theater').first().click()
  await expect(player).toHaveAttribute('data-size-mode', 'theater')
  await expect.poll(async () => {
    const frameBox = await page.getByTestId('work-video-frame').first().boundingBox()
    const tocBox = await page.getByTestId('work-toc-rail').boundingBox()
    if (!frameBox || !tocBox) {
      return false
    }

    return frameBox.x < tocBox.x + tocBox.width
      && frameBox.x + frameBox.width > tocBox.x
      && frameBox.y < tocBox.y + tocBox.height
      && frameBox.y + frameBox.height > tocBox.y
  }).toBe(false)

  await page.getByTestId('work-video-center-play').first().click()
  await expect.poll(async () => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false)
  await expect(page.getByTestId('work-video-center-play').first()).toBeHidden()

  await video.scrollIntoViewIfNeeded()
  const videoBox = await video.boundingBox()
  if (!videoBox) {
    throw new Error('Expected video bounding box for preview hover assertions')
  }

  await page.mouse.move(videoBox.x + (videoBox.width * 0.5), videoBox.y + videoBox.height - 40)
  await expect(page.getByTestId('work-video-timeline-preview').first()).toBeVisible()
})

test('PF-045 mobile public work detail disables timeline preview on touch devices', async ({ page }) => {
  const title = `Public Video Mobile Preview ${Date.now()}`
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Mobile preview disable coverage for public work videos')
  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/sample-video.mp4'))

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create with 1 Video|Create with Videos/ }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })

  await expect
    .poll(async () => {
      const apiResponse = await page.request.get(`/api/public/works/${created.slug}`)
      if (!apiResponse.ok()) {
        return false
      }

      const payload = await apiResponse.json() as {
        videos?: Array<{
          timeline_preview_sprite_url?: string | null
          timeline_preview_vtt_url?: string | null
        }>
      }

      return payload.videos?.some((video) => video.timeline_preview_sprite_url && video.timeline_preview_vtt_url) ?? false
    }, { timeout: 60_000 })
    .toBe(true)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/works/${created.slug}`)

  const video = page.locator('video').first()
  await expect(video).toBeVisible()
  await expect(page.getByTestId('work-video-preview-region')).toHaveCount(0)

  await video.click({ position: { x: 40, y: 40 } })
  await expect(page.getByTestId('work-video-timeline-preview')).toHaveCount(0)
})
