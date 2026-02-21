import { useParams } from 'react-router-dom'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">You&apos;re Invited!</h1>
        <p className="mt-2 text-muted-foreground">Joining trip via invite token: {token}</p>
        {/* Invite acceptance flow coming in Week 1, Day 4 */}
      </div>
    </div>
  )
}
