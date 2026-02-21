import { useParams } from 'react-router-dom'

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Trip Details</h1>
      <p className="mt-2 text-muted-foreground">Trip ID: {tripId}</p>
      {/* Trip detail UI coming in Week 2 */}
    </div>
  )
}
