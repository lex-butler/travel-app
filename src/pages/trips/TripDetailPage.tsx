import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Calendar, Users, Loader2, Copy, Check, Mail, Share2, X, DollarSign, Hotel, Map, Plane, Compass, Plus, CheckCircle2, Lock, ChevronRight } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { useNavigate } from 'react-router-dom'

// ─── Types and Helpers ────────────────────────────────────────────────────────

type RdpRange = { from: Date | undefined; to?: Date | undefined }

function formatRange(r: DateRange): string {
  const s = new Date(r.start + 'T00:00:00')
  const e = new Date(r.end + 'T00:00:00')
  return isSameDay(s, e) ? format(s, 'MMM d') : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
}

interface ActionCardProps {
  icon: React.ElementType
  title: string
  description: string
  highlight?: boolean
  badge?: string
  color?: keyof typeof COLOR_MAP
  className?: string
  onClick?: () => void
  comingSoon?: boolean
}

const COLOR_MAP = {
  blue: 'from-blue-500 to-cyan-400',
  violet: 'from-violet-500 to-fuchsia-400',
  emerald: 'from-emerald-500 to-teal-400',
  amber: 'from-amber-500 to-orange-400',
  rose: 'from-rose-500 to-pink-400',
  cyan: 'from-cyan-500 to-blue-400',
} as const

// ─── Invite dialog ────────────────────────────────────────────────────────────

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
      // User cancelled or share not supported
    }
  }

  const emailHref = `mailto:?subject=${encodeURIComponent(`Join "${trip.name}" on TripSync`)}&body=${encodeURIComponent(`Hi!\n\nYou've been invited to join a trip on TripSync.\n\nClick this link to join:\n${inviteUrl}\n\nThe link expires in 7 days.`)}`
  const canNativeShare = typeof navigator.share === 'function'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass rounded-2xl border-white/20 p-6 sm:p-7 max-w-sm animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Invite your crew</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1.5 text-xs text-balance">
            Share this link to bring everyone together for <strong>{trip.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : genError ? (
          <div className="p-6 text-center">
            <p className="text-sm text-destructive font-bold mb-4">
              Failed to generate invite link.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex gap-2 p-1.5 glass rounded-2xl border-white/40">
              <Input value={inviteUrl} readOnly className="border-none bg-transparent focus-visible:ring-0 text-sm font-medium h-12" />
              <Button size="icon" onClick={handleCopy} className="rounded-xl h-12 w-12 shadow-md">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>

            <div className="flex gap-3">
              {canNativeShare && (
                <Button variant="outline" className="flex-1 rounded-2xl h-14 font-bold border-2" onClick={handleNativeShare} disabled={!inviteUrl}>
                  <Share2 className="mr-2 h-5 w-5" />
                  Share
                </Button>
              )}
              <Button variant="outline" className="flex-1 rounded-2xl h-14 font-bold border-2" asChild disabled={!inviteUrl}>
                <a href={emailHref}>
                  <Mail className="mr-2 h-5 w-5" />
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
      <DialogContent className="max-w-md glass rounded-2xl border-white/20 p-0 overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
        <div className="premium-gradient px-6 pt-7 pb-6 text-white shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black tracking-tight text-white">Find your dates</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onClose(); window.location.href = `/trips/${trip.id}/planning` }}
                className="text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white hover:bg-white/10"
              >
                See Overlaps <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <DialogDescription className="text-white/80 mt-1.5 text-[11px] font-medium leading-relaxed">
              {memberCount > 1
                ? `${respondedCount} of ${memberCount} members have shared their availability.`
                : 'Share when you can travel so others can see.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 sm:p-7 space-y-7 overflow-y-auto custom-scrollbar">
          <div className="flex justify-center border-none glass rounded-[1.5rem] p-3.5 bg-white/40 dark:bg-white/5 shadow-inner">
            <CalendarWidget
              mode="range"
              selected={selection}
              onSelect={(range) => setSelection(range ?? { from: undefined })}
              disabled={{ before: new Date() }}
              numberOfMonths={1}
              className="p-0 border-none scale-95 sm:scale-100 origin-top"
            />
          </div>

          <div className="space-y-4">
            {selection.from ? (
              <Button
                onClick={addRange}
                disabled={saving}
                size="lg"
                className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/10"
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
              <p className="text-center text-xs font-semibold text-muted-foreground bg-muted/20 py-3.5 rounded-xl border border-dashed border-muted-foreground/20">
                Select dates on the calendar to add
              </p>
            )}

            {myRanges.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] px-1">
                  Your availability
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {myRanges.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl glass px-4 py-3 border-white/50 shadow-sm animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <span className="text-sm font-bold">{formatRange(r)}</span>
                      <button
                        onClick={() => removeRange(i)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({ icon: Icon, title, description, highlight, badge, color, className, onClick, comingSoon }: ActionCardProps) {
  const gradient = color ? COLOR_MAP[color] : 'from-gray-500 to-gray-400'

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-0 border-white/40 transition-all",
        comingSoon ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.98]",
        !comingSoon && onClick ? "cursor-pointer" : "",
        highlight && !comingSoon ? "ring-1 ring-primary ring-offset-1 ring-offset-background shadow-lg shadow-primary/5" : "shadow-sm",
        className
      )}
      onClick={comingSoon ? undefined : onClick}
    >
      {comingSoon && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg glass border border-white/30 text-muted-foreground">
            Coming soon
          </span>
        </div>
      )}
      <div className="p-5 relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3.5">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shadow-md text-white",
            highlight && !comingSoon ? "premium-gradient" : `bg-gradient-to-br ${gradient}`
          )}>
            <Icon className="h-5 w-5" />
          </div>
          {badge && !comingSoon && (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 animate-pulse">
              {badge}
            </span>
          )}
        </div>
        <p className="font-bold text-sm tracking-tight mb-0.5 group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{description}</p>
      </div>
      <div className="absolute top-0 right-0 -mr-4 -mt-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.02] group-hover:opacity-[0.05] transition-opacity blur-2xl" />
    </Card>
  )
}

