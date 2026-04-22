import Feature from 'ol/Feature';
import CircleGeometry from 'ol/geom/Circle';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';

export function getMarkerLabel(stop: MapStop): string {
  if (stop.kind === 'start') {
    return 'S';
  }

  if (stop.kind === 'end') {
    return 'E';
  }

  return stop.sequenceNumber != null ? String(stop.sequenceNumber) : '';
}

export function mapStopToAssignment(stop: MapStop): Assignment {
  return {
    id: stop.assignmentId ?? stop.id,
    name: stop.label,
    location: stop.location,
    description: stop.label,
  };
}

export function removeDuplicateTerminalStop(stops: MapStop[]): MapStop[] {
  if (stops.length < 2) {
    return stops;
  }

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  if (
    firstStop?.kind === 'start' &&
    lastStop?.kind === 'end' &&
    firstStop.location &&
    lastStop.location &&
    firstStop.location.lat === lastStop.location.lat &&
    firstStop.location.lon === lastStop.location.lon
  ) {
    return stops.slice(0, -1);
  }

  return stops;
}

export function getRenderableStops(stops: MapStop[], assignments: Assignment[]): MapStop[] {
  if (stops.length > 0) {
    return removeDuplicateTerminalStop(stops);
  }

  return assignments.map((assignment) => ({
    id: String(assignment.id),
    kind: 'assignment',
    label: assignment.name,
    assignmentId: String(assignment.id),
    location: assignment.location,
  }));
}

export function buildRouteFeatures(
  routeSegments: MapRouteSegment[],
  activeSegmentId: string | null,
): Feature[] {
  return routeSegments
    .filter((segment) => segment.coordinates.length >= 2)
    .map(
      (segment) =>
        new Feature({
          geometry: new LineString(segment.coordinates.map(([lon, lat]) => fromLonLat([lon, lat]))),
          segmentId: segment.id,
          active: segment.id === activeSegmentId,
        }),
    );
}

export function buildMarkerFeatures(args: {
  assignments: Assignment[];
  stops: MapStop[];
  focusedAssignmentId: string | null;
  hasValidCoordinates: (item: { location?: MapLocation | null } | null | undefined) => boolean;
}): Feature[] {
  const assignmentLookup = new globalThis.Map(
    args.assignments.map((assignment) => [String(assignment.id), assignment]),
  );

  return getRenderableStops(args.stops, args.assignments)
    .filter((stop): stop is MapStop & { location: { lat: number; lon: number } } =>
      args.hasValidCoordinates(stop),
    )
    .map((stop) => {
      const assignment =
        stop.kind === 'assignment'
          ? (assignmentLookup.get(stop.assignmentId ?? '') ?? mapStopToAssignment(stop))
          : undefined;

      return new Feature({
        geometry: new Point(fromLonLat([stop.location.lon, stop.location.lat])),
        stopKind: stop.kind,
        stopLabel: stop.label,
        markerLabel: getMarkerLabel(stop),
        assignment,
        assignmentId: assignment ? String(assignment.id) : null,
        assignmentStatus: assignment?.status ?? null,
        isFocusedAssignment:
          stop.kind === 'assignment' &&
          assignment != null &&
          String(assignment.id) === args.focusedAssignmentId,
      });
    });
}

export function buildUserLocationFeatures(args: {
  enableUserTracking: boolean;
  userLocation: MapLocation | null;
  userLocationAccuracy: number | null;
  userTrackingMode: 'idle' | 'locating' | 'live' | 'fallback' | 'unavailable' | 'denied';
  hasValidLocation: (
    location: MapLocation | null | undefined,
  ) => location is { lat: number; lon: number };
}): Feature[] {
  if (!args.enableUserTracking || !args.hasValidLocation(args.userLocation)) {
    return [];
  }

  const userLocation = args.userLocation;
  const center = fromLonLat([userLocation.lon, userLocation.lat]);
  const features: Feature[] = [];

  if (args.userTrackingMode === 'live' && args.userLocationAccuracy) {
    features.push(
      new Feature({
        geometry: new CircleGeometry(center, Math.max(args.userLocationAccuracy, 12)),
        userLocationKind: 'accuracy',
      }),
    );
  }

  features.push(
    new Feature({
      geometry: new Point(center),
      userLocationKind: 'position',
      estimated: args.userTrackingMode === 'fallback',
    }),
  );

  return features;
}
