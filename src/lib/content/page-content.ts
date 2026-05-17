import type { Block } from '@/components/content/BlockRenderer'

export interface HomeContent {
  headline?: string
  introText?: string
  profileImageUrl?: string
}

export interface HtmlPageContent {
  html: string
}

export interface BlockPageContent {
  blocks: Block[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBlock(value: unknown): value is Block {
  return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string'
}

export function parsePageContentJson(raw: string | null | undefined) {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function isHtmlPageContent(value: unknown): value is HtmlPageContent {
  return isRecord(value) && typeof value.html === 'string'
}

export function isBlockPageContent(value: unknown): value is BlockPageContent {
  return isRecord(value) && Array.isArray(value.blocks) && value.blocks.every(isBlock)
}

export function toHomeContent(value: unknown): HomeContent {
  if (!isRecord(value)) {
    return {}
  }

  return {
    headline: typeof value.headline === 'string' ? value.headline : undefined,
    introText: typeof value.introText === 'string' ? value.introText : undefined,
    profileImageUrl: typeof value.profileImageUrl === 'string' ? value.profileImageUrl : undefined,
  }
}
