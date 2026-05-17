import { render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Footer } from '@/components/layout/Footer'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Footer', () => {
  it('renders owner name and only configured social links', () => {
    render(
      <Footer
        ownerName="Woonggon Kim"
        githubUrl="https://github.com/woong"
        linkedinUrl="https://linkedin.com/in/woong"
      />
    )

    expect(screen.getAllByText(/Woonggon Kim/)).toHaveLength(1)
    expect(screen.getByText(/Works & Study Notes/)).toBeInTheDocument()
    expect(screen.getByLabelText('GitHub')).toHaveAttribute('href', 'https://github.com/woong')
    expect(screen.getByLabelText('LinkedIn')).toHaveAttribute('href', 'https://linkedin.com/in/woong')
    expect(screen.queryByLabelText('Facebook')).not.toBeInTheDocument()
  })
})
