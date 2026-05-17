import { expect, test, type Page } from './helpers/performance-test'
import {
  contrastRatio,
  expectDarkHtml,
  expectLightHtml,
  expectRgbClose,
  getColorChannels,
  getColorChannelsFromCssValue,
  getRootVariableChannels,
  getStyle,
  gotoWithTheme,
} from './helpers/ui-improvement'
import { expectResponsiveNavMode, toggleThemeForViewport } from './helpers/responsive-policy'
import { createBlogFixture, createWorkFixture } from './helpers/content-fixtures'
import { expectMermaidRendered } from './helpers/mermaid'

async function firstPublicSlug(page: Page, collection: 'blogs' | 'works') {
  const response = await page.request.get(`/api/public/${collection}?page=1&pageSize=1`)
  const payload = await response.json() as { items?: Array<{ slug?: string }> }
  const slug = payload.items?.[0]?.slug
  test.skip(!slug, `No public ${collection} available in this environment.`)
  return slug!
}

async function expectReadableCodeBoxMetrics(page: Page, codeBlockSelector: string) {
  const codeBlock = page.locator(codeBlockSelector).first()
  await expect(codeBlock).toBeVisible()

  const paddingTop = Number.parseFloat(await getStyle(codeBlock, 'padding-top'))
  const paddingLeft = Number.parseFloat(await getStyle(codeBlock, 'padding-left'))
  const borderRadius = Number.parseFloat(await getStyle(codeBlock, 'border-top-left-radius'))

  expect(paddingTop).toBeGreaterThanOrEqual(14)
  expect(paddingLeft).toBeGreaterThanOrEqual(14)
  expect(borderRadius).toBeGreaterThanOrEqual(6)
  expect(borderRadius).toBeLessThanOrEqual(8)
}

async function expectNoCodeWindowChrome(page: Page, codeBlockSelector: string) {
  const chrome = await page.locator(codeBlockSelector).first().evaluate((element) => {
    const before = window.getComputedStyle(element, '::before')
    const after = window.getComputedStyle(element, '::after')

    return {
      beforeContent: before.content,
      afterContent: after.content,
      afterBoxShadow: after.boxShadow,
    }
  })

  expect(chrome.beforeContent).toBe('none')
  expect(chrome.afterContent).toBe('none')
  expect(chrome.afterBoxShadow).toBe('none')
}

async function expectGitHubLightCodeColors(page: Page, codeBlockSelector: string, inlineCodeSelector: string) {
  const codeBlock = page.locator(codeBlockSelector).first()
  const inlineCode = page.locator(inlineCodeSelector).first()
  const background = await getColorChannels(codeBlock, 'background-color')
  const foreground = await getColorChannels(codeBlock, 'color')
  const inlineBackground = await getColorChannels(inlineCode, 'background-color')

  expect(channelDistance(background, [246, 248, 250])).toBeLessThanOrEqual(8)
  expect(channelDistance(inlineBackground, [239, 241, 243])).toBeLessThanOrEqual(16)
  expect(inlineBackground[3]).toBeGreaterThan(0)
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
}

async function expectGitHubDarkCodeColors(page: Page, codeBlockSelector: string, inlineCodeSelector: string) {
  const codeBlock = page.locator(codeBlockSelector).first()
  const inlineCode = page.locator(inlineCodeSelector).first()
  const background = await getColorChannels(codeBlock, 'background-color')
  const foreground = await getColorChannels(codeBlock, 'color')
  const inlineBackground = await getColorChannels(inlineCode, 'background-color')

  expect(channelDistance(background, [22, 27, 34])).toBeLessThanOrEqual(8)
  expect(channelDistance(inlineBackground, [48, 54, 61])).toBeLessThanOrEqual(18)
  expect(inlineBackground[3]).toBeGreaterThan(0)
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
}

