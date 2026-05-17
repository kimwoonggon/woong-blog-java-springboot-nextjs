import { expect, type Locator, type Page } from '@playwright/test'
import { toggleThemeForViewport } from './responsive-policy'

export async function getStyle(locator: Locator, property: string) {
  return locator.evaluate(
    (element, cssProperty) => getComputedStyle(element as HTMLElement).getPropertyValue(cssProperty),
    property,
  )
}

export async function getColorChannelsFromCssValue(page: Page, cssValue: string) {
  return page.evaluate((input) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is unavailable')
    }

    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000000'
    context.fillStyle = input
    context.fillRect(0, 0, 1, 1)

    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    return [red, green, blue, alpha] as const
  }, cssValue)
}

export async function getRootVariableChannels(page: Page, variableName: string) {
  return page.evaluate((name) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is unavailable')
    }

    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000000'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)

    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    return [red, green, blue, alpha] as const
  }, variableName)
}

export async function getColorChannels(locator: Locator, property: string) {
  return locator.evaluate((element, cssProperty) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is unavailable')
    }

    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000000'
    context.fillStyle = getComputedStyle(element as HTMLElement).getPropertyValue(cssProperty)
    context.fillRect(0, 0, 1, 1)

    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    return [red, green, blue, alpha] as const
  }, property)
}

export function expectRgbClose(actual: readonly number[], expected: readonly number[], tolerance = 3) {
  for (let index = 0; index < 3; index += 1) {
    expect(Math.abs(actual[index] - expected[index])).toBeLessThanOrEqual(tolerance)
  }
}

export function channelToLinear(channel: number) {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

export function rgbToLuminance(rgb: [number, number, number]) {
  const [red, green, blue] = rgb.map(channelToLinear) as [number, number, number]
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
}

export function contrastRatio(foreground: readonly number[], background: readonly number[]) {
  const foregroundLuminance = rgbToLuminance([foreground[0], foreground[1], foreground[2]])
  const backgroundLuminance = rgbToLuminance([background[0], background[1], background[2]])
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

export async function openThemeMenu(page: Page) {
  await toggleThemeForViewport(page)
}

export async function selectTheme(page: Page, value: 'Light' | 'Dark' | 'System') {
  if (value === 'System') {
    throw new Error('System theme is intentionally not exposed.')
  }

  const targetIsDark = value === 'Dark'
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  if (isDark !== targetIsDark) {
    await toggleThemeForViewport(page)
  }
}

export async function expectDarkHtml(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
}

export async function expectLightHtml(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false)
}

export async function gotoWithTheme(page: Page, url: string, theme: 'dark' | 'light' | 'system' = 'dark') {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.evaluate((selectedTheme) => {
    window.localStorage.setItem('theme', selectedTheme)
  }, theme)
  await page.reload({ waitUntil: 'domcontentloaded' })
}
