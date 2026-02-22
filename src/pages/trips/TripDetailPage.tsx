import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Calendar, Users, ArrowLeft, Loader2, Copy, Check, Link2, Mail, Share2, X, DollarSign, Hotel, Map, Plane, Compass, Plus } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
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
import { Calendar as CalendarWidget } from '@/components/ui/calendar'
import { subscribeToTrip, updateMyAvailability, getUserProfiles, type MemberProfile, type DateRange } from '@/services/tripService'
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

// ─── Availability dialog ──────────────────────────────────────────────────────

type RdpRange = { from: Date | undefined; to?: Date | undefined }

function formatRange(r: DateRange): string {
  const s = new Date(r.start + 'T00:00:00')
  const e = new Date(r.end + 'T00:00:00')
  return isSameDay(s, e) ? format(s, 'MMM d') : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
}

function AvailabilityDialog({
  trip,
  userId,
  open,
  onClose,
}: {
  trip: Trip
  userId: string | undefined
  open: boolean
  onClose: () => void
}) {
  const raw = userId ? (trip.availability?.[userId] ?? []) : []
  const myRanges: DateRange[] = Array.isArray(raw) ? raw : []
  const [selection, setSelection] = useState<RdpRange>({ from: undefined })
  const [saving, setSaving] = useState(false)

  const respondedCount = Object.keys(trip.availability ?? {}).length
  const memberCount = trip.memberIds.length

  async function addRange() {
    if (!userId || !selection.from) return
    const start = format(selection.from, 'yyyy-MM-dd')
    const end = format(selection.to ?? selection.from, 'yyyy-MM-dd')
    const updated = [...myRanges, { start, end }]
    setSaving(true)
    try {
      await updateMyAvailability(trip.id, userId, updated)
      setSelection({ from: undefined })
    } finally {
      setSaving(false)
    }
  }

  async function removeRange(index: number) {
    if (!userId) return
    const updated = myRanges.filter((_, i) => i !== index)
    await updateMyAvailability(trip.id, userId, updated)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Coloured header — pr-10 leaves room for the DialogContent close button */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-400 px-6 pt-6 pb-5 pr-10">
          <DialogHeader>
            <DialogTitle className="text-white">Find availability</DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              {memberCount > 1
                ? `${respondedCount} of ${memberCount} members have responded.`
                : 'Add your dates. Invite your group so they can add theirs.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Calendar */}
          <div className="flex justify-center border rounded-xl overflow-hidden">
            <CalendarWidget
              mode="range"
              selected={selection}
              onSelect={(range) => setSelection(range ?? { from: undefined })}
              disabled={{ before: new Date() }}
              numberOfMonths={1}
            />
          </div>

          {/* Add button — only shown when a date is selected */}
          {selection.from ? (
            <Button
              onClick={addRange}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {saving
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Plus className="mr-2 h-4 w-4" />}
              Add {format(selection.from, 'MMM d')}
              {selection.to && !isSameDay(selection.from, selection.to)
                ? ` – ${format(selection.to, 'MMM d')}`
                : ''}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-1">
              Tap a date or drag to select a range
            </p>
          )}

          {/* My added ranges */}
          {myRanges.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Your availability
              </p>
              <div className="space-y-1">
                {myRanges.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                    <span className="text-sm">{formatRange(r)}</span>
                    <button
                      onClick={() => removeRange(i)}
                      className="text-muted-foreground hover:text-foreground transition-colors ml-2"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────

const COLOR_CLASSES = {
  blue:    'bg-blue-500/15 text-blue-600',
  violet:  'bg-violet-500/15 text-violet-600',
  emerald: 'bg-emerald-500/15 text-emerald-600',
  amber:   'bg-amber-500/15 text-amber-600',
  rose:    'bg-rose-500/15 text-rose-600',
  cyan:    'bg-cyan-500/15 text-cyan-600',
} as const
type CardColor = keyof typeof COLOR_CLASSES

interface ActionCardProps {
  icon: React.ElementType
  title: string
  description: string
  highlight?: boolean
  color?: CardColor
  onClick?: () => void
}

function ActionCard({ icon: Icon, title, description, highlight, color, onClick }: ActionCardProps) {
  const iconClass = highlight
    ? 'bg-primary text-primary-foreground'
    : color
      ? COLOR_CLASSES[color]
      : 'bg-muted text-muted-foreground'

  return (
    <Card
      className={`transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} ${
        highlight ? 'border-primary ring-1 ring-primary shadow-sm' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── Invite prompt (primary card when no one else has joined) ─────────────────

function InvitePromptCard({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/75 shadow-md">
      <div className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">Invite your group</p>
          <p className="text-sm text-white/70 mt-0.5">Share a link to get everyone on board</p>
        </div>
        <Button
          onClick={onInvite}
          className="shrink-0 bg-white text-primary hover:bg-white/90 shadow-sm"
        >
          Invite
        </Button>
      </div>
    </div>
  )
}

// ─── Scenario dashboards ──────────────────────────────────────────────────────

function ScenarioA({ trip, onAvailability }: { trip: Trip; onAvailability: () => void }) {
  const isPoll = trip.dateStatus === 'poll'
  return (
    <>
      <div className="mb-5">
        <h2 className="font-semibold text-base">Next steps</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Let's nail down the basics before planning details.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {isPoll && (
          <ActionCard icon={Calendar} title="Find availability" description="Mark when you're free" color="blue" highlight onClick={onAvailability} />
        )}
        <ActionCard icon={MapPin} title="Pick a destination" description="Add options and vote as a group" color="violet" highlight={!isPoll} />
        {!isPoll && <ActionCard icon={Calendar} title="Set dates" description="Poll the group or set a window" color="blue" highlight />}
        <div className="col-span-2">
          <ActionCard icon={DollarSign} title="Budget" description="Set a rough budget estimate" color="emerald" />
        </div>
      </div>
    </>
  )
}

function ScenarioB({ trip, onAvailability }: { trip: Trip; onAvailability: () => void }) {
  const isPoll = trip.dateStatus === 'poll'
  return (
    <>
      <div className="mb-5">
        <h2 className="font-semibold text-base">Next steps</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Heading to <span className="font-medium text-foreground">{trip.destination}</span>
          {isPoll ? ' — find dates that work for everyone.' : ' — now let\'s lock in the dates.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {isPoll
          ? <ActionCard icon={Calendar} title="Find availability" description="Mark when you're free" color="blue" highlight onClick={onAvailability} />
          : <ActionCard icon={Calendar} title="Set dates" description="Poll the group or set a window" color="blue" highlight />}
        <ActionCard icon={Compass} title="Explore places" description="Start adding spots to visit" color="amber" />
        <div className="col-span-2">
          <ActionCard icon={DollarSign} title="Budget" description="Set a rough budget estimate" color="emerald" />
        </div>
      </div>
    </>
  )
}

function ScenarioC({ trip }: { trip: Trip }) {
  return (
    <>
      <div className="mb-5">
        <h2 className="font-semibold text-base">Next steps</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dates locked in{trip.dates ? ` — ${trip.dates}` : ''}. Now decide where you're going.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon={MapPin} title="Pick a destination" description="Add options and vote as a group" color="violet" highlight />
        <ActionCard icon={DollarSign} title="Budget" description="Set a rough budget estimate" color="emerald" />
        <div className="col-span-2">
          <ActionCard icon={Map} title="Itinerary" description="Start planning day by day" color="cyan" />
        </div>
      </div>
    </>
  )
}

function ScenarioD({ trip }: { trip: Trip }) {
  return (
    <>
      <div className="mb-5">
        <h2 className="font-semibold text-base">Plan the details</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {trip.destination} · {trip.dates}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon={Map} title="Itinerary" description="Plan your days, add activities" color="cyan" highlight />
        <ActionCard icon={Hotel} title="Accommodation" description="Find and vote on where to stay" color="rose" />
        <ActionCard icon={Plane} title="Transport" description="Flights, cars, and transfers" color="blue" />
        <ActionCard icon={DollarSign} title="Budget" description="Track and split expenses" color="emerald" />
      </div>
    </>
  )
}

// ─── Members section ─────────────────────────────────────────────────────────

function Avatar({ profile, size = 'md' }: { profile: MemberProfile; size?: 'sm' | 'md' }) {
  const initials = profile.displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'

  if (profile.photoURL) {
    return (
      <img
        src={profile.photoURL}
        alt={profile.displayName}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div className={`${dim} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  )
}

function MembersSection({
  trip,
  currentUserId,
  onInvite,
}: {
  trip: Trip
  currentUserId: string | undefined
  onInvite: () => void
}) {
  const [members, setMembers] = useState<MemberProfile[]>([])

  useEffect(() => {
    let cancelled = false
    getUserProfiles(trip.memberIds).then((profiles) => {
      if (!cancelled) setMembers(profiles)
    })
    return () => { cancelled = true }
  }, [trip.memberIds])

  function roleLabel(id: string) {
    if (id === trip.ownerId) return 'Owner'
    if (trip.coLeadIds.includes(id)) return 'Co-lead'
    return 'Member'
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            Members{' '}
            <span className="text-muted-foreground font-normal text-sm">· {trip.memberIds.length}</span>
          </h2>
          <button
            onClick={onInvite}
            className="text-xs font-medium text-primary hover:underline transition-colors"
          >
            + Invite
          </button>
        </div>
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar profile={m} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.displayName}
                  {m.id === currentUserId && <span className="text-muted-foreground font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full shrink-0">
                {roleLabel(m.id)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
  const [availabilityOpen, setAvailabilityOpen] = useState(false)

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
  const isSolo = trip.memberIds.length === 1

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Hero header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg">
        <div className="p-6">
          <Link
            to="/trips"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            My Trips
          </Link>
          <h1 className="text-2xl font-bold text-white">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" />
              {destDecided && trip.destination ? trip.destination : 'Destination TBD'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5" />
              {datesDecided && trip.dates
                ? trip.dates
                : trip.dateStatus === 'poll'
                  ? 'Finding availability'
                  : 'Dates flexible'}
            </span>
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
              onClick={() => setInviteOpen(true)}
            >
              <Link2 className="h-3.5 w-3.5" />
              {trip.memberIds.length === 1 ? 'Just you · Invite' : `${trip.memberIds.length} members`}
            </button>
          </div>
        </div>
      </div>

      {/* Invite prompt — primary card when creator is the only member */}
      {isSolo && trip.tripType === 'group' && (
        <InvitePromptCard onInvite={() => setInviteOpen(true)} />
      )}

      {/* Context-aware dashboard */}
      {!destDecided && !datesDecided && <ScenarioA trip={trip} onAvailability={() => setAvailabilityOpen(true)} />}
      {destDecided && !datesDecided && <ScenarioB trip={trip} onAvailability={() => setAvailabilityOpen(true)} />}
      {!destDecided && datesDecided && <ScenarioC trip={trip} />}
      {destDecided && datesDecided && <ScenarioD trip={trip} />}

      {/* Members list */}
      <MembersSection trip={trip} currentUserId={user?.uid} onInvite={() => setInviteOpen(true)} />

      {/* Invite dialog */}
      <InviteDialog trip={trip} open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {/* Availability dialog */}
      <AvailabilityDialog trip={trip} userId={user?.uid} open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />
    </div>
  )
}
