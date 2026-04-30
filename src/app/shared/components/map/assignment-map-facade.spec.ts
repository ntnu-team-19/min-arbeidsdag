import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeolocationService, GeolocationPositionUpdate } from '../../../core/services/geolocation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AssignmentMapFacade } from './assignment-map-facade';

describe('AssignmentMapFacade', () => {
  let service: AssignmentMapFacade;
  let themeService: ThemeService;
  let geolocationUpdates$: Subject<GeolocationPositionUpdate>;
  let geolocationServiceMock: {
    watchPosition: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    geolocationUpdates$ = new Subject<GeolocationPositionUpdate>();
    geolocationServiceMock = {
      watchPosition: vi.fn().mockReturnValue(geolocationUpdates$.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        AssignmentMapFacade,
        {
          provide: GeolocationService,
          useValue: geolocationServiceMock,
        },
      ],
    });

    service = TestBed.inject(AssignmentMapFacade);
    themeService = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('should use fallback user location when live geolocation is unavailable', () => {
    service.updateInputs({
      enableUserTracking: true,
      enableCompletedFilter: false,
      showCompletedAssignments: true,
      fallbackUserLocation: { lat: 63.43, lon: 10.39 },
    });
    geolocationUpdates$.next({ kind: 'unsupported' });

    expect(geolocationServiceMock.watchPosition).toHaveBeenCalledTimes(1);
    expect(service.userTrackingMode()).toBe('fallback');
    expect(service.userLocation()).toEqual({ lat: 63.43, lon: 10.39 });
    expect(service.userTrackingStatusKey()).toBeNull();
  });

  it('should surface tracking errors when no fallback location is available', () => {
    service.updateInputs({
      enableUserTracking: true,
      enableCompletedFilter: false,
      showCompletedAssignments: true,
      fallbackUserLocation: null,
    });
    geolocationUpdates$.next({ kind: 'error', errorCode: 2 });

    expect(service.userTrackingMode()).toBe('unavailable');
    expect(service.followUserMode()).toBe(false);
    expect(service.userTrackingStatusKey()).toBe('map.locationUnavailable');
  });

  it('should enable and disable follow mode around live location updates and manual interactions', () => {
    service.updateInputs({
      enableUserTracking: true,
      enableCompletedFilter: true,
      showCompletedAssignments: true,
      fallbackUserLocation: null,
    });
    geolocationUpdates$.next({
      kind: 'position',
      latitude: 63.4305,
      longitude: 10.3951,
      accuracy: 12,
    });

    expect(service.followButtonDisabled()).toBe(false);

    service.toggleFollowUserMode();
    expect(service.followUserMode()).toBe(true);

    service.handleManualMapInteraction();
    expect(service.followUserMode()).toBe(false);
  });

  it('should keep follow mode disabled until a live position is available', () => {
    service.updateInputs({
      enableUserTracking: true,
      enableCompletedFilter: false,
      showCompletedAssignments: true,
      fallbackUserLocation: { lat: 63.43, lon: 10.39 },
    });
    geolocationUpdates$.next({ kind: 'unsupported' });

    service.toggleFollowUserMode();

    expect(service.followUserMode()).toBe(false);
    expect(service.followButtonDisabled()).toBe(true);
  });

  it('should reactively mirror the current app theme without polling', () => {
    expect(service.activeBaseLayer()).toBe('grayscale');

    themeService.setTheme('dark', false);
    expect(service.activeBaseLayer()).toBe('dark');

    themeService.setTheme('light', false);
    expect(service.activeBaseLayer()).toBe('grayscale');
  });

  it('should clean up the active geolocation subscription on destroy', () => {
    let wasUnsubscribed = false;
    geolocationServiceMock.watchPosition.mockImplementationOnce(
      () =>
        new Observable<GeolocationPositionUpdate>(() => () => {
          wasUnsubscribed = true;
        }),
    );

    service.updateInputs({
      enableUserTracking: true,
      enableCompletedFilter: false,
      showCompletedAssignments: true,
      fallbackUserLocation: null,
    });

    service.ngOnDestroy();

    expect(wasUnsubscribed).toBe(true);
  });
});
