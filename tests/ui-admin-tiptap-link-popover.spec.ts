import { expect, test } from './helpers/performance-test'
import type { Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A'

async function openBlogEditor(page: Page) {
  await page.goto('/admin/blog')
  await page.getByTestId('admin-blog-row').first().getByRole('link').first().click()
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: {
        commands?: { setContent?: (value: string) => void }
        getHTML?: () => string
      }
    }
    return Boolean(target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent)
  })).toBe(true)
}

test('link toolbar opens a popover and applies links without browser dialogs', async ({ page }) => {
  let dialogSeen = false
  page.on('dialog', async (dialog) => {
    dialogSeen = true
    await dialog.dismiss()
  })

  await openBlogEditor(page)

  await page.evaluate(() => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: {
        commands?: { setContent?: (value: string) => void }
      }
    }
    target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent?.('<p>Link target text</p>')
  })

  const editor = page.locator('.tiptap.ProseMirror').first()
  const toolbar = page.getByTestId('tiptap-toolbar')

  await editor.click()
  await page.keyboard.press(selectAllShortcut)
  await toolbar.getByRole('button', { name: 'Add Link' }).click()

  const popover = page.getByTestId('tiptap-link-popover')
  await expect(popover).toBeVisible()

  const urlField = popover.getByLabel('URL')
  await urlField.fill('https://example.com')
  await urlField.press('Enter')

  await expect(popover).toBeHidden()
  await expect.poll(() => page.evaluate(() => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: {
        getHTML?: () => string
      }
    }
    return target.__WOONG_TIPTAP_EDITOR__?.getHTML?.() ?? ''
  })).toContain('href="https://example.com"')
  expect(dialogSeen).toBe(false)
})

test('link toolbar removes existing links from the current selection', async ({ page }) => {
  await openBlogEditor(page)

  await page.evaluate(() => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: {
        commands?: { setContent?: (value: string) => void }
      }
    }
    target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent?.('<p><a href="https://example.com">Linked text</a></p>')
  })

  const editor = page.locator('.tiptap.ProseMirror').first()
  const toolbar = page.getByTestId('tiptap-toolbar')

  await editor.click()
  await page.keyboard.press(selectAllShortcut)
  await toolbar.getByRole('button', { name: 'Add Link' }).click()

  const popover = page.getByTestId('tiptap-link-popover')
  await expect(popover.getByRole('button', { name: 'Remove' })).toBeVisible()
  await popover.getByRole('button', { name: 'Remove' }).click()

  await expect.poll(() => page.evaluate(() => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: {
        getHTML?: () => string
      }
    }
    return target.__WOONG_TIPTAP_EDITOR__?.getHTML?.() ?? ''
  })).not.toContain('href=')
})
