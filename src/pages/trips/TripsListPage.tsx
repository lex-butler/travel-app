import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, Calendar, Users, Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getUserTrips } from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import { useTripStore } from '@/stores/tripStore'
import type { Trip } from '@/types'

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip }: { trip: Trip }) {
  const memberCount = trip.memberIds.length

  return (
    <Link to={`/trips/${trip.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight">{trip.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                trip.phase === 'finalized'
                  ? 'bg-green-100 text-green-700'
                  : trip.phase === 'booking'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {trip.phase}
            </span>
          </div>

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

            {trip.tripType === 'group' && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>{memberCount === 1 ? 'Just you so far' : `${memberCount} members`}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Plane className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold">No trips yet</h2>
      <p className="mt-2 text-muted-foreground max-w-xs">
        Start planning your next adventure — create a trip and invite your crew.
      </p>
      <Button asChild className="mt-6">
        <Link to="/trips/new">
          <Plus className="mr-2 h-4 w-4" />
          Create your first trip
        </Link>
      </Button>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
      <div className="flex justify-between gap-2">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-3 w-28 rounded bg-muted" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripsListPage() {
  const user = useAuthStore((s) => s.user)
  const { trips, setTrips } = useTripStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    getUserTrips(user.uid)
      .then((data) => { if (active) { setTrips(data); setLoading(false) } })
      .catch(() => { if (active) { setError('Failed to load trips. Please refresh.'); setLoading(false) } })
    return () => { active = false }
  }, [user, setTrips])

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Button asChild>
          <Link to="/trips/new">
            <Plus className="mr-2 h-4 w-4" />
            New trip
          </Link>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : trips.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
