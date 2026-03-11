import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  Plane, Map, User, LayoutDashboard, DollarSign, Users,
  MapPin, Hotel, Calendar, Backpack, Settings, LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User as FirebaseUser } from 'firebase/auth'
import type { Trip } from '@/types'
import { cn } from '@/lib/utils'

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface NavItemDef {
  label: string
  href: string
  icon: React.ElementType
}

interface Props {
  isOpen: boolean
  onClose: () => void
  user: FirebaseUser | null
  activeTrip: Trip | null
  tripId: string | undefined
  isOwnerOrColead: boolean
  onSignOut: () => void
}

const itemVariants = {
  open: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 300, damping: 28 },
  }),
  closed: {
    x: -20,
    opacity: 0,
    transition: { duration: 0.12 },
  },
}

const drawerVariants = {
  open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  closed: { x: '-100%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
}

export default function NavigationDrawer({
  isOpen,
  onClose,
  user,
  activeTrip,
  tripId,
  isOwnerOrColead,
  onSignOut,
}: Props) {
  const location = useLocation()

  const globalItems: NavItemDef[] = [
    { label: 'My Trips', href: '/trips', icon: Map },
    { label: 'Profile', href: '/profile', icon: User },
  ]

  const tripTopItems: NavItemDef[] = tripId ? [
    { label: 'Overview', href: `/trips/${tripId}`, icon: LayoutDashboard },
    { label: 'Budget', href: `/trips/${tripId}/budget`, icon: DollarSign },
    { label: 'Crew', href: `/trips/${tripId}/crew`, icon: Users },
  ] : []

  const planningItems: NavItemDef[] = tripId ? [
    { label: 'Destinations', href: `/trips/${tripId}/destinations`, icon: MapPin },
    { label: 'Stays', href: `/trips/${tripId}/accommodations`, icon: Hotel },
    { label: 'Dates', href: `/trips/${tripId}/planning`, icon: Calendar },
    { label: 'Packing', href: `/trips/${tripId}/packing`, icon: Backpack },
  ] : []

  // Enumerate all items with stable indices for stagger
  const sections: { label?: string; items: NavItemDef[] }[] = [
    { items: globalItems },
    ...(tripId ? [
      { label: activeTrip?.name ?? 'Trip', items: tripTopItems },
      { label: 'Planning', items: planningItems },
      ...(isOwnerOrColead ? [{ label: 'Manage', items: [{ label: 'Trip Settings', href: `/trips/${tripId}/settings`, icon: Settings }] }] : []),
    ] : []),
  ]

  let itemIndex = 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drawer"
          className="fixed inset-y-0 left-0 z-20 w-[300px] flex flex-col"
          style={{ background: 'linear-gradient(160deg, #0e0e12 0%, #13101a 100%)' }}
          variants={drawerVariants}
          initial="closed"
          animate="open"
          exit="closed"
        >
          {/* User card */}
          <div className="px-5 pt-14 pb-6 border-b border-white/8">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-white/20">
                <AvatarImage src={user?.photoURL ?? undefined} />
                <AvatarFallback className="bg-primary/15 text-primary text-sm font-black">
                  {getInitials(user?.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">{user?.displayName ?? 'Traveler'}</p>
                <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Nav sections */}
          <div className="flex-1 overflow-y-auto py-4 space-y-6 px-3">
            {sections.map((section) => (
              <div key={section.label ?? 'global'}>
                {section.label && (
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 px-3 mb-2">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const idx = itemIndex++
                    const isActive = location.pathname === item.href
                    return (
                      <motion.div
                        key={item.href}
                        custom={idx}
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                      >
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all',
                            isActive
                              ? 'bg-white/12 text-primary'
                              : 'text-white/60 hover:text-white hover:bg-white/8',
                          )}
                        >
                          <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-white/35')} />
                          {item.label}
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sign out */}
          <div className="px-3 pb-8 border-t border-white/8 pt-4">
            <motion.button
              custom={itemIndex}
              variants={itemVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={() => { onSignOut(); onClose() }}
              className="flex w-full items-center gap-3.5 px-3 py-2.5 rounded-2xl text-sm font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="h-4 w-4 shrink-0 text-red-400/50" />
              Sign Out
            </motion.button>
          </div>

          {/* Branding */}
          <div className="px-5 pb-6 flex items-center gap-2 opacity-20">
            <div className="h-5 w-5 rounded-lg premium-gradient flex items-center justify-center">
              <Plane className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[10px] font-black tracking-wider text-white uppercase">TripSync</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
