import { GeolocationPositionUpdate } from '../../../core/services/geolocation.service';
import { MapLocation } from './map.models';

export type UserTrackingMode = 'idle' | 'locating' | 'live' | 'fallback' | 'unavailable' | 'denied';

export interface TrackingState {
  mode: UserTrackingMode;
  location: MapLocation | null;
  accuracy: number | null;
  followUserMode: boolean;
}

export function createIdleTrackingState(): TrackingState {
  return {
    mode: 'idle',
    location: null,
    accuracy: null,
    followUserMode: false,
  };
}

export function applyFallbackTrackingState(fallback: MapLocation): TrackingState {
  return {
    mode: 'fallback',
    location: fallback,
    accuracy: null,
    followUserMode: false,
  };
}

export function applyLiveTrackingState(
  update: GeolocationPositionUpdate,
  followUserMode: boolean,
): TrackingState {
  if (typeof update.latitude !== 'number' || typeof update.longitude !== 'number') {
    return {
      mode: 'unavailable',
      location: null,
      accuracy: null,
      followUserMode: false,
    };
  }

  return {
    mode: 'live',
    location: {
      lat: update.latitude,
      lon: update.longitude,
    },
    accuracy:
      typeof update.accuracy === 'number' && Number.isFinite(update.accuracy)
        ? update.accuracy
        : null,
    followUserMode,
  };
}

export function resolveTrackingErrorMode(
  update: Exclude<GeolocationPositionUpdate, { kind: 'position' }>,
): UserTrackingMode {
  return update.kind === 'unsupported' || update.errorCode === 1 ? 'denied' : 'unavailable';
}

export function getStatusKey(mode: UserTrackingMode): string | null {
  switch (mode) {
    case 'locating':
      return 'map.locatingUser';
    case 'denied':
      return 'map.locationPermissionDenied';
    case 'unavailable':
      return 'map.locationUnavailable';
    case 'fallback':
    case 'live':
    case 'idle':
    default:
      return null;
  }
}
