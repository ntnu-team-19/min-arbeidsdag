export interface MapLocation {
  lat?: number | null;
  lon?: number | null;
}

export type MapAssignmentStatus =
  | 'ongoing'
  | 'next'
  | 'upcoming'
  | 'completed'
  | 'cancelled'
  | 'confirmed'
  | 'unconfirmed'
  | 'absence';

export interface Assignment {
  id: string | number;
  name: string;
  location?: MapLocation | null;
  description?: string;
  status?: MapAssignmentStatus | null;
}

export type MapStopKind = 'start' | 'assignment' | 'end';

export interface MapStop {
  id: string;
  kind: MapStopKind;
  label: string;
  location?: MapLocation | null;
  assignmentId?: string;
  sequenceNumber?: number;
}

export type MapRouteCoordinate = [number, number];

export interface MapRouteSegment {
  id: string;
  fromStopId: string;
  toStopId: string;
  coordinates: MapRouteCoordinate[];
  durationMinutes?: number;
}

export function buildRouteSegmentId(fromStopId: string, toStopId: string): string {
  return `${fromStopId}__${toStopId}`;
}
