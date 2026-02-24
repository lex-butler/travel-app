import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/layout/AuthGuard'
import TripLayout from '@/components/layout/TripLayout'
import { handleGoogleRedirectResult } from '@/services/auth'

// Lazy-load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const TripsListPage = lazy(() => import('@/pages/trips/TripsListPage'))
const TripDetailPage = lazy(() => import('@/pages/trips/TripDetailPage'))
const NewTripPage = lazy(() => import('@/pages/trips/NewTripPage'))
const PlanningPage = lazy(() => import('@/pages/planning/PlanningPage'))
const TripDestinationsPage = lazy(() => import('@/pages/trips/TripDestinationsPage'))
const TripCrewPage = lazy(() => import('@/pages/trips/TripCrewPage'))
const TripSettingsPage = lazy(() => import('@/pages/trips/TripSettingsPage'))
const BudgetPage = lazy(() => import('@/pages/trips/BudgetPage'))
const AccommodationsPage = lazy(() => import('@/pages/trips/AccommodationsPage'))
const PackingListPage = lazy(() => import('@/pages/trips/PackingListPage'))
const InvitePage = lazy(() => import('@/pages/invite/InvitePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    // Handle Google redirect result (upserts user doc after OAuth redirect)
    handleGoogleRedirectResult().catch(console.error)

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        }
      >
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />

          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            {/* Full-screen pages (no nav) */}
            <Route path="/trips/new" element={<NewTripPage />} />

            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/trips" replace />} />
              <Route path="/trips" element={<TripsListPage />} />

              <Route element={<TripLayout />}>
                <Route path="/trips/:tripId" element={<TripDetailPage />} />
                <Route path="/trips/:tripId/destinations" element={<TripDestinationsPage />} />
                <Route path="/trips/:tripId/crew" element={<TripCrewPage />} />
                <Route path="/trips/:tripId/planning" element={<PlanningPage />} />
                <Route path="/trips/:tripId/budget" element={<BudgetPage />} />
                <Route path="/trips/:tripId/accommodations" element={<AccommodationsPage />} />
                <Route path="/trips/:tripId/packing" element={<PackingListPage />} />
                <Route path="/trips/:tripId/settings" element={<TripSettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
