import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/layout/AuthGuard'

// Lazy-load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const TripsListPage = lazy(() => import('@/pages/trips/TripsListPage'))
const TripDetailPage = lazy(() => import('@/pages/trips/TripDetailPage'))
const PlanningPage = lazy(() => import('@/pages/planning/PlanningPage'))
const InvitePage = lazy(() => import('@/pages/invite/InvitePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
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
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/trips" replace />} />
              <Route path="/trips" element={<TripsListPage />} />
              <Route path="/trips/:tripId" element={<TripDetailPage />} />
              <Route path="/trips/:tripId/planning" element={<PlanningPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