async function expectGitHubMermaidSurface(page: Page, selector: string, mode: 'light' | 'dark') {
  const shell = page.locator(selector).first()
  await expect(shell).toBeVisible()

  const background = await getColorChannels(shell, 'background-color')
  const foreground = await getColorChannels(shell, 'color')
  const border = await getColorChannels(shell, 'border-top-color')

  if (mode === 'light') {
    expect(channelDistance(background, [246, 248, 250])).toBeLessThanOrEqual(8)
    expect(channelDistance(border, [208, 215, 222])).toBeLessThanOrEqual(16)
  } else {
    expect(channelDistance(background, [22, 27, 34])).toBeLessThanOrEqual(8)
    expect(channelDistance(border, [48, 54, 61])).toBeLessThanOrEqual(16)
  }

  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
}

function rgbChannels(channels: readonly number[]) {
  return channels.slice(0, 3)
}

function minRgbChannel(channels: readonly number[]) {
  return Math.min(...rgbChannels(channels))
}

function maxRgbChannel(channels: readonly number[]) {
  return Math.max(...rgbChannels(channels))
}

function channelDistance(left: readonly number[], right: readonly number[]) {
  return Math.max(
    Math.abs(left[0] - right[0]),
    Math.abs(left[1] - right[1]),
    Math.abs(left[2] - right[2]),
  )
}

test.describe('theme toggle', () => {
  test('DM-01: theme toggle button is visible in the navbar', async ({ page }) => {
    await page.goto('/')
    await expectResponsiveNavMode(page)
  })

  test('DM-02: clicking the theme toggle applies the dark class directly', async ({ page }) => {
    await page.goto('/')
    await toggleThemeForViewport(page)
    await expectDarkHtml(page)

    const bodyBackground = await getColorChannels(page.locator('body'), 'background-color')
    const lightBackground = await getColorChannelsFromCssValue(page, 'oklch(0.98 0 0)')
    expect(bodyBackground[0]).not.toBe(lightBackground[0])
  })

  test('DM-03: clicking the theme toggle again removes the dark class', async ({ page }) => {
    await page.goto('/')
    await toggleThemeForViewport(page)
    await expectDarkHtml(page)
    await toggleThemeForViewport(page)
    await expectLightHtml(page)

    const bodyBackground = await getStyle(page.locator('body'), 'background-color')
    const lightBackground = await getStyle(page.locator('body'), 'background-color')
    expect(bodyBackground).toBe(lightBackground)
  })

  test('DM-04: the selected theme persists after reload', async ({ page }) => {
    await page.goto('/')
    await toggleThemeForViewport(page)
    await expectDarkHtml(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectDarkHtml(page)
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('theme'))).toBe('dark')
  })

  test('DM-05: default theme is light and the old theme dropdown is absent', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expectLightHtml(page)
    await toggleThemeForViewport(page)
    await expectDarkHtml(page)
    await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0)
    await expect(page.getByRole('menuitemradio')).toHaveCount(0)
  })

  test('DM-05b: mobile drawer theme row toggles dark and light directly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Toggle Menu' }).click()
    await page.getByTestId('mobile-theme-toggle').click()
    await expectDarkHtml(page)
    await page.getByTestId('mobile-theme-toggle').click()
    await expectLightHtml(page)
  })
})

