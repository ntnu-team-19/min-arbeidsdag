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
  effect,
  inject,
  untracked,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FeatureLike } from 'ol/Feature';
import OlMap from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Style from 'ol/style/Style';
import { AssignmentMapFacade } from './assignment-map-facade';
import { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';
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
import { createAssignmentMap, createTileSource, isMapClickEvent, ThemeMapBaseLayer } from './map-ol-factory';
import { MapThemeTokens, resolveMapThemeTokens } from './map-theme-tokens';

export type { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';

@Component({
  selector: 'app-assignment-map',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  providers: [AssignmentMapFacade],
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
  private readonly facade = inject(AssignmentMapFacade);
  private tileLayer?: TileLayer<OSM | XYZ>;
  private pulseInterval?: ReturnType<typeof setInterval>;
  private viewChangeListener?: () => void;
  private currentPulseValue = 0;
  private mapThemeTokens: MapThemeTokens = resolveMapThemeTokens();
  private suppressFollowDisable = false;
  private suppressFollowDisableTimeoutId?: ReturnType<typeof setTimeout>;
  private wheelListener?: EventListener;

  private readonly themeSyncEffect = effect(() => {
    const activeBaseLayer = this.facade.activeBaseLayer();

    untracked(() => {
      this.updateTileLayer(activeBaseLayer);
      this.refreshThemeTokens();
      this.routeLayer.changed();
      this.markerLayer.changed();
      this.userLocationLayer.changed();
    });
  });

  private readonly userTrackingEffect = effect(() => {
    const userTrackingMode = this.facade.userTrackingMode();
    const followUserMode = this.facade.followUserMode();
    this.facade.userLocation();
    this.facade.userLocationAccuracy();

    untracked(() => {
      this.updateUserLocationFeatures();

      if (followUserMode && userTrackingMode === 'live') {
        this.centerOnUser(300);
      }
    });
  });

  get mapLoaded(): boolean {
    return this.facade.mapLoaded();
  }

  set mapLoaded(value: boolean) {
    this.facade.setMapLoaded(value);
  }

  get mapError(): boolean {
    return this.facade.mapError();
  }

  set mapError(value: boolean) {
    this.facade.setMapError(value);
  }

  get followUserMode(): boolean {
    return this.facade.followUserMode();
  }

  get controlsMenuOpen(): boolean {
    return this.facade.controlsMenuOpen();
  }

  set controlsMenuOpen(value: boolean) {
    this.facade.setControlsMenuOpen(value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['enableUserTracking'] ||
      changes['fallbackUserLocation'] ||
      changes['enableCompletedFilter'] ||
      changes['showCompletedAssignments']
    ) {
      this.facade.updateInputs({
        enableUserTracking: this.enableUserTracking,
        enableCompletedFilter: this.enableCompletedFilter,
        showCompletedAssignments: this.showCompletedAssignments,
        fallbackUserLocation: this.fallbackUserLocation,
      });
    }

    this.updateMapFeatures();
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
          this.cdr.detectChanges();
          return;
        }

        this.refreshThemeTokens();
        this.tileLayer = new TileLayer({
          source: this.createTileSource(this.facade.activeBaseLayer()),
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
        this.startPulseAnimation();

        this.mapLoaded = true;
        this.mapError = false;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('[Map] Failed to initialize map:', error);
        this.mapLoaded = false;
        this.mapError = true;
        this.cdr.detectChanges();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
    }

    if (this.suppressFollowDisableTimeoutId) {
      clearTimeout(this.suppressFollowDisableTimeoutId);
    }

    if (this.map) {
      const view = typeof this.map.getView === 'function' ? this.map.getView() : undefined;
      if (this.viewChangeListener && view && typeof view.un === 'function') {
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
    return this.facade.userTrackingStatusKey();
  }

  get followButtonLabelKey(): string {
    return this.facade.followButtonLabelKey();
  }

  get followButtonDisabled(): boolean {
    return this.facade.followButtonDisabled();
  }

  get shouldShowControlsMenu(): boolean {
    return this.facade.shouldShowControlsMenu();
  }

  get shouldShowFollowQuickAction(): boolean {
    return this.facade.shouldShowFollowQuickAction();
  }

  get completedAssignmentsLabelKey(): string {
    return this.facade.completedAssignmentsLabelKey();
  }

  focusAssignment(assignment: Assignment, options: FocusAssignmentOptions = {}): void {
    if (!this.map || !hasValidCoordinates(assignment)) {
      return;
    }

    this.facade.disableFollowUserMode();
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

    this.facade.disableFollowUserMode();

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
    this.facade.toggleFollowUserMode();
  }

  toggleControlsMenu(): void {
    this.facade.toggleControlsMenu();
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

    this.facade.handleManualMapInteraction();
  }

  private centerOnUser(duration = 300): void {
    const userLocation = this.facade.userLocation();
    if (!this.map || !hasValidLocation(userLocation)) {
      return;
    }

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
      userLocation: this.facade.userLocation(),
      userLocationAccuracy: this.facade.userLocationAccuracy(),
      userTrackingMode: this.facade.userTrackingMode(),
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

  private mapStopToAssignment(stop: MapStop): Assignment {
    return mapStopToAssignment(stop);
  }

  private createTileSource(layer: ThemeMapBaseLayer): OSM | XYZ {
    return createTileSource(layer);
  }

  private updateTileLayer(baseLayer: ThemeMapBaseLayer): void {
    if (!this.tileLayer) {
      return;
    }

    this.tileLayer.setSource(this.createTileSource(baseLayer));
  }

  private isAvailabilityAssignmentId(assignmentId: string | number | undefined): boolean {
    return typeof assignmentId === 'string' && assignmentId.startsWith('availability-');
  }

  private refreshThemeTokens(): void {
    this.mapThemeTokens = resolveMapThemeTokens(this.mapElementRef?.nativeElement);
  }
}
