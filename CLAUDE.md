# TripSync — Claude Code Context

## Project
React + Vite + TypeScript travel planning app. Users create group trips, vote on destinations/dates, manage itineraries, split expenses.

## Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Firebase (Auth, Firestore, Storage)
- **State:** Zustand
- **Forms:** react-hook-form + zod
- **UI:** shadcn/ui (Radix primitives in `src/components/ui/`)
- **Routing:** react-router-dom v7

## Branch
All work goes on `claude/setup-tripsync-project-9fSzN`

## Progress
### Done
- **Week 1 Day 1** — Full project scaffold: routing, AuthGuard, AppLayout, Zustand stores (auth + trip), Firebase config, shadcn/ui primitives (Button, Card, Input, Label)
- **Week 1 Day 2** — Auth: `src/services/auth.ts` (Google + email/password + Firestore user upsert), `LoginPage` (tabbed sign-in/sign-up + Google OAuth), `AppLayout` nav bar with user avatar dropdown + sign out. New UI primitives: Avatar, DropdownMenu, Tabs

### Up Next (Week 1 Day 3)
- `TripsListPage` — fetch trips from Firestore, render trip cards, "New Trip" button/modal

## Key Files
- `src/services/auth.ts` — Firebase auth helpers
- `src/stores/authStore.ts` — Zustand auth state
- `src/stores/tripStore.ts` — Zustand trip state
- `src/types/index.ts` — all shared TypeScript types
- `src/config/firebase.ts` — Firebase init (reads from `.env.local`)

## Conventions
- Path alias `@/` maps to `src/`
- New UI primitives go in `src/components/ui/`
- Page-level services go in `src/services/`
- Commit messages follow: `feat: Week X Day Y — description`
