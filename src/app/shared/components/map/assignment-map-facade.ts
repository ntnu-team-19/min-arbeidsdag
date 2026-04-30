import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { GeolocationService, GeolocationPositionUpdate } from '../../../core/services/geolocation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { hasValidLocation } from './map-focus-fit';
import {
  applyFallbackTrackingState,
  applyLiveTrackingState,
  createIdleTrackingState,
  getStatusKey,
  resolveTrackingErrorMode,
  TrackingState,
} from './map-tracking-state';
import { MapLocation } from './map.models';
import { ThemeMapBaseLayer } from './map-ol-factory';

@Injectable()
export class AssignmentMapFacade implements OnDestroy {
  private readonly geolocationService = inject(GeolocationService);
  private readonly themeService = inject(ThemeService);

  private readonly _mapLoaded = signal(false);
  readonly mapLoaded = this._mapLoaded.asReadonly();

  private readonly _mapError = signal(false);
  readonly mapError = this._mapError.asReadonly();

  private readonly _controlsMenuOpen = signal(false);
  readonly controlsMenuOpen = this._controlsMenuOpen.asReadonly();

  private readonly _enableUserTracking = signal(false);
  readonly enableUserTracking = this._enableUserTracking.asReadonly();

  private readonly _enableCompletedFilter = signal(false);
  readonly enableCompletedFilter = this._enableCompletedFilter.asReadonly();

  private readonly _showCompletedAssignments = signal(true);
  readonly showCompletedAssignments = this._showCompletedAssignments.asReadonly();

  private readonly _fallbackUserLocation = signal<MapLocation | null>(null);
  readonly fallbackUserLocation = this._fallbackUserLocation.asReadonly();

  private readonly _trackingState = signal<TrackingState>(createIdleTrackingState());
  readonly userTrackingMode = computed(() => this._trackingState().mode);
  readonly userLocation = computed(() => this._trackingState().location);
  readonly userLocationAccuracy = computed(() => this._trackingState().accuracy);
  readonly followUserMode = computed(() => this._trackingState().followUserMode);

  readonly activeBaseLayer = computed<ThemeMapBaseLayer>(() =>
    this.themeService.isDark() ? 'dark' : 'grayscale',
  );

  readonly userTrackingStatusKey = computed(() => getStatusKey(this.userTrackingMode()));
  readonly followButtonLabelKey = computed(() =>
    this.followUserMode() ? 'map.stopFollowingUser' : 'map.followUser',
  );
  readonly followButtonDisabled = computed(
    () => this.userTrackingMode() !== 'live' || !hasValidLocation(this.userLocation()),
  );
  readonly shouldShowControlsMenu = computed(() => this._enableCompletedFilter());
  readonly shouldShowFollowQuickAction = computed(() => this._enableUserTracking());
  readonly completedAssignmentsLabelKey = computed(() =>
    this._showCompletedAssignments()
      ? 'map.hideCompletedAssignments'
      : 'map.showCompletedAssignments',
  );

  private geolocationSubscription?: Subscription;

  ngOnDestroy(): void {
    this.stopUserTracking();
  }

  updateInputs(args: {
    enableUserTracking: boolean;
    enableCompletedFilter: boolean;
    showCompletedAssignments: boolean;
    fallbackUserLocation: MapLocation | null;
  }): void {
    const shouldSyncTracking =
      args.enableUserTracking !== this._enableUserTracking() ||
      args.fallbackUserLocation !== this._fallbackUserLocation();

    this._enableUserTracking.set(args.enableUserTracking);
    this._enableCompletedFilter.set(args.enableCompletedFilter);
    this._showCompletedAssignments.set(args.showCompletedAssignments);
    this._fallbackUserLocation.set(args.fallbackUserLocation);

    if (shouldSyncTracking) {
      this.syncUserTracking();
    }
  }

  setMapLoaded(mapLoaded: boolean): void {
    this._mapLoaded.set(mapLoaded);
  }

  setMapError(mapError: boolean): void {
    this._mapError.set(mapError);
  }

  setControlsMenuOpen(controlsMenuOpen: boolean): void {
    this._controlsMenuOpen.set(controlsMenuOpen);
  }

  toggleControlsMenu(): void {
    this._controlsMenuOpen.update((value) => !value);
  }

  toggleFollowUserMode(): void {
    if (this.followUserMode()) {
      this.disableFollowUserMode();
      return;
    }

    if (this.followButtonDisabled()) {
      return;
    }

    this.patchTrackingState({
      followUserMode: true,
    });
  }

  disableFollowUserMode(): void {
    if (!this.followUserMode()) {
      return;
    }

    this.patchTrackingState({
      followUserMode: false,
    });
  }

  handleManualMapInteraction(): void {
    if (!this.followUserMode()) {
      return;
    }

    this.disableFollowUserMode();
  }

  private syncUserTracking(): void {
    if (!this._enableUserTracking()) {
      this.stopUserTracking();
      this._trackingState.set(createIdleTrackingState());
      return;
    }

    if (this.geolocationSubscription) {
      if (this.userTrackingMode() !== 'live') {
        this.applyFallbackIfPossible();
      }
      return;
    }

    this._trackingState.set({
      ...this._trackingState(),
      mode: 'locating',
      location: null,
      accuracy: null,
      followUserMode: false,
    });

    this.geolocationSubscription = this.geolocationService
      .watchPosition({
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      })
      .subscribe((update) => this.handleGeolocationUpdate(update));
  }

  private handleGeolocationUpdate(update: GeolocationPositionUpdate): void {
    if (update.kind === 'position') {
      this._trackingState.set(applyLiveTrackingState(update, this.followUserMode()));
      return;
    }

    if (!this.applyFallbackIfPossible()) {
      this._trackingState.set({
        mode: resolveTrackingErrorMode(update),
        location: null,
        accuracy: null,
        followUserMode: false,
      });
    }
  }

  private applyFallbackIfPossible(): boolean {
    const fallbackUserLocation = this._fallbackUserLocation();
    if (!hasValidLocation(fallbackUserLocation)) {
      return false;
    }

    this._trackingState.set(applyFallbackTrackingState(fallbackUserLocation));
    return true;
  }

  private stopUserTracking(): void {
    this.geolocationSubscription?.unsubscribe();
    this.geolocationSubscription = undefined;
  }

  private patchTrackingState(patch: Partial<TrackingState>): void {
    this._trackingState.update((state) => ({
      ...state,
      ...patch,
    }));
  }
}
