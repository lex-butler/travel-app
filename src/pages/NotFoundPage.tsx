import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-xl font-semibold">Page not found</p>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-primary underline underline-offset-4 hover:no-underline"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