// ─── Invite prompt ────────────────────────────────────────────────────────────

function InvitePromptCard({ onInvite }: { onInvite: () => void }) {
  return (
    <Card
      onClick={onInvite}
      className="p-0 border-none overflow-hidden shadow-lg shadow-primary/5 cursor-pointer hover:shadow-primary/10 transition-all active:scale-[0.99]"
    >
      <div className="glass flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5 text-foreground relative border-primary/20 bg-white/60">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl premium-gradient text-white shadow-lg rotate-2">
            <Users className="h-5 w-5" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
            <Plus className="h-2.5 w-2.5 text-slate-950 stroke-[4px]" />
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-lg font-black tracking-tight leading-none text-primary">Invite your crew</p>
          <p className="text-[11px] font-semibold max-w-sm leading-relaxed mt-1 text-muted-foreground">The more people, the better the plan. Tap to invite friends and start voting on destinations.</p>
        </div>
        <ChevronRight className="h-5 w-5 text-primary/40 shrink-0 hidden sm:block" />
      </div>
    </Card>
  )
}

// ─── Members section ─────────────────────────────────────────────────────────

function Avatar({ profile, size = 'md' }: { profile: MemberProfile; size?: 'sm' | 'md' }) {
  const parts = profile.displayName.trim().split(/\s+/)
  const initials = parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

  const dim = size === 'sm' ? 'h-10 w-10 text-[10px]' : 'h-14 w-14 text-sm'

  return (
    <div className={cn(
      "shrink-0 rounded-[1.25rem] border-2 border-white/50 shadow-sm overflow-hidden",
      dim
    )}>
      {profile.photoURL ? (
        <img src={profile.photoURL} alt={profile.displayName} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
          {initials}
        </div>
      )}
    </div>
  )
}

