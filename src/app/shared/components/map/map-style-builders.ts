import { FeatureLike } from 'ol/Feature';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import { MapAssignmentStatus, MapStopKind } from './map.models';
import { MapThemeTokens } from './map-theme-tokens';

interface MarkerStyleContext {
  markerScale: number;
  currentPulseValue: number;
  tokens: MapThemeTokens;
  isAvailabilityAssignmentId: (assignmentId: string | number | undefined) => boolean;
}

function pulseColor(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

export function createMarkerStyle(feature: FeatureLike, ctx: MarkerStyleContext): Style | Style[] {
  const stopKind = feature.get('stopKind') as MapStopKind | undefined;
  const markerLabel = feature.get('markerLabel') as string | undefined;
  const assignment = feature.get('assignment') as { id?: string | number } | undefined;
  const assignmentStatus = feature.get('assignmentStatus') as MapAssignmentStatus | undefined;
  const isFocusedAssignment = feature.get('isFocusedAssignment') === true;

  if (stopKind === 'start') {
    return new Style({
      image: new Icon({
        src: '/icons/home-pin.svg',
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        scale: 0.9 * ctx.markerScale,
      }),
      zIndex: 25,
    });
  }

  const isAvailabilityStop =
    stopKind === 'assignment' && ctx.isAvailabilityAssignmentId(assignment?.id);

  const radius = (stopKind === 'assignment' ? 16 : 13) * ctx.markerScale + (isFocusedAssignment ? 2 : 0);
  const fontSize = Math.max(10, Math.round(12 * ctx.markerScale));
  const isAssignment = stopKind === 'assignment';

  const palette = isAvailabilityStop
    ? ctx.tokens.availabilityPalette
    : stopKind === 'end'
      ? ctx.tokens.endPalette
      : isAssignment && assignmentStatus
        ? ctx.tokens.assignmentPalettes[assignmentStatus]
        : ctx.tokens.fallbackPalette;

  const styles: Style[] = [];

  if (isFocusedAssignment) {
    styles.push(
      new Style({
        image: new CircleStyle({
          radius: radius + 8,
          fill: new Fill({ color: palette.halo }),
          stroke: new Stroke({
            color: ctx.tokens.focusedHaloStroke,
            width: 2,
          }),
        }),
        zIndex: 31,
      }),
    );
  }

  if (assignmentStatus === 'ongoing') {
    const pulseRadius = radius + 6 + ctx.currentPulseValue * 10;
    const pulseOpacity = Math.max(0.08, 0.28 - ctx.currentPulseValue * 0.2);
    styles.push(
      new Style({
        image: new CircleStyle({
          radius: pulseRadius,
          fill: new Fill({ color: pulseColor(ctx.tokens.ongoingPulseRgb, pulseOpacity) }),
          stroke: new Stroke({
            color: pulseColor(ctx.tokens.ongoingPulseRgb, Math.max(0.16, pulseOpacity)),
            width: 2,
          }),
        }),
        zIndex: 30,
      }),
    );
  }

  styles.push(
    new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({ color: palette.fill }),
        stroke: new Stroke({
          color: palette.stroke,
          width: isFocusedAssignment ? 4 : 3,
        }),
      }),
      text: new Text({
        text: markerLabel ?? '',
        fill: new Fill({ color: palette.text }),
        font: `700 ${fontSize}px sans-serif`,
        textAlign: 'center',
        textBaseline: 'middle',
      }),
      zIndex: isFocusedAssignment ? 32 : stopKind === 'assignment' ? 20 : 25,
    }),
  );

  return styles;
}

export function createRouteStyle(feature: FeatureLike, tokens: MapThemeTokens): Style | Style[] {
  const isActive = feature.get('active') === true;

  if (isActive) {
    return [
      new Style({
        stroke: new Stroke({
          color: tokens.routeActiveOuter,
          width: 16,
          lineCap: 'round',
          lineJoin: 'round',
        }),
        zIndex: 14,
      }),
      new Style({
        stroke: new Stroke({
          color: tokens.routeActiveMiddle,
          width: 10,
          lineCap: 'round',
          lineJoin: 'round',
        }),
        zIndex: 15,
      }),
      new Style({
        stroke: new Stroke({
          color: tokens.routeActiveCore,
          width: 6,
          lineCap: 'round',
          lineJoin: 'round',
        }),
        zIndex: 16,
      }),
    ];
  }

  return new Style({
    stroke: new Stroke({
      color: tokens.routeInactive,
      width: 4,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    zIndex: 10,
  });
}

export function createUserLocationStyle(feature: FeatureLike, tokens: MapThemeTokens): Style | Style[] {
  const userLocationKind = feature.get('userLocationKind') as 'accuracy' | 'position' | undefined;

  if (userLocationKind === 'accuracy') {
    return new Style({
      fill: new Fill({ color: tokens.userAccuracyFill }),
      stroke: new Stroke({
        color: tokens.userAccuracyStroke,
        width: 2,
      }),
      zIndex: 22,
    });
  }

  const estimated = feature.get('estimated') === true;

  return [
    new Style({
      image: new CircleStyle({
        radius: estimated ? 14 : 16,
        fill: new Fill({
          color: estimated ? tokens.userPositionEstimatedOuterFill : tokens.userPositionOuterFill,
        }),
        stroke: new Stroke({
          color: estimated
            ? tokens.userPositionEstimatedOuterStroke
            : tokens.userPositionOuterStroke,
          width: 2,
          lineDash: estimated ? [6, 6] : undefined,
        }),
      }),
      zIndex: 33,
    }),
    new Style({
      image: new CircleStyle({
        radius: estimated ? 6 : 7,
        fill: new Fill({ color: estimated ? tokens.userPositionEstimatedInnerFill : tokens.userPositionInnerFill }),
        stroke: new Stroke({
          color: tokens.userPositionInnerStroke,
          width: 3,
        }),
      }),
      zIndex: 34,
    }),
  ];
}

export function getMarkerScale(map: { getView: () => { getZoom: () => number | undefined } } | undefined, compact: boolean): number {
  const zoom = map?.getView().getZoom() ?? (compact ? 13 : 12);

  if (zoom >= 13) {
    return 1;
  }

  if (zoom >= 11) {
    return 0.85;
  }

  if (zoom >= 9) {
    return 0.72;
  }

  return 0.62;
}
