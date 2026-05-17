import { describe, expect, it } from 'vitest'
import {
  isAcceptedImageFile,
  isAcceptedMp4VideoFile,
  isAcceptedPdfFile,
} from '@/lib/file-validation'

function file(name: string, type: string, size = 1) {
  return new File([new Uint8Array(size)], name, { type })
}

function emptyFile(name: string, type: string) {
  return new File([], name, { type })
}

describe('file validation helpers', () => {
  it.each([
    ['avatar.png', 'image/png'],
    ['avatar.JPG', 'image/jpeg'],
    ['diagram.webp', ''],
    ['animation.GIF', ''],
  ])('accepts image file %s with MIME %s', (name, type) => {
    expect(isAcceptedImageFile(file(name, type))).toBe(true)
  })

  it.each([
    ['notes.txt', 'text/plain'],
    ['avatar.png', 'text/plain'],
    ['empty.png', 'image/png', 0],
  ])('rejects non-renderable image file %s with MIME %s', (name, type, size = 1) => {
    const candidate = size === 0 ? emptyFile(name, type) : file(name, type, size)
    expect(isAcceptedImageFile(candidate)).toBe(false)
  })

  it.each([
    ['resume.pdf', 'application/pdf'],
    ['RESUME.PDF', ''],
  ])('accepts PDF file %s with MIME %s', (name, type) => {
    expect(isAcceptedPdfFile(file(name, type))).toBe(true)
  })

  it.each([
    ['resume.txt', 'application/pdf'],
    ['resume.pdf', 'text/plain'],
    ['empty.pdf', 'application/pdf', 0],
  ])('rejects invalid PDF file %s with MIME %s', (name, type, size = 1) => {
    const candidate = size === 0 ? emptyFile(name, type) : file(name, type, size)
    expect(isAcceptedPdfFile(candidate)).toBe(false)
  })

  it.each([
    ['demo.mp4', 'video/mp4'],
    ['DEMO.MP4', ''],
  ])('accepts MP4 video file %s with MIME %s', (name, type) => {
    expect(isAcceptedMp4VideoFile(file(name, type))).toBe(true)
  })

  it.each([
    ['demo.mov', 'video/quicktime'],
    ['demo.mp4', 'video/quicktime'],
    ['empty.mp4', 'video/mp4', 0],
  ])('rejects invalid MP4 video file %s with MIME %s', (name, type, size = 1) => {
    const candidate = size === 0 ? emptyFile(name, type) : file(name, type, size)
    expect(isAcceptedMp4VideoFile(candidate)).toBe(false)
  })
})