function TripProgress({ trip }: { trip: Trip }) {
  const stages = [
    { label: 'Dreaming', done: true, current: false },
    { label: 'Polls', done: trip.tripType === 'group' && (trip.dateStatus === 'decided' || Object.keys(trip.availability || {}).length > 0), current: trip.dateStatus === 'poll' },
    { label: 'Booking', done: trip.dateStatus === 'decided' && trip.destinationStatus === 'decided', current: trip.dateStatus === 'decided' && trip.phase !== 'finalized' },
    { label: 'Departure', done: trip.phase === 'finalized', current: trip.phase === 'finalized' },
  ]

  const hint =
    trip.phase === 'finalized' ? 'All set — enjoy the trip!'
    : trip.dateStatus === 'decided' && trip.destinationStatus === 'decided' ? 'Lock in accommodation and travel to advance'
    : trip.dateStatus === 'decided' ? 'Lock in a destination to reach Booking'
    : trip.destinationStatus === 'decided' ? 'Decide on dates to reach Booking'
    : trip.dateStatus === 'poll' ? 'Crew is submitting availability — check Planning'
    : 'Add destinations or start an availability poll to advance'

  return (
    <div className="flex flex-col gap-1 px-2 py-4">
    <div className="flex items-center justify-between gap-4">
      {stages.map((s, i) => (
        <div key={i} className="flex-1 flex flex-col gap-3 group">
          <div className="relative">
            <div className={cn(
              "h-1.5 rounded-full transition-all duration-700",
              s.done ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                : s.current ? "bg-primary/25"
                  : "bg-muted/30"
            )} />
            <div className={cn(
              "absolute -top-1.5 right-0 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center transition-all duration-500",
              s.done ? "bg-emerald-500 text-white scale-110"
                : s.current ? "bg-primary text-white scale-125 shadow-lg shadow-primary/40"
                  : "bg-muted text-muted-foreground/40"
            )}>
              {s.done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : s.current ? (
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              ) : i > 1 ? (
                <Lock className="h-2 w-2" />
              ) : (
                <div className="h-1 w-1 rounded-full bg-current" />
              )}
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.15em] transition-colors",
            s.done ? "text-emerald-500"
              : s.current ? "text-primary underline underline-offset-2 decoration-primary/40"
                : "text-muted-foreground/40"
          )}>{s.label}</span>
        </div>
      ))}
    </div>
    <p className="text-[10px] text-muted-foreground/50 font-medium px-1">{hint}</p>
    </div>
  )
}

