# Implementation Plan - Advanced Availability & Planning

Implement a comprehensive planning view to visualize availability overlaps and suggest optimal trip dates.

## User Requirements
- Keep the "Add Availability" feature for all crew members.
- Provide a detailed view for the planner (host) to see everyone's availability.
- Implement a way to see "common dates" (overlaps) across the group.
- Visualize individual availability for all members.

## Proposed Changes

### 1. New Page: `TripPlanningPage`
- **Location**: `src/pages/planning/PlanningPage.tsx` (Replace existing placeholder).
- **Features**:
  - **Availability Heatmap**: A visual calendar showing days with the most available members.
  - **Common Dates Suggestion**: A list of "Winning Windows" (ranges where most/all members can make it).
  - **Crew Roadmap**: Vertical list or grid of each member with their specific date ranges.
  - **Integrated Action**: Ability to vote on or select a "Winning Window" to lock in the trip dates.

### 2. Service Enhancements
- **Availability Analysis**: Utility functions to calculate overlaps and intersections between multiple `DateRange` arrays.

### 3. UI/UX Refinement
- Use the established "Glass" and "Premium Gradient" design system.
- Add micro-animations for data loading and state transitions.
- Ensure mobile-responsive behavior for the calendar views.

## Technical Details
- Use `date-fns` for complex date math.
- Integrate `TripNavigation` for seamless context switching.
- Real-time updates via Firestore subscriptions to `trip.availability`.

## Next Steps
1. Create `src/pages/planning/PlanningPage.tsx` with the new logic.
2. Update `TripDetailPage.tsx` to include "View Overlaps" CTA.
3. Add helper functions for date overlap calculation.
