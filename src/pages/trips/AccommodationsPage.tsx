import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Hotel, Plus, Loader2, ExternalLink, ThumbsUp, CheckCircle2,
  XCircle, Trash2, Link as LinkIcon, Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  subscribeToAccommodations, addAccommodation,
  deleteAccommodation, castAccomVote, removeAccomVote,
  approveAccommodation, rejectAccommodation,
} from '@/services/accommodationService'
import { fetchUrlPreview, type UrlPreview } from '@/services/previewService'
import { subscribeToTrip, getUserProfiles, type MemberProfile } from '@/services/tripService'
import { useAuthStore } from '@/stores/authStore'
import type { Trip, Accommodation, AccommodationType } from '@/types'
import { cn } from '@/lib/utils'

// ─── Type config ──────────────────────────────────────────────────────────────

const ACCOM_TYPES: { value: AccommodationType; label: string; emoji: string }[] = [
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'airbnb', label: 'Airbnb', emoji: '🏠' },
  { value: 'vrbo', label: 'VRBO', emoji: '🏡' },
  { value: 'hostel', label: 'Hostel', emoji: '🛏️' },
  { value: 'other', label: 'Other', emoji: '📍' },
]

function getTypeConfig(type: AccommodationType) {
  return ACCOM_TYPES.find((t) => t.value === type) ?? ACCOM_TYPES[4]
}

