export function normalizeTagsInput(tags: string) {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
}

export function formatTimestamp(value?: string | null) {
    if (!value) {
        return '—'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return '—'
    }

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function displayText(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value : fallback
}

export function usableId(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null
}

export function normalizedTags(value: unknown) {
    return Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
        : []
}
