import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { updateProfile } from 'firebase/auth'
import { MapPin, Plus, X, Loader2, Camera, ChevronDown, ChevronUp } from 'lucide-react'
import { db, storage, auth } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import { updateUserHomeCity, updatePaymentMethods } from '@/services/userService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { User as AppUser, PaymentMethod, PaymentMethodType } from '@/types'
import { cn } from '@/lib/utils'

// ─── Brand config ─────────────────────────────────────────────────────────────

const PM_CONFIG: Record<PaymentMethodType, {
  label: string
  from: string
  to: string
  shadow: string
  placeholder: string
}> = {
  venmo:    { label: 'Venmo',     from: '#3D95CE', to: '#1065A3', shadow: '#1065A3',  placeholder: '@username' },
  cashapp:  { label: 'Cash App',  from: '#00D632', to: '#00831F', shadow: '#00831F',  placeholder: '$cashtag' },
  paypal:   { label: 'PayPal',    from: '#009CDE', to: '#003087', shadow: '#003087',  placeholder: 'Username or email' },
  zelle:    { label: 'Zelle',     from: '#8C4FDB', to: '#5B16B5', shadow: '#5B16B5',  placeholder: 'Phone or email' },
  applepay: { label: 'Apple Pay', from: '#3A3A3C', to: '#1C1C1E', shadow: '#1C1C1E',  placeholder: 'Phone number' },
  other:    { label: 'Other',     from: '#636366', to: '#3A3A3C', shadow: '#3A3A3C',  placeholder: 'Handle, link, or phone' },
}

// ─── Brand SVG logos ──────────────────────────────────────────────────────────

function BrandIcon({ type }: { type: PaymentMethodType }) {
  switch (type) {
    case 'venmo':
      return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
          <path d="M7 7 L20 34 L33 7 H27.5 L20 21.5 L12.5 7 Z" fill="white" />
        </svg>
      )
    case 'cashapp':
      return (
        <svg viewBox="0 0 40 40" className="h-10 w-10">
          <text x="20" y="31" fontSize="30" fontWeight="900" textAnchor="middle"
            fill="white" fontFamily="system-ui, -apple-system, sans-serif">$</text>
        </svg>
      )
    case 'paypal':
      return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="white">
          <path d="M13 6h8c4 0 6.5 2 6 6s-3.5 6.5-8 6.5h-2.5L15 25h-4.5L13 6zm2.5 3.5L14 16h2.5c2.5 0 4-1.5 4-3.5s-1.5-3-5-3z" />
          <path d="M20 6h-3.5L16 9c4.5.3 7 3 6.5 7-.5 4-4 6.5-8 6.5H12l-.5 3h4.5l1.5-7.5h2C23 18 27 15 27.5 11 28 7.5 25 6 20 6z"
            opacity="0.55" />
        </svg>
      )
    case 'zelle':
      return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="white">
          <path d="M8 8h24L14 22h18v10H8V22L22 11H8V8z" />
        </svg>
      )
    case 'applepay':
      return (
        <svg viewBox="0 0 80 32" className="h-7 w-20" fill="white">
          {/* Apple logo */}
          <path d="M17 7.5c-1 0-2.3.65-3.1 1.6-.7-.95-2-1.6-3.1-1.6-.1 1.2.35 2.35 1.05 3.15-.8.8-1.85 1.75-1.85 1.75s.1 3.05 2.3 4.55c.85.55 1.55.75 2.2.75.6 0 1.25-.25 2-.7.75.45 1.4.7 2.05.7.65 0 1.35-.2 2.2-.75 2.2-1.5 2.3-4.55 2.3-4.55s-1.05-.95-1.85-1.75c.7-.8 1.15-1.95 1.05-3.15-.95 0-2.25.65-3.25 1.6-.5-1.05-1.7-1.6-3-1.6z M14.2 4.5c.75-.9 1.9-1.5 2.8-1.5.15 1.3-.4 2.5-1.05 3.25-.7.8-1.85 1.45-3 1.3-.15-1.2.5-2.4 1.25-3.05z" />
          {/* Pay text */}
          <text x="28" y="23" fontSize="13" fontWeight="700" fontFamily="system-ui, -apple-system">Pay</text>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
          <rect x="4" y="10" width="32" height="20" rx="4" stroke="white" strokeWidth="2" />
          <rect x="4" y="16" width="32" height="5" fill="rgba(255,255,255,0.4)" />
          <rect x="7" y="23" width="9" height="3" rx="1.5" fill="white" />
        </svg>
      )
  }
}

