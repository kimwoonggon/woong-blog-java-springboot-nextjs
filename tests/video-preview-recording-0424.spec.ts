import { copyFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import type { APIRequestContext } from '@playwright/test'
import { expect, test } from './helpers/performance-test'

test.use({
  storageState: 'test-results/playwright/admin-storage-state.json',
  video: 'on',
})

test.setTimeout(180_000)

const OUTPUT_DIR = path.resolve('tests/playwright/0424test/video-preview')
const LONG_VIDEO_FIXTURE = path.resolve('tests/fixtures/preview-long.mp4')
const OUTPUT_WEBM = 'work-video-hover-preview-long.webm'

async function waitForNonEmptyFile(filePath: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const stats = await stat(filePath).catch(() => null)
    if (stats && stats.size > 0) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

function ensureLongPreviewFixture() {
  if (existsSync(LONG_VIDEO_FIXTURE)) {
    return
  }

  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'testsrc=size=960x540:rate=30',
    '-t', '18',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    LONG_VIDEO_FIXTURE,
  ], { stdio: 'ignore' })
}

async function findExistingPreviewWork(request: APIRequestContext) {
  const response = await request.get('/api/public/works?page=1&pageSize=100')
  expect(response.ok()).toBeTruthy()
  const payload = await response.json() as {
    items?: Array<{
      slug?: string
      title?: string
    }>
  }

  const candidates = payload.items?.filter((item) => item.slug && item.title?.startsWith('Recording Long Video Preview')) ?? []
  for (const candidate of candidates) {
    const detailResponse = await request.get(`/api/public/works/${candidate.slug}`)
    if (!detailResponse.ok()) {
      continue
    }

    const detail = await detailResponse.json() as {
      videos?: Array<{
        timelinePreviewSpriteUrl?: string | null
        timelinePreviewVttUrl?: string | null
        timeline_preview_sprite_url?: string | null
        timeline_preview_vtt_url?: string | null
      }>
    }

    if (detail.videos?.some((video) => (
      (video.timelinePreviewSpriteUrl ?? video.timeline_preview_sprite_url)
      && (video.timelinePreviewVttUrl ?? video.timeline_preview_vtt_url)
    ))) {
      return candidate.slug!
    }
  }

  return null
}

test.beforeAll(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true })
  ensureLongPreviewFixture()
})

test.afterEach(async ({ page }) => {
  const video = page.video()
  if (!video) {
    return
  }

  await page.close()
  const sourcePath = await video.path()
  await waitForNonEmptyFile(sourcePath)
  await copyFile(sourcePath, path.join(OUTPUT_DIR, OUTPUT_WEBM))
})

test('records a long uploaded work video hover preview after processing', async ({ page, request }) => {
  const existingSlug = process.env.RECORDING_PREVIEW_WORK_SLUG ?? await findExistingPreviewWork(request)
  test.skip(!existingSlug, 'No existing long preview-capable work was found in this environment.')

  await page.goto(`/works/${existingSlug}`)

  const player = page.getByTestId('work-video-player').first()
  const video = page.locator('video').first()
  await expect(player).toBeVisible()
  await expect(player).toHaveAttribute('data-preview-ready', 'true')
  await expect(page.getByTestId('work-video-preview-region')).toHaveCount(0)
  await video.scrollIntoViewIfNeeded()
  await expect.poll(async () => video.evaluate((node) => Number.isFinite((node as HTMLVideoElement).duration) && (node as HTMLVideoElement).duration > 0)).toBe(true)
  await page.waitForTimeout(1000)

  const videoBox = await video.boundingBox()
  if (!videoBox) {
    throw new Error('Expected video bounding box for recording')
  }

  const hoverPoints = [0.18, 0.42, 0.74]
  for (const point of hoverPoints) {
    await page.mouse.move(
      videoBox.x + (videoBox.width * point),
      videoBox.y + videoBox.height - 40,
    )
    await expect(page.getByTestId('work-video-timeline-preview')).toBeVisible()
    await page.waitForTimeout(1200)
  }
})
