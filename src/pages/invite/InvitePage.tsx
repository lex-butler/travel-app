import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plane, Loader2, MapPin, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getInviteByToken, acceptInvite, type InviteData } from '@/services/inviteService'
import { useAuthStore } from '@/stores/authStore'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!token || authLoading) return

    getInviteByToken(token)
      .then((inv) => {
        if (!inv) {
          setError('This invite link is invalid.')
          return
        }
        if (Date.now() / 1000 > inv.expiresAt.seconds) {
          setError('This invite link has expired.')
          return
        }
        if (inv.status !== 'pending') {
          setError('This invite link has already been used.')
          return
        }
        setInvite(inv)
      })
      .catch(() => setError('Failed to load invite. Please try again.'))
      .finally(() => setLoading(false))
  }, [token, authLoading])

  async function handleJoin() {
    if (!user || !token) return
    setJoining(true)
    try {
      const tripId = await acceptInvite(token, user.uid)
      navigate(`/trips/${tripId}`, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join trip.')
      setJoining(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-destructive/10">
            <Plane className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Invite unavailable</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button asChild variant="outline">
            <Link to="/trips">Go to my trips</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!invite) return null

  const { trip } = invite
  const isSelfInvite = user?.uid === invite.invitedBy

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-muted/30">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary/10">
            <Plane className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">You're invited!</h1>
          <p className="text-muted-foreground text-sm">
            <strong>{invite.invitedByName}</strong> invited you to join a trip on TripSync
          </p>
        </div>

        {/* Trip snapshot card */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-base">{trip.name}</h2>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {trip.destinationStatus === 'decided' && trip.destination
                    ? trip.destination
                    : 'Destination TBD'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {trip.dateStatus === 'decided' && trip.dates
                    ? trip.dates
                    : trip.dateStatus === 'poll'
                      ? 'Polling dates'
                      : 'Dates flexible'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {trip.memberCount} member{trip.memberCount !== 1 ? 's' : ''} so far
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        {isSelfInvite ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">This is your own invite link.</p>
            <Button asChild className="w-full" variant="outline">
              <Link to={`/trips/${invite.tripId}`}>Go to trip</Link>
            </Button>
          </div>
        ) : !user ? (
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to={`/login?redirect=/invite/${token}`}>Sign in to join</Link>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be brought back here after signing in.
            </p>
          </div>
        ) : (
          <Button className="w-full" onClick={handleJoin} disabled={joining}>
            {joining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining…
              </>
            ) : (
              'Join trip'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
