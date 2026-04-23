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
import { FeatureLike } from 'ol/Feature';
import OlMap from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Style from 'ol/style/Style';
import { ThemeService } from '../../../core/services/theme.service';
import { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';
import {
  GeolocationPositionUpdate,
  GeolocationService,
} from '../../../core/services/geolocation.service';
import {
  FocusAssignmentLegOptions,
  FocusAssignmentOptions,
  clamp,
  fitCoordinates as fitCoordinatesHelper,
  fitToVisibleFeatures as fitToVisibleFeaturesHelper,
  focusAssignmentView,
  hasValidCoordinates,
  hasValidLocation,
  haveSameCoordinates,
} from './map-focus-fit';
import {
  buildMarkerFeatures,
  buildRouteFeatures,
  buildUserLocationFeatures,
  mapStopToAssignment,
} from './map-feature-updater';
import {
  createMarkerStyle,
  createRouteStyle,
  createUserLocationStyle,
  getMarkerScale,
} from './map-style-builders';
import {
  createAssignmentMap,
  createTileSource,
  isMapClickEvent,
  ThemeMapBaseLayer,
} from './map-ol-factory';
import { MapThemeTokens, resolveMapThemeTokens } from './map-theme-tokens';
import {
  applyFallbackTrackingState,
  applyLiveTrackingState,
  createIdleTrackingState,
  getStatusKey,
  resolveTrackingErrorMode,
  UserTrackingMode,
} from './map-tracking-state';

export type { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';

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
  @Input() enableOverviewAutoFit = true;
  @Input() fallbackUserLocation: MapLocation | null = null;
  @Output() markerClicked = new EventEmitter<Assignment>();
  @Output() mapBackgroundClicked = new EventEmitter<void>();
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
  private mapThemeTokens: MapThemeTokens = resolveMapThemeTokens();
  private geolocationSubscription?: Subscription;
  private userLocation: MapLocation | null = null;
  private userLocationAccuracy: number | null = null;
  private userTrackingMode: UserTrackingMode = 'idle';
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
        this.refreshThemeTokens();

        this.tileLayer = new TileLayer({
          source: this.createTileSource(this.activeBaseLayer),
        });

        this.map = createAssignmentMap({
          target: mapElement,
          compact: this.compact,
          tileLayer: this.tileLayer,
          routeLayer: this.routeLayer,
          markerLayer: this.markerLayer,
          userLocationLayer: this.userLocationLayer,
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
    return getStatusKey(this.userTrackingMode);
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
    if (!this.map || !hasValidCoordinates(assignment)) {
      return;
    }

    this.disableFollowUserMode();
    focusAssignmentView({
      map: this.map,
      assignment,
      compact: this.compact,
      options,
      withSuppressedFollowDisable: (duration, callback) => {
        this.withSuppressedFollowDisable(duration, callback);
      },
    });
  }

  focusAssignmentLeg(options: FocusAssignmentLegOptions = {}): void {
    const toStop = options.toStop;
    const fromStop = options.fromStop;

    if (!toStop || !hasValidCoordinates(toStop)) {
      return;
    }

    this.disableFollowUserMode();

    if (!this.map || !fromStop || !hasValidCoordinates(fromStop)) {
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
      this.refreshThemeTokens();
      this.routeLayer.changed();
      this.markerLayer.changed();
      this.userLocationLayer.changed();
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
    if (!this.map || !isMapClickEvent(event)) {
      return;
    }

    const hasFeature = this.map.hasFeatureAtPixel(event.pixel, {
      layerFilter: (layer) => layer === this.markerLayer,
    });
    this.map.getTargetElement().style.cursor = hasFeature ? 'pointer' : '';
  };

  private readonly onMapClick = (event: unknown) => {
    if (!this.map || !isMapClickEvent(event)) {
      return;
    }

    let hasClickedMarker = false;

    this.map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const assignment = feature.get('assignment') as Assignment | undefined;
        if (!assignment) {
          return false;
        }

        hasClickedMarker = true;
        this.markerClicked.emit(assignment);
        return true;
      },
      {
        layerFilter: (layer) => layer === this.markerLayer,
      },
    );

    if (!hasClickedMarker) {
      this.mapBackgroundClicked.emit();
    }
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
      const nextState = createIdleTrackingState();
      this.followUserMode = nextState.followUserMode;
      this.userTrackingMode = nextState.mode;
      this.userLocation = nextState.location;
      this.userLocationAccuracy = nextState.accuracy;
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
      const nextState = applyLiveTrackingState(update, this.followUserMode);
      this.userTrackingMode = nextState.mode;
      this.userLocation = nextState.location;
      this.userLocationAccuracy = nextState.accuracy;
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
      this.userTrackingMode = resolveTrackingErrorMode(update);
      this.followUserMode = false;
      this.updateUserLocationFeatures();
      this.cdr.detectChanges();
    }
  }

  private applyFallbackIfPossible(): boolean {
    if (!hasValidLocation(this.fallbackUserLocation)) {
      return false;
    }

    const nextState = applyFallbackTrackingState(this.fallbackUserLocation);
    this.userTrackingMode = nextState.mode;
    this.userLocationAccuracy = nextState.accuracy;
    this.userLocation = nextState.location;
    this.followUserMode = nextState.followUserMode;
    this.updateUserLocationFeatures();
    this.cdr.detectChanges();
    return true;
  }

  private centerOnUser(duration = 300): void {
    if (!this.map || !hasValidLocation(this.userLocation)) {
      return;
    }

    const userLocation = this.userLocation;
    const view = this.map.getView();
    const size = this.map.getSize();

    if (!size) {
      return;
    }

    const bottomInsetRatio = clamp(this.overviewBottomInsetRatio ?? 0, 0, 1);
    const targetYRatio = clamp((1 - bottomInsetRatio) / 2, 0, 1);
    const targetCoordinate = fromLonLat([userLocation.lon, userLocation.lat]);
    const currentCenter = view.getCenter();
    const currentZoom = view.getZoom();

    if (!currentCenter || currentZoom == null) {
      return;
    }

    this.withSuppressedFollowDisable(duration, () => {
      const nextZoom = Math.max(currentZoom, this.compact ? 14 : 15);
      view.setZoom(nextZoom);
      view.centerOn(targetCoordinate, size, [size[0] / 2, size[1] * targetYRatio]);
      const targetCenter = view.getCenter();

      if (!targetCenter) {
        return;
      }

      view.setCenter(currentCenter);
      view.setZoom(currentZoom);
      view.animate({
        center: targetCenter,
        duration,
        zoom: nextZoom,
      });
    });
  }

  private updateMapFeatures(): void {
    this.updateRouteSegments();
    this.updateMarkers();

    if (this.enableOverviewAutoFit && !this.followUserMode && !this.focusedAssignmentId) {
      this.fitToVisibleFeatures();
    }
  }

  private updateRouteSegments(): void {
    this.routeSource.clear(true);

    const features = buildRouteFeatures(this.routeSegments, this.activeSegmentId);
    this.routeSource.addFeatures(features);
  }

  private updateMarkers(): void {
    this.markerSource.clear(true);

    const markerFeatures = buildMarkerFeatures({
      assignments: this.assignments,
      stops: this.getRenderableStops(),
      focusedAssignmentId: this.focusedAssignmentId,
      hasValidCoordinates,
    });

    this.markerSource.addFeatures(markerFeatures);
  }

  private updateUserLocationFeatures(): void {
    this.userLocationSource.clear(true);

    const features = buildUserLocationFeatures({
      enableUserTracking: this.enableUserTracking,
      userLocation: this.userLocation,
      userLocationAccuracy: this.userLocationAccuracy,
      userTrackingMode: this.userTrackingMode,
      hasValidLocation,
    });
    this.userLocationSource.addFeatures(features);
  }

  private fitToVisibleFeatures(): void {
    if (!this.map || !this.enableOverviewAutoFit) {
      return;
    }

    fitToVisibleFeaturesHelper({
      map: this.map,
      markerExtent: this.markerSource.getExtent(),
      routeExtent: this.routeSource.getExtent(),
      userLocationExtent: this.userLocationSource.getExtent(),
      compact: this.compact,
      overviewBottomInsetRatio: this.overviewBottomInsetRatio,
      withSuppressedFollowDisable: (duration, callback) => {
        this.withSuppressedFollowDisable(duration, callback);
      },
    });
  }

  private fitCoordinates(
    coordinates: [number, number][],
    options: FocusAssignmentOptions = {},
  ): void {
    if (!this.map || coordinates.length === 0) {
      return;
    }

    fitCoordinatesHelper({
      map: this.map,
      coordinates,
      options,
      compact: this.compact,
      withSuppressedFollowDisable: (duration, callback) => {
        this.withSuppressedFollowDisable(duration, callback);
      },
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
      haveSameCoordinates(firstStop, lastStop)
    ) {
      return stops.slice(0, -1);
    }

    return stops;
  }

  private getMarkerStyle(feature: FeatureLike): Style | Style[] {
    return createMarkerStyle(feature, {
      markerScale: this.getMarkerScale(),
      currentPulseValue: this.currentPulseValue,
      tokens: this.mapThemeTokens,
      isAvailabilityAssignmentId: (assignmentId) => this.isAvailabilityAssignmentId(assignmentId),
    });
  }

  private getUserLocationStyle(feature: FeatureLike): Style | Style[] {
    return createUserLocationStyle(feature, this.mapThemeTokens);
  }

  private getMarkerScale(): number {
    return getMarkerScale(this.map, this.compact);
  }

  private getRouteStyle(feature: FeatureLike): Style | Style[] {
    return createRouteStyle(feature, this.mapThemeTokens);
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
    return mapStopToAssignment(stop);
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
    return createTileSource(layer);
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
    return hasValidCoordinates(item);
  }

  private hasValidLocation(location: MapLocation | null | undefined): location is {
    lat: number;
    lon: number;
  } {
    return hasValidLocation(location);
  }

  private haveSameCoordinates(a: Assignment | MapStop, b: Assignment | MapStop): boolean {
    return haveSameCoordinates(a, b);
  }

  private isMapClickEvent(event: unknown): event is {
    pixel: [number, number];
  } {
    return isMapClickEvent(event);
  }

  private clamp(value: number, min: number, max: number): number {
    return clamp(value, min, max);
  }

  private isAvailabilityAssignmentId(assignmentId: string | number | undefined): boolean {
    return typeof assignmentId === 'string' && assignmentId.startsWith('availability-');
  }

  private refreshThemeTokens(): void {
    this.mapThemeTokens = resolveMapThemeTokens(this.mapElementRef?.nativeElement);
  }
}
