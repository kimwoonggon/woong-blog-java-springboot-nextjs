export const PHONE_MAX_WIDTH = 767
export const TABLET_MAX_WIDTH = 1279

interface ResponsivePageSizeOptions {
  width: number
  height?: number
  desktopPageSize: number
  tabletPageSize: number
  mobilePageSize: number
}

export function resolveResponsivePageSize({
  width,
  desktopPageSize,
  tabletPageSize,
  mobilePageSize,
}: ResponsivePageSizeOptions) {
  if (width <= PHONE_MAX_WIDTH) {
    return mobilePageSize
  }

  if (width <= TABLET_MAX_WIDTH) {
    return tabletPageSize
  }

  return Math.max(desktopPageSize, mobilePageSize)
}
