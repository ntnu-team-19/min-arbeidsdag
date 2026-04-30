import { Assignment as MapAssignment, MapRouteSegment, MapStop } from '../../../shared/components/map/map';
import { Assignment } from '../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../core/models/daily-progress.model';
import { DashboardTravelState } from '../models/dashboard-travel-state.model';

export interface DashboardMapState {
  visibleCards: Assignment[];
  assignmentSequenceNumbers: Record<string, number>;
  mapAssignments: MapAssignment[];
  mapStops: MapStop[];
  allDayMapStops: MapStop[];
}

export interface DashboardRouteState {
  routeSegments: MapRouteSegment[];
  allRouteSegments: MapRouteSegment[];
  travelTimesByAssignmentId: Map<string, number>;
  travelState: DashboardTravelState;
  dailyProgress: DailyProgressSummary;
}

export interface DashboardSelectionContext {
  assignmentId: string;
  currentStop?: MapStop;
  previousStop?: MapStop;
  routeSegment?: MapRouteSegment;
  activeRouteSegmentId: string | null;
  focusedRouteSegment: MapRouteSegment | null;
}
