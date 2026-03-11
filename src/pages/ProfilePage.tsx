import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { MapPin, Plus, X, Loader2, CreditCard } from 'lucide-react'
import { db } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import { updateUserHomeCity, updatePaymentMethods } from '@/services/userService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { User as AppUser, PaymentMethod, PaymentMethodType } from '@/types'
import { cn } from '@/lib/utils'

// ─── Payment method config ────────────────────────────────────────────────────

const PM_CONFIG: Record<PaymentMethodType, { label: string; emoji: string; gradient: string; placeholder: string }> = {
  venmo:    { label: 'Venmo',     emoji: '💙', gradient: 'from-blue-500 to-blue-700',       placeholder: '@username' },
  cashapp:  { label: 'Cash App',  emoji: '💚', gradient: 'from-emerald-500 to-emerald-800', placeholder: '$cashtag' },
  paypal:   { label: 'PayPal',    emoji: '💛', gradient: 'from-sky-500 to-indigo-700',      placeholder: 'Username or email' },
  zelle:    { label: 'Zelle',     emoji: '💜', gradient: 'from-violet-500 to-purple-800',   placeholder: 'Phone or email' },
  applepay: { label: 'Apple Pay', emoji: '🍎', gradient: 'from-slate-700 to-slate-900',     placeholder: 'Phone number' },
  other:    { label: 'Other',     emoji: '💳', gradient: 'from-slate-500 to-slate-700',     placeholder: 'Handle, link, or phone' },
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

// ─── Wallet card ──────────────────────────────────────────────────────────────

export function WalletCard({ method, onDelete }: { method: PaymentMethod; onDelete?: () => void }) {
  const config = PM_CONFIG[method.type]
  return (
    <div className={cn('relative rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg', config.gradient)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{config.label}</p>
          <p className="text-base font-black mt-1">{method.handle}</p>
          {method.label && <p className="text-[10px] opacity-50 mt-0.5">{method.label}</p>}
        </div>
        <span className="text-2xl">{config.emoji}</span>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 h-6 w-6 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/40 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const firebaseUser = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [cityInput, setCityInput] = useState('')
  const [savingCity, setSavingCity] = useState(false)
  const [cityError, setCityError] = useState('')

  const [showAddMethod, setShowAddMethod] = useState(false)
  const [newMethodType, setNewMethodType] = useState<PaymentMethodType>('venmo')
  const [newHandle, setNewHandle] = useState('')
  const [savingMethod, setSavingMethod] = useState(false)

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

  return (
    <div className="max-w-lg mx-auto pb-8 space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-5 px-1 pt-2">
        <Avatar className="h-16 w-16 border-2 border-white/50">
          <AvatarImage src={firebaseUser.photoURL ?? undefined} />
          <AvatarFallback className="text-xl font-black bg-primary/10 text-primary">
            {getInitials(firebaseUser.displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{firebaseUser.displayName ?? 'Traveler'}</h1>
          <p className="text-sm text-muted-foreground">{firebaseUser.email}</p>
        </div>
      </div>

      {/* Home City */}
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

      {/* Payment Methods */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5" /> Payment Methods
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

        {(profile?.paymentMethods?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 opacity-40 text-center">
            <CreditCard className="h-10 w-10 mb-3" />
            <p className="font-black text-sm uppercase tracking-widest">No payment methods</p>
            <p className="text-xs mt-1">Add Venmo, CashApp, PayPal, and more</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile!.paymentMethods!.map((method) => (
              <WalletCard
                key={method.id}
                method={method}
                onDelete={() => handleDeleteMethod(method.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Method Dialog */}
      <Dialog open={showAddMethod} onOpenChange={(o) => { if (!o) { setShowAddMethod(false); setNewHandle('') } }}>
        <DialogContent className="max-w-sm glass border-white/40 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Type grid */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(PM_CONFIG) as [PaymentMethodType, typeof PM_CONFIG[PaymentMethodType]][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setNewMethodType(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all',
                    newMethodType === type
                      ? 'border-primary bg-primary/10'
                      : 'border-white/30 bg-white/30 dark:bg-white/5',
                  )}
                >
                  <span className="text-xl">{config.emoji}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">{config.label}</span>
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
