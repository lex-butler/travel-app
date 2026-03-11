import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Plane,
  Users,
  Receipt,
  ArrowRightLeft,
  Map,
  Hotel,
  CheckSquare,
  ArrowRight,
  Star,
  Globe,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/20 shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl premium-gradient shadow-md">
            <Plane className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">TripSync</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="font-bold text-slate-600 hover:text-slate-900">
              Sign in
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="premium-gradient text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-200">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroMockCard() {
  return (
    <div className="relative">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-3xl scale-90" />

      <div className="relative glass border-white/40 rounded-3xl shadow-2xl shadow-primary/10 p-5 w-72 animate-slide-up">
        {/* Trip header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Summer 2026</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">Barcelona & Lisbon</h3>
          </div>
          <div className="p-2 rounded-xl bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Users, label: '5 crew', color: 'bg-violet-50 text-violet-600' },
            { icon: CalendarDays, label: '10 days', color: 'bg-emerald-50 text-emerald-600' },
            { icon: Receipt, label: '$3,240', color: 'bg-amber-50 text-amber-600' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className={`${color} rounded-xl px-2 py-2 text-center`}>
              <Icon className="h-3.5 w-3.5 mx-auto mb-1" />
              <p className="text-[10px] font-black">{label}</p>
            </div>
          ))}
        </div>

        {/* Crew avatars */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {['A', 'J', 'S', 'M', 'R'].map((initial, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full premium-gradient border-2 border-white flex items-center justify-center text-[10px] font-black text-white"
              >
                {initial}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-medium">All confirmed</p>
        </div>

        {/* Settlement preview */}
        <div className="bg-gradient-to-br from-primary/8 to-violet-500/8 rounded-2xl p-3 border border-primary/10">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Settlement</p>
          {[
            { from: 'Alex', to: 'Jordan', amount: '$42' },
            { from: 'Sam', to: 'Alex', amount: '$18' },
          ].map(({ from, to, amount }) => (
            <div key={from} className="flex items-center justify-between py-1">
              <span className="text-xs font-bold text-slate-700">{from} → {to}</span>
              <span className="text-xs font-black text-primary">{amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-primary/8 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[600px] w-[600px] bg-violet-500/6 rounded-full blur-[120px] -ml-48 -mb-48 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] bg-sky-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center py-24">
          {/* Left: copy */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-1.5 mb-8">
              <Star className="h-3.5 w-3.5 text-primary fill-primary" />
              <span className="text-xs font-black text-primary">Group travel, finally sorted</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.08] mb-6">
              Plan trips
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600">
                together,
              </span>
              <br />
              without the
              <br />
              chaos.
            </h1>

            <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-10 max-w-md">
              Invite your crew, vote on destinations, split every expense, and arrive knowing exactly who owes who — zero awkward conversations.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/login">
                <Button
                  size="lg"
                  className="premium-gradient text-white font-black rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-200 h-12 px-8 text-sm"
                >
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-bold rounded-2xl h-12 px-8 text-sm border-slate-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          {/* Right: mock card */}
          <div className="flex justify-center lg:justify-end">
            <HeroMockCard />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Users,
    title: 'Plan as a team',
    description: 'Invite everyone, vote on destinations, and keep the whole crew on the same page.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    icon: Receipt,
    title: 'Track every expense',
    description: 'Log costs as you go — flights, hotels, dinners, taxis. Nothing slips through the cracks.',
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    icon: ArrowRightLeft,
    title: 'Automatic settlement',
    description: 'When the trip ends, TripSync does the math: who owes who and exactly how much.',
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
  },
  {
    icon: Map,
    title: 'Itinerary builder',
    description: 'Build a day-by-day plan everyone can see and contribute to.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  {
    icon: Hotel,
    title: 'Accommodations',
    description: 'Save hotel links, check-in times, and addresses all in one place.',
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
  },
  {
    icon: CheckSquare,
    title: 'Packing lists',
    description: 'Shared checklists so the group never forgets passports, adapters, or sunscreen.',
    color: 'from-teal-500 to-cyan-500',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
  },
]

function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-3">Everything you need</p>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
            One app. Every part of the trip.
          </h2>
          <p className="text-muted-foreground font-medium max-w-md mx-auto">
            From first idea to final expense settlement — TripSync handles it all.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="glass border-white/40 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-black text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Settlement callout ────────────────────────────────────────────────────────

function SettlementCallout() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-violet-600 p-px shadow-2xl shadow-primary/30">
          <div className="relative rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-primary/95 via-blue-600/95 to-violet-600/95 p-10 lg:p-14">
            {/* Background noise/texture */}
            <div className="absolute inset-0 rounded-[calc(1.5rem-1px)] opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: copy */}
              <div>
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 mb-6">
                  <ArrowRightLeft className="h-3 w-3 text-white" />
                  <span className="text-xs font-black text-white">Expense settlement</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-4">
                  No more chasing people for money.
                </h2>
                <p className="text-blue-100 font-medium leading-relaxed">
                  As your crew logs expenses throughout the trip, TripSync tracks the running total. When you're home, it calculates the simplest way for everyone to settle up — no spreadsheets, no awkward group chats.
                </p>
              </div>

              {/* Right: mock settlement card */}
              <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6">
                <p className="text-xs font-black text-blue-100 uppercase tracking-widest mb-5">
                  Barcelona Trip — Final Settlement
                </p>
                <div className="space-y-3">
                  {[
                    { from: 'Alex', to: 'Jordan', amount: '$42.00', settled: false },
                    { from: 'Sam', to: 'Alex', amount: '$18.50', settled: true },
                    { from: 'Jordan', to: 'Sam', amount: '$5.00', settled: false },
                    { from: 'Maya', to: 'Jordan', amount: '$63.25', settled: false },
                  ].map(({ from, to, amount, settled }) => (
                    <div key={from + to} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{from}</span>
                        <ArrowRight className="h-3 w-3 text-blue-300" />
                        <span className="text-sm font-black text-white">{to}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{amount}</span>
                        {settled && (
                          <span className="text-[10px] font-black bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full">
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-200/70 font-medium mt-4 text-center">
                  TripSync minimises the number of transfers needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Create a trip',
    description: 'Set a name, pick some dates, and you\'re off. Takes 30 seconds.',
  },
  {
    number: '02',
    title: 'Invite your crew',
    description: 'Share a link. Everyone joins, adds their preferences, and votes on plans.',
  },
  {
    number: '03',
    title: 'Log expenses as you go',
    description: 'Anyone can log costs on the fly. The group sees the running total in real time.',
  },
  {
    number: '04',
    title: 'Settle up at the end',
    description: 'TripSync calculates who owes who. One clear, fair breakdown — no maths required.',
  },
]

function HowItWorks() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-3">Simple by design</p>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ number, title, description }, i) => (
            <div key={number} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px border-t-2 border-dashed border-primary/20 z-0" />
              )}

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                  <span className="text-sm font-black text-white">{number}</span>
                </div>
                <h3 className="font-black text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── App preview mockup ───────────────────────────────────────────────────────

function AppPreview() {
  const mockTrips = [
    { name: 'Barcelona & Lisbon', dates: 'Jul 12 – 22', crew: 5, budget: '$3,240', status: 'Planning', color: 'from-blue-500 to-violet-500' },
    { name: 'Tokyo Adventure', dates: 'Sep 3 – 14', crew: 3, budget: '$4,100', status: 'Confirmed', color: 'from-rose-500 to-orange-500' },
    { name: 'Iceland Road Trip', dates: 'Dec 26 – Jan 2', crew: 4, budget: '$2,800', status: 'Planning', color: 'from-teal-500 to-cyan-500' },
  ]

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-3">See it in action</p>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
            Your trips, at a glance
          </h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto">
            Everything in one dashboard — past, present, and future adventures.
          </p>
        </div>

        {/* Mock browser chrome */}
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/15 border border-slate-200/60">
          {/* Browser bar */}
          <div className="bg-slate-100 px-5 py-3 flex items-center gap-3 border-b border-slate-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-slate-400 font-medium border border-slate-200 max-w-xs mx-auto text-center">
              tripsync.app/trips
            </div>
          </div>

          {/* App content */}
          <div className="bg-slate-50 p-6 lg:p-8">
            {/* Mock header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Welcome back, Alex</p>
                <h3 className="text-xl font-black text-slate-900">Your trips</h3>
              </div>
              <div className="w-28 h-9 rounded-xl premium-gradient flex items-center justify-center">
                <span className="text-xs font-black text-white">+ New trip</span>
              </div>
            </div>

            {/* Mock trip cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mockTrips.map(({ name, dates, crew, budget, status, color }) => (
                <div key={name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className={`h-20 rounded-xl bg-gradient-to-br ${color} mb-4 flex items-end p-3`}>
                    <span className="text-[10px] font-black text-white/80 bg-black/20 rounded-full px-2 py-0.5">{status}</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm mb-1 truncate">{name}</h4>
                  <p className="text-xs text-muted-foreground font-medium mb-3">{dates}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{crew} crew</span>
                    <span className="font-black text-primary">{budget}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function BottomCTA() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-6">
            Ready for your next
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600">
              adventure?
            </span>
          </h2>
          <p className="text-muted-foreground font-medium text-lg mb-10 max-w-sm mx-auto">
            Free to use. No credit card. Just great group trips.
          </p>
          <Link to="/login">
            <Button
              size="lg"
              className="premium-gradient text-white font-black rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-200 h-14 px-10 text-base"
            >
              Start planning — it's free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-slate-200/60 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg premium-gradient">
            <Plane className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-black text-slate-700">TripSync</span>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          © {new Date().getFullYear()} TripSync. Plan together, travel better.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary font-bold transition-colors">
            Sign in
          </Link>
          <Link to="/login" className="text-xs text-primary font-black hover:underline">
            Get started
          </Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Redirect authenticated users straight to their trips
  if (!authLoading && user) {
    return <Navigate to="/trips" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in">
      <Nav scrolled={scrolled} />
      <Hero />
      <Features />
      <SettlementCallout />
      <HowItWorks />
      <AppPreview />
      <BottomCTA />
      <Footer />
    </div>
  )
}
