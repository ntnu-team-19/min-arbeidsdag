import { MapAssignmentStatus } from './map.models';

export interface AssignmentMarkerPalette {
  fill: string;
  text: string;
  halo: string;
  stroke: string;
}

export interface MapThemeTokens {
  assignmentPalettes: Record<MapAssignmentStatus, AssignmentMarkerPalette>;
  availabilityPalette: AssignmentMarkerPalette;
  fallbackPalette: AssignmentMarkerPalette;
  endPalette: AssignmentMarkerPalette;
  focusedHaloStroke: string;
  ongoingPulseRgb: string;
  routeActiveOuter: string;
  routeActiveMiddle: string;
  routeActiveCore: string;
  routeInactive: string;
  userAccuracyFill: string;
  userAccuracyStroke: string;
  userPositionOuterFill: string;
  userPositionOuterStroke: string;
  userPositionEstimatedOuterFill: string;
  userPositionEstimatedOuterStroke: string;
  userPositionInnerFill: string;
  userPositionEstimatedInnerFill: string;
  userPositionInnerStroke: string;
}

const FALLBACK_VARS: Record<string, string> = {
  '--map-marker-ongoing-fill': '#D9A441',
  '--map-marker-ongoing-text': '#132238',
  '--map-marker-ongoing-halo': 'rgba(217, 164, 65, 0.22)',
  '--map-marker-ongoing-stroke': '#FFF7E6',
  '--map-marker-next-fill': '#1F4E79',
  '--map-marker-next-text': '#FFFFFF',
  '--map-marker-next-halo': 'rgba(31, 78, 121, 0.2)',
  '--map-marker-next-stroke': '#E7F0F8',
  '--map-marker-upcoming-fill': '#547FA9',
  '--map-marker-upcoming-text': '#FFFFFF',
  '--map-marker-upcoming-halo': 'rgba(84, 127, 169, 0.2)',
  '--map-marker-upcoming-stroke': '#EEF4FA',
  '--map-marker-completed-fill': '#54DA8C',
  '--map-marker-completed-text': '#12311F',
  '--map-marker-completed-halo': 'rgba(84, 218, 140, 0.2)',
  '--map-marker-completed-stroke': '#E8FFF1',
  '--map-marker-cancelled-fill': '#DC8A8A',
  '--map-marker-cancelled-text': '#3F1616',
  '--map-marker-cancelled-halo': 'rgba(220, 138, 138, 0.2)',
  '--map-marker-cancelled-stroke': '#FFF0F0',
  '--map-marker-unconfirmed-fill': '#FFD68A',
  '--map-marker-unconfirmed-text': '#1D1D1D',
  '--map-marker-unconfirmed-halo': 'rgba(255, 214, 138, 0.2)',
  '--map-marker-unconfirmed-stroke': '#FFF7E5',
  '--map-marker-availability-fill': '#C7A27B',
  '--map-marker-availability-text': '#4A2F1B',
  '--map-marker-availability-halo': 'rgba(199, 162, 123, 0.22)',
  '--map-marker-availability-stroke': '#F4E6D8',
  '--map-marker-fallback-fill': '#1F4E79',
  '--map-marker-fallback-text': '#FFFFFF',
  '--map-marker-fallback-halo': 'rgba(31, 78, 121, 0.2)',
  '--map-marker-fallback-stroke': '#FFFFFF',
  '--map-marker-end-fill': '#D65A4A',
  '--map-marker-end-text': '#FFFFFF',
  '--map-marker-end-halo': 'rgba(31, 78, 121, 0.2)',
  '--map-marker-end-stroke': '#FFFFFF',
  '--map-marker-focused-halo-stroke': 'rgba(255, 255, 255, 0.88)',
  '--map-marker-ongoing-pulse-rgb': '217, 164, 65',
  '--map-route-active-outer': 'rgba(22, 92, 155, 0.2)',
  '--map-route-active-middle': '#E4EEF7',
  '--map-route-active-core': '#1A5B95',
  '--map-route-inactive': 'rgba(123, 136, 150, 0.45)',
  '--map-user-accuracy-fill': 'rgba(54, 132, 255, 0.12)',
  '--map-user-accuracy-stroke': 'rgba(54, 132, 255, 0.28)',
  '--map-user-position-outer-fill': 'rgba(54, 132, 255, 0.2)',
  '--map-user-position-outer-stroke': 'rgba(54, 132, 255, 0.38)',
  '--map-user-position-estimated-outer-fill': 'rgba(54, 132, 255, 0.16)',
  '--map-user-position-estimated-outer-stroke': 'rgba(54, 132, 255, 0.5)',
  '--map-user-position-inner-fill': '#3684FF',
  '--map-user-position-estimated-inner-fill': '#7CB0FF',
  '--map-user-position-inner-stroke': '#FFFFFF',
};

