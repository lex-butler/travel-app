import { Link, useLocation, useParams } from 'react-router-dom'
import { LayoutDashboard, MapPin, Users, Calendar, DollarSign, Hotel, ChevronDown, Backpack } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
    label: string
    href: string
    icon: React.ElementType
}

export default function TripNavigation() {
    const { tripId } = useParams<{ tripId: string }>()
    const location = useLocation()

    const topItems: NavItem[] = [
        { label: 'Overview', href: `/trips/${tripId}`, icon: LayoutDashboard },
        { label: 'Budget',   href: `/trips/${tripId}/budget`, icon: DollarSign },
        { label: 'Crew',     href: `/trips/${tripId}/crew`, icon: Users },
    ]

    const planningItems: NavItem[] = [
        { label: 'Destinations', href: `/trips/${tripId}/destinations`, icon: MapPin },
        { label: 'Stays',        href: `/trips/${tripId}/accommodations`, icon: Hotel },
        { label: 'Dates',        href: `/trips/${tripId}/planning`, icon: Calendar },
        { label: 'Packing',      href: `/trips/${tripId}/packing`, icon: Backpack },
    ]

    const isPlanningActive = planningItems.some(item => location.pathname === item.href)

    const linkClass = (isActive: boolean) => cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 relative group",
        isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5"
    )

    const iconClass = (isActive: boolean) => cn(
        "h-4 w-4 md:h-3.5 md:w-3.5",
        isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
    )

    return (
        <nav className="flex items-center justify-center gap-1 mx-2 md:mx-4">
            {/* Overview (always first) */}
            {(() => {
                const item = topItems[0]
                const isActive = location.pathname === item.href
                return (
                    <Link key={item.href} to={item.href} className={linkClass(isActive)}>
                        <item.icon className={iconClass(isActive)} />
                        <span className="hidden sm:inline">{item.label}</span>
                        {isActive && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full mx-3"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </Link>
                )
            })()}

            {/* Planning dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 relative group focus-visible:outline-none",
                        isPlanningActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5"
                    )}>
                        <Calendar className={iconClass(isPlanningActive)} />
                        <span className="hidden sm:inline">Planning</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                        {isPlanningActive && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full mx-3"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="center"
                    className="w-44 glass rounded-2xl border-white/20 p-1.5 shadow-xl"
                >
                    {planningItems.map(item => {
                        const isSubActive = location.pathname === item.href
                        return (
                            <DropdownMenuItem key={item.href} asChild className="rounded-xl p-0 cursor-pointer focus:bg-white/10">
                                <Link
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-2.5 px-2.5 py-2 w-full rounded-xl",
                                        isSubActive ? "text-primary font-semibold" : "text-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="text-sm">{item.label}</span>
                                </Link>
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Budget + Crew */}
            {topItems.slice(1).map((item) => {
                const isActive = location.pathname === item.href
                return (
                    <Link key={item.href} to={item.href} className={linkClass(isActive)}>
                        <item.icon className={iconClass(isActive)} />
                        <span className="hidden sm:inline">{item.label}</span>
                        {isActive && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full mx-3"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
