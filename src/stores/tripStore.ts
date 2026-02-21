import { create } from 'zustand'
import type { Trip } from '@/types'

interface TripState {
  trips: Trip[]
  activeTrip: Trip | null
  setTrips: (trips: Trip[]) => void
  setActiveTrip: (trip: Trip | null) => void
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  activeTrip: null,
  setTrips: (trips) => set({ trips }),
  setActiveTrip: (activeTrip) => set({ activeTrip }),
}))
