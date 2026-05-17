import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center">
            <h2 className="text-3xl font-bold">404 - Page Not Found</h2>
            <p className="text-gray-500">The page you are looking for does not exist or has been deleted.</p>
            <Link href="/">
                <Button>Return Home</Button>
            </Link>
        </div>
    )
}