function readVar(name: string, hostStyles?: CSSStyleDeclaration): string {
  const hostValue = hostStyles?.getPropertyValue(name).trim();
  if (hostValue) {
    return hostValue;
  }

  const rootValue = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (rootValue) {
    return rootValue;
  }

  return FALLBACK_VARS[name] ?? '';
}

function readPalette(prefix: string, hostStyles?: CSSStyleDeclaration): AssignmentMarkerPalette {
  return {
    fill: readVar(`--map-marker-${prefix}-fill`, hostStyles),
    text: readVar(`--map-marker-${prefix}-text`, hostStyles),
    halo: readVar(`--map-marker-${prefix}-halo`, hostStyles),
    stroke: readVar(`--map-marker-${prefix}-stroke`, hostStyles),
  };
}

export function resolveMapThemeTokens(hostElement?: HTMLElement | null): MapThemeTokens {
  const hostStyles = hostElement ? getComputedStyle(hostElement) : undefined;

  return {
    assignmentPalettes: {
      ongoing: readPalette('ongoing', hostStyles),
      next: readPalette('next', hostStyles),
      upcoming: readPalette('upcoming', hostStyles),
      completed: readPalette('completed', hostStyles),
      confirmed: readPalette('completed', hostStyles),
      cancelled: readPalette('cancelled', hostStyles),
      unconfirmed: readPalette('unconfirmed', hostStyles),
      absence: readPalette('cancelled', hostStyles),
    },
    availabilityPalette: readPalette('availability', hostStyles),
    fallbackPalette: readPalette('fallback', hostStyles),
    endPalette: readPalette('end', hostStyles),
    focusedHaloStroke: readVar('--map-marker-focused-halo-stroke', hostStyles),
    ongoingPulseRgb: readVar('--map-marker-ongoing-pulse-rgb', hostStyles),
    routeActiveOuter: readVar('--map-route-active-outer', hostStyles),
    routeActiveMiddle: readVar('--map-route-active-middle', hostStyles),
    routeActiveCore: readVar('--map-route-active-core', hostStyles),
    routeInactive: readVar('--map-route-inactive', hostStyles),
    userAccuracyFill: readVar('--map-user-accuracy-fill', hostStyles),
    userAccuracyStroke: readVar('--map-user-accuracy-stroke', hostStyles),
    userPositionOuterFill: readVar('--map-user-position-outer-fill', hostStyles),
    userPositionOuterStroke: readVar('--map-user-position-outer-stroke', hostStyles),
    userPositionEstimatedOuterFill: readVar('--map-user-position-estimated-outer-fill', hostStyles),
    userPositionEstimatedOuterStroke: readVar(
      '--map-user-position-estimated-outer-stroke',
      hostStyles,
    ),
    userPositionInnerFill: readVar('--map-user-position-inner-fill', hostStyles),
    userPositionEstimatedInnerFill: readVar('--map-user-position-estimated-inner-fill', hostStyles),
    userPositionInnerStroke: readVar('--map-user-position-inner-stroke', hostStyles),
  };
}