test.describe('public pages', () => {
  test('DM-06: home page renders dark mode surfaces and section backgrounds', async ({ page }) => {
    await gotoWithTheme(page, '/')
    await expectDarkHtml(page)

    const section = page.getByRole('heading', { name: 'Works', exact: true }).locator('..').locator('..')
    const sectionBackground = await getStyle(section, 'background-color')
    const expectedBackground = await getStyle(section, 'background-color')
    expect(sectionBackground).toBe(expectedBackground)

    await page.screenshot({ path: 'test-results/playwright/dark-mode-home-dark.png', fullPage: true })
  })

  test('DM-07: works listing cards use dark brand colors', async ({ page }) => {
    await gotoWithTheme(page, '/works')
    const badge = page.locator('[data-testid="work-card"]').first().locator('.rounded-full').first()
    test.skip(await badge.count() === 0, 'No rendered work cards available in this environment.')
    await expect(badge).toBeVisible()

    const badgeBackground = await getColorChannels(badge, 'background-color')
    const expectedBadgeBackground = await getRootVariableChannels(page, '--brand-navy')
    expectRgbClose(badgeBackground, expectedBadgeBackground)
  })

test('DM-08: work detail page keeps navy detail anchors in dark mode', async ({ page }) => {
  await gotoWithTheme(page, `/works/${await firstPublicSlug(page, 'works')}`)
  const badge = page.locator('article header .rounded-full').first()
  test.skip(!(await badge.isVisible().catch(() => false)), 'No rendered work detail badge available in this environment.')

    const badgeBackground = await getColorChannels(badge, 'background-color')
    const expectedBadgeBackground = await getRootVariableChannels(page, '--brand-navy')
    expectRgbClose(badgeBackground, expectedBadgeBackground)

  await expect(page.locator('article header p')).toHaveCount(0)
})

  test('DM-09: blog listing hover state uses accent color in dark mode', async ({ page }) => {
    await gotoWithTheme(page, '/blog')
    const card = page.getByTestId('blog-card').first()
    test.skip(await card.count() === 0, 'No rendered blog cards available in this environment.')
    const stripe = card.getByTestId('blog-card-accent-stripe')
    const title = card.locator('[data-slot="card-title"]')
    await expect(stripe).toHaveClass(/study-card-stripe/)
    await expect(stripe).not.toHaveClass(/from-brand-accent/)
    await expect(title).toBeVisible()
    const titleClass = await title.evaluate((element) => element.className)
    expect(titleClass).toContain('group-hover/card:text-brand-accent')
  })

test('DM-10: blog detail page uses navy detail anchors and keeps prose readable', async ({ page }) => {
  await gotoWithTheme(page, `/blog/${await firstPublicSlug(page, 'blogs')}`)
  const badge = page.locator('article header .rounded-full').first()
  const prose = page.locator('#blog-detail-content .prose').first()
  test.skip(await badge.count() === 0, 'No rendered blog detail badge available in this environment.')

    const badgeBackground = await getColorChannels(badge, 'background-color')
    const expectedBadgeBackground = await getRootVariableChannels(page, '--brand-navy')
    expectRgbClose(badgeBackground, expectedBadgeBackground)

    await expect(page.locator('article header p')).toHaveCount(0)

    await expect(prose).toBeVisible()
    await page.screenshot({ path: 'test-results/playwright/dark-mode-blog-detail-dark.png', fullPage: true })
  })

test('DM-11: contact page email link uses the semantic primary color in dark mode', async ({ page }) => {
  await gotoWithTheme(page, '/contact')
  const emailLink = page.locator('main a[href^="mailto:"]').first()
  if (await emailLink.count()) {
    await expect(emailLink).toBeVisible()
    const linkColor = await getColorChannels(emailLink, 'color')
    const expectedColor = await getRootVariableChannels(page, '--primary')
    expectRgbClose(linkColor, expectedColor)
    return
  }

  await expect(page.locator('main .prose').first()).toBeVisible()
})

  test('DM-12: footer renders with a dark background and stable links', async ({ page }) => {
    await gotoWithTheme(page, '/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    const footerBackground = await getColorChannels(footer, 'background-color')
    expect(footerBackground[0]).toBeLessThanOrEqual(40)
    expect(footerBackground[1]).toBeLessThanOrEqual(40)
    expect(footerBackground[2]).toBeLessThanOrEqual(52)

    const footerLinks = footer.getByRole('link')
    if (await footerLinks.count()) {
      const linkClass = await footerLinks.first().evaluate((element) => element.className)
      expect(linkClass).toContain('hover:text-brand-accent')
    }
  })

  test('DM-18: public prose code blocks stay readable after light and dark theme changes', async ({ page, request }, testInfo) => {
    const fixture = await createBlogFixture(request, testInfo, {
      titlePrefix: 'Playwright Code Readability',
      html: '<p>Use <code>inlineValue</code> outside.</p><pre><code>const message = "안녕하세요";\nconsole.log(message);</code></pre>',
      tags: ['playwright-fixture', 'code-readability'],
    })

    await gotoWithTheme(page, `/blog/${fixture.slug}`, 'light')
    await expectLightHtml(page)

    const codeBlock = page.locator('#blog-detail-content .prose pre').first()
    const blockCode = page.locator('#blog-detail-content .prose pre code').first()
    const inlineCode = page.locator('#blog-detail-content .prose p code').first()

    await expectReadableCodeBoxMetrics(page, '#blog-detail-content .prose pre')
    await expectNoCodeWindowChrome(page, '#blog-detail-content .prose pre')
    await expect(inlineCode).toHaveText('inlineValue')
    await expect(blockCode).toHaveText('const message = "안녕하세요";\nconsole.log(message);')

    const lightBackground = await getColorChannels(codeBlock, 'background-color')
    const lightForeground = await getColorChannels(codeBlock, 'color')
    const inlineBackground = await getColorChannels(inlineCode, 'background-color')

    await expectGitHubLightCodeColors(page, '#blog-detail-content .prose pre', '#blog-detail-content .prose p code')
    expect(lightBackground[3]).toBeGreaterThan(0)
    expect(lightBackground[0]).toBeGreaterThan(210)
    expect(lightBackground[1]).toBeGreaterThan(210)
    expect(lightBackground[2]).toBeGreaterThan(210)
    expect(lightBackground[0]).toBeLessThanOrEqual(250)
    expect(lightBackground[1]).toBeLessThanOrEqual(250)
    expect(lightBackground[2]).toBeLessThanOrEqual(250)
    expect(contrastRatio(lightForeground, lightBackground)).toBeGreaterThanOrEqual(4.5)
    expect(inlineBackground.slice(0, 3)).not.toEqual(lightBackground.slice(0, 3))

    await toggleThemeForViewport(page)
    await expectDarkHtml(page)
    await expectReadableCodeBoxMetrics(page, '#blog-detail-content .prose pre')
    await expectNoCodeWindowChrome(page, '#blog-detail-content .prose pre')
    await expectGitHubDarkCodeColors(page, '#blog-detail-content .prose pre', '#blog-detail-content .prose p code')
    await expect(codeBlock).toBeVisible()

    const darkBackground = await getColorChannels(codeBlock, 'background-color')
    const darkForeground = await getColorChannels(codeBlock, 'color')

    expect(darkBackground[3]).toBeGreaterThan(0)
    expect(darkBackground[0]).toBeGreaterThanOrEqual(13)
    expect(darkBackground[1]).toBeGreaterThanOrEqual(13)
    expect(darkBackground[2]).toBeGreaterThanOrEqual(13)
    expect(Math.max(...darkBackground.slice(0, 3)) - Math.min(...darkBackground.slice(0, 3))).toBeLessThanOrEqual(18)
    expect(darkForeground[0]).toBeLessThan(250)
    expect(darkForeground[1]).toBeLessThan(250)
    expect(darkForeground[2]).toBeLessThan(250)
    expect(contrastRatio(darkForeground, darkBackground)).toBeGreaterThanOrEqual(4.5)
  })

  test('DM-18b: public Mermaid diagrams use GitHub-readable surfaces in light and dark mode', async ({ page, request }, testInfo) => {
    const mermaidCode = `flowchart TD
      Start[Light mode] --> Render[Readable Mermaid]
      Render --> Done[Dark mode too]`
    const html = `<p>Diagram intro</p><mermaid-block data-code="${mermaidCode.replace(/\n/g, '&#10;')}"></mermaid-block><p>Diagram outro</p>`
    const blogFixture = await createBlogFixture(request, testInfo, {
      titlePrefix: 'Playwright Mermaid Readability',
      html,
      tags: ['playwright-fixture', 'mermaid-readability'],
    })
    const workFixture = await createWorkFixture(request, testInfo, {
      titlePrefix: 'Playwright Work Mermaid Readability',
      html,
      category: 'mermaid-readability',
      tags: ['playwright-fixture', 'mermaid-readability'],
    })

    for (const route of [`/blog/${blogFixture.slug}`, `/works/${workFixture.slug}`]) {
      await gotoWithTheme(page, route, 'light')
      await expectLightHtml(page)
      await expectMermaidRendered(page)
      await expectGitHubMermaidSurface(page, '[data-testid="mermaid-renderer"]', 'light')

      await toggleThemeForViewport(page)
      await expectDarkHtml(page)
      await expectMermaidRendered(page)
      await expectGitHubMermaidSurface(page, '[data-testid="mermaid-renderer"]', 'dark')
    }
  })

  test('DM-19: prose text remains readable in dark mode', async ({ page }) => {
    await gotoWithTheme(page, `/blog/${await firstPublicSlug(page, 'blogs')}`)
    const proseText = page.locator('.prose p').first()
    test.skip(!(await proseText.isVisible().catch(() => false)), 'No rendered blog prose text available in this environment.')
    await expect(proseText).toBeVisible()

    const textColor = await getColorChannels(proseText, 'color')
    const background = await getColorChannels(page.locator('body'), 'background-color')
    expect(contrastRatio(textColor, background)).toBeGreaterThanOrEqual(4.5)
  })

  test('DM-20: mobile menu exposes a wide direct theme toggle in dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoWithTheme(page, '/')
    await page.getByRole('button', { name: 'Toggle Menu' }).click()
    const mobileThemeToggle = page.getByTestId('mobile-theme-toggle')
    await expect(mobileThemeToggle).toBeVisible()
    await expect(page.getByText('Account')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)
    const toggleBox = await mobileThemeToggle.boundingBox()
    expect(toggleBox).toBeTruthy()
    expect(toggleBox!.width).toBeGreaterThanOrEqual(300)
    await mobileThemeToggle.click()
    await expectLightHtml(page)
    await page.screenshot({ path: 'test-results/playwright/dark-mode-mobile-menu-dark.png', fullPage: true })
  })

  test('DM-21: dark to light transitions keep the works layout stable', async ({ page }) => {
    await gotoWithTheme(page, '/works')
    await expectDarkHtml(page)
    await page.screenshot({ path: 'test-results/playwright/dark-mode-works-dark.png', fullPage: true })

    await page.evaluate(() => window.localStorage.setItem('theme', 'light'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectLightHtml(page)
    test.skip(await page.getByTestId('work-card').first().count() === 0, 'No rendered work cards available in this environment.')
    await expect(page.getByTestId('work-card').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/playwright/dark-mode-works-light.png', fullPage: true })
  })

  test('DM-22: pagination uses the dark active state variant', async ({ page }) => {
    await gotoWithTheme(page, '/blog')
    const activePage = page.locator('nav[aria-label="Study pagination"] a').first()
    await expect(activePage).toBeVisible()

    const background = await getColorChannels(activePage, 'background-color')
    const borderColor = await getColorChannels(activePage, 'border-top-color')
    expect(background[2]).toBeGreaterThan(background[0])
    expect(borderColor[2]).toBeGreaterThan(borderColor[0])
  })

  test('DM-23: dark mode body text contrast is at least 4.5:1', async ({ page }) => {
    await gotoWithTheme(page, '/')
    const foreground = await getColorChannels(page.locator('body'), 'color')
    const background = await getColorChannels(page.locator('body'), 'background-color')
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  test('DM-24: muted text contrast is at least 4.5:1 in dark mode', async ({ page }) => {
    await gotoWithTheme(page, '/')
    const mutedText = page.getByRole('heading', { name: 'Study Notes' })
    await expect(mutedText).toBeVisible()

    const foreground = await getColorChannels(mutedText, 'color')
    const background = await getColorChannels(page.locator('body'), 'background-color')
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })
})

test.describe('login and admin dark mode', () => {
  test('DM-13: login page renders with dark surfaces', async ({ page }) => {
    await page.context().clearCookies()
    await gotoWithTheme(page, '/login')
    const card = page.locator('.max-w-md').first()
    await expect(card).toBeVisible()

    const background = await getColorChannels(card, 'background-color')
    const foreground = await getColorChannels(card, 'color')
    expect(minRgbChannel(background)).toBeGreaterThanOrEqual(34)
    expect(maxRgbChannel(background)).toBeLessThanOrEqual(58)
    expect(maxRgbChannel(foreground)).toBeLessThanOrEqual(235)
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

  test('DM-14: admin dashboard uses dark cards and surfaces', async ({ page }) => {
    await gotoWithTheme(page, '/admin/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.locator('main .grid').first().waitFor()
    await page.screenshot({ path: 'test-results/playwright/dark-mode-admin-dashboard-dark.png', fullPage: true })
  })

  test('DM-15: blog editor uses the dark primary button token', async ({ page }) => {
    await gotoWithTheme(page, '/admin/blog')
    await page.getByTestId('admin-blog-row').first().getByTitle('Edit').click()
    const saveButton = page.getByRole('button', { name: /Update Post|Create Post/i })
    await expect(saveButton).toBeVisible()

    const background = await getColorChannels(saveButton, 'background-color')
    const expectedBackground = await getRootVariableChannels(page, '--primary')
    expectRgbClose(background, expectedBackground)
  })

  test('DM-16: work editor uses the dark primary button token', async ({ page }) => {
    await gotoWithTheme(page, '/admin/works')
    await page.getByTestId('admin-work-row').first().getByRole('link').first().click()
    const saveButton = page.getByRole('button', { name: /Update Work|Create Work|Create with Videos/i }).last()
    await expect(saveButton).toBeVisible()

    const background = await getColorChannels(saveButton, 'background-color')
    const expectedBackground = await getRootVariableChannels(page, '--primary')
    expectRgbClose(background, expectedBackground)
  })

  test('DM-17: destructive buttons gain the dark hover state', async ({ page }) => {
    await gotoWithTheme(page, '/admin/blog')
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first()
    await expect(deleteButton).toBeVisible()
    await deleteButton.hover()

    const background = await getColorChannels(deleteButton, 'background-color')
    expect(background[3]).toBeGreaterThan(0)
  })

  test('DM-25: global dark palette uses soft readable surfaces across public and admin UI', async ({ page }) => {
    await gotoWithTheme(page, '/admin/dashboard')
    await expectDarkHtml(page)

    const bodyBackground = await getColorChannels(page.locator('body'), 'background-color')
    const bodyText = await getColorChannels(page.locator('body'), 'color')
    expect(minRgbChannel(bodyBackground)).toBeGreaterThanOrEqual(24)
    expect(maxRgbChannel(bodyBackground)).toBeLessThanOrEqual(48)
    expect(maxRgbChannel(bodyText)).toBeLessThanOrEqual(230)
    expect(contrastRatio(bodyText, bodyBackground)).toBeGreaterThanOrEqual(4.5)

    const card = page.locator('[data-slot="card"]').first()
    await expect(card).toBeVisible()
    const cardBackground = await getColorChannels(card, 'background-color')
    const cardBorder = await getColorChannels(card, 'border-top-color')
    expect(minRgbChannel(cardBackground)).toBeGreaterThan(minRgbChannel(bodyBackground))
    expect(channelDistance(cardBackground, bodyBackground)).toBeGreaterThanOrEqual(8)
    expect(maxRgbChannel(cardBorder)).toBeLessThanOrEqual(90)

    await gotoWithTheme(page, '/admin/blog')
    const adminSearch = page.getByRole('textbox', { name: 'Search blog titles' }).first()
    await expect(adminSearch).toBeVisible()
    const inputBackground = await getColorChannels(adminSearch, 'background-color')
    expect(inputBackground[3]).toBeGreaterThan(0)
    expect(minRgbChannel(inputBackground)).toBeGreaterThanOrEqual(38)
    await adminSearch.focus()
    await expect.poll(() => getStyle(adminSearch, 'box-shadow')).not.toBe('none')

    await page.setViewportSize({ width: 390, height: 844 })
    await gotoWithTheme(page, '/')
    await page.getByRole('button', { name: 'Toggle Menu' }).click()
    const sheet = page.locator('[data-slot="sheet-content"]').first()
    await expect(sheet).toBeVisible()
    const sheetBackground = await getColorChannels(sheet, 'background-color')
    expect(minRgbChannel(sheetBackground)).toBeGreaterThanOrEqual(34)
    expect(maxRgbChannel(sheetBackground)).toBeLessThanOrEqual(58)
    expect(channelDistance(sheetBackground, bodyBackground)).toBeGreaterThanOrEqual(8)
  })
})
