import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CircleStyle from 'ol/style/Circle';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import { provideTranslateService } from '@ngx-translate/core';
import { GeolocationService, GeolocationPositionUpdate } from '../../../core/services/geolocation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AssignmentMap, Assignment, MapRouteSegment, MapStop } from './map';

describe('AssignmentMap', () => {
  let component: AssignmentMap;
  let fixture: ComponentFixture<AssignmentMap>;
  let geolocationUpdates$: Subject<GeolocationPositionUpdate>;
  let geolocationServiceMock: {
    watchPosition: ReturnType<typeof vi.fn>;
  };
  let themeService: ThemeService;

  beforeEach(async () => {
    geolocationUpdates$ = new Subject<GeolocationPositionUpdate>();
    geolocationServiceMock = {
      watchPosition: vi.fn().mockReturnValue(geolocationUpdates$.asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [AssignmentMap],
      providers: [
        provideTranslateService(),
        {
          provide: GeolocationService,
          useValue: geolocationServiceMock,
        },
      ],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(AssignmentMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('should create with default state', () => {
    expect(component).toBeTruthy();
    expect(component.assignments).toEqual([]);
    expect(component.compact).toBe(false);
    expect(component.mapLoaded).toBe(false);
    expect(component.mapError).toBe(false);
  });

  it('should render markers only for assignments with valid coordinates', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        name: 'Valid assignment',
        location: { lat: 59.9139, lon: 10.7522 },
      },
      {
        id: 2,
        name: 'Missing location',
        location: null,
      },
      {
        id: 3,
        name: 'Missing longitude',
        location: { lat: 59.91 },
      },
      {
        id: 4,
        name: 'Out of range latitude',
        location: { lat: 120, lon: 10.75 },
      },
    ];

    fixture.componentRef.setInput('assignments', assignments);
    fixture.detectChanges();

    const markerSource = (component as unknown as Record<string, unknown>)['markerSource'] as {
      getFeatures: () => unknown[];
    };
    expect(markerSource.getFeatures()).toHaveLength(1);
  });

  it('should render numbered assignment stops and hide the duplicated terminal end stop', () => {
    const stops: MapStop[] = [
      {
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: { lat: 59.91, lon: 10.75 },
      },
      {
        id: 'assignment-1',
        kind: 'assignment',
        label: 'Oppdrag 1',
        assignmentId: '1',
        sequenceNumber: 1,
        location: { lat: 59.9139, lon: 10.7522 },
      },
      {
        id: 'end',
        kind: 'end',
        label: 'Slutt',
        location: { lat: 59.91, lon: 10.75 },
      },
    ];

    fixture.componentRef.setInput('stops', stops);
    fixture.detectChanges();

    const markerSource = (component as unknown as Record<string, unknown>)['markerSource'] as {
      getFeatures: () => { get: (key: string) => unknown }[];
    };
    const features = markerSource.getFeatures();

    expect(features).toHaveLength(2);
    expect(features.map((feature) => feature.get('markerLabel'))).toEqual(['S', '1']);
  });

  it('should render route segment features and track the active segment id', () => {
    const segments: MapRouteSegment[] = [
      {
        id: 'start__assignment-1',
        fromStopId: 'start',
        toStopId: 'assignment-1',
        coordinates: [
          [10.75, 59.91],
          [10.7522, 59.9139],
        ],
      },
      {
        id: 'assignment-1__end',
        fromStopId: 'assignment-1',
        toStopId: 'end',
        coordinates: [
          [10.7522, 59.9139],
          [10.754, 59.915],
        ],
      },
    ];

    fixture.componentRef.setInput('routeSegments', segments);
    fixture.componentRef.setInput('activeSegmentId', 'assignment-1__end');
    fixture.detectChanges();

    const routeSource = (component as unknown as Record<string, unknown>)['routeSource'] as {
      getFeatures: () => { get: (key: string) => unknown }[];
    };
    const features = routeSource.getFeatures();

    expect(features).toHaveLength(2);
    expect(features.map((feature) => feature.get('active'))).toEqual([false, true]);
  });

  it('should use a layered active style for the active route segment', () => {
    const activeFeature = {
      get: (key: string) => (key === 'active' ? true : undefined),
    };
    const inactiveFeature = {
      get: (key: string) => (key === 'active' ? false : undefined),
    };

    const activeStyle = (
      component as unknown as {
        getRouteStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getRouteStyle(activeFeature);
    const inactiveStyle = (
      component as unknown as {
        getRouteStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getRouteStyle(inactiveFeature);

    expect(Array.isArray(activeStyle)).toBe(true);
    expect((activeStyle as Style[])[0]?.getStroke()?.getWidth()).toBe(16);
    expect((inactiveStyle as Style).getStroke()?.getWidth()).toBe(4);
  });

  it('should fit the incoming route leg geometry when focusing an assignment leg', () => {
    const fit = vi.fn();

    (component as unknown as Record<string, unknown>)['map'] = {
      getSize: () => [1000, 800],
      getView: () => ({
        fit,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    component.focusAssignmentLeg({
      fromStop: {
        id: 'assignment-1',
        kind: 'assignment',
        label: 'Oppdrag 1',
        assignmentId: '1',
        sequenceNumber: 1,
        location: { lat: 59.91, lon: 10.75 },
      },
      toStop: {
        id: 'assignment-2',
        kind: 'assignment',
        label: 'Oppdrag 2',
        assignmentId: '2',
        sequenceNumber: 2,
        location: { lat: 59.9139, lon: 10.7522 },
      },
      routeSegment: {
        id: 'assignment-1__assignment-2',
        fromStopId: 'assignment-1',
        toStopId: 'assignment-2',
        coordinates: [
          [10.75, 59.91],
          [10.751, 59.912],
          [10.7522, 59.9139],
        ],
      },
      targetYRatio: 0.25,
    });

    expect(fit).toHaveBeenCalledTimes(1);
  });

  it('should fall back to single-marker focus when the previous stop is invalid', () => {
    const focusAssignmentSpy = vi
      .spyOn(component, 'focusAssignment')
      .mockImplementation(() => undefined);

    (component as unknown as Record<string, unknown>)['map'] = {
      getSize: () => [1000, 800],
      getView: () => ({
        fit: vi.fn(),
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    component.focusAssignmentLeg({
      fromStop: {
        id: 'start',
        kind: 'start',
        label: 'Start',
      },
      toStop: {
        id: 'assignment-1',
        kind: 'assignment',
        label: 'Oppdrag 1',
        assignmentId: '1',
        sequenceNumber: 1,
        location: { lat: 59.9139, lon: 10.7522 },
      },
      targetYRatio: 0.25,
    });

    expect(focusAssignmentSpy).toHaveBeenCalled();
  });

  it('should refresh marker styles when the view resolution changes', () => {
    const resolutionHandlers: (() => void)[] = [];
    const changed = vi.fn();
    const userLayerChanged = vi.fn();

    (component as unknown as Record<string, unknown>)['markerLayer'] = {
      changed,
    };
    (component as unknown as Record<string, unknown>)['userLocationLayer'] = {
      changed: userLayerChanged,
    };
    (component as unknown as Record<string, unknown>)['map'] = {
      getView: () => ({
        on: (_eventName: string, handler: () => void) => {
          resolutionHandlers.push(handler);
        },
        un: vi.fn(),
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    (
      component as unknown as {
        attachViewChangeListener: () => void;
      }
    ).attachViewChangeListener();

    resolutionHandlers[0]?.();

    expect(changed).toHaveBeenCalledTimes(1);
    expect(userLayerChanged).toHaveBeenCalledTimes(1);
  });

  it('should react to theme changes by updating the tile layer source', async () => {
    const setSource = vi.fn();

    (component as unknown as Record<string, unknown>)['tileLayer'] = {
      setSource,
    };

    themeService.setTheme('dark', false);
    await fixture.whenStable();

    expect(setSource).toHaveBeenCalledTimes(1);
  });

  it('should emit markerClicked when clicking an assignment marker', () => {
    const markerClickedSpy = vi.spyOn(component.markerClicked, 'emit');
    const assignment: Assignment = {
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4305, lon: 10.3951 },
    };

    (component as unknown as Record<string, unknown>)['map'] = {
      forEachFeatureAtPixel: (
        _pixel: [number, number],
        callback: (feature: { get: (key: string) => unknown }) => boolean,
      ) => {
        callback({
          get: (key: string) => (key === 'assignment' ? assignment : undefined),
        });
      },
      hasFeatureAtPixel: vi.fn(),
      getTargetElement: () => ({ style: { cursor: '' } }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    (
      component as unknown as {
        onMapClick: (event: unknown) => void;
      }
    ).onMapClick({ pixel: [12, 34] });

    expect(markerClickedSpy).toHaveBeenCalledWith(assignment);
  });

  it('should emit mapBackgroundClicked when clicking empty map space', () => {
    const mapBackgroundClickedSpy = vi.spyOn(component.mapBackgroundClicked, 'emit');

    (component as unknown as Record<string, unknown>)['map'] = {
      forEachFeatureAtPixel: vi.fn(),
      hasFeatureAtPixel: vi.fn(),
      getTargetElement: () => ({ style: { cursor: '' } }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    (
      component as unknown as {
        onMapClick: (event: unknown) => void;
      }
    ).onMapClick({ pixel: [20, 40] });

    expect(mapBackgroundClickedSpy).toHaveBeenCalledTimes(1);
  });

  it('should render fallback user location features when tracking falls back', () => {
    fixture.componentRef.setInput('enableUserTracking', true);
    fixture.componentRef.setInput('fallbackUserLocation', { lat: 63.43, lon: 10.39 });
    fixture.detectChanges();
    geolocationUpdates$.next({ kind: 'unsupported' });
    fixture.detectChanges();

    const userLocationSource = (component as unknown as Record<string, unknown>)[
      'userLocationSource'
    ] as {
      getFeatures: () => unknown[];
    };

    expect(userLocationSource.getFeatures()).toHaveLength(1);
    expect(component.userTrackingStatusKey).toBeNull();
  });

  it('should scale assignment markers down at lower zoom levels', () => {
    const getMarkerStyle = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getMarkerStyle.bind(component);
    const lowZoomMap = {
      getView: () => ({
        getZoom: () => 8,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    const highZoomMap = {
      getView: () => ({
        getZoom: () => 13,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    const assignmentFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'assignment';
        if (key === 'markerLabel') return '4';
        if (key === 'assignmentStatus') return 'next';
        return undefined;
      },
    };

    (component as unknown as Record<string, unknown>)['map'] = highZoomMap;
    const highZoomStyle = getMarkerStyle(assignmentFeature) as Style[];

    (component as unknown as Record<string, unknown>)['map'] = lowZoomMap;
    const lowZoomStyle = getMarkerStyle(assignmentFeature) as Style[];

    expect(highZoomStyle[0]?.getText()?.getText()).toBe('4');
    expect((highZoomStyle[0]?.getImage() as CircleStyle).getRadius()).toBeGreaterThan(
      (lowZoomStyle[0]?.getImage() as CircleStyle).getRadius(),
    );
  });

  it('should scale the home icon down at lower zoom levels', () => {
    const getMarkerStyle = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style;
      }
    ).getMarkerStyle.bind(component);
    const lowZoomMap = {
      getView: () => ({
        getZoom: () => 8,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    const highZoomMap = {
      getView: () => ({
        getZoom: () => 13,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    const startFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'start';
        return undefined;
      },
    };

    (component as unknown as Record<string, unknown>)['map'] = highZoomMap;
    const highZoomStyle = getMarkerStyle(startFeature);

    (component as unknown as Record<string, unknown>)['map'] = lowZoomMap;
    const lowZoomStyle = getMarkerStyle(startFeature);

    const highZoomScale = (highZoomStyle.getImage() as Icon).getScale();
    const lowZoomScale = (lowZoomStyle.getImage() as Icon).getScale();

    expect(highZoomScale as number).toBeGreaterThan(lowZoomScale as number);
  });
});
