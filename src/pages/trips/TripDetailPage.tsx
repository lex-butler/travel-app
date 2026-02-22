import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Calendar, Users, ArrowLeft, Loader2, Copy, Check, Link2, Mail, Share2, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { subscribeToTrip, updateMyAvailability } from '@/services/tripService'
import { createInviteLink } from '@/services/inviteService'
import { useAuthStore } from '@/stores/authStore'
import { useTripStore } from '@/stores/tripStore'
import type { Trip } from '@/types'

// ─── Invite dialog ────────────────────────────────────────────────────────────

function InviteDialog({
  trip,
  open,
  onClose,
}: {
  trip: Trip
  open: boolean
  onClose: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const [inviteUrl, setInviteUrl] = useState('')
  const [genError, setGenError] = useState(false)
  const [copied, setCopied] = useState(false)

  // Derived: generating while dialog is open but no result or error yet
  const generating = open && !inviteUrl && !genError

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    createInviteLink(trip, user.uid, user.displayName ?? 'Someone')
      .then((token) => { if (!cancelled) setInviteUrl(`${window.location.origin}/invite/${token}`) })
      .catch(() => { if (!cancelled) setGenError(true) })
    return () => {
      cancelled = true
      setInviteUrl('')
      setGenError(false)
    }
  }, [open, user, trip])

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: `Join "${trip.name}" on TripSync`,
        text: `${user?.displayName ?? 'Someone'} invited you to join a trip on TripSync.`,
        url: inviteUrl,
      })
    } catch {
      // User cancelled or share not supported — fall back silently
    }
  }

  const emailHref = `mailto:?subject=${encodeURIComponent(`Join "${trip.name}" on TripSync`)}&body=${encodeURIComponent(`Hi!\n\nYou've been invited to join a trip on TripSync.\n\nClick this link to join:\n${inviteUrl}\n\nThe link expires in 7 days.`)}`

  const canNativeShare = typeof navigator.share === 'function'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Invite someone to <strong>{trip.name}</strong>. Link expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : genError ? (
          <p className="text-sm text-destructive text-center py-4">
            Failed to generate invite link. Please try again.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Link + copy */}
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copy link">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* Share buttons */}
            <div className="flex gap-2">
              {canNativeShare && (
                <Button variant="outline" className="flex-1" onClick={handleNativeShare} disabled={!inviteUrl}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              )}
              <Button variant="outline" className="flex-1" asChild disabled={!inviteUrl}>
                <a href={emailHref}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  icon: React.ElementType
  title: string
  description: string
  highlight?: boolean
  onClick?: () => void
}

