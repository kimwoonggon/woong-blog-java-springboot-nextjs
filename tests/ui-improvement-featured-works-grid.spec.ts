import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

const representativePhoneViewport = { width: 375, height: 667 }

test('Featured works renders as a grid card layout', async ({ page }) => {
  await page.goto('/')

  const section = page.getByTestId('featured-works-section')
  const grid = page.getByTestId('featured-works-grid')
  await expect(section.getByTestId('featured-work-card').first()).toBeVisible()

  const templateColumns = await getStyle(grid, 'grid-template-columns')
  expect(templateColumns).not.toBe('none')
})

test('clicking a featured work card opens its detail page', async ({ page }) => {
  await page.goto('/')

  const firstCard = page.getByTestId('featured-work-card').first()

  await expect(firstCard).toHaveAttribute('href', /\/works\/.+/)
  await Promise.all([
    page.waitForURL(/\/works\/.+/),
    firstCard.click(),
  ])
})

test('View all from Works navigates to /works', async ({ page }) => {
  await page.goto('/')

  const section = page.getByRole('heading', { name: 'Works', exact: true }).locator('xpath=ancestor::section[1]')
  await section.getByRole('link', { name: 'View all' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/works')
})

test('featured work cards advertise hover interactions', async ({ page }) => {
  await page.goto('/')

  const card = page.getByTestId('featured-work-card').first()

  const image = card.locator('img').first()
  const title = card.locator('h3').first()
  const placeholder = card.getByTestId('featured-work-no-image-placeholder')

  if (await image.count()) {
    await expect(image).toHaveClass(/group-hover:scale-105/)
  } else {
    await expect(placeholder).toBeVisible()
    await expect(card.locator('[data-slot="card"]').first()).toHaveClass(/hover:border-primary\/30/)
  }

  await expect(title).toHaveClass(/group-hover:text-brand-accent/)
})

test('featured work cards use the richer no-image placeholder treatment', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/works?__qaNoImage=1')

  const placeholder = page.getByTestId('work-card-no-image-placeholder').first()
  await expect(placeholder).toBeVisible()
  await expect(placeholder).toHaveClass(/bg-gradient-to-br/)
})

test('home featured works no-image placeholder matches icon plus label pattern', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/?__qaNoImage=1')

  const placeholder = page.getByTestId('featured-work-no-image-placeholder').first()
  await expect(placeholder).toBeVisible()
  await expect(placeholder.locator('svg')).toBeVisible()
  await expect(placeholder.getByText('No Image', { exact: true })).toBeVisible()
})

test('home featured works no longer shows the legacy click-to-view-details fallback copy', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Click to view details', { exact: true })).toHaveCount(0)
})

test('Works collapses to one column on mobile', async ({ page }) => {
  await page.setViewportSize(representativePhoneViewport)
  await page.goto('/')

  const cards = page.getByTestId('featured-work-card')
  await expect(cards.nth(0)).toBeVisible()
  await expect(cards.nth(1)).toBeVisible()

  const firstBox = await cards.nth(0).boundingBox()
  const secondBox = await cards.nth(1).boundingBox()
  expect(firstBox).toBeTruthy()
  expect(secondBox).toBeTruthy()
  expect(Math.abs(firstBox!.x - secondBox!.x)).toBeLessThan(4)
  expect(secondBox!.y).toBeGreaterThan(firstBox!.y)
})

test('Works stays aligned to the mobile home content rail', async ({ page }) => {
  await page.setViewportSize(representativePhoneViewport)
  await page.goto('/')

  const section = page.getByTestId('featured-works-section')
  const firstCard = page.getByTestId('featured-work-card').first()

  await expect(section).toBeVisible()
  await expect(firstCard).toBeVisible()

  const metrics = await page.evaluate(() => {
    const pageContainer = document.querySelector('main > div.container')
    const section = document.querySelector('[data-testid="featured-works-section"]')
    const firstCard = document.querySelector('[data-testid="featured-work-card"]')

    if (!pageContainer || !section || !firstCard) {
      throw new Error('Expected home Works layout elements to exist')
    }

    const containerRect = pageContainer.getBoundingClientRect()
    const sectionRect = section.getBoundingClientRect()
    const cardRect = firstCard.getBoundingClientRect()
    const containerStyles = window.getComputedStyle(pageContainer)
    const contentLeft = containerRect.left + parseFloat(containerStyles.paddingLeft)
    const contentRight = containerRect.right - parseFloat(containerStyles.paddingRight)

    return {
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      contentLeft,
      contentRight,
      sectionLeft: sectionRect.left,
      sectionRight: sectionRect.right,
    }
  })

  expect(metrics.sectionLeft).toBeGreaterThanOrEqual(metrics.contentLeft - 1)
  expect(metrics.sectionRight).toBeLessThanOrEqual(metrics.contentRight + 1)
  expect(metrics.cardLeft).toBeGreaterThanOrEqual(metrics.contentLeft - 1)
  expect(metrics.cardRight).toBeLessThanOrEqual(metrics.contentRight + 1)
})

