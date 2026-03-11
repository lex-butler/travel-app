import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Plane, LogOut, User, Map, Settings } from 'lucide-react'
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
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

function getInitials(name: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const activeTrip = useTripStore((s) => s.activeTrip)
  const navigate = useNavigate()
  const location = useLocation()
  const { tripId } = useParams()
  const isOnTripsPage = location.pathname === '/trips'
  const isOwnerOrColead =
    user && activeTrip &&
    (activeTrip.ownerId === user.uid || activeTrip.coLeadIds.includes(user.uid))

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-3 left-0 right-0 z-50 px-6 sm:px-12 lg:px-20">
        <div className="container mx-auto max-w-7xl">
          <div className="glass flex h-14 items-center justify-between px-5 sm:px-8 rounded-2xl shadow-lg shadow-primary/5 animate-slide-down">
            {/* Logo */}
            <Link to="/trips" className="flex items-center gap-2 font-bold text-lg tracking-tight group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl premium-gradient text-white shadow-md shadow-primary/10 transition-transform group-hover:scale-105">
                <Plane className="h-4 w-4" />
              </div>
              <span className={cn("text-primary/90", tripId && "hidden sm:block")}>
                TripSync
              </span>
            </Link>

            {/* Trip Navigation (Header integrated) */}
            {tripId && <TripNavigation />}

            {/* User menu */}
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
      </header>

      <main className="flex-1 pt-20 pb-10">
        <div className="container mx-auto px-6 sm:px-12 lg:px-20 max-w-7xl animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