function ChipDecal() {
  return (
    <svg viewBox="0 0 36 28" className="h-7 w-9" fill="none">
      <rect x="1" y="1" width="34" height="26" rx="5" fill="rgba(255,255,255,0.22)"
        stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <line x1="1" y1="10" x2="35" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="1" y1="18" x2="35" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="13" y1="1" x2="13" y2="27" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="23" y1="1" x2="23" y2="27" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
    </svg>
  )
}

// ─── Wallet Card ──────────────────────────────────────────────────────────────

export function WalletCard({
  method,
  onDelete,
}: {
  method: PaymentMethod
  onDelete?: () => void
}) {
  const cfg = PM_CONFIG[method.type]
  return (
    <div
      className="relative w-full rounded-[22px] overflow-hidden select-none"
      style={{
        aspectRatio: '1.586',
        background: `linear-gradient(145deg, ${cfg.from} 0%, ${cfg.to} 100%)`,
        boxShadow: `0 24px 64px -12px ${cfg.shadow}55, 0 8px 24px -6px ${cfg.shadow}30`,
      }}
    >
      {/* Top-left shine */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.2) 0%, transparent 45%)' }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full"
        style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full"
        style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Card content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        {/* Top row: logo + chip + delete */}
        <div className="flex items-start justify-between">
          <BrandIcon type={method.type} />
          <div className="flex items-center gap-2.5">
            <ChipDecal />
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="h-7 w-7 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(0,0,0,0.22)' }}
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom row: handle + brand name */}
        <div className="space-y-0.5">
          <p className="text-white/50 text-[9px] font-black uppercase tracking-[0.25em]">{cfg.label}</p>
          <p className="text-white text-[1.35rem] font-black tracking-tight leading-tight">{method.handle}</p>
          {method.label && (
            <p className="text-white/45 text-[10px] mt-0.5">{method.label}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Wallet stack (Apple Wallet style) ────────────────────────────────────────

function WalletStack({
  methods,
  onDelete,
}: {
  methods: PaymentMethod[]
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current?.querySelector('[data-first-card]') as HTMLElement | null
    if (!el) return
    const ro = new ResizeObserver(() => {
      setCardH(el.offsetHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [methods.length])

  if (methods.length === 0) return null

  const PEEK = 62
  const GAP = 12
  const containerH = cardH > 0
    ? expanded
      ? (cardH + GAP) * methods.length - GAP
      : cardH + PEEK * (methods.length - 1)
    : undefined

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative"
        style={{
          height: containerH,
          transition: 'height 0.4s ease',
          cursor: expanded ? 'default' : 'pointer',
        }}
        onClick={() => !expanded && methods.length > 1 && setExpanded(true)}
      >
        {methods.map((method, index) => (
          <div
            key={method.id}
            data-first-card={index === 0 ? '' : undefined}
            className={cn('w-full', cardH > 0 ? 'absolute' : index === 0 ? 'relative' : 'hidden')}
            style={cardH > 0 ? {
              top: expanded ? index * (cardH + GAP) : index * PEEK,
              zIndex: methods.length - index,
              transition: 'top 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
            } : {}}
          >
            <WalletCard
              method={method}
              onDelete={expanded || methods.length === 1 ? () => onDelete(method.id) : undefined}
            />
          </div>
        ))}
      </div>

      {methods.length > 1 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground mx-auto mt-2 hover:text-foreground transition-colors"
        >
          {expanded
            ? <><ChevronUp className="h-3 w-3" /> Collapse</>
            : <><ChevronDown className="h-3 w-3" /> {methods.length} cards · tap to expand</>}
        </button>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

async function geocodeCity(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const data = await resp.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const firebaseUser = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [cityInput, setCityInput] = useState('')
  const [savingCity, setSavingCity] = useState(false)
  const [cityError, setCityError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [showAddMethod, setShowAddMethod] = useState(false)
  const [newMethodType, setNewMethodType] = useState<PaymentMethodType>('venmo')
  const [newHandle, setNewHandle] = useState('')
  const [savingMethod, setSavingMethod] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!firebaseUser) return
    getDoc(doc(db, 'users', firebaseUser.uid)).then((snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as AppUser
        setProfile(data)
        setCityInput(data.homeCity ?? '')
      }
    })
  }, [firebaseUser])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !firebaseUser || !auth.currentUser) return
    setUploadingAvatar(true)
    try {
      const fileRef = storageRef(storage, `users/${firebaseUser.uid}/avatar`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      await updateProfile(auth.currentUser, { photoURL: url })
      await updateDoc(doc(db, 'users', firebaseUser.uid), { photoURL: url })
      useAuthStore.getState().setUser(auth.currentUser)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveCity() {
    if (!firebaseUser || !cityInput.trim()) return
    setSavingCity(true)
    setCityError('')
    try {
      const geo = await geocodeCity(cityInput.trim())
      if (!geo) {
        setCityError('City not found — check the spelling and try again')
        return
      }
      await updateUserHomeCity(firebaseUser.uid, cityInput.trim(), geo.lat, geo.lng)
      setProfile((prev) => prev ? { ...prev, homeCity: cityInput.trim(), homeLat: geo.lat, homeLng: geo.lng } : prev)
    } finally {
      setSavingCity(false)
    }
  }

  async function handleAddMethod() {
    if (!firebaseUser || !newHandle.trim() || !profile) return
    setSavingMethod(true)
    try {
      const method: PaymentMethod = {
        id: crypto.randomUUID(),
        type: newMethodType,
        handle: newHandle.trim(),
      }
      const updated = [...(profile.paymentMethods ?? []), method]
      await updatePaymentMethods(firebaseUser.uid, updated)
      setProfile((prev) => prev ? { ...prev, paymentMethods: updated } : prev)
      setShowAddMethod(false)
      setNewHandle('')
    } finally {
      setSavingMethod(false)
    }
  }

  async function handleDeleteMethod(id: string) {
    if (!firebaseUser || !profile) return
    const updated = (profile.paymentMethods ?? []).filter((m) => m.id !== id)
    await updatePaymentMethods(firebaseUser.uid, updated)
    setProfile((prev) => prev ? { ...prev, paymentMethods: updated } : prev)
  }

  if (!firebaseUser) return null

  const methods = profile?.paymentMethods ?? []

  return (
    <div className="max-w-md mx-auto pb-10 space-y-8">

      {/* ── Avatar ── */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="relative">
          <Avatar className="h-28 w-28 border-4 border-white/60 shadow-2xl shadow-black/20">
            <AvatarImage src={firebaseUser.photoURL ?? undefined} />
            <AvatarFallback className="text-4xl font-black bg-primary/10 text-primary">
              {getInitials(firebaseUser.displayName)}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {uploadingAvatar
              ? <Loader2 className="h-4 w-4 text-white animate-spin" />
              : <Camera className="h-4 w-4 text-white" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight">{firebaseUser.displayName ?? 'Traveler'}</h1>
          <p className="text-sm text-muted-foreground">{firebaseUser.email}</p>
        </div>
      </div>

      {/* ── Home City ── */}
      <Card className="p-5 glass border-white/40 rounded-3xl space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" /> Home City
        </p>
        <p className="text-xs text-muted-foreground">Used to estimate travel times to destinations</p>
        <div className="flex gap-2">
          <Input
            value={cityInput}
            onChange={(e) => { setCityInput(e.target.value); setCityError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCity()}
            placeholder="e.g. New York, NY"
            className="rounded-xl h-11 flex-1"
          />
          <Button
            onClick={handleSaveCity}
            disabled={savingCity || !cityInput.trim() || cityInput.trim() === profile?.homeCity}
            className="rounded-xl h-11 px-5 font-black"
          >
            {savingCity ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
        {cityError && <p className="text-[11px] text-destructive font-bold">{cityError}</p>}
      </Card>

      {/* ── Wallet ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Wallet
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddMethod(true)}
            className="h-8 rounded-xl text-[10px] font-black uppercase gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {methods.length === 0 ? (
          <button
            onClick={() => setShowAddMethod(true)}
            className="w-full rounded-3xl border-2 border-dashed border-white/30 py-14 flex flex-col items-center gap-3 opacity-50 hover:opacity-70 transition-opacity"
          >
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <p className="font-black text-sm uppercase tracking-widest">Add payment method</p>
            <p className="text-xs">Venmo, Cash App, PayPal, and more</p>
          </button>
        ) : (
          <WalletStack methods={methods} onDelete={handleDeleteMethod} />
        )}
      </div>

      {/* ── Add Method Dialog ── */}
      <Dialog open={showAddMethod} onOpenChange={(o) => { if (!o) { setShowAddMethod(false); setNewHandle('') } }}>
        <DialogContent className="max-w-sm glass border-white/40 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Add Payment Method</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Type grid */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(PM_CONFIG) as [PaymentMethodType, typeof PM_CONFIG[PaymentMethodType]][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => setNewMethodType(type)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all"
                  style={{
                    borderColor: newMethodType === type ? cfg.from : 'rgba(255,255,255,0.2)',
                    background: newMethodType === type
                      ? `linear-gradient(135deg, ${cfg.from}22, ${cfg.to}22)`
                      : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Mini brand badge */}
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}
                  >
                    <MiniBrandIcon type={type} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider">{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* Live card preview */}
            {newHandle.trim() && (
              <WalletCard method={{ id: 'preview', type: newMethodType, handle: newHandle.trim() }} />
            )}

            {/* Handle input */}
            <Input
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
              placeholder={PM_CONFIG[newMethodType].placeholder}
              className="rounded-xl h-11"
            />

            <Button
              onClick={handleAddMethod}
              disabled={savingMethod || !newHandle.trim()}
              className="w-full rounded-xl h-11 font-black uppercase tracking-widest text-[10px]"
            >
              {savingMethod ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Method'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mini icon for the type grid (smaller than full BrandIcon)
function MiniBrandIcon({ type }: { type: PaymentMethodType }) {
  switch (type) {
    case 'venmo':
      return <svg viewBox="0 0 40 40" className="h-5 w-5" fill="none"><path d="M7 7 L20 34 L33 7 H27.5 L20 21.5 L12.5 7 Z" fill="white" /></svg>
    case 'cashapp':
      return <svg viewBox="0 0 40 40" className="h-5 w-5"><text x="20" y="31" fontSize="30" fontWeight="900" textAnchor="middle" fill="white" fontFamily="system-ui">$</text></svg>
    case 'paypal':
      return <svg viewBox="0 0 40 40" className="h-5 w-5" fill="white"><path d="M13 6h8c4 0 6.5 2 6 6s-3.5 6.5-8 6.5h-2.5L15 25h-4.5L13 6zm2.5 3.5L14 16h2.5c2.5 0 4-1.5 4-3.5s-1.5-3-5-3z" /></svg>
    case 'zelle':
      return <svg viewBox="0 0 40 40" className="h-5 w-5" fill="white"><path d="M8 8h24L14 22h18v10H8V22L22 11H8V8z" /></svg>
    case 'applepay':
      return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.029 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg>
    default:
      return <svg viewBox="0 0 40 40" className="h-5 w-5" fill="none"><rect x="4" y="10" width="32" height="20" rx="4" stroke="white" strokeWidth="2.5" /><rect x="4" y="16" width="32" height="5" fill="rgba(255,255,255,0.4)" /></svg>
  }
}
