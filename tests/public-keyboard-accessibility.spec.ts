import { expect, test, type Page } from './helpers/performance-test'

async function activeElementState(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement
    const text = active?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

    return {
      label: active?.getAttribute('aria-label')
        || active?.getAttribute('title')
        || text
        || active?.id
        || active?.tagName
        || '',
      inSheet: Boolean(active?.closest('[data-slot="sheet-content"]')),
    }
  })
}

async function tabUntilSheetItem(page: Page, label: string | RegExp, maxTabs = 12) {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab')
    const state = await activeElementState(page)
    const matches = typeof label === 'string' ? state.label === label : label.test(state.label)
    if (state.inSheet && matches) {
      return
    }
  }

  throw new Error(`Could not focus sheet item ${String(label)} with Tab.`)
}

test('public pages expose one focusable main landmark for the skip link target', async ({ page }) => {
  for (const path of ['/', '/blog', '/works', '/introduction', '/contact', '/resume']) {
    await page.goto(path)

    const main = page.getByRole('main')
    await expect(main).toHaveCount(1)
    await expect(main).toHaveAttribute('id', 'main-content')
    await expect(main).toHaveAttribute('tabindex', '-1')
  }
})

test('mobile public menu opens, traps focus, closes with Escape, and navigates by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const menuButton = page.getByRole('button', { name: 'Toggle Menu' })
  await menuButton.focus()
  await page.keyboard.press('Enter')

  const sheet = page.getByRole('dialog', { name: 'Public navigation' })
  await expect(sheet).toBeVisible()
  await expect.poll(() => activeElementState(page)).toMatchObject({ inSheet: true })

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(menuButton).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(sheet).toBeVisible()
  await tabUntilSheetItem(page, 'Contact')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/contact$/)
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('main')).toBeVisible()
})
