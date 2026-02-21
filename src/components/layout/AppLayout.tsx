import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar — coming in Week 1, Day 2 */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <span className="font-bold text-lg">TripSync</span>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
