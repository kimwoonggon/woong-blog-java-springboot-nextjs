import { createClientId } from '@/components/admin/work-editor/utils'

export const SOCIAL_SHARE_MESSAGE_KEY = 'socialShareMessage'

export type MetadataField = {
  id: string
  key: string
  value: string
}

export function createMetadataField(key = '', value = ''): MetadataField {
  return {
    id: createClientId(),
    key,
    value,
  }
}

export function stringifyMetadataValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (value == null) {
    return ''
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

export function readSocialShareMessage(record?: Record<string, unknown> | null) {
  const value = record?.[SOCIAL_SHARE_MESSAGE_KEY]
  return typeof value === 'string' ? value : ''
}

export function createMetadataFields(record?: Record<string, unknown> | null) {
  return Object.entries(record ?? {})
    .filter(([key]) => key !== SOCIAL_SHARE_MESSAGE_KEY)
    .map(([key, value]) => createMetadataField(key, stringifyMetadataValue(value)))
}

export function buildMetadataJsonFromRecord(record?: Record<string, unknown> | null, socialShareMessage?: string) {
  const normalized = Object.fromEntries(
    Object.entries(record ?? {})
      .filter(([key]) => key !== SOCIAL_SHARE_MESSAGE_KEY)
      .map(([key, value]) => [key, stringifyMetadataValue(value)]),
  ) as Record<string, string>
  const normalizedShareMessage = socialShareMessage?.trim() ?? ''
  if (normalizedShareMessage) {
    normalized[SOCIAL_SHARE_MESSAGE_KEY] = normalizedShareMessage
  }

  return JSON.stringify(normalized)
}

export function buildMetadataJsonFromFields(fields: MetadataField[], socialShareMessage: string) {
  const normalized = fields.reduce<Record<string, string>>((accumulator, field) => {
    const key = field.key.trim()
    if (!key || key === SOCIAL_SHARE_MESSAGE_KEY) {
      return accumulator
    }

    accumulator[key] = field.value
    return accumulator
  }, {})
  const normalizedShareMessage = socialShareMessage.trim()
  if (normalizedShareMessage) {
    normalized[SOCIAL_SHARE_MESSAGE_KEY] = normalizedShareMessage
  }

  return JSON.stringify(normalized)
}
