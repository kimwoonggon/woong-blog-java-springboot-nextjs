import { expect, test } from './helpers/performance-test'
import { loginAsLocalAdmin } from './helpers/auth'

const expectedShortcut = process.env.PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT ?? 'hidden'

async function gotoAndExpectButton(page: import('./helpers/performance-test').Page, url: string, buttonName: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: buttonName })).toBeVisible({ timeout: 15000 })
}

async function gotoAndWaitForPublicAdminGate(page: import('./helpers/performance-test').Page, url: string) {
  const sessionSettled = page.waitForResponse((response) => {
    return response.url().includes('/api/auth/session') && response.request().method() === 'GET'
  }, { timeout: 15000 }).catch(() => null)

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await sessionSettled
}

test('login page reflects the expected local admin shortcut policy', async ({ page }) => {
  await page.goto('/login')

  const shortcut = page.getByRole('link', { name: 'Continue as Local Admin' })
  if (expectedShortcut === 'visible') {
    await expect(shortcut).toBeVisible()
  } else {
    await expect(shortcut).toHaveCount(0)
  }
})

test('admin session keeps public page and list edit affordances without navbar account controls', async ({ page }) => {
  await loginAsLocalAdmin(page, '/')

  await expect(page.getByText('Signed in')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open signed-in menu' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)

  await gotoAndExpectButton(page, '/introduction', '소개글 수정')
  await gotoAndExpectButton(page, '/contact', '문의글 수정')
  await gotoAndExpectButton(page, '/resume', '이력서 PDF 업로드')
  await gotoAndExpectButton(page, '/works', '새 작업 쓰기')
  await expect(page.getByRole('link', { name: '작업 관리' })).toBeVisible({ timeout: 15000 })

  await gotoAndExpectButton(page, '/blog', '새 글 쓰기')
  await expect(page.getByRole('link', { name: '글 관리' })).toBeVisible({ timeout: 15000 })
})

test('admin session keeps public detail edit affordances without exposing delete outside the editor shell', async ({ page }) => {
  await loginAsLocalAdmin(page, '/')

  await page.goto('/blog/seeded-blog', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '글 수정' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(0)

  await page.goto('/works/seeded-work', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '작업 수정' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(0)
})

test('signed-in public navbar omits account, admin, logout, and login controls', async ({ page }) => {
  await loginAsLocalAdmin(page, '/')

  await expect(page.getByText('Signed in')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open signed-in menu' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'My Page' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'Admin Page' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'Logout' })).toHaveCount(0)

  await expect(page).toHaveURL(/\/$/)
})

test('mobile public drawer omits account, admin, logout, and login controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsLocalAdmin(page, '/')
  await page.getByRole('button', { name: 'Toggle Menu' }).click()

  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Account')).toHaveCount(0)
  await expect(drawer.getByRole('link', { name: 'My Page' })).toHaveCount(0)
  await expect(drawer.getByRole('link', { name: 'Admin Page' })).toHaveCount(0)
  await expect(drawer.getByRole('button', { name: 'Logout' })).toHaveCount(0)
  await expect(drawer.getByRole('link', { name: 'Login' })).toHaveCount(0)
  await expect(drawer.getByTestId('mobile-theme-toggle')).toBeVisible()
})

test('unauthenticated visitors do not see public edit or create affordances', async ({ page }) => {
  await gotoAndWaitForPublicAdminGate(page, '/works')
  await expect(page.getByRole('button', { name: '새 작업 쓰기' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '작업 관리' })).toHaveCount(0)

  await page.goto('/blog', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '새 글 쓰기' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '글 관리' })).toHaveCount(0)

  await page.goto('/introduction', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '소개글 수정' })).toHaveCount(0)

  await page.goto('/contact', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '문의글 수정' })).toHaveCount(0)

  await page.goto('/resume', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '이력서 PDF 업로드' })).toHaveCount(0)
})

test('non-admin signed-in visitors do not see public edit or create affordances', async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, role: 'author' }),
    })
  })

  await gotoAndWaitForPublicAdminGate(page, '/works')
  await expect(page.getByRole('button', { name: '새 작업 쓰기' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '작업 관리' })).toHaveCount(0)

  await page.goto('/blog', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '새 글 쓰기' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '글 관리' })).toHaveCount(0)

  await page.goto('/introduction', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '소개글 수정' })).toHaveCount(0)

  await page.goto('/contact', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '문의글 수정' })).toHaveCount(0)
})
