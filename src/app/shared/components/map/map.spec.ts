import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignmentMap, Assignment, MapRouteSegment, MapStop } from './map';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { provideTranslateService } from '@ngx-translate/core';
import CircleStyle from 'ol/style/Circle';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import { resolveMapThemeTokens } from './map-theme-tokens';

describe('AssignmentMap', () => {
  let component: AssignmentMap;
  let fixture: ComponentFixture<AssignmentMap>;
  let geolocationServiceMock: {
    watchPosition: ReturnType<typeof vi.fn>;
  };
  let themeService: ThemeService;

  beforeEach(async () => {
    geolocationServiceMock = {
      watchPosition: vi.fn().mockReturnValue(of({ kind: 'unsupported' as const })),
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
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default properties', () => {
    expect(component.assignments).toEqual([]);
    expect(component.compact).toBe(false);
    expect(component.mapLoaded).toBe(false);
    expect(component.mapError).toBe(false);
  });

  it('should accept assignments input', () => {
    const testAssignments: Assignment[] = [
      {
        id: 1,
        name: 'Test Assignment',
        location: { lat: 59.9139, lon: 10.7522 },
        description: 'Test description',
      },
    ];

    fixture.componentRef.setInput('assignments', testAssignments);
    fixture.detectChanges();

    expect(component.assignments).toEqual(testAssignments);
  });

  it('should accept compact input', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect(component.compact).toBe(true);
  });

  it('should render markers only for assignments with valid coordinates', () => {
    const testAssignments: Assignment[] = [
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

    expect(() => {
      fixture.componentRef.setInput('assignments', testAssignments);
      fixture.detectChanges();
    }).not.toThrow();

    const markerSource = (component as unknown as Record<string, unknown>)['markerSource'] as {
      getFeatures: () => unknown[];
    };
    const markerCount = markerSource.getFeatures().length;
    expect(markerCount).toBe(1);
  });

  it('should render numbered assignment stops and start/end stops when provided', () => {
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
        location: { lat: 59.915, lon: 10.754 },
      },
    ];

    fixture.componentRef.setInput('stops', stops);
    fixture.detectChanges();

    const markerSource = (component as unknown as Record<string, unknown>)['markerSource'] as {
      getFeatures: () => { get: (key: string) => unknown }[];
    };
    const features = markerSource.getFeatures();

    expect(features).toHaveLength(3);
    expect(features.map((feature) => feature.get('markerLabel'))).toEqual(['S', '1', 'E']);
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

  it('should use a stronger layered style for the active route segment', () => {
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
    expect(activeStyle).toHaveLength(3);
    expect((activeStyle as Style[])[0]?.getStroke()?.getWidth()).toBe(16);
    expect((activeStyle as Style[])[2]?.getStroke()?.getColor()).toBe('#1A5B95');
    expect(Array.isArray(inactiveStyle)).toBe(false);
    expect((inactiveStyle as Style).getStroke()?.getWidth()).toBe(4);
  });

  it('should hide the end stop marker when start and end share the same coordinates', () => {
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
    expect(fit.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        duration: 350,
        maxZoom: 16,
        padding: [40, 40, 440, 40],
      }),
    );
  });

  it('should fit the two stops when the route segment geometry is missing', () => {
    const fit = vi.fn();
    const focusAssignmentSpy = vi.spyOn(component, 'focusAssignment');

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
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: { lat: 59.91, lon: 10.75 },
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

    expect(fit).toHaveBeenCalledTimes(1);
    expect(focusAssignmentSpy).not.toHaveBeenCalled();
  });

  it('should fall back to single-marker focus when the previous stop is invalid', () => {
    const fit = vi.fn();
    const focusAssignmentSpy = vi
      .spyOn(component, 'focusAssignment')
      .mockImplementation(() => undefined);

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

    expect(focusAssignmentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        name: 'Oppdrag 1',
      }),
      expect.objectContaining({
        targetYRatio: 0.25,
      }),
    );
    expect(fit).not.toHaveBeenCalled();
  });

  it('should scale assignment markers down at lower zoom levels', () => {
    const cleanupSafeMapMixin = {
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    const getMarkerStyle = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getMarkerStyle.bind(component);
    const lowZoomMap = {
      ...cleanupSafeMapMixin,
      getView: () => ({
        getZoom: () => 8,
      }),
    };
    const highZoomMap = {
      ...cleanupSafeMapMixin,
      getView: () => ({
        getZoom: () => 13,
      }),
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

    expect(highZoomStyle[0]?.getImage()).toBeTruthy();
    expect(lowZoomStyle[0]?.getImage()).toBeTruthy();
    expect(highZoomStyle[0]?.getText()?.getText()).toBe('4');
    expect(lowZoomStyle[0]?.getText()?.getText()).toBe('4');
    expect((highZoomStyle[0]?.getImage() as CircleStyle).getRadius()).toBeGreaterThan(
      (lowZoomStyle[0]?.getImage() as CircleStyle).getRadius(),
    );
    const extractFontSize = (font: string | undefined): number => {
      const match = font?.match(/(\d+)px/);
      return match ? Number(match[1]) : 0;
    };
    expect(extractFontSize(highZoomStyle[0]?.getText()?.getFont())).toBeGreaterThan(
      extractFontSize(lowZoomStyle[0]?.getText()?.getFont()),
    );
  });

  it('should scale the home icon down at lower zoom levels', () => {
    const cleanupSafeMapMixin = {
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    const getMarkerStyle = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style;
      }
    ).getMarkerStyle.bind(component);
    const lowZoomMap = {
      ...cleanupSafeMapMixin,
      getView: () => ({
        getZoom: () => 8,
      }),
    };
    const highZoomMap = {
      ...cleanupSafeMapMixin,
      getView: () => ({
        getZoom: () => 13,
      }),
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

    expect(typeof highZoomScale).toBe('number');
    expect(typeof lowZoomScale).toBe('number');
    expect(highZoomScale as number).toBeGreaterThan(lowZoomScale as number);
  });

  it('should refresh marker styles when the view resolution changes', () => {
    const resolutionHandlers: (() => void)[] = [];
    const changed = vi.fn();
    const userLayerChanged = vi.fn();
    const cleanupSafeMapMixin = {
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    (component as unknown as Record<string, unknown>)['markerLayer'] = {
      changed,
    };
    (component as unknown as Record<string, unknown>)['userLocationLayer'] = {
      changed: userLayerChanged,
    };
    (component as unknown as Record<string, unknown>)['map'] = {
      ...cleanupSafeMapMixin,
      getView: () => ({
        on: (_eventName: string, handler: () => void) => {
          resolutionHandlers.push(handler);
        },
        un: vi.fn(),
      }),
    };

    (
      component as unknown as {
        attachViewChangeListener: () => void;
      }
    ).attachViewChangeListener();

    expect(resolutionHandlers).toHaveLength(1);

    resolutionHandlers[0]?.();

    expect(changed).toHaveBeenCalledTimes(1);
    expect(userLayerChanged).toHaveBeenCalledTimes(1);
  });

  it('should apply focused styling for the focused assignment marker', () => {
    const focusedFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'assignment';
        if (key === 'markerLabel') return '2';
        if (key === 'assignmentStatus') return 'upcoming';
        if (key === 'isFocusedAssignment') return true;
        return undefined;
      },
    };

    const styles = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getMarkerStyle(focusedFeature) as Style[];

    expect(styles).toHaveLength(2);
    expect((styles[0]?.getImage() as CircleStyle).getRadius()).toBeGreaterThan(
      (styles[1]?.getImage() as CircleStyle).getRadius(),
    );
    expect(styles[1]?.getText()?.getText()).toBe('2');
  });

  it('should add a pulsing halo for ongoing assignment markers', () => {
    (component as unknown as Record<string, unknown>)['currentPulseValue'] = 0.5;

    const ongoingFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'assignment';
        if (key === 'markerLabel') return '1';
        if (key === 'assignmentStatus') return 'ongoing';
        return undefined;
      },
    };

    const styles = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getMarkerStyle(ongoingFeature) as Style[];

    expect(styles).toHaveLength(2);
    expect((styles[0]?.getImage() as CircleStyle).getRadius()).toBeGreaterThan(
      (styles[1]?.getImage() as CircleStyle).getRadius(),
    );
    const pulseFill = String((styles[0]?.getImage() as CircleStyle).getFill()?.getColor());
    const pulseOpacity = Number(pulseFill.replace(/^rgba\([^,]+,[^,]+,[^,]+,\s*|\)$/g, ''));
    expect(pulseOpacity).toBeCloseTo(0.18, 2);
  });

  it('should resolve availability marker palette through semantic map tokens', () => {
    const availabilityFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'assignment';
        if (key === 'markerLabel') return 'A';
        if (key === 'assignmentStatus') return 'unconfirmed';
        if (key === 'assignment') return { id: 'availability-1' };
        return undefined;
      },
    };

    const styles = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getMarkerStyle(availabilityFeature) as Style[];

    expect((styles[0]?.getImage() as CircleStyle).getFill()?.getColor()).toBe('#C7A27B');
    expect(styles[0]?.getText()?.getFill()?.getColor()).toBe('#4A2F1B');
  });

  it('should keep focused marker halo styling after tokenized style resolution', () => {
    const focusedFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'assignment';
        if (key === 'markerLabel') return '2';
        if (key === 'assignmentStatus') return 'next';
        if (key === 'isFocusedAssignment') return true;
        return undefined;
      },
    };

    const styles = (
      component as unknown as {
        getMarkerStyle: (feature: { get: (key: string) => unknown }) => Style | Style[];
      }
    ).getMarkerStyle(focusedFeature) as Style[];

    expect(styles).toHaveLength(2);
    expect((styles[0]?.getImage() as CircleStyle).getStroke()?.getWidth()).toBe(2);
    expect((styles[0]?.getImage() as CircleStyle).getStroke()?.getColor()).toBe(
      'rgba(255, 255, 255, 0.88)',
    );
    expect(styles[1]?.getZIndex()).toBe(32);
  });

  it('should resolve different map token palettes for light and dark theme variables', () => {
    const rootStyle = document.documentElement.style;
    const originalLight = rootStyle.getPropertyValue('--map-route-active-core');
    const originalDark = rootStyle.getPropertyValue('--map-user-position-inner-fill');

    rootStyle.setProperty('--map-route-active-core', '#1A5B95');
    rootStyle.setProperty('--map-user-position-inner-fill', '#3684FF');
    const lightTokens = resolveMapThemeTokens();

    rootStyle.setProperty('--map-route-active-core', '#60A5FA');
    rootStyle.setProperty('--map-user-position-inner-fill', '#60A5FA');
    const darkTokens = resolveMapThemeTokens();

    expect(lightTokens.routeActiveCore).not.toBe(darkTokens.routeActiveCore);
    expect(lightTokens.userPositionInnerFill).not.toBe(darkTokens.userPositionInnerFill);

    rootStyle.setProperty('--map-route-active-core', originalLight);
    rootStyle.setProperty('--map-user-position-inner-fill', originalDark);
  });

  it('should use the grayscale base layer for the light app theme', () => {
    const setSource = vi.fn();

    (component as unknown as Record<string, unknown>)['tileLayer'] = {
      setSource,
    };
    themeService.setTheme('light', false);
    (component as unknown as Record<string, unknown>)['currentTheme'] = 'light';
    (component as unknown as { syncBaseLayerToTheme: () => void }).syncBaseLayerToTheme();

    expect((component as unknown as Record<string, unknown>)['activeBaseLayer']).toBe('grayscale');
    expect(setSource).not.toHaveBeenCalled();
  });

  it('should update the tile layer when the app theme changes', () => {
    vi.useFakeTimers();
    const setSource = vi.fn();

    (component as unknown as Record<string, unknown>)['tileLayer'] = {
      setSource,
    };
    (component as unknown as Record<string, unknown>)['currentTheme'] = 'light';
    component.mapLoaded = true;
    themeService.setTheme('dark', false);

    (component as unknown as { setupThemeListener: () => void }).setupThemeListener();
    vi.advanceTimersByTime(500);

    expect((component as unknown as Record<string, unknown>)['activeBaseLayer']).toBe('dark');
    expect(setSource).toHaveBeenCalledTimes(1);
  });

  it('should use fallback user location when live geolocation is unavailable', () => {
    fixture.componentRef.setInput('enableUserTracking', true);
    fixture.componentRef.setInput('fallbackUserLocation', { lat: 63.43, lon: 10.39 });
    fixture.detectChanges();

    expect(geolocationServiceMock.watchPosition).toHaveBeenCalledTimes(1);
    expect((component as unknown as Record<string, unknown>)['userTrackingMode']).toBe('fallback');

    const userLocationSource = (component as unknown as Record<string, unknown>)[
      'userLocationSource'
    ] as {
      getFeatures: () => unknown[];
    };

    expect(userLocationSource.getFeatures()).toHaveLength(1);
    expect(component.userTrackingStatusKey).toBeNull();
  });

  it('should render the follow action as a quick-access button below settings', () => {
    fixture.componentRef.setInput('enableCompletedFilter', true);
    fixture.componentRef.setInput('enableUserTracking', true);
    component.controlsMenuOpen = true;
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.map-menu__trigger')).toBeTruthy();
    expect(nativeElement.querySelector('.map-menu__follow .map-follow-button--quick')).toBeTruthy();
    expect(nativeElement.querySelector('.map-menu__panel .map-follow-button')).toBeTruthy();
    expect(nativeElement.querySelector('.map-menu__panel .map-follow-button--quick')).toBeNull();
    expect(nativeElement.querySelector('.map-menu__panel .map-chip')).toBeNull();
  });

  it('should keep the follow action in place when the settings panel is open', () => {
    fixture.componentRef.setInput('enableCompletedFilter', true);
    fixture.componentRef.setInput('enableUserTracking', true);
    component.controlsMenuOpen = true;
    fixture.detectChanges();

    const followContainer = fixture.nativeElement.querySelector(
      '.map-menu__follow',
    ) as HTMLElement | null;

    expect(followContainer).toBeTruthy();
    expect(followContainer?.classList.contains('map-menu__follow--offset')).toBe(false);
    expect(fixture.nativeElement.querySelector('.map-menu__panel')).toBeTruthy();
  });

  it('should render only the standalone follow action when tracking is enabled without settings', () => {
    fixture.componentRef.setInput('enableUserTracking', true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.map-menu__trigger')).toBeNull();
    expect(nativeElement.querySelector('.map-menu__follow .map-follow-button--quick')).toBeTruthy();
  });

  it('should toggle follow mode from the quick-access follow button', () => {
    fixture.componentRef.setInput('enableUserTracking', true);
    fixture.detectChanges();

    (component as unknown as Record<string, unknown>)['userTrackingMode'] = 'live';
    (component as unknown as Record<string, unknown>)['userLocation'] = {
      lat: 63.4305,
      lon: 10.3951,
    };
    (component as unknown as Record<string, unknown>)['map'] = {
      getSize: () => [1000, 800],
      getView: () => ({
        animate: vi.fn(),
        getZoom: () => 12,
        fit: vi.fn(),
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    const followButton = fixture.debugElement.query(
      By.css('.map-menu__follow .map-follow-button--quick'),
    );

    expect(followButton).toBeTruthy();

    followButton.triggerEventHandler('click', new MouseEvent('click'));

    expect(component.followUserMode).toBe(true);
  });

  it('should add overview bottom padding when fitting visible features', () => {
    const fit = vi.fn();

    fixture.componentRef.setInput('overviewBottomInsetRatio', 0.52);
    fixture.detectChanges();

    (component as unknown as Record<string, unknown>)['map'] = {
      getSize: () => [1000, 800],
      getView: () => ({
        fit,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['markerSource'] = {
      clear: vi.fn(),
      getExtent: () => [0, 0, 10, 10],
      addFeatures: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['routeSource'] = {
      clear: vi.fn(),
      getExtent: () => [0, 0, 0, 0],
      addFeatures: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['userLocationSource'] = {
      clear: vi.fn(),
      getExtent: () => [0, 0, 0, 0],
      addFeatures: vi.fn(),
    };

    (
      component as unknown as {
        fitToVisibleFeatures: () => void;
      }
    ).fitToVisibleFeatures();

    expect(fit).toHaveBeenCalledTimes(1);
    expect(fit.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        padding: [40, 40, 456, 40],
      }),
    );
  });

  it('should recenter on the live user location and turn follow mode off on manual interaction', () => {
    vi.useFakeTimers();
    const animate = vi.fn();

    (component as unknown as Record<string, unknown>)['map'] = {
      getView: () => ({
        animate,
        getZoom: () => 12,
      }),
      un: vi.fn(),
      setTarget: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['userTrackingMode'] = 'live';
    (component as unknown as Record<string, unknown>)['userLocation'] = {
      lat: 63.4305,
      lon: 10.3951,
    };

    component.toggleFollowUserMode();

    expect(component.followUserMode).toBe(true);
    expect(animate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(450);

    (
      component as unknown as {
        handleManualMapInteraction: () => void;
      }
    ).handleManualMapInteraction();

    expect(component.followUserMode).toBe(false);
  });
});
