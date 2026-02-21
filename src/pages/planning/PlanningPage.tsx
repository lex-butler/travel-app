import { useParams } from 'react-router-dom'

export default function PlanningPage() {
  const { tripId } = useParams<{ tripId: string }>()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Trip Planning</h1>
      <p className="mt-2 text-muted-foreground">Planning board for trip: {tripId}</p>
      {/* Itinerary builder coming in Week 2 */}
    </div>
  )
}
