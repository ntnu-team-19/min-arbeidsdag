import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import Feature, { FeatureLike } from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import CircleGeometry from 'ol/geom/Circle';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import type { Pixel } from 'ol/pixel';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import {
  boundingExtent,
  createEmpty,
  extend as extendExtent,
  isEmpty as isEmptyExtent,
} from 'ol/extent';
import { ThemeService } from '../../../core/services/theme.service';
import {
  Assignment,
  MapRouteSegment,
  MapStop,
  MapStopKind,
  MapAssignmentStatus,
  MapLocation,
} from './map.models';
import {
  GeolocationPositionUpdate,
  GeolocationService,
} from '../../../core/services/geolocation.service';

export type { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';

interface FocusAssignmentOptions {
  zoom?: number;
  duration?: number;
  targetXRatio?: number;
  targetYRatio?: number;
}

interface FocusAssignmentLegOptions extends FocusAssignmentOptions {
  fromStop?: MapStop;
  toStop?: MapStop;
  routeSegment?: MapRouteSegment;
}

interface AssignmentMarkerPalette {
  fill: string;
  text: string;
  halo: string;
  stroke: string;
}

type ThemeMapBaseLayer = 'grayscale' | 'dark';

@Component({
  selector: 'app-assignment-map',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class AssignmentMap implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapElement') private mapElementRef?: ElementRef<HTMLDivElement>;

  @Input() assignments: Assignment[] = [];
  @Input() stops: MapStop[] = [];
  @Input() routeSegments: MapRouteSegment[] = [];
  @Input() activeSegmentId: string | null = null;
  @Input() compact = false;
  @Input() focusedAssignmentId: string | null = null;
  @Input() enableUserTracking = false;
  @Input() enableCompletedFilter = false;
  @Input() showCompletedAssignments = true;
  @Input() overviewBottomInsetRatio = 0;
  @Input() fallbackUserLocation: MapLocation | null = null;
  @Output() markerClicked = new EventEmitter<Assignment>();
  @Output() completedAssignmentsToggle = new EventEmitter<void>();

  mapLoaded = false;
  mapError = false;
  followUserMode = false;
  controlsMenuOpen = false;

  private map?: OlMap;
  private readonly markerSource = new VectorSource();
  private readonly routeSource = new VectorSource();
  private readonly userLocationSource = new VectorSource();
  private readonly markerLayer = new VectorLayer({
    source: this.markerSource,
    style: (feature) => this.getMarkerStyle(feature),
  });
  private readonly routeLayer = new VectorLayer({
    source: this.routeSource,
    style: (feature) => this.getRouteStyle(feature),
  });
  private readonly userLocationLayer = new VectorLayer({
    source: this.userLocationSource,
    style: (feature) => this.getUserLocationStyle(feature),
  });

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly themeService = inject(ThemeService);
  private readonly geolocationService = inject(GeolocationService);
  private tileLayer?: TileLayer<OSM | XYZ>;
  private currentTheme: 'light' | 'dark' = 'light';
  private activeBaseLayer: ThemeMapBaseLayer = 'grayscale';
  private themeCheckInterval?: ReturnType<typeof setInterval>;
  private pulseInterval?: ReturnType<typeof setInterval>;
  private viewChangeListener?: () => void;
  private currentPulseValue = 0;
  private geolocationSubscription?: Subscription;
  private userLocation: MapLocation | null = null;
  private userLocationAccuracy: number | null = null;
  private userTrackingMode: 'idle' | 'locating' | 'live' | 'fallback' | 'unavailable' | 'denied' =
    'idle';
  private suppressFollowDisable = false;
  private suppressFollowDisableTimeoutId?: ReturnType<typeof setTimeout>;
  private wheelListener?: EventListener;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['enableUserTracking'] ||
      changes['fallbackUserLocation'] ||
      changes['focusedAssignmentId']
    ) {
      this.syncUserTracking();
    }

    this.updateMapFeatures();
    this.updateUserLocationFeatures();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      try {
        const mapElement = this.mapElementRef?.nativeElement;

        if (!mapElement) {
          throw new Error('Map container element not found');
        }

        if (typeof ResizeObserver === 'undefined') {
          this.mapLoaded = false;
          this.mapError = false;
          this.updateMapFeatures();
          this.updateUserLocationFeatures();
          this.syncUserTracking();
          this.cdr.detectChanges();
          return;
        }

        this.currentTheme = this.themeService.isDark() ? 'dark' : 'light';
        this.syncBaseLayerToTheme();

        this.tileLayer = new TileLayer({
          source: this.createTileSource(this.activeBaseLayer),
        });

        this.map = new OlMap({
          target: mapElement,
          layers: [this.tileLayer, this.routeLayer, this.markerLayer, this.userLocationLayer],
          view: new View({
            center: fromLonLat([10.3951, 63.4305]),
            zoom: this.compact ? 13 : 12,
          }),
        });

        this.map.on('click', this.onMapClick);
        this.map.on('pointermove', this.onPointerMove);
        this.map.on('movestart', this.onMoveStart);
        this.map.on('pointerdrag', this.onPointerDrag);
        this.attachWheelListener();
        this.attachViewChangeListener();
        this.updateMapFeatures();
        this.updateUserLocationFeatures();
        this.syncUserTracking();
        this.startPulseAnimation();

        this.mapLoaded = true;
        this.mapError = false;
        this.cdr.detectChanges();
        this.setupThemeListener();
      } catch (error) {
        console.error('[Map] Failed to initialize map:', error);
        this.mapLoaded = false;
        this.mapError = true;
        this.cdr.detectChanges();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.themeCheckInterval) {
      clearInterval(this.themeCheckInterval);
    }

    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
    }

    if (this.suppressFollowDisableTimeoutId) {
      clearTimeout(this.suppressFollowDisableTimeoutId);
    }

    this.stopUserTracking();

    if (this.map) {
      const view = this.map.getView();
      if (this.viewChangeListener) {
        view.un('change:resolution', this.viewChangeListener);
      }

      this.map.un('click', this.onMapClick);
      this.map.un('pointermove', this.onPointerMove);
      this.map.un('movestart', this.onMoveStart);
      this.map.un('pointerdrag', this.onPointerDrag);

      const viewport =
        typeof this.map.getViewport === 'function' ? this.map.getViewport() : undefined;
      if (this.wheelListener && viewport) {
        viewport.removeEventListener('wheel', this.wheelListener);
      }

      this.map.setTarget(undefined);
      this.map = undefined;
    }
  }

  get userTrackingStatusKey(): string | null {
    switch (this.userTrackingMode) {
      case 'locating':
        return 'map.locatingUser';
      case 'fallback':
        return null;
      case 'denied':
        return 'map.locationPermissionDenied';
      case 'unavailable':
        return 'map.locationUnavailable';
      case 'live':
      case 'idle':
      default:
        return null;
    }
  }

  get followButtonLabelKey(): string {
    return this.followUserMode ? 'map.stopFollowingUser' : 'map.followUser';
  }

  get followButtonDisabled(): boolean {
    return this.userTrackingMode !== 'live' || !this.hasValidLocation(this.userLocation);
  }

  get shouldShowControlsMenu(): boolean {
    return this.enableCompletedFilter;
  }

  get shouldShowFollowQuickAction(): boolean {
    return this.enableUserTracking;
  }

  get completedAssignmentsLabelKey(): string {
    return this.showCompletedAssignments
      ? 'map.hideCompletedAssignments'
      : 'map.showCompletedAssignments';
  }

  focusAssignment(assignment: Assignment, options: FocusAssignmentOptions = {}): void {
    if (!this.map || !this.hasValidCoordinates(assignment)) {
      return;
    }

    this.disableFollowUserMode();

    const location = assignment.location;
    const size = this.map.getSize();
    if (!size) {
      return;
    }

    const view = this.map.getView();
    const currentCenter = view.getCenter();
    const currentZoom = view.getZoom();
    const nextZoom = Math.max(currentZoom ?? 0, options.zoom ?? (this.compact ? 14 : 16));

    if (!currentCenter || currentZoom == null) {
      return;
    }

    const targetXRatio = this.clamp(options.targetXRatio ?? 0.5, 0, 1);
    const targetYRatio = this.clamp(options.targetYRatio ?? 0.5, 0, 1);
    const coordinate = fromLonLat([location.lon, location.lat]);

    view.setZoom(nextZoom);
    view.centerOn(coordinate, size, [size[0] * targetXRatio, size[1] * targetYRatio]);
    const targetCenter = view.getCenter();
    view.setCenter(currentCenter);
    view.setZoom(currentZoom);

    if (!targetCenter) {
      return;
    }

    this.withSuppressedFollowDisable(options.duration ?? 350, () => {
      view.animate({
        center: targetCenter,
        zoom: nextZoom,
        duration: options.duration ?? 350,
      });
    });
  }

  focusAssignmentLeg(options: FocusAssignmentLegOptions = {}): void {
    const toStop = options.toStop;
    const fromStop = options.fromStop;

    if (!toStop || !this.hasValidCoordinates(toStop)) {
      return;
    }

    this.disableFollowUserMode();

    if (!this.map || !fromStop || !this.hasValidCoordinates(fromStop)) {
      this.focusAssignment(this.mapStopToAssignment(toStop), options);
      return;
    }

    if (options.routeSegment && options.routeSegment.coordinates.length >= 2) {
      this.fitCoordinates(options.routeSegment.coordinates, options);
      return;
    }

    this.fitCoordinates(
      [
        [fromStop.location.lon, fromStop.location.lat],
        [toStop.location.lon, toStop.location.lat],
      ],
      options,
    );
  }

  toggleFollowUserMode(): void {
    if (this.followUserMode) {
      this.disableFollowUserMode();
      return;
    }

    if (this.followButtonDisabled) {
      return;
    }

    this.followUserMode = true;
    this.centerOnUser(300);
    this.cdr.detectChanges();
  }

  toggleControlsMenu(): void {
    this.controlsMenuOpen = !this.controlsMenuOpen;
  }

  onCompletedAssignmentsToggle(): void {
    this.completedAssignmentsToggle.emit();
  }

  private startPulseAnimation(): void {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
    }

    this.pulseInterval = setInterval(() => {
      this.currentPulseValue = (this.currentPulseValue + 0.12) % 1;
      this.markerLayer.changed();
    }, 120);
  }

  private setupThemeListener(): void {
    const checkTheme = () => {
      const isDark = this.themeService.isDark();
      const newTheme = isDark ? 'dark' : 'light';

      if (newTheme === this.currentTheme) {
        return;
      }

      this.currentTheme = newTheme;
      this.syncBaseLayerToTheme();
      this.cdr.detectChanges();
    };

    this.themeCheckInterval = setInterval(() => {
      if (!this.mapLoaded) {
        if (this.themeCheckInterval) {
          clearInterval(this.themeCheckInterval);
        }
        return;
      }
      checkTheme();
    }, 500);
  }

  private attachWheelListener(): void {
    if (!this.map) {
      return;
    }

    this.wheelListener = () => {
      this.handleManualMapInteraction();
    };
    this.map.getViewport().addEventListener('wheel', this.wheelListener, { passive: true });
  }

  private attachViewChangeListener(): void {
    if (!this.map) {
      return;
    }

    const view = this.map.getView();
    this.viewChangeListener = () => {
      this.markerLayer.changed();
      this.userLocationLayer.changed();
    };
    view.on('change:resolution', this.viewChangeListener);
  }

  private readonly onMoveStart = () => {
    if (this.suppressFollowDisable) {
      return;
    }

    this.handleManualMapInteraction();
  };

  private readonly onPointerDrag = () => {
    this.handleManualMapInteraction();
  };

  private readonly onPointerMove = (event: unknown) => {
    if (!this.map || !this.isMapClickEvent(event)) {
      return;
    }

    const hasFeature = this.map.hasFeatureAtPixel(event.pixel, {
      layerFilter: (layer) => layer === this.markerLayer,
    });
    this.map.getTargetElement().style.cursor = hasFeature ? 'pointer' : '';
  };

  private readonly onMapClick = (event: unknown) => {
    if (!this.map || !this.isMapClickEvent(event)) {
      return;
    }

    this.map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const assignment = feature.get('assignment') as Assignment | undefined;
        if (!assignment) {
          return false;
        }

        this.markerClicked.emit(assignment);
        return true;
      },
      {
        layerFilter: (layer) => layer === this.markerLayer,
      },
    );
  };

  private handleManualMapInteraction(): void {
    if (!this.followUserMode || this.suppressFollowDisable) {
      return;
    }

    this.disableFollowUserMode();
  }

  private disableFollowUserMode(): void {
    if (!this.followUserMode) {
      return;
    }

    this.followUserMode = false;
    this.cdr.detectChanges();
  }

  private syncUserTracking(): void {
    if (!this.enableUserTracking) {
      this.stopUserTracking();
      this.followUserMode = false;
      this.userTrackingMode = 'idle';
      this.userLocation = null;
      this.userLocationAccuracy = null;
      this.updateUserLocationFeatures();
      return;
    }

    if (this.geolocationSubscription) {
      if (this.userTrackingMode !== 'live') {
        this.applyFallbackIfPossible();
      }
      return;
    }

    this.userTrackingMode = 'locating';
    this.updateUserLocationFeatures();
    this.cdr.detectChanges();

    this.geolocationSubscription = this.geolocationService
      .watchPosition({
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      })
      .subscribe((update) => this.handleGeolocationUpdate(update));
  }

  private stopUserTracking(): void {
    this.geolocationSubscription?.unsubscribe();
    this.geolocationSubscription = undefined;
  }

  private handleGeolocationUpdate(update: GeolocationPositionUpdate): void {
    if (update.kind === 'position') {
      this.userTrackingMode = 'live';
      this.userLocation = {
        lat: update.latitude,
        lon: update.longitude,
      };
      this.userLocationAccuracy =
        typeof update.accuracy === 'number' && Number.isFinite(update.accuracy)
          ? update.accuracy
          : null;
      this.updateUserLocationFeatures();

      if (this.followUserMode) {
        this.centerOnUser(300);
      }

      this.cdr.detectChanges();
      return;
    }

    if (!this.applyFallbackIfPossible()) {
      this.userLocation = null;
      this.userLocationAccuracy = null;
      this.userTrackingMode =
        update.kind === 'unsupported' || update.errorCode === 1 ? 'denied' : 'unavailable';
      this.followUserMode = false;
      this.updateUserLocationFeatures();
      this.cdr.detectChanges();
    }
  }

  private applyFallbackIfPossible(): boolean {
    if (!this.hasValidLocation(this.fallbackUserLocation)) {
      return false;
    }

    this.userTrackingMode = 'fallback';
    this.userLocationAccuracy = null;
    this.userLocation = this.fallbackUserLocation;
    this.followUserMode = false;
    this.updateUserLocationFeatures();
    this.cdr.detectChanges();
    return true;
  }

  private centerOnUser(duration = 300): void {
    if (!this.map || !this.hasValidLocation(this.userLocation)) {
      return;
    }

    const userLocation = this.userLocation;
    const view = this.map.getView();
    this.withSuppressedFollowDisable(duration, () => {
      view.animate({
        center: fromLonLat([userLocation.lon, userLocation.lat]),
        duration,
        zoom: Math.max(view.getZoom() ?? 0, this.compact ? 14 : 15),
      });
    });
  }

  private updateMapFeatures(): void {
    this.updateRouteSegments();
    this.updateMarkers();

    if (!this.followUserMode && !this.focusedAssignmentId) {
      this.fitToVisibleFeatures();
    }
  }

  private updateRouteSegments(): void {
    this.routeSource.clear(true);

    const features = this.routeSegments
      .filter((segment) => segment.coordinates.length >= 2)
      .map(
        (segment) =>
          new Feature({
            geometry: new LineString(
              segment.coordinates.map(([lon, lat]) => fromLonLat([lon, lat])),
            ),
            segmentId: segment.id,
            active: segment.id === this.activeSegmentId,
          }),
      );

    this.routeSource.addFeatures(features);
  }

  private updateMarkers(): void {
    this.markerSource.clear(true);

    const assignmentLookup = new globalThis.Map(
      this.assignments.map((assignment) => [String(assignment.id), assignment]),
    );

    const markerFeatures = this.getRenderableStops()
      .filter((stop): stop is MapStop & { location: { lat: number; lon: number } } =>
        this.hasValidCoordinates(stop),
      )
      .map((stop) => {
        const assignment =
          stop.kind === 'assignment'
            ? (assignmentLookup.get(stop.assignmentId ?? '') ?? this.mapStopToAssignment(stop))
            : undefined;

        return new Feature({
          geometry: new Point(fromLonLat([stop.location.lon, stop.location.lat])),
          stopKind: stop.kind,
          stopLabel: stop.label,
          markerLabel: this.getMarkerLabel(stop),
          assignment,
          assignmentId: assignment ? String(assignment.id) : null,
          assignmentStatus: assignment?.status ?? null,
          isFocusedAssignment:
            stop.kind === 'assignment' &&
            assignment != null &&
            String(assignment.id) === this.focusedAssignmentId,
        });
      });

    this.markerSource.addFeatures(markerFeatures);
  }

  private updateUserLocationFeatures(): void {
    this.userLocationSource.clear(true);

    if (!this.enableUserTracking || !this.hasValidLocation(this.userLocation)) {
      return;
    }

    const center = fromLonLat([this.userLocation.lon, this.userLocation.lat]);
    const features: Feature[] = [];

    if (this.userTrackingMode === 'live' && this.userLocationAccuracy) {
      features.push(
        new Feature({
          geometry: new CircleGeometry(center, Math.max(this.userLocationAccuracy, 12)),
          userLocationKind: 'accuracy',
        }),
      );
    }

    features.push(
      new Feature({
        geometry: new Point(center),
        userLocationKind: 'position',
        estimated: this.userTrackingMode === 'fallback',
      }),
    );

    this.userLocationSource.addFeatures(features);
  }

  private fitToVisibleFeatures(): void {
    if (!this.map) {
      return;
    }

    const size = this.map.getSize();
    if (!size) {
      return;
    }

    const extent = createEmpty();
    let hasFeatures = false;

    const markerExtent = this.markerSource.getExtent();
    if (markerExtent && !isEmptyExtent(markerExtent)) {
      extendExtent(extent, markerExtent);
      hasFeatures = true;
    }

    const routeExtent = this.routeSource.getExtent();
    if (routeExtent && !isEmptyExtent(routeExtent)) {
      extendExtent(extent, routeExtent);
      hasFeatures = true;
    }

    const userLocationExtent = this.userLocationSource.getExtent();
    if (userLocationExtent && !isEmptyExtent(userLocationExtent)) {
      extendExtent(extent, userLocationExtent);
      hasFeatures = true;
    }

    if (!hasFeatures) {
      return;
    }

    const basePadding = 40;
    const bottomInsetRatio = this.clamp(this.overviewBottomInsetRatio ?? 0, 0, 1);
    const bottomPadding = basePadding + size[1] * bottomInsetRatio;

    this.withSuppressedFollowDisable(200, () => {
      this.map!.getView().fit(extent, {
        padding: [basePadding, basePadding, bottomPadding, basePadding],
        maxZoom: this.compact ? 14 : 16,
        duration: 200,
      });
    });
  }

  private fitCoordinates(
    coordinates: [number, number][],
    options: FocusAssignmentOptions = {},
  ): void {
    if (!this.map || coordinates.length === 0) {
      return;
    }

    const size = this.map.getSize();
    if (!size) {
      return;
    }

    const projectedCoordinates = coordinates.map(([lon, lat]) => fromLonLat([lon, lat]));
    const extent = boundingExtent(projectedCoordinates);
    const targetYRatio = this.clamp(options.targetYRatio ?? 0.5, 0, 1);
    const basePadding = 40;
    const bottomPaddingAdjustment = Math.max(0, size[1] * (1 - 2 * targetYRatio));
    const duration = options.duration ?? 350;

    this.withSuppressedFollowDisable(duration, () => {
      this.map!.getView().fit(extent, {
        padding: [basePadding, basePadding, basePadding + bottomPaddingAdjustment, basePadding],
        maxZoom: options.zoom ?? (this.compact ? 14 : 16),
        duration,
      });
    });
  }

  private withSuppressedFollowDisable(duration: number, callback: () => void): void {
    this.suppressFollowDisable = true;

    if (this.suppressFollowDisableTimeoutId) {
      clearTimeout(this.suppressFollowDisableTimeoutId);
    }

    callback();

    this.suppressFollowDisableTimeoutId = setTimeout(() => {
      this.suppressFollowDisable = false;
      this.suppressFollowDisableTimeoutId = undefined;
    }, duration + 100);
  }

  private getRenderableStops(): MapStop[] {
    if (this.stops.length > 0) {
      return this.removeDuplicateTerminalStop(this.stops);
    }

    return this.assignments.map((assignment) => ({
      id: String(assignment.id),
      kind: 'assignment',
      label: assignment.name,
      assignmentId: String(assignment.id),
      location: assignment.location,
    }));
  }

  private removeDuplicateTerminalStop(stops: MapStop[]): MapStop[] {
    if (stops.length < 2) {
      return stops;
    }

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    if (
      firstStop?.kind === 'start' &&
      lastStop?.kind === 'end' &&
      this.haveSameCoordinates(firstStop, lastStop)
    ) {
      return stops.slice(0, -1);
    }

    return stops;
  }

  private getMarkerStyle(feature: FeatureLike): Style | Style[] {
    const stopKind = feature.get('stopKind') as MapStopKind | undefined;
    const markerLabel = feature.get('markerLabel') as string | undefined;
    const assignment = feature.get('assignment') as Assignment | undefined;
    const assignmentStatus = feature.get('assignmentStatus') as MapAssignmentStatus | undefined;
    const isFocusedAssignment = feature.get('isFocusedAssignment') === true;
    const markerScale = this.getMarkerScale();

    if (stopKind === 'start') {
      return new Style({
        image: new Icon({
          src: '/icons/home-pin.svg',
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: 0.9 * markerScale,
        }),
        zIndex: 25,
      });
    }

    const isAvailabilityStop =
      stopKind === 'assignment' && this.isAvailabilityAssignmentId(assignment?.id);

    const radius =
      (stopKind === 'assignment' ? 16 : 13) * markerScale + (isFocusedAssignment ? 2 : 0);
    const fontSize = Math.max(10, Math.round(12 * markerScale));
    const isAssignment = stopKind === 'assignment';

    const palette = isAvailabilityStop
      ? {
          fill: '#C7A27B',
          text: '#4A2F1B',
          halo: 'rgba(199, 162, 123, 0.22)',
          stroke: '#F4E6D8',
        }
      : isAssignment && assignmentStatus
        ? this.getAssignmentMarkerPalette(assignmentStatus)
        : {
            fill: stopKind === 'end' ? '#D65A4A' : '#1F4E79',
            text: '#FFFFFF',
            halo: 'rgba(31, 78, 121, 0.2)',
            stroke: '#FFFFFF',
          };

    const styles: Style[] = [];

    if (isFocusedAssignment) {
      styles.push(
        new Style({
          image: new CircleStyle({
            radius: radius + 8,
            fill: new Fill({ color: palette.halo }),
            stroke: new Stroke({
              color: 'rgba(255, 255, 255, 0.88)',
              width: 2,
            }),
          }),
          zIndex: 31,
        }),
      );
    }

    if (assignmentStatus === 'ongoing') {
      const pulseRadius = radius + 6 + this.currentPulseValue * 10;
      const pulseOpacity = Math.max(0.08, 0.28 - this.currentPulseValue * 0.2);
      styles.push(
        new Style({
          image: new CircleStyle({
            radius: pulseRadius,
            fill: new Fill({ color: `rgba(217, 164, 65, ${pulseOpacity})` }),
            stroke: new Stroke({
              color: `rgba(217, 164, 65, ${Math.max(0.16, pulseOpacity)})`,
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

  private getUserLocationStyle(feature: FeatureLike): Style | Style[] {
    const userLocationKind = feature.get('userLocationKind') as 'accuracy' | 'position' | undefined;

    if (userLocationKind === 'accuracy') {
      return new Style({
        fill: new Fill({ color: 'rgba(54, 132, 255, 0.12)' }),
        stroke: new Stroke({
          color: 'rgba(54, 132, 255, 0.28)',
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
            color: estimated ? 'rgba(54, 132, 255, 0.16)' : 'rgba(54, 132, 255, 0.2)',
          }),
          stroke: new Stroke({
            color: estimated ? 'rgba(54, 132, 255, 0.5)' : 'rgba(54, 132, 255, 0.38)',
            width: 2,
            lineDash: estimated ? [6, 6] : undefined,
          }),
        }),
        zIndex: 33,
      }),
      new Style({
        image: new CircleStyle({
          radius: estimated ? 6 : 7,
          fill: new Fill({ color: estimated ? '#7CB0FF' : '#3684FF' }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 3,
          }),
        }),
        zIndex: 34,
      }),
    ];
  }

  private getMarkerScale(): number {
    const zoom = this.map?.getView().getZoom() ?? (this.compact ? 13 : 12);

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

  private getAssignmentMarkerPalette(status: MapAssignmentStatus): AssignmentMarkerPalette {
    switch (status) {
      case 'ongoing':
        return {
          fill: '#D9A441',
          text: '#132238',
          halo: 'rgba(217, 164, 65, 0.22)',
          stroke: '#FFF7E6',
        };
      case 'next':
        return {
          fill: '#1F4E79',
          text: '#FFFFFF',
          halo: 'rgba(31, 78, 121, 0.2)',
          stroke: '#E7F0F8',
        };
      case 'upcoming':
        return {
          fill: '#547FA9',
          text: '#FFFFFF',
          halo: 'rgba(84, 127, 169, 0.2)',
          stroke: '#EEF4FA',
        };
      case 'completed':
      case 'confirmed':
        return {
          fill: '#54DA8C',
          text: '#12311F',
          halo: 'rgba(84, 218, 140, 0.2)',
          stroke: '#E8FFF1',
        };
      case 'cancelled':
        return {
          fill: '#DC8A8A',
          text: '#3F1616',
          halo: 'rgba(220, 138, 138, 0.2)',
          stroke: '#FFF0F0',
        };
      case 'unconfirmed':
      default:
        return {
          fill: '#FFD68A',
          text: '#1D1D1D',
          halo: 'rgba(255, 214, 138, 0.2)',
          stroke: '#FFF7E5',
        };
    }
  }

  private getRouteStyle(feature: FeatureLike): Style | Style[] {
    const isActive = feature.get('active') === true;

    if (isActive) {
      return [
        new Style({
          stroke: new Stroke({
            color: 'rgba(22, 92, 155, 0.2)',
            width: 16,
            lineCap: 'round',
            lineJoin: 'round',
          }),
          zIndex: 14,
        }),
        new Style({
          stroke: new Stroke({
            color: '#E4EEF7',
            width: 10,
            lineCap: 'round',
            lineJoin: 'round',
          }),
          zIndex: 15,
        }),
        new Style({
          stroke: new Stroke({
            color: '#1A5B95',
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
        color: 'rgba(123, 136, 150, 0.45)',
        width: 4,
        lineCap: 'round',
        lineJoin: 'round',
      }),
      zIndex: 10,
    });
  }

  private getMarkerLabel(stop: MapStop): string {
    if (stop.kind === 'start') {
      return 'S';
    }

    if (stop.kind === 'end') {
      return 'E';
    }

    return stop.sequenceNumber != null ? String(stop.sequenceNumber) : '';
  }

  private mapStopToAssignment(stop: MapStop): Assignment {
    return {
      id: stop.assignmentId ?? stop.id,
      name: stop.label,
      location: stop.location,
      description: stop.label,
    };
  }

  private syncBaseLayerToTheme(): void {
    const nextBaseLayer: ThemeMapBaseLayer = this.currentTheme === 'dark' ? 'dark' : 'grayscale';

    if (this.activeBaseLayer === nextBaseLayer) {
      return;
    }

    this.activeBaseLayer = nextBaseLayer;
    this.updateTileLayer();
  }

  private createTileSource(layer: ThemeMapBaseLayer): OSM | XYZ {
    if (layer === 'dark') {
      return new XYZ({
        url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        attributions: '© OpenStreetMap contributors, © CARTO',
        maxZoom: 20,
      });
    }

    return new XYZ({
      url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
      attributions: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 20,
    });
  }

  private updateTileLayer(): void {
    if (!this.tileLayer) {
      return;
    }

    this.tileLayer.setSource(this.createTileSource(this.activeBaseLayer));
  }

  private hasValidCoordinates(
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

  private hasValidLocation(location: MapLocation | null | undefined): location is {
    lat: number;
    lon: number;
  } {
    return this.hasValidCoordinates({ location });
  }

  private haveSameCoordinates(a: Assignment | MapStop, b: Assignment | MapStop): boolean {
    if (!this.hasValidCoordinates(a) || !this.hasValidCoordinates(b)) {
      return false;
    }

    return a.location.lat === b.location.lat && a.location.lon === b.location.lon;
  }

  private isMapClickEvent(event: unknown): event is {
    pixel: Pixel;
  } {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const pixel = (event as { pixel?: unknown }).pixel;
    return (
      Array.isArray(pixel) &&
      pixel.length === 2 &&
      typeof pixel[0] === 'number' &&
      typeof pixel[1] === 'number'
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private isAvailabilityAssignmentId(assignmentId: string | number | undefined): boolean {
    return typeof assignmentId === 'string' && assignmentId.startsWith('availability-');
  }
}
