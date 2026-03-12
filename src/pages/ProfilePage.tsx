import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth'
import { MapPin, Plus, Loader2, Camera, Trash2, Copy, ExternalLink, Pencil, X, Lock, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  domain: string
  deepLink: (handle: string) => string | null
}> = {
  venmo:    { label: 'Venmo',     from: '#3D95CE', to: '#1065A3', shadow: '#1065A3', placeholder: '@username',       domain: 'venmo.com',    deepLink: (h) => `https://venmo.com/${h.replace('@', '')}?txn=pay` },
  cashapp:  { label: 'Cash App',  from: '#00D632', to: '#00831F', shadow: '#00831F', placeholder: '$cashtag',        domain: 'cash.app',     deepLink: (h) => `https://cash.app/${h}` },
  paypal:   { label: 'PayPal',    from: '#009CDE', to: '#003087', shadow: '#003087', placeholder: 'Username/email',  domain: 'paypal.com',   deepLink: (h) => `https://paypal.me/${h}` },
  zelle:    { label: 'Zelle',     from: '#8C4FDB', to: '#5B16B5', shadow: '#5B16B5', placeholder: 'Phone or email', domain: 'zellepay.com', deepLink: () => null },
  applepay: { label: 'Apple Pay', from: '#3A3A3C', to: '#1C1C1E', shadow: '#1C1C1E', placeholder: 'Phone number',   domain: 'apple.com',    deepLink: () => null },
  other:    { label: 'Other',     from: '#636366', to: '#3A3A3C', shadow: '#3A3A3C', placeholder: 'Handle or link', domain: '',             deepLink: () => null },
}

// ─── Clearbit logo ────────────────────────────────────────────────────────────

function ClearbitLogo({ type, className }: { type: PaymentMethodType; className?: string }) {
  const [err, setErr] = useState(false)
  const domain = PM_CONFIG[type].domain
  if (!domain || err) {
    return (
      <span className={cn('font-black text-white flex items-center justify-center', className)}>
        {PM_CONFIG[type].label[0]}
      </span>
    )
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      className={cn('object-contain', className)}
      onError={() => setErr(true)}
      alt={PM_CONFIG[type].label}
      draggable={false}
    />
  )
}

// ─── QR code via free API ─────────────────────────────────────────────────────

function getQRData(method: PaymentMethod): string {
  const h = method.handle
  switch (method.type) {
    case 'venmo':   return `https://venmo.com/${h.replace('@', '')}`
    case 'cashapp': return `https://cash.app/${h}`
    case 'paypal':  return `https://paypal.me/${h}`
    default:        return h
  }
}

