const TECHNICAL_ERROR_PATTERN = /SQLSTATE|stack\s*trace|status\s*5\d\d|WoongBlog\.Api|Npgsql|System\.|Exception/i
const TECHNICAL_UPLOAD_ERROR_PATTERN =
  /SQLSTATE|stack\s*trace|status\s*5\d\d|WoongBlog\.Api|Npgsql|System\.|Exception|Cloudflare|R2|S3|bucket|storage|CORS|upload session/i
const TECHNICAL_MUTATION_ERROR_PATTERN =
  /SQLSTATE|stack\s*trace|status\s*5\d\d|WoongBlog\.Api|Npgsql|System\.|Exception|Cloudflare|R2|S3|bucket|storage/i

export function sanitizeAdminSaveError(message: string, fallback: string) {
  const normalized = message.trim()

  if (!normalized || TECHNICAL_ERROR_PATTERN.test(normalized)) {
    return fallback
  }

  return normalized
}

export function sanitizeAdminUploadError(message: string, fallback: string) {
  const normalized = message.trim()

  if (!normalized || TECHNICAL_UPLOAD_ERROR_PATTERN.test(normalized)) {
    return fallback
  }

  return normalized
}

export function sanitizeAdminMutationError(message: string, fallback: string) {
  const normalized = message.trim()

  if (!normalized || TECHNICAL_MUTATION_ERROR_PATTERN.test(normalized)) {
    return fallback
  }

  return normalized
}