function formatDateRange(checkIn: string, checkOut: string) {
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(checkIn)} → ${fmt(checkOut)}`
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

// ─── Mini avatar ─────────────────────────────────────────────────────────────

function MiniAvatar({ profile, size = 8 }: { profile: MemberProfile; size?: number }) {
  const initials = profile.displayName.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={cn('shrink-0 rounded-full border-2 border-white/50 overflow-hidden', `h-${size} w-${size}`)}>
      {profile.photoURL
        ? <img src={profile.photoURL} alt={profile.displayName} className="h-full w-full object-cover" />
        : <div className="h-full w-full bg-primary/10 text-primary font-black flex items-center justify-center text-[9px]">{initials}</div>}
    </div>
  )
}

// ─── URL Preview Card ─────────────────────────────────────────────────────────

function UrlPreviewCard({ preview, url, onClear }: { preview: UrlPreview; url: string; onClear: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl border border-primary/20 bg-primary/5 animate-scale-in">
      {preview.image ? (
        <img src={preview.image} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0 border border-white/30" />
      ) : (
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Globe className="h-6 w-6 text-primary/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black truncate">{preview.title ?? 'No title'}</p>
        {preview.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{preview.description}</p>
        )}
        <p className="text-[9px] font-bold text-primary/70 mt-1 uppercase tracking-wide">{preview.siteName ?? new URL(url).hostname}</p>
      </div>
      <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Add Accommodation Dialog ─────────────────────────────────────────────────

interface AddAccomDialogProps {
  open: boolean
  onClose: () => void
  trip: Trip
  profiles: MemberProfile[]
  userId: string
}

// Parse check-in/check-out dates from a URL's query params.
// Supports Airbnb (check_in/check_out), Booking.com (checkin/checkout), VRBO (arrival/departure).
function parseDatesFromUrl(url: string): { checkIn: string; checkOut: string } | null {
  try {
    const params = new URL(url).searchParams
    const checkIn =
      params.get('check_in') ||    // Airbnb
      params.get('checkin') ||     // Booking.com
      params.get('arrival')        // VRBO
    const checkOut =
      params.get('check_out') ||   // Airbnb
      params.get('checkout') ||    // Booking.com
      params.get('departure')      // VRBO
    if (checkIn && checkOut && /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      return { checkIn, checkOut }
    }
  } catch {
    // invalid URL — skip silently
  }
  return null
}

function AddAccomDialog({ open, onClose, trip, profiles, userId }: AddAccomDialogProps) {
  const [urlInput, setUrlInput] = useState('')
  const [preview, setPreview] = useState<UrlPreview | null>(null)
  const [fetchingPreview, setFetchingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<AccommodationType>('hotel')
  const [address, setAddress] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [splitAmong, setSplitAmong] = useState<string[]>(trip.memberIds)
  const [saving, setSaving] = useState(false)

  function reset() {
    setUrlInput(''); setPreview(null); setPreviewError(null)
    setName(''); setType('hotel'); setAddress(''); setCheckIn(''); setCheckOut('')
    setTotalCost(''); setImageUrl(''); setNotes(''); setSplitAmong(trip.memberIds)
  }

  function handleClose() { reset(); onClose() }

  async function handleFetchPreview() {
    const url = urlInput.trim()
    if (!url) return
    setFetchingPreview(true)
    setPreviewError(null)
    try {
      const result = await fetchUrlPreview(url)
      setPreview(result)
      // Auto-fill from preview
      if (result.title && !name) setName(result.title)
      if (result.image && !imageUrl) setImageUrl(result.image)
      if (result.description && !notes) setNotes(result.description)
      // Detect type from site name
      const site = (result.siteName ?? '').toLowerCase()
      if (site.includes('airbnb')) setType('airbnb')
      else if (site.includes('vrbo')) setType('vrbo')
      else if (site.includes('hostel')) setType('hostel')
      else setType('hotel')
    } catch {
      setPreviewError('Could not load preview — fill in details manually.')
    } finally {
      setFetchingPreview(false)
    }
  }

  function clearPreview() { setPreview(null); setUrlInput('') }

  function toggleMember(uid: string) {
    setSplitAmong((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid])
  }

  async function handleSave() {
    if (!name.trim()) { alert('Name is required'); return }
    setSaving(true)
    try {
      await addAccommodation(trip.id, userId, {
        name: name.trim(),
        type,
        address: address.trim(),
        checkIn,
        checkOut,
        totalCost: parseFloat(totalCost) || 0,
        bookingUrl: urlInput.trim() || null,
        confirmationNumber: null,
        imageUrl: imageUrl.trim() || null,
        description: preview?.description ?? null,
        previewFetched: !!preview,
        votingRequired: true,
        approvalThreshold: 0.5,
        splitAmong,
        notes: notes.trim(),
      })
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  const perPerson = splitAmong.length > 0 && parseFloat(totalCost) > 0
    ? parseFloat(totalCost) / splitAmong.length
    : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md glass border-white/40 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-tight">Add Stay Option</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* URL / Preview */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Listing URL (optional)</label>
            {preview ? (
              <UrlPreviewCard preview={preview} url={urlInput} onClear={clearPreview} />
            ) : (
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => {
                    const val = e.target.value
                    setUrlInput(val)
                    // Auto-parse dates from the pasted URL
                    const parsed = parseDatesFromUrl(val)
                    if (parsed) {
                      if (!checkIn) setCheckIn(parsed.checkIn)
                      if (!checkOut) setCheckOut(parsed.checkOut)
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchPreview()}
                  placeholder="Paste Airbnb, Booking.com, or any URL…"
                  className="rounded-xl h-11 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchPreview}
                  disabled={!urlInput.trim() || fetchingPreview}
                  className="h-11 rounded-xl px-3 shrink-0 border-2"
                >
                  {fetchingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {previewError && <p className="text-[10px] text-muted-foreground">{previewError}</p>}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cozy flat in Eixample" className="rounded-xl h-11" />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</label>
            <div className="flex flex-wrap gap-2">
              {ACCOM_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={cn('px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all',
                    type === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-white/30 bg-white/40 dark:bg-white/5 text-muted-foreground')}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Carrer de Mallorca 401, Barcelona" className="rounded-xl h-11" />
          </div>

          {/* Dates */}
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-in</label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-out</label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>

          {/* Cost */}
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Cost ({trip.currency})</label>
              <Input type="number" min="0" step="1" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} placeholder="0" className="rounded-xl h-11" />
            </div>
            {perPerson && (
              <div className="space-y-1.5 w-28">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Per Person</label>
                <div className="h-11 flex items-center px-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] font-black text-primary">
                  {formatCurrency(perPerson, trip.currency)}
                </div>
              </div>
            )}
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Image URL (optional)</label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="rounded-xl h-11" />
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-xl border border-white/30" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
          </div>

          {/* Split among */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Split among</label>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button key={p.id} type="button" onClick={() => toggleMember(p.id)}
                  className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all',
                    splitAmong.includes(p.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/30 bg-white/40 dark:bg-white/5 text-muted-foreground opacity-50')}>
                  <MiniAvatar profile={p} size={5} />
                  {p.displayName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Free cancellation until March 1" className="rounded-xl h-11" />
          </div>

          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full rounded-xl h-12 font-black uppercase tracking-widest text-[10px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to Options'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Accommodation Card ───────────────────────────────────────────────────────

function AccomCard({
  accom, profiles, userId, isHost, currency, tripId, memberCount,
}: {
  accom: Accommodation
  profiles: MemberProfile[]
  userId: string
  isHost: boolean
  currency: string
  tripId: string
  memberCount: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [voting, setVoting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const typeConfig = getTypeConfig(accom.type)
  const myVote = accom.votes[userId] === true
  const voteCount = Object.values(accom.votes).filter(Boolean).length
  const isApproved = accom.status === 'approved'
  const isRejected = accom.status === 'rejected'
  const perPerson = accom.splitAmong.length > 0 && accom.totalCost > 0
    ? accom.totalCost / accom.splitAmong.length : null
  const canDelete = (accom.addedBy === userId || isHost) && !isApproved

  async function handleVote(e: React.MouseEvent) {
    e.stopPropagation()
    setVoting(true)
    try {
      if (myVote) await removeAccomVote(tripId, accom.id, userId)
      else await castAccomVote(tripId, accom.id, userId)
    } finally { setVoting(false) }
  }

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation()
    setApproving(true)
    try { await approveAccommodation(tripId, accom.id) } finally { setApproving(false) }
  }

  async function handleReject(e: React.MouseEvent) {
    e.stopPropagation()
    setApproving(true)
    try { await rejectAccommodation(tripId, accom.id) } finally { setApproving(false) }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Remove this option?')) return
    setDeleting(true)
    try { await deleteAccommodation(tripId, accom.id) } finally { setDeleting(false) }
  }

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className={cn(
        'group rounded-2xl border transition-all cursor-pointer overflow-hidden',
        isApproved
          ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
          : isRejected
            ? 'border-white/30 bg-white/40 dark:bg-white/5 opacity-60'
            : expanded
              ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/10'
              : 'border-white/50 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20',
      )}
    >
      {/* Collapsed header */}
      <div className="flex items-start gap-3 p-4">
        {/* Thumbnail */}
        <div className="shrink-0 h-14 w-14 rounded-xl overflow-hidden border border-white/30">
          {accom.imageUrl
            ? <img src={accom.imageUrl} alt={accom.name} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-primary/10 flex items-center justify-center text-2xl">{typeConfig.emoji}</div>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-black text-sm uppercase tracking-tight truncate">{accom.name}</h3>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0',
              isApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-white/50 dark:bg-slate-700 text-muted-foreground',
            )}>
              {isApproved ? '✓ Approved' : typeConfig.label}
            </span>
          </div>
          {accom.address && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{accom.address}</p>}
          {accom.checkIn && accom.checkOut && (
            <p className="text-[10px] font-bold mt-0.5">{formatDateRange(accom.checkIn, accom.checkOut)}</p>
          )}
        </div>

        {/* Right: cost + votes */}
        <div className="text-right shrink-0">
          {perPerson && <p className="font-black text-sm">{formatCurrency(perPerson, currency)}<span className="text-[9px] font-bold text-muted-foreground">/pp</span></p>}
          {accom.totalCost > 0 && <p className="text-[10px] text-muted-foreground">{formatCurrency(accom.totalCost, currency)} total</p>}
          <div className="flex items-center gap-1 justify-end mt-1">
            <ThumbsUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground">{voteCount}/{memberCount}</span>
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-white/20 p-4 space-y-4 animate-scale-in origin-top" onClick={(e) => e.stopPropagation()}>
          {/* Full image */}
          {accom.imageUrl && (
            <img src={accom.imageUrl} alt={accom.name} className="w-full h-40 object-cover rounded-xl border border-white/30" />
          )}

          {/* Description / notes */}
          {(accom.description || accom.notes) && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{accom.description || accom.notes}</p>
          )}

          {/* Booking link */}
          {accom.bookingUrl && (
            <a href={accom.bookingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-[11px] font-black text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" />
              Book Now
            </a>
          )}

          {/* Vote breakdown */}
          {voteCount > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Interested</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(accom.votes).filter(([, v]) => v).map(([uid]) => {
                  const p = profiles.find((pr) => pr.id === uid)
                  return (
                    <div key={uid} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60 dark:bg-white/10 border border-white/40 text-[10px] font-bold">
                      <ThumbsUp className="h-2.5 w-2.5 text-primary" />
                      <span>{p ? p.displayName.split(' ')[0] : 'Someone'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* Vote toggle */}
            {!isApproved && !isRejected && (
              <Button
                variant={myVote ? 'default' : 'outline'}
                size="sm"
                onClick={handleVote}
                disabled={voting}
                className={cn('flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border-2',
                  myVote && 'bg-primary border-primary text-white')}
              >
                {voting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><ThumbsUp className="h-3.5 w-3.5 mr-1.5" />{myVote ? "I'm in" : "I want this"}</>}
              </Button>
            )}

            {/* Host: Approve / Reject */}
            {isHost && !isApproved && !isRejected && (
              <>
                <Button size="sm" onClick={handleApprove} disabled={approving}
                  className="flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Lock In</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReject} disabled={approving}
                  className="h-10 rounded-xl font-black text-[10px] uppercase text-destructive hover:bg-destructive/10 px-3">
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Host: reopen from approved */}
            {isHost && isApproved && (
              <Button variant="outline" size="sm" onClick={handleReject} disabled={approving}
                className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 text-muted-foreground">
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reopen Voting'}
              </Button>
            )}

            {/* Delete */}
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting}
                className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 shrink-0">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccommodationsPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const user = useAuthStore((s) => s.user)

  const [trip, setTrip] = useState<Trip | null>(null)
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [profiles, setProfiles] = useState<MemberProfile[]>([])
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!tripId) return
    const unsubTrip = subscribeToTrip(tripId, setTrip)
    const unsubAccom = subscribeToAccommodations(tripId, setAccommodations)
    return () => { unsubTrip(); unsubAccom() }
  }, [tripId])

  useEffect(() => {
    if (!trip) return
    getUserProfiles(trip.memberIds).then(setProfiles)
  }, [trip])

  if (!trip) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>

  const isHost = user?.uid === trip.ownerId || trip.coLeadIds.includes(user?.uid ?? '')
  const currency = trip.currency || 'USD'

  const approved = accommodations.filter((a) => a.status === 'approved')
  const voting = accommodations.filter((a) => a.status === 'voting')
  const all = [...approved, ...voting, ...accommodations.filter((a) => a.status === 'rejected')]

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Hotel className="h-6 w-6 text-primary" />
          Stays
        </h1>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl h-10 font-black text-[10px] uppercase tracking-widest gap-2">
          <Plus className="h-4 w-4" /> Add Option
        </Button>
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 opacity-40">
          <div className="h-16 w-16 rounded-3xl premium-gradient text-white flex items-center justify-center mb-4">
            <Hotel className="h-8 w-8" />
          </div>
          <p className="font-black text-sm uppercase tracking-widest">No options yet</p>
          <p className="text-xs font-medium mt-1">Paste an Airbnb or Booking.com link to get started</p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="w-full glass border border-white/30 rounded-2xl h-11 p-1">
            <TabsTrigger value="all" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
              All {all.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary rounded-full text-[9px]">{all.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="voting" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest">Voting</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Approved {approved.length > 0 && <span className="ml-1.5 h-2 w-2 bg-emerald-500 rounded-full inline-block" />}
            </TabsTrigger>
          </TabsList>

          {(['all', 'voting', 'approved'] as const).map((tab) => {
            const list = tab === 'all' ? all : tab === 'voting' ? voting : approved
            return (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {list.length === 0 ? (
                  <div className="text-center py-12 opacity-40">
                    <p className="font-black text-sm uppercase tracking-widest">No {tab} options</p>
                  </div>
                ) : (
                  list.map((accom) => (
                    <AccomCard
                      key={accom.id}
                      accom={accom}
                      profiles={profiles}
                      userId={user?.uid ?? ''}
                      isHost={isHost}
                      currency={currency}
                      tripId={trip.id}
                      memberCount={trip.memberIds.length}
                    />
                  ))
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {user && (
        <AddAccomDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          trip={trip}
          profiles={profiles}
          userId={user.uid}
        />
      )}
    </div>
  )
}
