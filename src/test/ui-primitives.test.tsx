import { render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'
import { Footer } from '@/components/layout/Footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

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

describe('UI primitives and shared render helpers', () => {
  it('renders badge and button as child links with explicit variants', () => {
    render(
      <div>
        <Badge>Default badge</Badge>
        <Badge asChild variant="link">
          <a href="/docs">Docs</a>
        </Badge>
        <Button>Default button</Button>
        <Button asChild variant="outline" size="sm">
          <a href="/settings">Settings</a>
        </Button>
      </div>,
    )

    expect(screen.getByText('Default badge')).toHaveAttribute('data-variant', 'default')
    expect(screen.getByText('Docs')).toHaveAttribute('href', '/docs')
    expect(screen.getByText('Docs')).toHaveAttribute('data-variant', 'link')
    expect(screen.getByText('Default button')).toHaveAttribute('data-size', 'default')
    expect(screen.getByText('Settings')).toHaveAttribute('href', '/settings')
    expect(screen.getByText('Settings')).toHaveAttribute('data-size', 'sm')
  })

  it('renders card, table, form, and admin error primitives with their slots', () => {
    render(
      <div>
        <AdminErrorPanel title="Load failed" message="Try again later" />
        <Card className="custom-card">
          <CardHeader className="custom-card-header">
            <CardTitle className="custom-card-title">Card title</CardTitle>
            <CardDescription className="custom-card-description">Card description</CardDescription>
            <CardAction className="custom-card-action">Action</CardAction>
          </CardHeader>
          <CardContent className="custom-card-content">Body</CardContent>
          <CardFooter className="custom-card-footer">Footer</CardFooter>
        </Card>
        <Label htmlFor="field" className="custom-label">Field</Label>
        <Input id="field" type="email" placeholder="name@example.com" className="custom-input" />
        <Textarea aria-label="Notes" defaultValue="hello" className="custom-textarea" />
        <Checkbox aria-label="Accept" defaultChecked />
        <Table className="custom-table">
          <TableCaption className="custom-table-caption">Example caption</TableCaption>
          <TableHeader className="custom-table-header">
            <TableRow className="custom-table-row">
              <TableHead className="custom-table-head">Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-table-body">
            <TableRow className="custom-table-row">
              <TableCell className="custom-table-cell">Value</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter className="custom-table-footer">
            <TableRow className="custom-table-row">
              <TableCell className="custom-table-cell">Total</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>,
    )

    expect(screen.getByText('Load failed')).toBeInTheDocument()
    expect(screen.getByText('Card title')).toHaveAttribute('data-slot', 'card-title')
    expect(screen.getByText('Card description')).toHaveAttribute('data-slot', 'card-description')
    expect(screen.getByText('Body')).toHaveAttribute('data-slot', 'card-content')
    expect(screen.getByText('Footer')).toHaveAttribute('data-slot', 'card-footer')
    expect(screen.getByText('Field')).toHaveAttribute('data-slot', 'label')
    expect(screen.getByPlaceholderText('name@example.com')).toHaveAttribute('data-slot', 'input')
    expect(screen.getByLabelText('Notes')).toHaveAttribute('data-slot', 'textarea')
    expect(screen.getByLabelText('Accept')).toHaveAttribute('data-slot', 'checkbox')
    expect(screen.getByText('Example caption')).toHaveAttribute('data-slot', 'table-caption')
    expect(screen.getByText('Value')).toHaveAttribute('data-slot', 'table-cell')
    expect(screen.getByText('Total')).toHaveAttribute('data-slot', 'table-cell')
  })

  it('hides social links when the footer receives no configured urls', () => {
    render(<Footer />)

    expect(screen.getAllByText(/John Doe/)).toHaveLength(1)
    expect(screen.getByText(/Works & Study Notes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).not.toBeInTheDocument()
  })

  it('renders only the configured footer social links', () => {
    render(
      <Footer
        ownerName="Woong"
        githubUrl="https://github.com/example"
        linkedinUrl="https://linkedin.com/in/example"
      />,
    )

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/example')
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/in/example')
    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument()
  })
})
