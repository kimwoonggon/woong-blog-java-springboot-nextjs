import { expect, test, type Locator, type Page } from './helpers/performance-test'
import { expectRgbClose, getColorChannels, gotoWithTheme } from './helpers/ui-improvement'

test.setTimeout(60_000)

function px(value: string) {
  return Number.parseFloat(value.replace('px', ''))
}

async function expectWhiteReadingSurface(page: Page, testId: string, contentRootSelector: string) {
  const body = page.getByTestId(testId)
  const contentRoot = page.locator(contentRootSelector)
  await expect(body).toBeVisible()
  await expect(contentRoot).toBeVisible()

  const [bodyBackground, contentBackground] = await Promise.all([
    getColorChannels(body, 'background-color'),
    getColorChannels(contentRoot, 'background-color'),
  ])

  expectRgbClose(bodyBackground, [255, 255, 255, 255], 3)
  expectRgbClose(contentBackground, [255, 255, 255, 255], 3)
}

async function expectWhiteSurface(locator: Locator) {
  await expect(locator).toBeVisible()
  const background = await getColorChannels(locator, 'background-color')
  expectRgbClose(background, [255, 255, 255, 255], 3)
}

test('VA-120 blog TOC stays visually separated from the article body', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/blog/seeded-blog')

  const toc = page.getByTestId('blog-toc')
  const body = page.getByTestId('blog-detail-body')
  await expect(toc).toBeVisible()
  await expect(body).toBeVisible()

  const styles = await toc.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      borderTopWidth: style.borderTopWidth,
      backgroundColor: style.backgroundColor,
    }
  })

  expect(px(styles.borderTopWidth)).toBeGreaterThan(0)
  expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

  const [bodyBox, tocBox] = await Promise.all([body.boundingBox(), toc.boundingBox()])
  expect(bodyBox).toBeTruthy()
  expect(tocBox).toBeTruthy()
  expect(bodyBox!.x + bodyBox!.width).toBeLessThanOrEqual(tocBox!.x - 24)
})

test('VA-121 blog body keeps readable paragraph line-height and spacing', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const paragraph = page.locator('#blog-detail-content p').filter({ hasText: /\S/ }).first()
  await expect(paragraph).toBeVisible()

  const metrics = await paragraph.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      marginTop: style.marginTop,
      marginBottom: style.marginBottom,
    }
  })

  const ratio = px(metrics.lineHeight) / px(metrics.fontSize)
  expect(ratio).toBeGreaterThanOrEqual(1.5)
  expect(px(metrics.marginBottom)).toBeGreaterThan(0)
  expect(px(metrics.marginTop)).toBeGreaterThanOrEqual(0)
})

test('VA-122 blog previous and next cards keep balanced sizing and shared chrome', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const nav = page.getByTestId('blog-prev-next')
  await expect(nav).toBeVisible()
  const links = nav.getByRole('link')
  expect(await links.count()).toBeGreaterThanOrEqual(1)

  if (await links.count() > 1) {
    const [first, second] = await Promise.all([links.nth(0).boundingBox(), links.nth(1).boundingBox()])
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(Math.abs((first?.height ?? 0) - (second?.height ?? 0))).toBeLessThanOrEqual(12)
  }

  const firstLink = links.first()
  const chrome = await firstLink.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      borderTopWidth: style.borderTopWidth,
      backgroundColor: style.backgroundColor,
    }
  })

  expect(px(chrome.borderTopWidth)).toBeGreaterThan(0)
  expect(chrome.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
})

test('VA-123 Work and Study detail pages keep long-form reading bodies on a white surface', async ({ page }) => {
  await gotoWithTheme(page, '/blog/seeded-blog', 'light')
  await expectWhiteReadingSurface(page, 'blog-detail-body', '#blog-detail-content')
  await expectWhiteReadingSurface(page, 'blog-detail-page-shell', '#blog-detail-content')

  await gotoWithTheme(page, '/works/seeded-work', 'light')
  await expectWhiteReadingSurface(page, 'work-detail-body', '#work-detail-content')
  await expectWhiteReadingSurface(page, 'work-detail-page-shell', '#work-detail-content')
})

test('VA-124 Work and Study TOC rails keep a readable desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/blog/seeded-blog')
  const blogTocBox = await page.getByTestId('blog-toc').boundingBox()
  expect(blogTocBox).toBeTruthy()
  expect(blogTocBox!.width).toBeGreaterThanOrEqual(280)

  await page.goto('/works/seeded-work')
  const workTocBox = await page.getByTestId('work-toc-rail').boundingBox()
  expect(workTocBox).toBeTruthy()
  expect(workTocBox!.width).toBeGreaterThanOrEqual(280)
})

test('VA-125 Work and Study detail pages keep the article body centered independently of the TOC rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/blog/seeded-blog')
  const blogBody = page.getByTestId('blog-detail-body')
  const blogToc = page.getByTestId('blog-toc')
  await expect(blogBody).toBeVisible()
  await expect(blogToc).toBeVisible()
  const [blogBodyBox, blogTocBox] = await Promise.all([blogBody.boundingBox(), blogToc.boundingBox()])
  expect(blogBodyBox).toBeTruthy()
  expect(blogTocBox).toBeTruthy()
  expect(Math.abs(blogBodyBox!.x + blogBodyBox!.width / 2 - 720)).toBeLessThanOrEqual(4)
  expect(blogTocBox!.x - (blogBodyBox!.x + blogBodyBox!.width)).toBeGreaterThanOrEqual(24)
  expect(blogTocBox!.width).toBeGreaterThanOrEqual(280)

  await page.goto('/works/seeded-work')
  const workBody = page.getByTestId('work-detail-body')
  const workToc = page.getByTestId('work-toc-rail')
  await expect(workBody).toBeVisible()
  await expect(workToc).toBeVisible()
  const [workBodyBox, workTocBox] = await Promise.all([workBody.boundingBox(), workToc.boundingBox()])
  expect(workBodyBox).toBeTruthy()
  expect(workTocBox).toBeTruthy()
  expect(Math.abs(workBodyBox!.x + workBodyBox!.width / 2 - 720)).toBeLessThanOrEqual(4)
  expect(workTocBox!.x - (workBodyBox!.x + workBodyBox!.width)).toBeGreaterThanOrEqual(24)
  expect(workTocBox!.width).toBeGreaterThanOrEqual(280)
})

test('VA-126 Work and Study detail light mode uses white base surfaces for body, TOC, and related cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await gotoWithTheme(page, '/blog/seeded-blog', 'light')
  await expectWhiteSurface(page.locator('body'))
  await expectWhiteSurface(page.getByTestId('blog-detail-page-shell'))
  await expectWhiteSurface(page.getByTestId('blog-detail-body'))
  await expectWhiteSurface(page.locator('#blog-detail-content'))
  await expectWhiteSurface(page.getByTestId('blog-toc'))
  await expectWhiteSurface(page.getByTestId('blog-related-shell'))
  await expectWhiteSurface(page.getByTestId('related-blog-card').first().locator('article'))

  await gotoWithTheme(page, '/works/seeded-work', 'light')
  await expectWhiteSurface(page.locator('body'))
  await expectWhiteSurface(page.getByTestId('work-detail-page-shell'))
  await expectWhiteSurface(page.getByTestId('work-detail-body'))
  await expectWhiteSurface(page.locator('#work-detail-content'))
  await expectWhiteSurface(page.getByTestId('work-toc-nav'))
  await expectWhiteSurface(page.getByTestId('work-related-shell'))
  await expectWhiteSurface(page.getByTestId('related-work-card').first().locator('article'))
})
