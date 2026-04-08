import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignmentMap, Assignment, MapRouteSegment, MapStop } from './map';
import CircleStyle from 'ol/style/Circle';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';

describe('AssignmentMap', () => {
  let component: AssignmentMap;
  let fixture: ComponentFixture<AssignmentMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentMap],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
    expect((activeStyle as Style[])[0]?.getStroke()?.getWidth()).toBe(14);
    expect((activeStyle as Style[])[2]?.getStroke()?.getColor()).toBe('#0B4A8B');
    expect(Array.isArray(inactiveStyle)).toBe(false);
    expect((inactiveStyle as Style).getStroke()?.getWidth()).toBe(3);
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
    const assignmentFeature = {
      get: (key: string) => {
        if (key === 'stopKind') return 'assignment';
        if (key === 'markerLabel') return '4';
        return undefined;
      },
    };

    (component as unknown as Record<string, unknown>)['map'] = highZoomMap;
    const highZoomStyle = getMarkerStyle(assignmentFeature);

    (component as unknown as Record<string, unknown>)['map'] = lowZoomMap;
    const lowZoomStyle = getMarkerStyle(assignmentFeature);

    expect(highZoomStyle.getImage()).toBeTruthy();
    expect(lowZoomStyle.getImage()).toBeTruthy();
    expect(highZoomStyle.getText()?.getText()).toBe('4');
    expect(lowZoomStyle.getText()?.getText()).toBe('4');
    expect((highZoomStyle.getImage() as CircleStyle).getRadius()).toBeGreaterThan(
      (lowZoomStyle.getImage() as CircleStyle).getRadius(),
    );
    const extractFontSize = (font: string | undefined): number => {
      const match = font?.match(/(\d+)px/);
      return match ? Number(match[1]) : 0;
    };
    expect(extractFontSize(highZoomStyle.getText()?.getFont())).toBeGreaterThan(
      extractFontSize(lowZoomStyle.getText()?.getFont()),
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
    const cleanupSafeMapMixin = {
      un: vi.fn(),
      setTarget: vi.fn(),
    };

    (component as unknown as Record<string, unknown>)['markerLayer'] = {
      changed,
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
  });
});