function MembersSection({ trip, currentUserId, onInvite, onCrew, profiles }: { trip: Trip; currentUserId: string | undefined; onInvite: () => void; onCrew: () => void; profiles: MemberProfile[] }) {
  const members = profiles

  function roleLabel(id: string) {
    if (id === trip.ownerId) return 'Owner'
    if (trip.coLeadIds.includes(id)) return 'Host'
    return 'Traveler'
  }

  const isHost = currentUserId === trip.ownerId || trip.coLeadIds.includes(currentUserId ?? '')

  return (
    <Card className="mt-10 p-0 overflow-hidden border-white/30 bg-transparent shadow-none">
      <div className="p-2 sm:p-4">
        <div className="flex items-center justify-between mb-8 glass p-6 rounded-2xl border-white/50">
          <div>
            <h2 className="text-xl font-black tracking-tight">Trip Crew</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex squad-stack items-center">
                {members.slice(0, 4).map(m => (
                  <Avatar key={m.id} profile={m} size="sm" />
                ))}
                {members.length > 4 && (
                  <div className="h-10 w-10 rounded-[1.25rem] bg-muted flex items-center justify-center text-[10px] font-black border-2 border-background">
                    +{members.length - 4}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                {trip.memberIds.length} {trip.memberIds.length === 1 ? 'traveler' : 'travelers'} onboard
              </p>
            </div>
          </div>
          {isHost && (
            <Button size="sm" onClick={onInvite} className="rounded-xl font-black text-[10px] uppercase tracking-wider h-10 px-5 shadow-lg shadow-primary/20 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Invite
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {members.slice(0, 4).map((m) => (
            <div key={m.id} className="flex items-center gap-4 glass p-4 rounded-2xl border-white/50 hover:bg-white/40 transition-colors group/member">
              <Avatar profile={m} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <p className="text-sm font-black truncate group-hover:text-primary transition-colors">
                    {m.displayName}
                  </p>
                  {m.id === currentUserId && <span className="text-primary font-black text-[10px]">YOU</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md",
                    m.id === trip.ownerId ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {roleLabel(m.id)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {members.length > 4 && (
            <div
              onClick={onCrew}
              className="flex items-center justify-center gap-2 glass p-4 rounded-2xl border-white/50 border-dashed hover:bg-white/40 transition-colors cursor-pointer"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-black text-muted-foreground uppercase opacity-70">View all {members.length} members</span>
            </div>
          )}
          <div
            onClick={onCrew}
            className="flex items-center justify-center gap-2 glass p-4 rounded-2xl border-white/50 border-dashed hover:bg-white/40 transition-colors cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase">Manage Crew</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Dashboard Scenarios ──────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5 px-1">
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <p className="text-xs text-muted-foreground font-medium mt-0.5">{subtitle}</p>
    </div>
  )
}

function ScenarioA({ trip, onAvailability, onDestinations, onPlanning, onBudget, isHost, userId }: { trip: Trip; onAvailability: () => void; onDestinations: () => void; onPlanning: () => void; onBudget: () => void; isHost: boolean; userId?: string }) {
  const isPoll = trip.dateStatus === 'poll'
  const hasResponded = userId ? !!trip.availability?.[userId] : false

  return (
    <>
      <SectionHeader
        title={isHost ? "Next Steps" : "Your Mission"}
        subtitle={isHost ? "Let's build the foundation for your trip." : "Help the crew get this trip moving."}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isPoll && (
          <ActionCard
            icon={Calendar}
            title="Availability"
            description={isHost ? "See who's free & overlap" : "When can you travel?"}
            color="blue"
            highlight={!hasResponded || isHost}
            badge={!hasResponded ? "Action Required" : isHost ? "Analysis Ready" : "Updated"}
            onClick={isHost ? onPlanning : onAvailability}
          />
        )}
        <ActionCard
          icon={MapPin}
          title="Destinations"
          description={isHost ? "Lock in where we're heading" : "Vote on where we're heading"}
          color="violet"
          highlight={!isPoll}
          badge={trip.tripType === 'group' && trip.memberIds.length > 1 ? "Vote Now" : undefined}
          onClick={onDestinations}
        />
        {isHost && !isPoll && <ActionCard icon={Calendar} title="Trip Dates" description="Finalize the calendar" color="blue" highlight />}
        <ActionCard
          icon={DollarSign}
          title="Total Budget"
          description="See estimated costs"
          color="emerald"
          className="sm:col-span-2 lg:col-span-1"
          onClick={onBudget}
        />
      </div>
    </>
  )
}

function ScenarioB({ trip, onAvailability, onPlanning, onBudget, isHost }: { trip: Trip; onAvailability: () => void; onPlanning: () => void; onBudget: () => void; isHost: boolean }) {
  const isPoll = trip.dateStatus === 'poll'
  return (
    <>
      <SectionHeader
        title="Destination Locked"
        subtitle={`Going to ${trip.destination}. Let's find the best dates.`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isPoll
          ? <ActionCard icon={Calendar} title="Availability" description={isHost ? "Crew Overlaps & Heatmap" : "Add your window"} color="blue" highlight onClick={isHost ? onPlanning : onAvailability} />
          : isHost && <ActionCard icon={Calendar} title="Trip Dates" description="Finalize the dates" color="blue" highlight onClick={onPlanning} />}
        <ActionCard icon={Compass} title="Bucket List" description="Start adding sights and bites" color="amber" />
        <ActionCard icon={DollarSign} title="Budget Plan" description="Track expected expenses" color="emerald" className={cn(isPoll || isHost ? "" : "sm:col-span-2 lg:col-span-1")} onClick={onBudget} />
      </div>
    </>
  )
}

function ScenarioC({ trip, onDestinations, onBudget }: { trip: Trip; onDestinations: () => void; onBudget: () => void }) {
  return (
    <>
      <SectionHeader
        title="Dates Ready"
        subtitle={`Set for ${trip.dates}. Now, where should we go?`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActionCard icon={MapPin} title="Destination" description="Vet and vote on locations" color="violet" highlight onClick={onDestinations} />
        <ActionCard icon={DollarSign} title="Budgeting" description="How much will we spend?" color="emerald" onClick={onBudget} />
        <ActionCard icon={Map} title="Itinerary" description="Draft a daily schedule" color="cyan" className="sm:col-span-2 lg:col-span-1" comingSoon />
      </div>
    </>
  )
}

function ScenarioD({ trip, onBudget, onAccommodations }: { trip: Trip; onBudget: () => void; onAccommodations: () => void }) {
  return (
    <>
      <SectionHeader
        title="Detail Planning"
        subtitle={`${trip.destination} · ${trip.dates}`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ActionCard icon={Map} title="Daily Schedule" description="Activities and bookings" color="cyan" comingSoon />
        <ActionCard icon={Hotel} title="Stay" description="Lodging options and votes" color="rose" onClick={onAccommodations} />
        <ActionCard icon={Plane} title="Travel" description="Flights and transit info" color="blue" comingSoon />
        <ActionCard icon={DollarSign} title="Final Budget" description="Track and split costs" color="emerald" onClick={onBudget} />
      </div>
    </>
  )
}

export default function TripDetailPage() {
  const navigate = useNavigate()
  const { tripId } = useParams<{ tripId: string }>()
  const { setActiveTrip } = useTripStore()
  const user = useAuthStore((s) => s.user)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([])

  useEffect(() => {
    if (!trip) return
    let cancelled = false
    getUserProfiles(trip.memberIds).then((profiles) => {
      if (cancelled) return
      // If solo, add some mock members for visualization as requested
      if (profiles.length <= 1) {
        const mocks: MemberProfile[] = [
          { id: 'mock1', displayName: 'Sarah Chen', photoURL: 'https://i.pravatar.cc/150?u=mock1', email: 'sarah@example.com', homeCity: 'London', homeLat: 51.5074, homeLng: -0.1278 },
          { id: 'mock2', displayName: 'Marcus Vance', photoURL: 'https://i.pravatar.cc/150?u=mock2', email: 'marcus@example.com', homeCity: 'New York', homeLat: 40.7128, homeLng: -74.0060 },
          { id: 'mock3', displayName: 'Elena Rossi', photoURL: 'https://i.pravatar.cc/150?u=mock3', email: 'elena@example.com', homeCity: 'Rome', homeLat: 41.9028, homeLng: 12.4964 },
          { id: 'mock4', displayName: 'Jack Thompson', photoURL: 'https://i.pravatar.cc/150?u=mock4', email: 'jack@example.com', homeCity: 'Berlin', homeLat: 52.5200, homeLng: 13.4050 },
        ]
        setMemberProfiles([...profiles, ...mocks])
      } else {
        setMemberProfiles(profiles)
      }
    })
    return () => { cancelled = true }
  }, [trip])

  useEffect(() => {
    if (!tripId) return
    const unsubscribe = subscribeToTrip(tripId, (data) => {
      if (data === null) { setNotFound(true) } else { setTrip(data); setActiveTrip(data) }
      setLoading(false)
    })
    return () => { unsubscribe(); setActiveTrip(null) }
  }, [tripId, setActiveTrip])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 animate-fade-in">
        <div className="h-12 w-12 premium-gradient rounded-2xl animate-float flex items-center justify-center shadow-lg shadow-primary/10">
          <Plane className="h-6 w-6 text-white" />
        </div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Trip...</p>
      </div>
    )
  }

  if (notFound || !trip) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="h-16 w-16 mx-auto bg-destructive/5 text-destructive rounded-2xl flex items-center justify-center mb-6 border border-destructive/10">
          <X className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black mb-1.5">Trip Not Found</h2>
        <p className="text-sm text-muted-foreground mb-8">This trip may have been deleted or moved.</p>
        <Button asChild variant="outline" size="sm" className="rounded-xl px-8 font-bold">
          <Link to="/trips">Head Back</Link>
        </Button>
      </div>
    )
  }

  const destDecided = trip.destinationStatus === 'decided'
  const datesDecided = trip.dateStatus === 'decided'
  const isSolo = trip.memberIds.length === 1
  const isHost = user?.uid === trip.ownerId || trip.coLeadIds.includes(user?.uid ?? '')

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="relative group animate-slide-up">
        {/* Back button integrated inside Hero */}
        <div className={cn(
          "rounded-2xl border-white/60 p-6 sm:p-10 pt-16 sm:pt-20 relative overflow-hidden shadow-xl transition-all duration-700",
          trip.imageUrl
            ? "glass bg-slate-900/40"
            : "glass bg-gradient-to-br from-white/80 via-white/60 to-indigo-50/50 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40"
        )}>
          {trip.imageUrl ? (
            <div className="absolute inset-0 z-0">
              <img
                src={trip.imageUrl}
                className="h-full w-full object-cover opacity-40 scale-105 group-hover:scale-100 transition-transform duration-1000"
                alt=""
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
            </div>
          ) : (
            <>
              <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary/20 to-violet-400/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-gradient-to-br from-cyan-400/15 to-emerald-400/15 blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-64 rounded-full bg-gradient-to-r from-amber-300/10 to-rose-300/10 blur-2xl pointer-events-none" />
            </>
          )}

          <div className="relative z-10">
            <h1 className={cn(
              "text-3xl sm:text-4xl font-black tracking-tight text-balance leading-tight mb-6 transition-colors",
              trip.imageUrl ? "text-white drop-shadow-md" : "text-foreground"
            )}>
              {trip.name}
            </h1>

            <div className="flex flex-wrap gap-2.5">
              {/* Group / Solo badge */}
              <div className={cn(
                "inline-flex items-center gap-2 rounded-xl backdrop-blur-md px-4 py-2 text-xs font-bold border shadow-sm",
                trip.imageUrl
                  ? "bg-black/20 text-white border-white/20"
                  : "bg-white/50 dark:bg-white/5 border-white/50 text-foreground",
              )}>
                <Users className="h-3.5 w-3.5 text-primary" />
                {trip.tripType === 'group' ? 'Group Trip' : 'Solo Trip'}
              </div>

              <div className={cn(
                "inline-flex items-center gap-2 rounded-xl backdrop-blur-md px-4 py-2 text-xs font-bold border shadow-sm transition-all",
                trip.imageUrl
                  ? "bg-black/20 text-white border-white/20 hover:bg-black/30"
                  : "bg-white/50 dark:bg-white/5 border-white/50 text-foreground",
                !destDecided && "cursor-pointer hover:bg-white/70 dark:hover:bg-white/10"
              )}>
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {destDecided && trip.destination ? trip.destination : 'Destination TBD'}
              </div>
              <button
                onClick={trip.dateStatus === 'poll' ? () => setAvailabilityOpen(true) : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl backdrop-blur-md px-4 py-2 text-xs font-bold border shadow-sm transition-all",
                  trip.imageUrl
                    ? "bg-black/20 text-white border-white/20 hover:bg-black/30"
                    : "bg-white/50 dark:bg-white/5 border-white/50 text-foreground",
                  trip.dateStatus === 'poll' && "cursor-pointer hover:bg-white/70 dark:hover:bg-white/10 hover:border-primary/30"
                )}
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {datesDecided && trip.dates ? trip.dates : trip.dateStatus === 'poll' ? 'Finding Dates' : 'Dates TBD'}
              </button>
              <button
                onClick={() => setInviteOpen(true)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl backdrop-blur-md px-3 py-1.5 text-xs font-bold border shadow-sm transition-all hover:scale-[1.02] active:scale-95",
                  trip.imageUrl
                    ? "bg-black/20 text-white border-white/20 hover:bg-black/40"
                    : "bg-white/50 dark:bg-white/5 border-white/50 text-foreground hover:bg-white/70"
                )}
              >
                {/* Overlapping crew avatars */}
                <div className="flex -space-x-2">
                  {memberProfiles.slice(0, 5).map((m) => {
                    const parts = m.displayName.trim().split(/\s+/)
                    const initials = parts.length === 1 ? parts[0][0] : (parts[0][0] + parts[parts.length - 1][0])
                    return (
                      <div key={m.id} className="h-6 w-6 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                        {m.photoURL ? (
                          <img src={m.photoURL} alt={m.displayName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full premium-gradient text-white font-black flex items-center justify-center" style={{ fontSize: '7px' }}>
                            {initials.toUpperCase()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {/* Plus button */}
                  <div className="h-6 w-6 rounded-full border-2 border-dashed border-primary/50 bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>
                <span className={trip.imageUrl ? "text-white/80" : "text-muted-foreground"}>
                  {Math.max(trip.memberIds.length, memberProfiles.length)} {Math.max(trip.memberIds.length, memberProfiles.length) === 1 ? 'traveler' : 'travelers'}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Invite prompt (solo trip only) */}
        {isSolo && trip.tripType === 'group' && isHost && (
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <InvitePromptCard onInvite={() => setInviteOpen(true)} />
          </div>
        )}

        {/* Dashboard Sections */}
        <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <TripProgress trip={trip} />
          <div className="mt-6">
            {!destDecided && !datesDecided && <ScenarioA trip={trip} onAvailability={() => setAvailabilityOpen(true)} onDestinations={() => navigate(`/trips/${tripId}/destinations`)} onPlanning={() => navigate(`/trips/${tripId}/planning`)} onBudget={() => navigate(`/trips/${tripId}/budget`)} isHost={isHost} userId={user?.uid} />}
            {destDecided && !datesDecided && <ScenarioB trip={trip} onAvailability={() => setAvailabilityOpen(true)} onPlanning={() => navigate(`/trips/${tripId}/planning`)} onBudget={() => navigate(`/trips/${tripId}/budget`)} isHost={isHost} />}
            {!destDecided && datesDecided && <ScenarioC trip={trip} onDestinations={() => navigate(`/trips/${tripId}/destinations`)} onBudget={() => navigate(`/trips/${tripId}/budget`)} />}
            {destDecided && datesDecided && <ScenarioD trip={trip} onBudget={() => navigate(`/trips/${tripId}/budget`)} onAccommodations={() => navigate(`/trips/${tripId}/accommodations`)} />}
          </div>
        </div>

        {/* Members list */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <MembersSection trip={trip} currentUserId={user?.uid} onInvite={() => setInviteOpen(true)} onCrew={() => navigate(`/trips/${tripId}/crew`)} profiles={memberProfiles} />
        </div>
      </div>

      {/* Dialogs */}
      <InviteDialog trip={trip} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <AvailabilityDialog trip={trip} userId={user?.uid} open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />
    </div>
  )
}