test('Works cards do not overflow on mobile with long unbroken content', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 667 },
    representativePhoneViewport,
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const firstCard = page.getByTestId('featured-work-card').first()
    await expect(firstCard).toBeVisible()

    await page.evaluate(() => {
      const firstCard = document.querySelector('[data-testid="featured-work-card"]')
      const title = firstCard?.querySelector('h3')
      const category = firstCard?.querySelector('[data-slot="card-content"] span:last-child')

      if (!firstCard || !title || !category) {
        throw new Error('Expected first Works card title and category to exist')
      }

      title.textContent = 'SUPERLONGUNBROKENWORKTITLEWITHOUTANYSPACES'.repeat(4)
      category.textContent = 'SUPERLONGCATEGORYWITHOUTBREAKS'.repeat(3)
    })

    const metrics = await page.evaluate(() => {
      const section = document.querySelector('[data-testid="featured-works-section"]')
      const grid = document.querySelector('[data-testid="featured-works-grid"]')
      const firstCard = document.querySelector('[data-testid="featured-work-card"]')
      const nav = document.querySelector('[data-testid="mobile-bottom-nav"]')

      if (!section || !grid || !firstCard || !nav) {
        throw new Error('Expected mobile Works layout and nav elements to exist')
      }

      const sectionRect = section.getBoundingClientRect()
      const gridRect = grid.getBoundingClientRect()
      const cardRect = firstCard.getBoundingClientRect()
      const navRect = nav.getBoundingClientRect()

      return {
        cardLeft: cardRect.left,
        cardRight: cardRect.right,
        documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        gridRight: gridRect.right,
        navLeft: navRect.left,
        navRight: navRect.right,
        sectionRight: sectionRect.right,
        viewportWidth: window.innerWidth,
      }
    })

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
    expect(metrics.sectionRight).toBeLessThanOrEqual(metrics.navRight + 1)
    expect(metrics.gridRight).toBeLessThanOrEqual(metrics.navRight + 1)
    expect(metrics.cardLeft).toBeGreaterThanOrEqual(metrics.navLeft - 1)
    expect(metrics.cardRight).toBeLessThanOrEqual(metrics.navRight + 1)
  }
})

test('Works card width stays stable when mobile viewport height is extremely short', async ({ page }) => {
  const measureWithHeight = async (width: number, height: number) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')

    const firstCard = page.getByTestId('featured-work-card').first()
    await expect(firstCard).toBeVisible()

    await page.evaluate(() => {
      const firstCard = document.querySelector('[data-testid="featured-work-card"]')
      const title = firstCard?.querySelector('h3')
      const category = firstCard?.querySelector('[data-slot="card-content"] span:last-child')

      if (!firstCard || !title || !category) {
        throw new Error('Expected first Works card title and category to exist')
      }

      title.textContent = 'SUPERLONGUNBROKENWORKTITLEWITHOUTANYSPACES'.repeat(4)
      category.textContent = 'SUPERLONGCATEGORYWITHOUTBREAKS'.repeat(3)
    })

    return page.evaluate(() => {
      const grid = document.querySelector('[data-testid="featured-works-grid"]')
      const firstCard = document.querySelector('[data-testid="featured-work-card"]')
      const nav = document.querySelector('[data-testid="mobile-bottom-nav"]')

      if (!grid || !firstCard || !nav) {
        throw new Error('Expected mobile Works grid, card, and nav elements to exist')
      }

      const cardRect = firstCard.getBoundingClientRect()
      const navRect = nav.getBoundingClientRect()

      return {
        cardRight: cardRect.right,
        cardWidth: cardRect.width,
        documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        gridTemplateColumns: window.getComputedStyle(grid).gridTemplateColumns,
        navRight: navRect.right,
        viewportWidth: window.innerWidth,
      }
    })
  }

  for (const width of [320, representativePhoneViewport.width]) {
    const normalHeight = await measureWithHeight(width, representativePhoneViewport.height)
    const shortHeight = await measureWithHeight(width, width === 320 ? 240 : 260)

    expect(shortHeight.documentWidth).toBeLessThanOrEqual(shortHeight.viewportWidth + 1)
    expect(shortHeight.cardRight).toBeLessThanOrEqual(shortHeight.navRight + 1)
    expect(shortHeight.gridTemplateColumns).toBe(normalHeight.gridTemplateColumns)
    expect(Math.abs(shortHeight.cardWidth - normalHeight.cardWidth)).toBeLessThanOrEqual(1)
  }
})