function ActionCard({ icon: Icon, title, description, highlight, onClick }: ActionCardProps) {
  return (
    <Card
      className={`transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${
        highlight ? 'border-primary ring-1 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${
            highlight ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── Availability section (shown when dateStatus === 'poll') ─────────────────

function AvailabilitySection({
  trip,
  userId,
  onInvite,
}: {
  trip: Trip
  userId: string | undefined
  onInvite: () => void
}) {
  const myDates = userId ? (trip.availability?.[userId] ?? '') : ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setDraft(myDates)
    setEditing(true)
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    try {
      await updateMyAvailability(trip.id, userId, draft.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const respondedCount = Object.keys(trip.availability ?? {}).length
  const memberCount = trip.memberIds.length
  const isSolo = memberCount === 1

  return (
    <Card className="mb-6">
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Finding availability</p>
              <p className="text-xs text-muted-foreground">
                {isSolo
                  ? 'Invite your group so everyone can share their dates'
                  : `${respondedCount} of ${memberCount} members have responded`}
              </p>
            </div>
          </div>
          {isSolo && (
            <Button variant="outline" size="sm" onClick={onInvite}>
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Invite
            </Button>
          )}
        </div>

        {/* Current user's availability */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your available dates
          </p>
          {editing ? (
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. June 1–15, July 10–20"
                autoFocus
              />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : myDates ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{myDates}</p>
              <button
                onClick={startEdit}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit availability"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="text-sm text-primary hover:underline transition-colors"
            >
              + Add your available dates
            </button>
          )}
        </div>

        {!isSolo && (
          <p className="text-xs text-muted-foreground">
            Once everyone responds, you'll be able to pick dates that work for the whole group.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Scenario dashboards ──────────────────────────────────────────────────────

function ScenarioA({ trip, onInvite }: { trip: Trip; onInvite: () => void }) {
  const isPoll = trip.dateStatus === 'poll'
  return (
    <>
      <div className="mb-6">
        <p className="text-muted-foreground">Let's nail down the basics before planning details.</p>
      </div>
      {isPoll ? (
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            icon={Users}
            title="Invite people"
            description="Get everyone sharing their availability"
            highlight
            onClick={onInvite}
          />
          <ActionCard icon={MapPin} title="Pick a destination" description="Add options and vote as a group" highlight />
          <div className="col-span-2">
            <ActionCard icon={MapPin} title="Budget" description="Set a rough budget estimate" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <ActionCard icon={Users} title="Invite people" description="Get your crew on board" highlight onClick={onInvite} />
          <ActionCard icon={MapPin} title="Pick a destination" description="Add options and vote as a group" highlight />
          <ActionCard icon={Calendar} title="Set dates" description="Poll the group or set a window" />
          <ActionCard icon={MapPin} title="Budget" description="Set a rough budget estimate" />
        </div>
      )}
    </>
  )
}

function ScenarioB({ trip, onInvite }: { trip: Trip; onInvite: () => void }) {
  const isPoll = trip.dateStatus === 'poll'
  return (
    <>
      <div className="mb-6">
        <p className="text-muted-foreground">
          Heading to <span className="font-medium text-foreground">{trip.destination}</span>
          {isPoll ? ' — invite your group to find dates that work.' : ' — now let\'s lock in the dates.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ActionCard
          icon={Users}
          title="Invite people"
          description={isPoll ? 'Get everyone sharing their availability' : 'Get your crew on board'}
          highlight
          onClick={onInvite}
        />
        {isPoll
          ? <ActionCard icon={MapPin} title="Accommodation" description="Start browsing where to stay" />
          : <ActionCard icon={Calendar} title="Set dates" description="Poll the group or set a window" highlight />}
        <ActionCard icon={MapPin} title="Explore places" description="Start adding spots to visit" />
        <ActionCard icon={MapPin} title="Budget" description="Set a rough budget estimate" />
      </div>
    </>
  )
}

function ScenarioC({ trip, onInvite }: { trip: Trip; onInvite: () => void }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-muted-foreground">
          Dates locked in{trip.dates ? ` — ${trip.dates}` : ''}. Now decide where you're going.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon={MapPin} title="Pick a destination" description="Add options and vote as a group" highlight />
        <ActionCard icon={Users} title="Invite people" description="Get your crew on board" onClick={onInvite} />
        <ActionCard icon={MapPin} title="Budget" description="Set a rough budget estimate" />
        <ActionCard icon={Calendar} title="Itinerary" description="Start planning day by day" />
      </div>
    </>
  )
}

function ScenarioD({ trip, onInvite }: { trip: Trip; onInvite: () => void }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-muted-foreground">
          {trip.destination} · {trip.dates} — time to plan the details.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon={Calendar} title="Itinerary" description="Plan your days, add activities" highlight />
        <ActionCard icon={MapPin} title="Accommodation" description="Find and vote on where to stay" />
        <ActionCard icon={MapPin} title="Transport" description="Flights, cars, and transfers" />
        <ActionCard icon={Users} title="Invite people" description="Add more to the trip" onClick={onInvite} />
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { setActiveTrip } = useTripStore()
  const user = useAuthStore((s) => s.user)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (!tripId) return
    const unsubscribe = subscribeToTrip(tripId, (data) => {
      if (data === null) {
        setNotFound(true)
      } else {
        setTrip(data)
        setActiveTrip(data)
      }
      setLoading(false)
    })
    return () => {
      unsubscribe()
      setActiveTrip(null)
    }
  }, [tripId, setActiveTrip])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !trip) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <p className="text-muted-foreground">Trip not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/trips">Back to trips</Link>
        </Button>
      </div>
    )
  }

  const destDecided = trip.destinationStatus === 'decided'
  const datesDecided = trip.dateStatus === 'decided'

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back link */}
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        My Trips
      </Link>

      {/* Trip header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {destDecided && trip.destination ? trip.destination : 'Destination TBD'}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {datesDecided && trip.dates
              ? trip.dates
              : trip.dateStatus === 'poll'
                ? 'Finding availability'
                : 'Dates flexible'}
          </span>
          <button
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            onClick={() => setInviteOpen(true)}
          >
            <Link2 className="h-4 w-4" />
            {trip.memberIds.length === 1 ? 'Just you · Invite others' : `${trip.memberIds.length} members`}
          </button>
        </div>
      </div>

      {/* Availability section — shown when polling for dates */}
      {trip.dateStatus === 'poll' && (
        <AvailabilitySection trip={trip} userId={user?.uid} onInvite={() => setInviteOpen(true)} />
      )}

      {/* Context-aware dashboard */}
      {!destDecided && !datesDecided && <ScenarioA trip={trip} onInvite={() => setInviteOpen(true)} />}
      {destDecided && !datesDecided && <ScenarioB trip={trip} onInvite={() => setInviteOpen(true)} />}
      {!destDecided && datesDecided && <ScenarioC trip={trip} onInvite={() => setInviteOpen(true)} />}
      {destDecided && datesDecided && <ScenarioD trip={trip} onInvite={() => setInviteOpen(true)} />}

      {/* Invite dialog */}
      <InviteDialog trip={trip} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
