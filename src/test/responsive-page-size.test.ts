import { describe, expect, it } from 'vitest'
import { resolveResponsivePageSize } from '@/lib/responsive-page-size'

describe('resolveResponsivePageSize', () => {
  it('returns mobile page size for Android phone widths', () => {
    expect(resolveResponsivePageSize({
      width: 390,
      height: 844,
      desktopPageSize: 12,
      tabletPageSize: 8,
      mobilePageSize: 4,
    })).toBe(4)
  })

  it('returns tablet page size for iPad widths without height interpolation', () => {
    expect(resolveResponsivePageSize({
      width: 900,
      height: 1200,
      desktopPageSize: 12,
      tabletPageSize: 8,
      mobilePageSize: 4,
    })).toBe(8)
  })

  it('keeps tablet page size at 1024x768 instead of collapsing toward mobile', () => {
    expect(resolveResponsivePageSize({
      width: 1024,
      height: 768,
      desktopPageSize: 12,
      tabletPageSize: 8,
      mobilePageSize: 4,
    })).toBe(8)
  })

  it('returns desktop page size from 1280px and wider', () => {
    expect(resolveResponsivePageSize({
      width: 1280,
      height: 720,
      desktopPageSize: 12,
      tabletPageSize: 8,
      mobilePageSize: 4,
    })).toBe(12)
  })

  it('never returns more than the configured desktop page size', () => {
    expect(resolveResponsivePageSize({
      width: 1600,
      height: 2400,
      desktopPageSize: 6,
      tabletPageSize: 4,
      mobilePageSize: 2,
    })).toBe(6)
  })

  it('falls back to the safer higher floor when desktop is configured below mobile', () => {
    expect(resolveResponsivePageSize({
      width: 1440,
      height: 1800,
      desktopPageSize: 1,
      tabletPageSize: 1,
      mobilePageSize: 2,
    })).toBe(2)
  })
})