test('Works uses two columns on tablet and three from lg desktop for a balanced six-card grid', async ({ page }) => {
  const measureColumns = async (width: number, height: number) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')

    const grid = page.getByTestId('featured-works-grid')

    const templateColumns = await getStyle(grid, 'grid-template-columns')
    const repeatMatch = templateColumns.match(/^repeat\((\d+),/)
    return repeatMatch ? Number(repeatMatch[1]) : templateColumns.split(' ').length
  }

  expect(await measureColumns(768, 1024)).toBe(2)
  expect(await measureColumns(1024, 800)).toBe(3)
  expect(await measureColumns(1280, 800)).toBe(3)
})

test('hero CTAs keep a clear primary-versus-secondary visual hierarchy', async ({ page }) => {
  await page.goto('/')

  const primary = page.getByRole('link', { name: 'View My Works' })
  const secondary = page.getByRole('link', { name: 'Read Study' })
  await expect(primary).toBeVisible()
  await expect(secondary).toBeVisible()

  await expect(primary).toHaveClass(/bg-foreground/)
  await expect(primary).toHaveClass(/text-background/)
  await expect(secondary).toHaveClass(/border/)
  await expect(secondary).not.toHaveClass(/bg-foreground/)
})

test('featured work media keeps a 4:3 ratio and cards keep consistent heights', async ({ page }) => {
  await page.goto('/')

  const cards = page.getByTestId('featured-work-card')
  await expect(cards.nth(0)).toBeVisible()
  await expect(cards.nth(1)).toBeVisible()

  const mediaBoxes = await Promise.all([0, 1].map(async (index) => {
    const box = await cards.nth(index).locator('.aspect-\\[4\\/3\\]').first().boundingBox()
    expect(box).toBeTruthy()
    return box!
  }))
  const cardBoxes = await Promise.all([0, 1].map(async (index) => {
    const box = await cards.nth(index).locator('[data-slot="card"]').first().boundingBox()
    expect(box).toBeTruthy()
    return box!
  }))

  for (const box of mediaBoxes) {
    expect(Math.abs((box.width / box.height) - (4 / 3))).toBeLessThan(0.08)
  }

  expect(Math.abs(cardBoxes[0].height - cardBoxes[1].height)).toBeLessThanOrEqual(6)
})

test('featured work cards keep a shared resting shadow and a stronger hover elevation', async ({ page }) => {
  await page.goto('/')

  const firstCard = page.getByTestId('featured-work-card').nth(0).locator('[data-slot="card"]').first()
  const secondCard = page.getByTestId('featured-work-card').nth(1).locator('[data-slot="card"]').first()
  await expect(firstCard).toBeVisible()
  await expect(secondCard).toBeVisible()

  const firstShadow = await getStyle(firstCard, 'box-shadow')
  const secondShadow = await getStyle(secondCard, 'box-shadow')
  expect(firstShadow).toBe(secondShadow)
  expect(firstShadow).not.toBe('none')

  await firstCard.hover()
  const hoveredShadow = await getStyle(firstCard, 'box-shadow')
  expect(hoveredShadow).not.toBe('none')
})
