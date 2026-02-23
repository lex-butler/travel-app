import { Link, useLocation, useParams } from 'react-router-dom'
import { LayoutDashboard, MapPin, Users, Calendar, DollarSign, Hotel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface NavItem {
    label: string
    href: string
    icon: React.ElementType
}

export default function TripNavigation() {
    const { tripId } = useParams<{ tripId: string }>()
    const location = useLocation()

    const items: NavItem[] = [
        { label: 'Overview', href: `/trips/${tripId}`, icon: LayoutDashboard },
        { label: 'Destinations', href: `/trips/${tripId}/destinations`, icon: MapPin },
        { label: 'Stays', href: `/trips/${tripId}/accommodations`, icon: Hotel },
        { label: 'Budget', href: `/trips/${tripId}/budget`, icon: DollarSign },
        { label: 'Crew', href: `/trips/${tripId}/crew`, icon: Users },
        { label: 'Planning', href: `/trips/${tripId}/planning`, icon: Calendar },
    ]

    return (
        <nav className="flex items-center justify-center gap-1 mx-2 md:mx-4">
            {items.map((item) => {
                const isActive = location.pathname === item.href
                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 relative group",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5"
                        )}
                    >
                        <item.icon className={cn("h-4 w-4 md:h-3.5 md:w-3.5", isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground")} />
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
