import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule, convertToParamMap, ParamMap } from '@angular/router';
import { of, ReplaySubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../../core/models/daily-progress.model';
import { DailyProgressInfobox } from '../../components/daily-progress-infobox/daily-progress-infobox';
import { MAP_BOTTOM_SHEET_PEEK_RATIO } from '../../components/map-bottom-sheet/map-bottom-sheet';
import { RoutingService } from '../../../../core/services/routing.service';
import { buildRouteSegmentId, MapRouteSegment } from '../../../../shared/components/map/map.models';
import { TechnicianLocation } from '../../../../core/models/tech-location.model';

const MOCK_CARDS: Assignment[] = [
  {
    id: '1',
    fieldTechId: 40231,
    title: 'Pågående oppdrag',
    shortDescription: 'Beskrivelse 1',
    time: '11:30',
    address: 'Adresse 1, 7052 Trondheim',
    phoneNumber: '12345678',
    status: 'ongoing',
    date: '2026-03-20',
    locationPoint: { x: 10.3951, y: 63.4305 },
  },
  {
    id: '2',
    fieldTechId: 40231,
    title: 'Neste oppdrag',
    shortDescription: 'Beskrivelse 2',
    time: '12:30',
    address: 'Adresse 2, 7041 Trondheim',
    phoneNumber: '87654321',
    status: 'next',
    date: '2026-03-20',
    locationPoint: { x: 10.4512, y: 63.4365 },
  },
  {
    id: '3',
    fieldTechId: 40231,
    title: 'Kommende oppdrag',
    shortDescription: 'Beskrivelse 3',
    time: '13:45',
    address: 'Adresse 3, 7021 Trondheim',
    phoneNumber: '11111111',
    status: 'upcoming',
    date: '2026-03-20',
    locationPoint: { x: 10.3772, y: 63.4105 },
  },
  {
    id: '4',
    fieldTechId: 40231,
    title: 'Fullført oppdrag',
    shortDescription: 'Beskrivelse 4',
    time: '07:00',
    address: 'Adresse 4, 7050 Trondheim',
    phoneNumber: '22222222',
    status: 'completed',
    date: '2026-03-20',
    locationPoint: { x: 10.4399, y: 63.4102 },
  },
];

const MOCK_TRAVEL_TIMES = [15, 12, 10, 8];
const MOCK_TECHNICIAN_LOCATIONS: TechnicianLocation[] = [
  {
    fieldTechId: 392841,
    role: 'start',
    label: 'Hjem',
    location: { lat: 63.35514, lon: 10.35346 },
    startTime: '2026-03-20T00:00:00',
    stopTime: '2026-03-20T11:30:00',
    isAllDay: false,
    isTemporary: false,
  },
];
const MOCK_ROUTE_SEGMENTS: MapRouteSegment[] = [
  {
    id: buildRouteSegmentId('start', 'assignment-1'),
    fromStopId: 'start',
    toStopId: 'assignment-1',
    coordinates: [
      [10.3951, 63.4305],
      [10.396, 63.431],
      [10.3951, 63.4305],
    ],
  },
  {
    id: buildRouteSegmentId('assignment-1', 'assignment-2'),
    fromStopId: 'assignment-1',
    toStopId: 'assignment-2',
    coordinates: [
      [10.3951, 63.4305],
      [10.421, 63.432],
      [10.4512, 63.4365],
    ],
  },
];

const MOCK_DAILY_PROGRESS: DailyProgressSummary = {
  completedAssignments: 1,
  totalAssignments: 4,
  completedTravelMinutes: 15,
  totalTravelMinutes: 45,
  typeBreakdown: [
    { label: 'Fiber', count: 2 },
    { label: 'El-nett', count: 1 },
  ],
};

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let queryParamSubject: ReplaySubject<ParamMap>;
  let assignmentServiceMock: {
    getAssignmentCardsByDesiredDate: ReturnType<typeof vi.fn>;
    getTravelTimesByDesiredDate: ReturnType<typeof vi.fn>;
    getDailyProgressByDesiredDate: ReturnType<typeof vi.fn>;
    getTechnicianLocationsByDesiredDate: ReturnType<typeof vi.fn>;
    updateTomorrowConfirmation: ReturnType<typeof vi.fn>;
  };
  let routingServiceMock: {
    getRouteSegments: ReturnType<typeof vi.fn>;
  };

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    queryParamSubject = new ReplaySubject<ParamMap>(1);

    assignmentServiceMock = {
      getAssignmentCardsByDesiredDate: vi.fn().mockReturnValue(of(MOCK_CARDS)),
      getTravelTimesByDesiredDate: vi.fn().mockReturnValue(of(MOCK_TRAVEL_TIMES)),
      getDailyProgressByDesiredDate: vi.fn().mockReturnValue(of(MOCK_DAILY_PROGRESS)),
      getTechnicianLocationsByDesiredDate: vi.fn().mockReturnValue(of(MOCK_TECHNICIAN_LOCATIONS)),
      updateTomorrowConfirmation: vi.fn().mockReturnValue(of(undefined)),
    };
    routingServiceMock = {
      getRouteSegments: vi.fn().mockReturnValue(of(MOCK_ROUTE_SEGMENTS)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RouterModule.forRoot([])],
      providers: [
        {
          provide: AssignmentService,
          useValue: assignmentServiceMock,
        },
        {
          provide: RoutingService,
          useValue: routingServiceMock,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
            queryParamMap: queryParamSubject.asObservable(),
          },
        },
        provideTranslateService(),
      ],
    }).compileComponents();

    // Set up translations
    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      sheet: {
        assignments: 'Oppdrag',
        today: 'i dag',
        tomorrow: 'i morgen',
        assignmentCountText: 'Oppdrag',
        assignmentCountTextPlural: 'Oppdrag',
      },
    });
    translateService.use('no');

    // Emit params before creating component so it's replayed on subscription
    queryParamSubject.next(convertToParamMap({}));

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to list view', () => {
    expect(component.isListView).toBe(true);
  });

  it('should default to today as selected day', () => {
    expect(component.selectedDay).toBe('today');
  });

  it('should load assignment cards on init', () => {
    expect(component.assignmentCards.length).toBe(4);
  });

  it('should load travel times on init', () => {
    expect(component.travelTimes).toEqual([15, 12, 10, 8]);
  });

  it('should build ordered stops and route segments on init', () => {
    expect(component.mapStops.map((stop) => stop.id)).toEqual([
      'start',
      'assignment-1',
      'assignment-2',
      'assignment-3',
      'assignment-4',
      'end',
    ]);
    expect(
      component.mapStops
        .filter((stop) => stop.kind === 'assignment')
        .map((stop) => stop.sequenceNumber),
    ).toEqual([1, 2, 3, 4]);
    expect(routingServiceMock.getRouteSegments).toHaveBeenCalledWith(component.mapStops);
    expect(component.routeSegments).toEqual(MOCK_ROUTE_SEGMENTS);
  });

  it('should show day selector', () => {
    const daySelector = fixture.debugElement.query(By.css('app-day-selector'));
    expect(daySelector).toBeTruthy();
  });

  it('should show the shared daily progress infobox', () => {
    const infobox = fixture.debugElement.query(By.css('app-daily-progress-infobox'));
    expect(infobox).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Dagens fremdrift');
  });

  it('should not render the technician start location card when first assignment is not next', () => {
    expect(component.shouldShowStartLocationCard).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Hjem');
  });

  it('should render the technician start location card when first assignment is next', async () => {
    const localFixture = TestBed.createComponent(DashboardPage);
    const localComponent = localFixture.componentInstance;

    localComponent.assignmentCards = [
      {
        ...MOCK_CARDS[1],
        status: 'next',
      },
      {
        ...MOCK_CARDS[2],
      },
    ];
    localComponent.technicianLocations = MOCK_TECHNICIAN_LOCATIONS;

    localFixture.detectChanges();
    await localFixture.whenStable();

    expect(localComponent.shouldShowStartLocationCard).toBe(true);
    expect(localFixture.nativeElement.textContent).toContain('Hjem');
  });

  it('should render the technician start location card in map-bottom-sheet when first assignment is next', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const localFixture = TestBed.createComponent(DashboardPage);
    const localComponent = localFixture.componentInstance;

    localComponent.assignmentCards = [
      {
        ...MOCK_CARDS[1],
        status: 'next',
      },
      {
        ...MOCK_CARDS[2],
      },
    ];
    localComponent.technicianLocations = MOCK_TECHNICIAN_LOCATIONS;
    localComponent.isListView = false;

    localFixture.detectChanges();
    await localFixture.whenStable();

    expect(localComponent.shouldShowStartLocationCard).toBe(true);
    expect(localFixture.nativeElement.textContent).toContain('Hjem');
  });

  it('should render the technician start location card for tomorrow view', async () => {
    const localFixture = TestBed.createComponent(DashboardPage);
    const localComponent = localFixture.componentInstance;

    localComponent.selectedDay = 'tomorrow';
    localComponent.assignmentCards = [
      {
        ...MOCK_CARDS[0],
        status: 'confirmed',
      },
      {
        ...MOCK_CARDS[2],
      },
    ];
    localComponent.technicianLocations = MOCK_TECHNICIAN_LOCATIONS;

    localFixture.detectChanges();
    await localFixture.whenStable();

    expect(localComponent.shouldShowStartLocationCard).toBe(true);
    expect(localFixture.nativeElement.textContent).toContain('Hjem');
  });

  it('should not show the daily progress infobox in map view', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const mapFixture = TestBed.createComponent(DashboardPage);
    const mapComponent = mapFixture.componentInstance;
    mapComponent.isListView = false;
    mapFixture.detectChanges();
    await mapFixture.whenStable();

    const infobox = mapFixture.debugElement.query(By.css('app-daily-progress-infobox'));
    expect(infobox).toBeFalsy();
  });

  it('should pass the selected day to the daily progress infobox', async () => {
    const todayInfobox = fixture.debugElement.query(By.directive(DailyProgressInfobox));
    expect(todayInfobox.componentInstance.day).toBe('today');

    const tomorrowFixture = TestBed.createComponent(DashboardPage);
    const tomorrowComponent = tomorrowFixture.componentInstance;
    tomorrowComponent.selectedDay = 'tomorrow';
    tomorrowFixture.detectChanges();
    await tomorrowFixture.whenStable();

    const tomorrowInfobox = tomorrowFixture.debugElement.query(By.directive(DailyProgressInfobox));
    expect(tomorrowInfobox.componentInstance.day).toBe('tomorrow');
  });

  it('should zoom to the incoming leg, snap the sheet, and highlight the matching card when a marker is clicked', () => {
    vi.useFakeTimers();
    component.isListView = false;

    const markerAssignment = {
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4305, lon: 10.3951 },
    };
    const focusAssignmentLeg = vi.fn();
    const focusAssignment = vi.fn();
    const snapTo = vi.fn();
    const scrollToElement = vi.fn();
    const cardRow = document.createElement('div');
    cardRow.dataset['assignmentId'] = '2';

    (component as unknown as Record<string, unknown>)['assignmentMap'] = {
      focusAssignmentLeg,
      focusAssignment,
    };
    (component as unknown as Record<string, unknown>)['mapBottomSheet'] = {
      snapTo,
      scrollToElement,
    };
    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: (predicate: (row: { nativeElement: HTMLElement }) => boolean) => {
        const row = { nativeElement: cardRow };
        return predicate(row) ? row : undefined;
      },
    };

    component.onMarkerClicked(markerAssignment);

    expect(component.activeRouteSegmentId).toBe(
      buildRouteSegmentId('assignment-1', 'assignment-2'),
    );
    expect(focusAssignmentLeg).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStop: expect.objectContaining({ id: 'assignment-1' }),
        toStop: expect.objectContaining({ id: 'assignment-2' }),
        routeSegment: MOCK_ROUTE_SEGMENTS[1],
        targetYRatio: MAP_BOTTOM_SHEET_PEEK_RATIO / 2,
      }),
    );
    expect(focusAssignment).not.toHaveBeenCalled();
    expect(snapTo).toHaveBeenCalledWith('peek');
    expect(scrollToElement).not.toHaveBeenCalled();
    expect(cardRow.classList.contains('marker-focused')).toBe(false);

    vi.advanceTimersByTime(280);

    expect(scrollToElement).toHaveBeenCalledWith(cardRow);
    expect(cardRow.classList.contains('marker-focused')).toBe(false);

    vi.advanceTimersByTime(180);

    expect(cardRow.classList.contains('marker-focused')).toBe(true);
  });

  it('should clear the highlighted card on the next user interaction', () => {
    vi.useFakeTimers();
    component.isListView = false;

    const cardRow = document.createElement('div');
    cardRow.dataset['assignmentId'] = '2';

    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: (predicate: (row: { nativeElement: HTMLElement }) => boolean) => {
        const row = { nativeElement: cardRow };
        return predicate(row) ? row : undefined;
      },
    };

    component.onMarkerClicked({
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4305, lon: 10.3951 },
    });

    vi.advanceTimersByTime(460);

    expect(cardRow.classList.contains('marker-focused')).toBe(true);

    component.onUserInteractionStart();

    expect(cardRow.classList.contains('marker-focused')).toBe(false);
  });

  it('should zoom assignment 1 together with the start stop', () => {
    component.isListView = false;

    const focusAssignmentLeg = vi.fn();

    (component as unknown as Record<string, unknown>)['assignmentMap'] = {
      focusAssignmentLeg,
      focusAssignment: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['mapBottomSheet'] = {
      snapTo: vi.fn(),
      scrollToElement: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: () => undefined,
    };

    component.onMarkerClicked({
      id: '1',
      name: 'Pågående oppdrag',
      location: { lat: 63.4305, lon: 10.3951 },
    });

    expect(component.activeRouteSegmentId).toBe(buildRouteSegmentId('start', 'assignment-1'));
    expect(focusAssignmentLeg).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStop: expect.objectContaining({ id: 'start' }),
        toStop: expect.objectContaining({ id: 'assignment-1' }),
        routeSegment: MOCK_ROUTE_SEGMENTS[0],
      }),
    );
  });

  it('should clear the active route segment when the selected day changes', () => {
    component.activeRouteSegmentId = buildRouteSegmentId('assignment-1', 'assignment-2');

    component.onDayChange('tomorrow');

    expect(component.selectedDay).toBe('tomorrow');
    expect(component.activeRouteSegmentId).toBeNull();
    expect(routingServiceMock.getRouteSegments).toHaveBeenCalledTimes(2);
  });

  it('should keep map markers functional when route data is unavailable', async () => {
    routingServiceMock.getRouteSegments.mockReturnValueOnce(of([]));

    const routeFixture = TestBed.createComponent(DashboardPage);
    const routeComponent = routeFixture.componentInstance;

    routeFixture.detectChanges();
    await routeFixture.whenStable();
    routeFixture.detectChanges();

    expect(routeComponent.mapAssignments.length).toBe(4);
    expect(routeComponent.routeSegments).toEqual([]);
  });
});
