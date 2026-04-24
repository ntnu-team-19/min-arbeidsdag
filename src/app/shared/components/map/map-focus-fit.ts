import {
  boundingExtent,
  createEmpty,
  type Extent,
  extend as extendExtent,
  isEmpty as isEmptyExtent,
} from 'ol/extent';
import OlMap from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';

export interface FocusAssignmentOptions {
  zoom?: number;
  duration?: number;
  targetXRatio?: number;
  targetYRatio?: number;
}

export interface FocusAssignmentLegOptions extends FocusAssignmentOptions {
  fromStop?: MapStop;
  toStop?: MapStop;
  routeSegment?: MapRouteSegment;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function hasValidCoordinates(
  item: { location?: MapLocation | null } | null | undefined,
): item is { location: { lat: number; lon: number } } {
  const lat = item?.location?.lat;
  const lon = item?.location?.lon;

  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lon === 'number' &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  );
}

export function hasValidLocation(location: MapLocation | null | undefined): location is {
  lat: number;
  lon: number;
} {
  return hasValidCoordinates({ location });
}

export function haveSameCoordinates(a: Assignment | MapStop, b: Assignment | MapStop): boolean {
  if (!hasValidCoordinates(a) || !hasValidCoordinates(b)) {
    return false;
  }

  return a.location.lat === b.location.lat && a.location.lon === b.location.lon;
}

export function focusAssignmentView(args: {
  map: OlMap;
  assignment: Assignment;
  compact: boolean;
  options: FocusAssignmentOptions;
  withSuppressedFollowDisable: (duration: number, callback: () => void) => void;
}): void {
  if (!hasValidCoordinates(args.assignment)) {
    return;
  }

  const size = args.map.getSize();
  if (!size) {
    return;
  }

  const view = args.map.getView();
  const currentCenter = view.getCenter();
  const currentZoom = view.getZoom();
  const nextZoom = Math.max(currentZoom ?? 0, args.options.zoom ?? (args.compact ? 14 : 16));

  if (!currentCenter || currentZoom == null) {
    return;
  }

  const targetXRatio = clamp(args.options.targetXRatio ?? 0.5, 0, 1);
  const targetYRatio = clamp(args.options.targetYRatio ?? 0.5, 0, 1);
  const coordinate = fromLonLat([args.assignment.location.lon, args.assignment.location.lat]);

  view.setZoom(nextZoom);
  view.centerOn(coordinate, size, [size[0] * targetXRatio, size[1] * targetYRatio]);
  const targetCenter = view.getCenter();
  view.setCenter(currentCenter);
  view.setZoom(currentZoom);

  if (!targetCenter) {
    return;
  }

  const duration = args.options.duration ?? 350;
  args.withSuppressedFollowDisable(duration, () => {
    view.animate({
      center: targetCenter,
      zoom: nextZoom,
      duration,
    });
  });
}

export function fitCoordinates(args: {
  map: OlMap;
  coordinates: [number, number][];
  options: FocusAssignmentOptions;
  compact: boolean;
  withSuppressedFollowDisable: (duration: number, callback: () => void) => void;
}): void {
  if (args.coordinates.length === 0) {
    return;
  }

  const size = args.map.getSize();
  if (!size) {
    return;
  }

  const projectedCoordinates = args.coordinates.map(([lon, lat]) => fromLonLat([lon, lat]));
  const extent = boundingExtent(projectedCoordinates);
  const targetYRatio = clamp(args.options.targetYRatio ?? 0.5, 0, 1);
  const basePadding = 40;
  const bottomPaddingAdjustment = Math.max(0, size[1] * (1 - 2 * targetYRatio));
  const duration = args.options.duration ?? 350;

  args.withSuppressedFollowDisable(duration, () => {
    args.map.getView().fit(extent, {
      padding: [basePadding, basePadding, basePadding + bottomPaddingAdjustment, basePadding],
      maxZoom: args.options.zoom ?? (args.compact ? 14 : 16),
      duration,
    });
  });
}

export function fitToVisibleFeatures(args: {
  map: OlMap;
  markerExtent: Extent | null;
  routeExtent: Extent | null;
  userLocationExtent: Extent | null;
  compact: boolean;
  overviewBottomInsetRatio: number;
  withSuppressedFollowDisable: (duration: number, callback: () => void) => void;
}): void {
  const size = args.map.getSize();
  if (!size) {
    return;
  }

  const extent = createEmpty();
  let hasFeatures = false;

  if (args.markerExtent && !isEmptyExtent(args.markerExtent)) {
    extendExtent(extent, args.markerExtent);
    hasFeatures = true;
  }

  if (args.routeExtent && !isEmptyExtent(args.routeExtent)) {
    extendExtent(extent, args.routeExtent);
    hasFeatures = true;
  }

  if (args.userLocationExtent && !isEmptyExtent(args.userLocationExtent)) {
    extendExtent(extent, args.userLocationExtent);
    hasFeatures = true;
  }

  if (!hasFeatures) {
    return;
  }

  const basePadding = 40;
  const bottomInsetRatio = clamp(args.overviewBottomInsetRatio ?? 0, 0, 1);
  const bottomPadding = basePadding + size[1] * bottomInsetRatio;

  args.withSuppressedFollowDisable(200, () => {
    args.map.getView().fit(extent, {
      padding: [basePadding, basePadding, bottomPadding, basePadding],
      maxZoom: args.compact ? 14 : 16,
      duration: 200,
    });
  });
}
