import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, MapPin, Calendar, Plane, Bell, MoreHorizontal, Archive, ArchiveRestore, CheckCircle2, RotateCcw, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  getUserTrips,
  getUserProfiles,
  createTrip,
  archiveTrip,
  unarchiveTrip,
  completeTrip,
  uncompleteTrip,
  type MemberProfile,
} from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import { useTripStore } from '@/stores/tripStore'
import type { Trip } from '@/types'

const phaseColors = {
  finalized: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  booking: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  planning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  userId,
  onArchiveToggle,
  onCompleteToggle,
}: {
  trip: Trip
  userId?: string
  onArchiveToggle: () => void
  onCompleteToggle: () => void
}) {
  const navigate = useNavigate()
  const [members, setMembers] = useState<MemberProfile[]>([])
  const memberCount = trip.memberIds.length
  const needsAttention = trip.dateStatus === 'poll' && userId && !trip.availability?.[userId]
  const isOwner = userId === trip.ownerId

  useEffect(() => {
    let active = true
    getUserProfiles(trip.memberIds.slice(0, 4)).then(p => { if (active) setMembers(p) })
    return () => { active = false }
  }, [trip.memberIds])

  const progressSteps = [
    { label: 'Created', done: true },
    { label: 'Dates', done: trip.dateStatus === 'decided' },
    { label: 'Finalized', done: trip.phase === 'finalized' },
  ]

  return (
    <div className="group relative animate-slide-up">
      <Card
        className={cn(
          "hover:scale-[1.01] active:scale-[0.99] transition-all p-0 overflow-hidden border-white/40 group-hover:shadow-xl group-hover:shadow-primary/5 bg-white/60 dark:bg-black/20 cursor-pointer",
          (trip.archived || trip.completed) && "opacity-60",
        )}
        onClick={() => navigate(`/trips/${trip.id}`)}
      >
        <div className="p-6 space-y-5">
          {/* Header row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1 min-w-0">
              <h3 className="font-black text-xl tracking-tight group-hover:text-primary transition-colors leading-tight">{trip.name}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                {trip.tripType === 'group' ? 'Group Adventure' : 'Solo Mission'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass rounded-xl border-white/20 p-1 shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onCompleteToggle() }}
                      className="rounded-lg gap-2 text-sm cursor-pointer"
                    >
                      {trip.completed ? (
                        <><RotateCcw className="h-4 w-4" /> Reopen</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mark Complete</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-white/20" />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onArchiveToggle() }}
                      className="rounded-lg gap-2 text-sm cursor-pointer"
                    >
                      {trip.archived ? (
                        <><ArchiveRestore className="h-4 w-4" /> Unarchive</>
                      ) : (
                        <><Archive className="h-4 w-4" /> Archive</>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Status badge */}
              {trip.completed ? (
                <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              ) : needsAttention ? (
                <span className="flex items-center gap-1 rounded-lg bg-destructive text-destructive-foreground px-2.5 py-1 text-[9px] font-black uppercase tracking-wider shadow-lg shadow-destructive/20 animate-pulse">
                  <Bell className="h-3 w-3" />
                  Action Required
                </span>
              ) : (
                <span className={cn(
                  "rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border",
                  phaseColors[trip.phase as keyof typeof phaseColors] || phaseColors.planning
                )}>
                  {trip.phase}
                </span>
              )}
            </div>
          </div>

          {/* Mini-Progress Tracker */}
          <div className="space-y-1">
            <div className="flex gap-1">
              {progressSteps.map((s) => (
                <div key={s.label} className={cn(
                  "h-1 rounded-full flex-1 transition-all duration-700",
                  s.done ? "premium-gradient" : "bg-muted/30"
                )} />
              ))}
            </div>
            <div className="flex gap-1">
              {progressSteps.map((s) => (
                <p key={s.label} className={cn(
                  "flex-1 text-center text-[8px] font-black uppercase tracking-wider",
                  s.done ? "text-primary/60" : "text-muted-foreground/30"
                )}>
                  {s.label}
                </p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold">
            <div className="flex items-center gap-2.5 bg-white shadow-sm dark:bg-white/5 px-4 py-2.5 rounded-xl border border-white/50">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate text-[11px] tracking-tight">
                {trip.destinationStatus === 'decided' && trip.destination ? trip.destination : 'TBD'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-white shadow-sm dark:bg-white/5 px-4 py-2.5 rounded-xl border border-white/50">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate text-[11px] tracking-tight">
                {trip.dateStatus === 'decided' && trip.dates ? trip.dates : 'Planning'}
              </span>
            </div>
          </div>

          {trip.tripType === 'group' && (
            <div className="flex items-center justify-between pt-4 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="flex squad-stack items-center">
                  {members.map(m => (
                    <div key={m.id} className="h-7 w-7 rounded-lg border-2 border-white dark:border-slate-900 bg-slate-100 overflow-hidden shadow-sm">
                      {m.photoURL ? (
                        <img src={m.photoURL} alt={m.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-[10px] font-black">
                          {m.displayName[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {memberCount > 4 && (
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-sm">
                      +{memberCount - 4}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                  {memberCount} {memberCount === 1 ? 'traveler' : 'travelers'}
                </span>
              </div>
              <div className="text-[9px] font-black uppercase text-primary tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View<span>&rarr;</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {needsAttention && !trip.completed && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-12 w-1.5 bg-destructive rounded-full blur-[2px] opacity-70" />
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterView }) {
  const messages: Record<FilterView, { icon: React.ElementType; title: string; sub: string }> = {
    active: { icon: Plane, title: 'Ready to explore?', sub: 'Create a trip to start planning with your crew.' },
    completed: { icon: CheckCircle2, title: 'No completed trips yet', sub: "Mark a trip as complete after you've been there." },
    archived: { icon: Archive, title: 'No archived trips', sub: 'Archived trips will appear here.' },
  }
  const { icon: Icon, title, sub } = messages[filter]
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-6">
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-black tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
      {filter === 'active' && (
        <Button asChild className="mt-8 rounded-xl px-8 shadow-lg shadow-primary/10">
          <Link to="/trips/new">
            <Plus className="mr-2 h-4 w-4" />
            Create your first trip
          </Link>
        </Button>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border glass p-5 space-y-4 animate-pulse">
      <div className="flex justify-between gap-2">
        <div className="h-5 w-48 rounded-lg bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-8 rounded-xl bg-muted" />
        <div className="h-8 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const demoTrips = [
  {
    name: 'Ibiza Opening Party',
    destination: 'Ibiza, Spain',
    destinationStatus: 'decided' as const,
    dates: 'June 15 - 22, 2025',
    dateStatus: 'decided' as const,
    tripType: 'group' as const,
    estimatedSize: 6,
    phase: 'planning' as const,
    imageUrl: 'https://images.unsplash.com/photo-1545618055-32526e031e40?auto=format&fit=crop&q=80&w=1200',
    memberIds: ['demo-1', 'demo-2', 'demo-3'],
  },
  {
    name: 'Niseko Powder Run',
    destination: 'Hokkaido, Japan',
    destinationStatus: 'tbd' as const,
    dates: 'Feb 2026',
    dateStatus: 'poll' as const,
    tripType: 'group' as const,
    estimatedSize: 4,
    phase: 'planning' as const,
    imageUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&q=80&w=1200',
    memberIds: ['demo-4', 'demo-5'],
  },
  {
    name: 'Amalfi Coast Retreat',
    destination: 'Positano, Italy',
    destinationStatus: 'decided' as const,
    dates: 'Sept 5 - 12, 2025',
    dateStatus: 'decided' as const,
    tripType: 'group' as const,
    estimatedSize: 8,
    phase: 'planning' as const,
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=1200',
    memberIds: ['demo-1', 'demo-3', 'demo-6', 'demo-7'],
  }
]

type FilterView = 'active' | 'completed' | 'archived'
type SortBy = 'newest' | 'name'

export default function TripsListPage() {
  const user = useAuthStore((s) => s.user)
  const { trips, setTrips } = useTripStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [filter, setFilter] = useState<FilterView>('active')
  const [sortBy, setSortBy] = useState<SortBy>('newest')

  const counts = {
    active: trips.filter(t => !t.archived && !t.completed).length,
    completed: trips.filter(t => t.completed === true).length,
    archived: trips.filter(t => t.archived === true).length,
  }

  const filtered = trips.filter(t => {
    if (filter === 'active') return !t.archived && !t.completed
    if (filter === 'completed') return t.completed === true
    return t.archived === true
  })

  const visibleTrips = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    // newest: sort by createdAt descending
    return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  })

  async function handleAddDemo() {
    if (!user) return
    setDemoLoading(true)
    try {
      const demo = demoTrips[Math.floor(Math.random() * demoTrips.length)]
      await createTrip({
        ...demo,
        ownerId: user.uid,
        memberIds: [user.uid, ...demo.memberIds],
      })
      const updated = await getUserTrips(user.uid)
      setTrips(updated)
    } finally {
      setDemoLoading(false)
    }
  }

  async function handleArchiveToggle(trip: Trip) {
    if (!user) return
    if (trip.archived) {
      await unarchiveTrip(trip.id)
    } else {
      await archiveTrip(trip.id)
    }
    const updated = await getUserTrips(user.uid)
    setTrips(updated)
  }

  async function handleCompleteToggle(trip: Trip) {
    if (!user) return
    if (trip.completed) {
      await uncompleteTrip(trip.id)
    } else {
      await completeTrip(trip.id)
    }
    const updated = await getUserTrips(user.uid)
    setTrips(updated)
  }

  useEffect(() => {
    if (!user) return
    let active = true
    getUserTrips(user.uid)
      .then((data) => { if (active) { setTrips(data); setLoading(false) } })
      .catch(() => { if (active) { setError('Failed to load trips. Please refresh.'); setLoading(false) } })
    return () => { active = false }
  }, [user, setTrips])

  const filterLabels: Record<FilterView, string> = {
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl leading-none">
            Your <span className="text-primary">Journal</span>
          </h1>
          <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-50">Adventures & Expeditions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleAddDemo}
            disabled={demoLoading}
            className="rounded-xl border-2 font-black uppercase tracking-widest text-[9px] h-12 px-6"
          >
            {demoLoading ? 'Adding...' : 'Add Demo Trip'}
          </Button>
          {trips.length > 0 && (
            <Button asChild className="rounded-xl shadow-xl shadow-primary/20 premium-gradient font-black uppercase tracking-widest text-[10px] h-12 px-8">
              <Link to="/trips/new">
                <Plus className="mr-2 h-4 w-4 stroke-[3px]" />
                New Trip
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filter + Sort controls */}
      {!loading && trips.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 glass rounded-xl border border-white/30">
            {(['active', 'completed', 'archived'] as FilterView[]).map((view) => (
              <button
                key={view}
                onClick={() => setFilter(view)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === view
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filterLabels[view]}
                <span className={cn(
                  "text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none",
                  filter === view ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {counts[view]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          {visibleTrips.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-xl border-white/30 gap-1.5 text-[10px] font-black uppercase tracking-widest">
                  <ArrowUpDown className="h-3 w-3" />
                  {sortBy === 'newest' ? 'Newest' : 'A – Z'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="glass rounded-xl border-white/20 p-1 shadow-xl">
                <DropdownMenuItem
                  onClick={() => setSortBy('newest')}
                  className={cn("rounded-lg text-sm cursor-pointer", sortBy === 'newest' && "text-primary font-bold")}
                >
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy('name')}
                  className={cn("rounded-lg text-sm cursor-pointer", sortBy === 'name' && "text-primary font-bold")}
                >
                  Name A – Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative">
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="glass p-8 rounded-2xl text-center">
            <p className="text-sm font-bold text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : trips.length === 0 ? (
          <EmptyState filter="active" />
        ) : visibleTrips.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                userId={user?.uid}
                onArchiveToggle={() => handleArchiveToggle(trip)}
                onCompleteToggle={() => handleCompleteToggle(trip)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