function QRCodeDisplay({ method }: { method: PaymentMethod }) {
  const data = getQRData(method)
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=000000&margin=4`
  return (
    <img
      src={url}
      alt="QR Code"
      className="h-44 w-44 rounded-2xl"
      crossOrigin="anonymous"
    />
  )
}

// ─── Wallet card (stack/collapsed — logo at bottom strip only) ────────────────

export function WalletCard({ method, onClick }: { method: PaymentMethod; onClick?: () => void }) {
  const cfg = PM_CONFIG[method.type]
  return (
    <div
      className="relative w-full rounded-[22px] overflow-hidden select-none"
      style={{
        aspectRatio: '1.586',
        background: `linear-gradient(145deg, ${cfg.from} 0%, ${cfg.to} 100%)`,
        boxShadow: `0 20px 50px -12px ${cfg.shadow}50`,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 45%)' }}
      />
      {/* Decorative circle */}
      <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom strip — visible in stack peek — logo + brand name */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[68px] flex items-center px-5 gap-3"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)' }}
      >
        <ClearbitLogo type={method.type} className="h-9 w-9 rounded-xl flex-shrink-0" />
        <span className="text-white font-black text-sm tracking-tight">{cfg.label}</span>
      </div>
    </div>
  )
}

// ─── Card detail view (unified card + QR, tap card to dismiss) ────────────────

function CardDetail({
  method,
  onClose,
  onDelete,
}: {
  method: PaymentMethod
  onClose: () => void
  onDelete: () => void
}) {
  const cfg = PM_CONFIG[method.type]
  const deepLink = cfg.deepLink(method.handle)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(method.handle)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="space-y-3"
    >
      {/* Unified card + QR container — tap the card to go back */}
      <div
        className="w-full rounded-[22px] overflow-hidden"
        style={{ boxShadow: `0 40px 80px -12px ${cfg.shadow}65` }}
      >
        {/* Card section */}
        <div
          onClick={onClose}
          className="relative w-full cursor-pointer active:opacity-90 transition-opacity"
          style={{
            aspectRatio: '1.586',
            background: `linear-gradient(145deg, ${cfg.from} 0%, ${cfg.to} 100%)`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.2) 0%, transparent 45%)' }}
          />
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)' }} />

          <div className="absolute inset-0 p-5 flex flex-col justify-between">
            {/* Logo — top left + delete top right */}
            <div className="flex items-start justify-between">
              <ClearbitLogo type={method.type} className="h-12 w-12 rounded-xl" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="h-7 w-7 rounded-full flex items-center justify-center transition-colors active:scale-90"
                style={{ background: 'rgba(0,0,0,0.22)' }}
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
            {/* Handle — bottom */}
            <div className="space-y-0.5">
              <p className="text-white/50 text-[9px] font-black uppercase tracking-[0.25em]">{cfg.label}</p>
              <p className="text-white text-[1.4rem] font-black tracking-tight leading-tight">{method.handle}</p>
              {method.label && <p className="text-white/45 text-[10px]">{method.label}</p>}
            </div>
          </div>

          {/* "Tap to close" hint */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1 opacity-40">
            <span className="text-[8px] font-black uppercase tracking-widest text-white">tap to close</span>
          </div>
        </div>

        {/* QR section — seamlessly connected below the card */}
        <div
          className="flex flex-col items-center gap-4 py-7 px-6"
          style={{ background: 'rgba(10,10,16,0.92)' }}
        >
          <QRCodeDisplay method={method} />
          <div className="text-center">
            <p className="font-black text-sm text-white">{method.handle}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{cfg.label}</p>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex gap-2">
        {deepLink ? (
          <Button
            asChild
            className="flex-1 rounded-xl h-11 font-black uppercase tracking-widest text-[10px]"
            style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}
          >
            <a href={deepLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open {cfg.label}
            </a>
          </Button>
        ) : (
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1 rounded-xl h-11 font-black uppercase tracking-widest text-[10px]"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {copied ? 'Copied!' : `Copy ${method.type === 'zelle' ? 'Info' : 'Handle'}`}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Wallet stack ─────────────────────────────────────────────────────────────

function WalletStack({
  methods,
  onDelete,
}: {
  methods: PaymentMethod[]
  onDelete: (id: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current?.querySelector('[data-measure]') as HTMLElement | null
    if (!el) return
    const ro = new ResizeObserver(() => { setCardH(el.offsetHeight) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [methods.length])

  if (methods.length === 0) return null

  const selectedMethod = methods.find((m) => m.id === selectedId)
  const PEEK = 68
  const containerH = cardH > 0 ? cardH + PEEK * (methods.length - 1) : undefined

  return (
    <AnimatePresence mode="wait">
      {selectedMethod ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <CardDetail
            method={selectedMethod}
            onClose={() => setSelectedId(null)}
            onDelete={() => { onDelete(selectedMethod.id); setSelectedId(null) }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="stack"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-3"
        >
          <div
            ref={containerRef}
            className="relative"
            style={{ height: containerH, transition: 'height 0.4s ease' }}
          >
            {methods.map((method, index) => (
              <div
                key={method.id}
                data-measure={index === 0 ? '' : undefined}
                className={cn('w-full', cardH > 0 ? 'absolute' : index === 0 ? 'relative' : 'hidden')}
                style={cardH > 0 ? {
                  top: index * PEEK,
                  zIndex: methods.length - index,
                  transition: 'top 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
                } : {}}
              >
                <WalletCard method={method} onClick={() => setSelectedId(method.id)} />
              </div>
            ))}
          </div>

          {methods.length > 1 && (
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {methods.length} cards · tap to view
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
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

// ─── Password field with show/hide ───────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl h-11 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const firebaseUser = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Account edit state
  const [editingAccount, setEditingAccount] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCity, setEditCity] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // Add method state
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
      }
    })
  }, [firebaseUser])

  const isGoogleUser = (firebaseUser?.providerData ?? []).some(p => p.providerId === 'google.com')

  function startEdit() {
    setEditName(firebaseUser?.displayName ?? '')
    setEditEmail(firebaseUser?.email ?? '')
    setEditCity(profile?.homeCity ?? '')
    setAccountError('')
    setEditingAccount(true)
  }

  function cancelEdit() {
    setEditingAccount(false)
    setAccountError('')
  }

  async function handleSaveAccount() {
    if (!firebaseUser || !auth.currentUser) return
    setSavingAccount(true)
    setAccountError('')
    try {
      const nameChanged = editName.trim() && editName.trim() !== firebaseUser.displayName
      const cityChanged = editCity.trim() !== (profile?.homeCity ?? '')
      const emailChanged = !isGoogleUser && editEmail.trim() && editEmail.trim() !== firebaseUser.email

      if (nameChanged) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() })
        await updateDoc(doc(db, 'users', firebaseUser.uid), { displayName: editName.trim() })
        useAuthStore.getState().setUser(auth.currentUser)
      }

      if (emailChanged) {
        await updateEmail(auth.currentUser, editEmail.trim())
        await updateDoc(doc(db, 'users', firebaseUser.uid), { email: editEmail.trim() })
      }

      if (cityChanged && editCity.trim()) {
        const geo = await geocodeCity(editCity.trim())
        if (!geo) { setAccountError('City not found — check the spelling and try again'); return }
        await updateUserHomeCity(firebaseUser.uid, editCity.trim(), geo.lat, geo.lng)
        setProfile(prev => prev ? { ...prev, homeCity: editCity.trim(), homeLat: geo.lat, homeLng: geo.lng } : prev)
      } else if (cityChanged && !editCity.trim()) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setProfile(prev => prev ? (({ homeCity: _hc, homeLat: _hl, homeLng: _hlng, ...rest }) => rest)(prev) as AppUser : prev)
      }

      setEditingAccount(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      if (msg.includes('requires-recent-login')) {
        setAccountError('Please sign out and sign back in before changing your email.')
      } else {
        setAccountError(msg)
      }
    } finally {
      setSavingAccount(false)
    }
  }

  async function handlePasswordChange() {
    if (!firebaseUser || !auth.currentUser || !firebaseUser.email) return
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setSavingPw(true)
    setPwError('')
    try {
      const cred = EmailAuthProvider.credential(firebaseUser.email, currentPw)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPw)
      setShowPasswordDialog(false)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setPwError('Current password is incorrect')
      } else {
        setPwError(msg)
      }
    } finally {
      setSavingPw(false)
    }
  }

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

  async function handleAddMethod() {
    if (!firebaseUser || !newHandle.trim() || !profile) return
    setSavingMethod(true)
    try {
      const method: PaymentMethod = { id: crypto.randomUUID(), type: newMethodType, handle: newHandle.trim() }
      const updated = [...(profile.paymentMethods ?? []), method]
      await updatePaymentMethods(firebaseUser.uid, updated)
      setProfile(prev => prev ? { ...prev, paymentMethods: updated } : prev)
      setShowAddMethod(false)
      setNewHandle('')
    } finally {
      setSavingMethod(false)
    }
  }

  async function handleDeleteMethod(id: string) {
    if (!firebaseUser || !profile) return
    const updated = (profile.paymentMethods ?? []).filter(m => m.id !== id)
    await updatePaymentMethods(firebaseUser.uid, updated)
    setProfile(prev => prev ? { ...prev, paymentMethods: updated } : prev)
  }

  if (!firebaseUser) return null
  const methods = profile?.paymentMethods ?? []

  return (
    <div className="max-w-md mx-auto pb-10 space-y-6">

      {/* ── Avatar ── */}
      <div className="flex flex-col items-center gap-3 pt-4">
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
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight">{firebaseUser.displayName ?? 'Traveler'}</h1>
          <p className="text-sm text-muted-foreground">{firebaseUser.email}</p>
        </div>
      </div>

      {/* ── Account Info ── */}
      <Card className="p-5 glass border-white/40 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account</p>
          {!editingAccount && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>

        {!editingAccount ? (
          /* ── Read view ── */
          <div className="space-y-3">
            <InfoRow label="Name" value={firebaseUser.displayName ?? '—'} />
            <InfoRow label="Email" value={firebaseUser.email ?? '—'} />
            {profile?.homeCity && (
              <InfoRow label="Home City" value={profile.homeCity} icon={<MapPin className="h-3 w-3" />} />
            )}
            {!isGoogleUser && (
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors pt-1"
              >
                <Lock className="h-3 w-3" /> Change Password
              </button>
            )}
            {isGoogleUser && (
              <p className="text-[10px] text-muted-foreground pt-1">
                Signed in with Google · Name and email managed by Google
              </p>
            )}
          </div>
        ) : (
          /* ── Edit view ── */
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Display name"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</label>
              {isGoogleUser ? (
                <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-sm text-muted-foreground flex-1 truncate">{firebaseUser.email}</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 shrink-0">Google</span>
                </div>
              ) : (
                <Input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="Email address"
                  className="rounded-xl h-11"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Home City
              </label>
              <Input
                value={editCity}
                onChange={e => { setEditCity(e.target.value); setAccountError('') }}
                placeholder="e.g. New York, NY"
                className="rounded-xl h-11"
              />
            </div>

            {accountError && (
              <p className="text-[11px] text-destructive font-bold">{accountError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={cancelEdit}
                className="flex-1 rounded-xl h-11 font-black"
                disabled={savingAccount}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSaveAccount}
                disabled={savingAccount}
                className="flex-1 rounded-xl h-11 font-black"
              >
                {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Wallet ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wallet</p>
          <Button
            variant="outline" size="sm"
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
      <Dialog open={showAddMethod} onOpenChange={o => { if (!o) { setShowAddMethod(false); setNewHandle('') } }}>
        <DialogContent className="max-w-sm glass border-white/40 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Add Payment Method</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PM_CONFIG) as PaymentMethodType[]).map((type) => {
                const cfg = PM_CONFIG[type]
                const selected = newMethodType === type
                return (
                  <button
                    key={type}
                    onClick={() => setNewMethodType(type)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all"
                    style={{
                      borderColor: selected ? cfg.from : 'rgba(255,255,255,0.18)',
                      background: selected
                        ? `linear-gradient(135deg, ${cfg.from}22, ${cfg.to}22)`
                        : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}
                    >
                      <ClearbitLogo type={type} className="h-6 w-6 rounded-lg" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider">{cfg.label}</span>
                  </button>
                )
              })}
            </div>

            {newHandle.trim() && (
              <WalletCard method={{ id: 'preview', type: newMethodType, handle: newHandle.trim() }} />
            )}

            <Input
              value={newHandle}
              onChange={e => setNewHandle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMethod()}
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

      {/* ── Password Change Dialog ── */}
      <Dialog open={showPasswordDialog} onOpenChange={o => {
        if (!o) { setShowPasswordDialog(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError('') }
      }}>
        <DialogContent className="max-w-sm glass border-white/40 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Change Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Password</label>
              <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="Current password" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Password</label>
              <PasswordInput value={newPw} onChange={setNewPw} placeholder="New password" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirm New Password</label>
              <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Confirm new password" />
            </div>

            {pwError && <p className="text-[11px] text-destructive font-bold">{pwError}</p>}

            <Button
              onClick={handlePasswordChange}
              disabled={savingPw || !currentPw || !newPw || !confirmPw}
              className="w-full rounded-xl h-11 font-black uppercase tracking-widest text-[10px] mt-2"
            >
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/6 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </span>
      <span className="text-sm font-bold truncate max-w-[55%] text-right">{value}</span>
    </div>
  )
}
