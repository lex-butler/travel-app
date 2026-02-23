import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  Flame,
  Star,
  Clock,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar as CalendarWidget } from '@/components/ui/calendar'
import { subscribeToTrip, getUserProfiles, updateMyAvailability, type MemberProfile, type DateRange } from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import type { Trip } from '@/types'
import { cn } from '@/lib/utils'
import {
  format,
  startOfToday,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isWithinInterval,
  addMonths,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth
} from 'date-fns'

type RdpRange = { from: Date | undefined; to?: Date | undefined }

function formatRange(r: DateRange): string {
  const s = new Date(r.start + 'T00:00:00')
  const e = new Date(r.end + 'T00:00:00')
  return isSameDay(s, e) ? format(s, 'MMM d') : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
}

interface WinningWindow {
  start: Date
  end: Date
  score: number
  memberCount: number
}

export default function PlanningPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const user = useAuthStore((s) => s.user)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [profiles, setProfiles] = useState<MemberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [mySelection, setMySelection] = useState<RdpRange>({ from: undefined })
  const [savingAvail, setSavingAvail] = useState(false)

  useEffect(() => {
    if (!tripId) return
    const unsub = subscribeToTrip(tripId, (data) => {
      setTrip(data)
      setLoading(false)
    })
    return unsub
  }, [tripId])

  const [mockAvailability, setMockAvailability] = useState<Record<string, { start: string; end: string }[]>>({})

  useEffect(() => {
    if (!trip) return
    getUserProfiles(trip.memberIds).then(profiles => {
      if (profiles.length <= 1) {
        const mocks: MemberProfile[] = [
          { id: 'mock1', displayName: 'Sarah Chen', photoURL: 'https://i.pravatar.cc/150?u=mock1', email: 'sarah@example.com', homeCity: 'London', homeLat: 51.5074, homeLng: -0.1278 },
          { id: 'mock2', displayName: 'Marcus Vance', photoURL: 'https://i.pravatar.cc/150?u=mock2', email: 'marcus@example.com', homeCity: 'New York', homeLat: 40.7128, homeLng: -74.0060 },
          { id: 'mock3', displayName: 'Elena Rossi', photoURL: 'https://i.pravatar.cc/150?u=mock3', email: 'elena@example.com', homeCity: 'Rome', homeLat: 41.9028, homeLng: 12.4964 },
          { id: 'mock4', displayName: 'Jack Thompson', photoURL: 'https://i.pravatar.cc/150?u=mock4', email: 'jack@example.com', homeCity: 'Berlin', homeLat: 52.5200, homeLng: 13.4050 },
        ]
        setProfiles([...profiles, ...mocks])

        // Inject mock availability for visualization
        const today = startOfToday()
        const sampleAvail = {
          'mock1': [
            { start: format(subDays(today, 2), 'yyyy-MM-dd'), end: format(addDays(today, 10), 'yyyy-MM-dd') },
            { start: format(addDays(today, 20), 'yyyy-MM-dd'), end: format(addMonths(today, 1), 'yyyy-MM-dd') }
          ],
          'mock2': [
            { start: format(today, 'yyyy-MM-dd'), end: format(addDays(today, 15), 'yyyy-MM-dd') },
            { start: format(addDays(today, 25), 'yyyy-MM-dd'), end: format(addMonths(today, 2), 'yyyy-MM-dd') }
          ],
          'mock3': [
            { start: format(subDays(today, 5), 'yyyy-MM-dd'), end: format(addDays(today, 12), 'yyyy-MM-dd') }
          ],
          'mock4': [
            { start: format(today, 'yyyy-MM-dd'), end: format(addMonths(today, 3), 'yyyy-MM-dd') }
          ]
        }
        setMockAvailability(sampleAvail)
      } else {
        setProfiles(profiles)
        setMockAvailability({})
      }
    })
  }, [trip])

  // Heatmap Analysis
  const heatmap = useMemo(() => {
    if (!trip) return []
    const baseAvailability = trip.availability || {}
    const finalAvail = { ...baseAvailability, ...mockAvailability }

    // Analyze next 6 months
    const start = startOfToday()
    const end = addMonths(start, 6)
    const days = eachDayOfInterval({ start, end })

    return days.map(date => {
      const availableMembers = profiles.filter(p => {
        const ranges = finalAvail[p.id] || []
        return ranges.some((r: { start: string; end: string }) => {
          const s = parseISO(r.start)
          const e = parseISO(r.end)
          return isWithinInterval(date, { start: s, end: e })
        })
      })
      return {
        date,
        count: availableMembers.length,
        members: availableMembers.map(m => m.displayName)
      }
    })
  }, [trip, profiles, mockAvailability])

  // Find "Winning Windows" (Common ranges)
  const winningWindows = useMemo(() => {
    if (heatmap.length === 0 || profiles.length === 0) return []

    const windows: WinningWindow[] = []
    let currentWindow: { start: Date; score: number } | null = null

    heatmap.forEach((day, i) => {
      // Logic: A winning window is at least 3 days where more than 50% of crew is free
      const threshold = Math.max(1, Math.ceil(profiles.length * 0.5))

      if (day.count >= threshold) {
        if (!currentWindow) {
          currentWindow = { start: day.date, score: day.count }
        } else {
          // Keep the lowest count as the score for the whole window
          currentWindow.score = Math.min(currentWindow.score, day.count)
        }
      } else {
        if (currentWindow) {
          const end = heatmap[i - 1].date
          // Minimum trip length of 3 days
          const daysDiff = Math.ceil((end.getTime() - currentWindow.start.getTime()) / (1000 * 60 * 60 * 24))
          if (daysDiff >= 2) {
            windows.push({
              start: currentWindow.start,
              end,
              score: currentWindow.score,
              memberCount: currentWindow.score
            })
          }
          currentWindow = null
        }
      }
    })

    return windows.sort((a, b) => b.score - a.score || b.start.getTime() - a.start.getTime()).slice(0, 5)
  }, [heatmap, profiles.length])

  const myRanges: DateRange[] = user
    ? (Array.isArray(trip?.availability?.[user.uid]) ? trip!.availability![user.uid] : [])
    : []

  async function addMyRange() {
    if (!user || !tripId || !mySelection.from) return
    const start = format(mySelection.from, 'yyyy-MM-dd')
    const end = format(mySelection.to ?? mySelection.from, 'yyyy-MM-dd')
    const updated = [...myRanges, { start, end }]
    setSavingAvail(true)
    try {
      await updateMyAvailability(tripId, user.uid, updated)
      setMySelection({ from: undefined })
    } finally {
      setSavingAvail(false)
    }
  }

  async function removeMyRange(index: number) {
    if (!user || !tripId) return
    const updated = myRanges.filter((_, i) => i !== index)
    await updateMyAvailability(tripId, user.uid, updated)
  }

  if (loading || !trip) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>

  const daysInView = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })

  // Group members by availability status
  const hasResponded = (uid: string) => !!(trip.availability?.[uid] || mockAvailability[uid])
  const responders = profiles.filter(p => hasResponded(p.id))
  const laggards = profiles.filter(p => !hasResponded(p.id))

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {Object.keys(mockAvailability).length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-1.5 rounded-lg">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Demo Mode</p>
              <p className="text-[9px] font-medium text-primary/70">Using sample data to preview how availability windows work.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Data & Heatmap */}
        <div className="flex-1 space-y-8">
          <header>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              Optimal Windows
            </h1>
            <p className="text-muted-foreground font-medium mt-1">Analyzing availability for {profiles.length} crew members.</p>
          </header>

          {/* Winning Windows Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {winningWindows.length > 0 ? (
              winningWindows.map((window, i) => (
                <Card key={i} className={cn(
                  "p-5 relative overflow-hidden border-white/40 glass group hover:scale-[1.02] transition-all cursor-pointer",
                  i === 0 ? "ring-2 ring-primary/40 bg-primary/5" : ""
                )}>
                  {i === 0 && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">
                      Best Bet
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl premium-gradient text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-tight">
                        {format(window.start, 'MMM d')} – {format(window.end, 'MMM d')}
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {window.memberCount} / {profiles.length} Members Free
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/10">
                    Propose these dates
                  </Button>
                </Card>
              ))
            ) : (
              <Card className="col-span-full p-10 text-center glass border-dashed">
                <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-bold text-muted-foreground">Not enough data to find overlaps yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Need at least 2 people to respond.</p>
              </Card>
            )}
          </div>

          {/* Calendar Heatmap Section */}
          <Card className="p-6 border-white/40 glass rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-black text-lg">Heatmap</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Visualizing group availability</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="rounded-xl h-10 w-10">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-black uppercase tracking-widest px-4">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl h-10 w-10">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase text-muted-foreground mb-4">{d}</div>
              ))}
              {/* Padding for start of month */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {daysInView.map(day => {
                const data = heatmap.find(h => isSameDay(h.date, day))
                const intensity = data ? (data.count / profiles.length) : 0
                const isSelectedMonth = day.getMonth() === currentMonth.getMonth()

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "aspect-square rounded-xl relative group transition-all",
                      !isSelectedMonth ? "opacity-20 pointer-events-none" : "",
                      intensity > 0 ? "cursor-help" : "bg-muted/30"
                    )}
                    style={{
                      backgroundColor: intensity > 0 ? `rgba(99, 102, 241, ${0.1 + intensity * 0.9})` : undefined,
                      boxShadow: intensity > 0.8 ? '0 0 15px rgba(99, 102, 241, 0.3)' : undefined
                    }}
                  >
                    <span className={cn(
                      "absolute top-2 left-2 text-[10px] font-black",
                      intensity > 0.5 ? "text-white" : "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {data && data.count > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/90 rounded-xl transition-opacity z-10 p-2 text-center pointer-events-none">
                        <p className="text-[8px] text-white font-bold leading-tight">
                          {data.count} Free<br />{data.members.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Heatmap legend */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Availability</p>
              <div className="flex items-center gap-2">
                {[
                  { label: 'None', alpha: 0 },
                  { label: 'Some', alpha: 0.35 },
                  { label: 'Most', alpha: 0.65 },
                  { label: 'All', alpha: 1 },
                ].map(({ label, alpha }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div
                      className="h-4 w-4 rounded-md border border-white/20"
                      style={{ backgroundColor: alpha > 0 ? `rgba(99, 102, 241, ${0.1 + alpha * 0.9})` : 'rgba(0,0,0,0.08)' }}
                    />
                    <span className="text-[9px] font-bold text-muted-foreground/60">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: My Availability + Crew Status */}
        <div className="lg:w-80 space-y-6">
          {/* My Availability */}
          <Card className="p-6 border-white/40 glass bg-white/20 dark:bg-slate-950/40 rounded-3xl space-y-5">
            <h2 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              My Availability
            </h2>

            <div className="flex justify-center border-none glass rounded-2xl p-3 bg-white/40 dark:bg-white/5 shadow-inner">
              <CalendarWidget
                mode="range"
                selected={mySelection}
                onSelect={(r) => setMySelection(r ?? { from: undefined })}
                disabled={{ before: new Date() }}
                numberOfMonths={1}
                className="p-0 border-none scale-90 origin-top"
              />
            </div>

            {mySelection.from ? (
              <Button
                onClick={addMyRange}
                disabled={savingAvail}
                size="sm"
                className="w-full rounded-xl font-bold"
              >
                {savingAvail
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Plus className="mr-2 h-4 w-4" />}
                Add {format(mySelection.from, 'MMM d')}
                {mySelection.to && !isSameDay(mySelection.from, mySelection.to)
                  ? ` – ${format(mySelection.to, 'MMM d')}`
                  : ''}
              </Button>
            ) : (
              <p className="text-center text-[11px] font-medium text-muted-foreground bg-muted/20 py-3 rounded-xl border border-dashed border-muted-foreground/20">
                Select dates to add your availability
              </p>
            )}

            {myRanges.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Your windows</p>
                {myRanges.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl glass px-3 py-2 border-white/50 shadow-sm">
                    <span className="text-xs font-bold">{formatRange(r)}</span>
                    <button
                      onClick={() => removeMyRange(i)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 border-white/40 glass bg-white/20 dark:bg-slate-950/40 rounded-3xl">
            <h2 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Crew Readiness
            </h2>

            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> Responded ({responders.length})
                </p>
                <div className="space-y-3">
                  {responders.map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                        {p.photoURL ? <img src={p.photoURL} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary/20 text-primary font-black text-[10px] flex items-center justify-center">{p.displayName[0]}</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{p.displayName}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">
                          {(() => { const n = trip.availability?.[p.id]?.length || mockAvailability[p.id]?.length || 0; return `${n} ${n === 1 ? 'window' : 'windows'}` })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {laggards.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Waiting On ({laggards.length})
                  </p>
                  <div className="space-y-3">
                    {laggards.map(p => (
                      <div key={p.id} className="flex items-center gap-3 opacity-60 grayscale">
                        <div className="h-8 w-8 rounded-xl border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                          {p.photoURL ? <img src={p.photoURL} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-slate-200 text-slate-500 font-black text-[10px] flex items-center justify-center">{p.displayName[0]}</div>}
                        </div>
                        <p className="text-xs font-bold truncate">{p.displayName}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-6 rounded-xl text-[9px] font-black uppercase tracking-widest h-9 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all">
                    Nudge Laggards
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 border-white/40 glass premium-gradient text-white rounded-3xl shadow-xl shadow-primary/20">
            <Star className="h-6 w-6 mb-3" />
            <h3 className="font-black text-sm uppercase tracking-tight">Need higher precision?</h3>
            <p className="text-[10px] font-bold opacity-80 mt-2 leading-relaxed">Connect your Google or Outlook calendar to automatically find sync points without manual entry.</p>
            <Button className="w-full mt-4 bg-white text-primary rounded-xl font-black text-[10px] uppercase tracking-widest h-10 hover:bg-white/90">
              Connect Calendar
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
