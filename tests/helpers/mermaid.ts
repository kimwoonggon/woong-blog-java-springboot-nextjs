import { expect, type Locator, type Page } from '@playwright/test'

const renderedMermaidSvgSelector = [
  'svg[id^="mermaid-"]:not(.lucide):not([aria-hidden="true"])',
  'svg[aria-roledescription]:not(.lucide):not([aria-hidden="true"])',
  'svg[class*="flowchart"]:not(.lucide):not([aria-hidden="true"])',
  'svg[class*="sequence"]:not(.lucide):not([aria-hidden="true"])',
].join(', ')

export async function expectMermaidRendered(page: Page, scope?: Locator) {
  const root = scope ?? page.locator('main')
  const svg = root.locator(renderedMermaidSvgSelector).first()

  await expect(svg).toBeVisible()
  await expect(svg).not.toHaveClass(/(?:^|\s)lucide(?:\s|$)/)

  const box = await svg.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(48)
  expect(box?.height ?? 0).toBeGreaterThan(24)
}
