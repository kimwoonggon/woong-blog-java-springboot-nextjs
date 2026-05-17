import { describe, expect, it, vi } from 'vitest'
import { createPublicMetadata, getMetadataBaseUrl } from '@/lib/seo'

describe('SEO metadata helpers', () => {
  it('builds canonical, Open Graph, and Twitter metadata for public routes', () => {
    expect(createPublicMetadata({
      title: 'Study',
      description: 'Study notes.',
      path: '/blog',
    })).toMatchObject({
      title: 'Study',
      description: 'Study notes.',
      alternates: { canonical: '/blog' },
      openGraph: {
        title: 'Study',
        description: 'Study notes.',
        url: '/blog',
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: 'Study',
        description: 'Study notes.',
      },
    })
  })

  it('adds social images when metadata image is provided', () => {
    expect(createPublicMetadata({
      title: 'Work detail',
      description: 'Case study',
      path: '/works/sample',
      type: 'article',
      images: 'https://cdn.example.com/thumb.jpg',
    })).toMatchObject({
      openGraph: {
        images: ['https://cdn.example.com/thumb.jpg'],
      },
      twitter: {
        card: 'summary_large_image',
        images: ['https://cdn.example.com/thumb.jpg'],
      },
    })
  })

  it('filters blank social images and keeps metadata strings user-facing safe', () => {
    const metadata = createPublicMetadata({
      title: '  ',
      description: '',
      path: 'works/sample',
      images: [' ', '', null as unknown as string, 'https://cdn.example.com/thumb.jpg'],
    })

    expect(metadata.title).toBe('Woonggon Kim')
    expect(metadata.description).toBe('')
    expect(metadata.alternates?.canonical).toBe('/works/sample')
    expect(metadata.openGraph?.title).toBe('Woonggon Kim')
    expect(metadata.openGraph?.description).toBe('')
    expect(metadata.openGraph?.images).toEqual(['https://cdn.example.com/thumb.jpg'])
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
    expect(JSON.stringify(metadata)).not.toMatch(/\b(undefined|null)\b/i)
  })

  it('keeps canonical paths same-origin and filters unsafe social images', () => {
    const metadata = createPublicMetadata({
      title: 'Metadata',
      description: 'Description',
      path: '//evil.example//works///sample',
      images: [
        'javascript:alert(1)',
        '//evil.example/tracker.png',
        '/media/thumb.jpg',
        'https://cdn.example.com/thumb.jpg',
      ],
    })

    expect(metadata.alternates?.canonical).toBe('/evil.example/works/sample')
    expect(metadata.openGraph?.url).toBe('/evil.example/works/sample')
    expect(metadata.openGraph?.images).toEqual([
      '/media/thumb.jpg',
      'https://cdn.example.com/thumb.jpg',
    ])
    expect(JSON.stringify(metadata)).not.toMatch(/javascript:|\/\/evil\.example/i)
  })

  it('uses configured public site URL before falling back to localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/')
    expect(getMetadataBaseUrl()).toBe('https://example.com')
    vi.unstubAllEnvs()
    expect(getMetadataBaseUrl()).toBe('http://localhost:3000')
  })
})
