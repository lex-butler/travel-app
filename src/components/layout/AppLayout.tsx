import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom'
import { Plane, LogOut, User, Map, Settings, Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useTripStore } from '@/stores/tripStore'
import { signOut } from '@/services/auth'
import TripNavigation from '@/components/trip/TripNavigation'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { cn } from '@/lib/utils'

function getInitials(name: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

const mainVariants = {
  open: {
    scale: 0.84,
    x: 300,
    rotateY: -6,
    borderRadius: 28,
    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.55)',
    transition: { type: 'spring' as const, stiffness: 280, damping: 28 },
  },
  closed: {
    scale: 1,
    x: 0,
    rotateY: 0,
    borderRadius: 0,
    boxShadow: '0 0px 0px rgba(0,0,0,0)',
    transition: { type: 'spring' as const, stiffness: 280, damping: 28 },
  },
}

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const activeTrip = useTripStore((s) => s.activeTrip)
  const navigate = useNavigate()
  const location = useLocation()
  const { tripId } = useParams()

  const isLg = useMediaQuery('(min-width: 1024px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const touchStartX = useRef(0)

  // Close drawer when screen hits lg breakpoint
  useEffect(() => {
    if (isLg) setDrawerOpen(false)
  }, [isLg])

  // Lock scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const isOnTripsPage = location.pathname === '/trips'
  const isOwnerOrColead =
    !!(user && activeTrip &&
      (activeTrip.ownerId === user.uid || activeTrip.coLeadIds.includes(user.uid)))

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const animateState = drawerOpen && !isLg ? 'open' : 'closed'

  return (
    <div
      className="relative overflow-hidden w-screen bg-[#0e0e12]"
      style={{ minHeight: '100dvh', perspective: '1200px' }}
    >
      {/* ── Navigation Drawer (mobile only) ── */}
      <NavigationDrawer
        isOpen={drawerOpen && !isLg}
        onClose={() => setDrawerOpen(false)}
        user={user}
        activeTrip={activeTrip}
        tripId={tripId}
        isOwnerOrColead={isOwnerOrColead}
        onSignOut={handleSignOut}
      />

      {/* ── Main shell (entire app — gets scaled/shifted on mobile when drawer opens) ── */}
      <motion.div
        className="absolute inset-0 bg-background flex flex-col overflow-hidden"
        variants={mainVariants}
        animate={animateState}
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (drawerOpen && !isLg && e.changedTouches[0].clientX - touchStartX.current < -60) {
            setDrawerOpen(false)
          }
        }}
      >
        {/* Scrollable content inside the shell */}
        <div className="flex flex-col h-full overflow-y-auto">

          {/* ── HEADER ── */}
          <header
            className={cn(
              'sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pb-3 bg-background',
              drawerOpen && !isLg && 'pointer-events-none',
            )}
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            {/* ── Mobile header (< lg) ── */}
            <div className="flex lg:hidden items-center glass h-14 rounded-2xl shadow-lg shadow-primary/5 px-4 relative animate-slide-down">
              {/* Hamburger — hidden on the trips list page */}
              {!isOnTripsPage && (
                <button
                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/8 transition-colors"
                  onClick={() => setDrawerOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}

              {/* Logo — absolutely centered when hamburger is present, normal flex otherwise */}
              <Link
                to="/trips"
                className={cn(
                  'pointer-events-auto flex items-center gap-2 font-bold text-base tracking-tight group',
                  !isOnTripsPage && 'absolute left-1/2 -translate-x-1/2',
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl premium-gradient text-white shadow-md shadow-primary/10 transition-transform group-hover:scale-105">
                  <Plane className="h-4 w-4" />
                </div>
                <span className="text-primary/90">TripSync</span>
              </Link>

              {/* Avatar dropdown (mobile) — same items as desktop */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="pointer-events-auto ml-auto rounded-xl active:scale-95 transition-transform focus-visible:outline-none">
                      <Avatar className="h-8 w-8 border-2 border-white/50">
                        <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                        <AvatarFallback className="bg-background text-[10px]">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 glass rounded-2xl border-white/20 p-1.5 shadow-xl animate-scale-in">
                    <DropdownMenuLabel className="font-normal p-3">
                      <p className="text-sm font-bold truncate">{user.displayName ?? 'Traveler'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {!isOnTripsPage && (
                      <DropdownMenuItem asChild className="rounded-xl m-1 gap-2.5 p-2.5 text-sm cursor-pointer">
                        <Link to="/trips"><Map className="h-4 w-4" /><span>My Trips</span></Link>
                      </DropdownMenuItem>
                    )}
                    {tripId && isOwnerOrColead && (
                      <DropdownMenuItem asChild className="rounded-xl m-1 gap-2.5 p-2.5 text-sm cursor-pointer">
                        <Link to={`/trips/${tripId}/settings`}><Settings className="h-4 w-4" /><span>Trip Settings</span></Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild className="rounded-xl m-1 gap-2.5 p-2.5 text-sm cursor-pointer">
                      <Link to="/profile"><User className="h-4 w-4" /><span>Profile</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleSignOut}
                      className="rounded-xl m-1 gap-2.5 p-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 text-sm">
                      <LogOut className="h-4 w-4" /><span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* ── Desktop header (≥ lg) — unchanged from original ── */}
            <div className="hidden lg:block">
              <div className="container mx-auto max-w-7xl">
                <div className="glass flex h-14 items-center justify-between px-5 sm:px-8 rounded-2xl shadow-lg shadow-primary/5 animate-slide-down">
                  {/* Logo */}
                  <Link to="/trips" className="flex items-center gap-2 font-bold text-lg tracking-tight group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl premium-gradient text-white shadow-md shadow-primary/10 transition-transform group-hover:scale-105">
                      <Plane className="h-4 w-4" />
                    </div>
                    <span className={cn('text-primary/90', tripId && 'hidden sm:block')}>
                      TripSync
                    </span>
                  </Link>

                  {/* Trip Navigation */}
                  {tripId && <TripNavigation />}

                  {/* User dropdown */}
                  {user && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="group relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform active:scale-95">
                          <div className="absolute -inset-0.5 rounded-xl bg-primary/10 opacity-0 group-hover:opacity-100 blur transition-opacity" />
                          <Avatar className="h-8 w-8 border-2 border-white/50 relative">
                            <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                            <AvatarFallback className="bg-background text-[10px]">{getInitials(user.displayName)}</AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-56 glass rounded-2xl border-white/20 p-1.5 shadow-xl animate-scale-in">
                        <DropdownMenuLabel className="font-normal p-3">
                          <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-bold">{user.displayName ?? 'Traveler'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator className="bg-white/10" />

                        {!isOnTripsPage && (
                          <DropdownMenuItem asChild className="rounded-xl m-1 gap-2.5 p-2.5 text-sm cursor-pointer">
                            <Link to="/trips">
                              <Map className="h-4 w-4" />
                              <span>My Trips</span>
                            </Link>
                          </DropdownMenuItem>
                        )}

                        {tripId && isOwnerOrColead && (
                          <DropdownMenuItem asChild className="rounded-xl m-1 gap-2.5 p-2.5 text-sm cursor-pointer">
                            <Link to={`/trips/${tripId}/settings`}>
                              <Settings className="h-4 w-4" />
                              <span>Trip Settings</span>
                            </Link>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem asChild className="rounded-xl m-1 gap-2.5 p-2.5 text-sm cursor-pointer">
                          <Link to="/profile">
                            <User className="h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-white/10" />

                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="rounded-xl m-1 gap-2.5 p-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 text-sm"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="flex-1" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-20 max-w-7xl pt-4 lg:pt-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>

        {/* ── Overlay to close drawer (click outside) ── */}
        <AnimatePresence>
          {drawerOpen && !isLg && (
            <motion.div
              key="overlay"
              className="absolute inset-0 z-40 cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
