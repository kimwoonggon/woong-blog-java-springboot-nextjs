const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp'])

function getLowercaseExtension(fileName: string) {
  const index = fileName.lastIndexOf('.')
  return index >= 0 ? fileName.slice(index).toLowerCase() : ''
}

function hasContent(file: File) {
  return file.size > 0
}

export function isAcceptedImageFile(file: File) {
  if (!hasContent(file)) {
    return false
  }

  const extension = getLowercaseExtension(file.name)
  const hasAllowedExtension = imageExtensions.has(extension)
  const mimeType = file.type.toLowerCase()

  if (!mimeType) {
    return hasAllowedExtension
  }

  return mimeType.startsWith('image/') && hasAllowedExtension
}

export function isAcceptedPdfFile(file: File) {
  if (!hasContent(file)) {
    return false
  }

  const extension = getLowercaseExtension(file.name)
  const mimeType = file.type.toLowerCase()

  return extension === '.pdf' && (!mimeType || mimeType === 'application/pdf')
}

export function isAcceptedMp4VideoFile(file: File) {
  if (!hasContent(file)) {
    return false
  }

  const extension = getLowercaseExtension(file.name)
  const mimeType = file.type.toLowerCase()

  return extension === '.mp4' && (!mimeType || mimeType === 'video/mp4')
}
