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
import { AssignmentMap } from '../../../../shared/components/map/map';
import { MiniAssignmentCard } from '../../components/mini-assignment-card/mini-assignment-card';
import {
  MAP_BOTTOM_SHEET_COLLAPSED_VISIBLE_HEIGHT,
  MAP_BOTTOM_SHEET_EXPANDED_RATIO,
  MAP_BOTTOM_SHEET_PEEK_RATIO,
} from '../../components/map-bottom-sheet/map-bottom-sheet';
import { RoutingService } from '../../../../core/services/routing.service';
import { buildRouteSegmentId, MapRouteSegment } from '../../../../shared/components/map/map.models';
import { AvailabilityService } from '../../../../core/services/availability.service';
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
  let availabilityServiceMock: {
    getAvailabilitiesByDate: ReturnType<typeof vi.fn>;
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
    availabilityServiceMock = {
      getAvailabilitiesByDate: vi.fn().mockReturnValue(of([])),
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
          provide: AvailabilityService,
          useValue: availabilityServiceMock,
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
      daySelector: {
        todayOverview: 'Dagens Oversikt',
        tomorrowOverview: 'Morgendagens Oversikt',
        selectDay: 'Velg oversikt for dag',
      },
      sheet: {
        assignments: 'Oppdrag',
        today: 'i dag',
        tomorrow: 'i morgen',
        assignmentCountText: 'Oppdrag',
        assignmentCountTextPlural: 'Oppdrag',
      },
      travelTime: {
        minDriving: 'min kjøring',
      },
      status: {
        ongoing: 'Pågående oppdrag',
        next: 'Neste oppdrag',
        upcoming: 'Kommende oppdrag',
        completed: 'Fullført oppdrag',
      },
      assignment: {
        noDescription: 'Ingen beskrivelse tilgjengelig',
        notSpecified: 'Ikke oppgitt',
        markConfirmed: 'Marker som bekreftet',
        markUnconfirmed: 'Marker som ikke bekreftet',
      },
      location: {
        allDay: 'Hele dagen',
        unknownTime: 'Ukjent tidspunkt',
      },
      dailyProgress: {
        todayTitle: 'Dagens fremdrift',
        tomorrowTitle: 'Morgendagens oversikt',
        assignmentHeadline:
          '{{assignmentCount}} {{assignmentLabel}} fordelt på {{typeCount}} {{typeLabel}}',
        assignmentLabelSingular: 'oppdrag',
        assignmentLabelPlural: 'oppdrag',
        typeLabelSingular: 'type',
        typeLabelPlural: 'typer',
        assignmentTypes: 'Oppdragstyper',
        showAssignmentTypes: 'Vis oppdragstyper',
        hideAssignmentTypes: 'Skjul oppdragstyper',
        completedAssignments: 'Fullførte oppdrag',
        plannedAssignments: 'Planlagte oppdrag',
        noAssignmentsRegistered: 'Ingen oppdrag registrert',
        allAssignmentsCompleted: 'Alle oppdrag er fullført',
        assignmentsRemaining: '{{count}} {{assignmentLabel}} gjenstår',
        plannedTravelTime: 'Planlagt kjøretid: {{minutes}} min',
        travelTime: 'Kjøretid: {{completedMinutes}} min av {{totalMinutes}} min',
        tomorrowEstimate: 'Estimert for morgendagens oppdrag',
        travelTimeFootnote: '{{percentage}}% av dagens tid brukt på kjøring',
        noAssignmentTypesPlanned: 'Ingen oppdragstyper planlagt',
        noAssignmentTypesForDay: 'Ingen oppdragstyper for valgt dag',
        plannedDrivingTime: 'Planlagt kjøretid',
        drivingTimeUsed: 'Kjøretid brukt',
      },
      map: {
        showCompletedAssignments: 'Vis fullførte i kartet',
        hideCompletedAssignments: 'Skjul fullførte i kartet',
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
      'end',
    ]);
    expect(
      component.mapStops
        .filter((stop) => stop.kind === 'assignment')
        .map((stop) => stop.sequenceNumber),
    ).toEqual([2, 3, 4]);
    expect(routingServiceMock.getRouteSegments).toHaveBeenCalledWith(component.mapStops);
    expect(component.routeSegments).toEqual(MOCK_ROUTE_SEGMENTS);
  });

  it('should include assignment status in map assignments and expose the fallback user location', () => {
    expect(component.mapAssignments[0]).toEqual(
      expect.objectContaining({
        id: '1',
        status: 'ongoing',
      }),
    );
    expect(component.fallbackUserLocation).toEqual(MOCK_TECHNICIAN_LOCATIONS[0]?.location);
  });

  it('should keep fixed day sequence numbers for assignments', () => {
    expect(component.assignmentSequenceNumbers).toEqual({
      '4': 1,
      '1': 2,
      '2': 3,
      '3': 4,
    });
    expect(
      component.mapStops
        .filter((stop) => stop.kind === 'assignment')
        .map((stop) => stop.sequenceNumber),
    ).toEqual([2, 3, 4]);
  });

  it('should default the overview bottom inset ratio to the peek sheet ratio', () => {
    expect(component.currentMapSheetSnap).toBe('peek');
    expect(component.overviewBottomInsetRatio).toBeCloseTo(1 - MAP_BOTTOM_SHEET_PEEK_RATIO);
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

  it('should hide travel time indicators before completed assignments in the map bottom sheet', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const mapFixture = TestBed.createComponent(DashboardPage);
    const mapComponent = mapFixture.componentInstance;
    mapComponent.isListView = false;
    mapFixture.detectChanges();
    await mapFixture.whenStable();
    mapFixture.detectChanges();

    const travelIndicators = mapFixture.debugElement.queryAll(By.css('app-travel-time-indicator'));
    expect(travelIndicators).toHaveLength(3);
  });

  it('should keep list-view travel time indicators unchanged', () => {
    const travelIndicators = fixture.debugElement.queryAll(By.css('app-travel-time-indicator'));
    expect(travelIndicators).toHaveLength(3);
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

  it('should pass the overview bottom inset ratio to the map in map view', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const mapFixture = TestBed.createComponent(DashboardPage);
    const mapComponent = mapFixture.componentInstance;
    mapComponent.isListView = false;
    mapFixture.detectChanges();
    await mapFixture.whenStable();
    mapFixture.detectChanges();

    const mapDebug = mapFixture.debugElement.query(By.directive(AssignmentMap));

    expect(mapDebug.componentInstance.enableCompletedFilter).toBe(true);
    expect(mapDebug.componentInstance.overviewBottomInsetRatio).toBeCloseTo(
      1 - MAP_BOTTOM_SHEET_PEEK_RATIO,
    );
  });

  it('should update overview inset ratio when the bottom sheet snap changes', () => {
    Object.defineProperty(component, 'mapStageRef', {
      value: {
        nativeElement: {
          getBoundingClientRect: () => ({
            height: 800,
          }),
        },
      },
      configurable: true,
    });

    component.onSnapChanged('expanded');
    expect(component.currentMapSheetSnap).toBe('expanded');
    expect(component.overviewBottomInsetRatio).toBeCloseTo(1 - MAP_BOTTOM_SHEET_EXPANDED_RATIO);

    component.onSnapChanged('collapsed');
    expect(component.currentMapSheetSnap).toBe('collapsed');
    expect(component.overviewBottomInsetRatio).toBeCloseTo(
      MAP_BOTTOM_SHEET_COLLAPSED_VISIBLE_HEIGHT / 800,
    );
  });

  it('should disable overview auto-fit when the bottom sheet is expanded', () => {
    expect(component.enableOverviewAutoFit).toBe(true);

    component.onSnapChanged('expanded');

    expect(component.enableOverviewAutoFit).toBe(false);
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

    expect(component.focusedAssignmentId).toBe('2');
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

  it('should zoom a sequence-1 assignment together with the start stop when that leg exists', () => {
    component.isListView = false;

    const focusAssignmentLeg = vi.fn();
    const focusAssignment = vi.fn();

    (component as unknown as Record<string, unknown>)['assignmentMap'] = {
      focusAssignmentLeg,
      focusAssignment,
    };
    (component as unknown as Record<string, unknown>)['mapBottomSheet'] = {
      snapTo: vi.fn(),
      scrollToElement: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: () => undefined,
    };
    component.assignmentSequenceNumbers = {
      '4': 1,
      '1': 2,
      '2': 3,
      '3': 4,
    };
    component.mapStops = [
      {
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: { lat: 63.35514, lon: 10.35346 },
      },
      {
        id: 'assignment-4',
        kind: 'assignment',
        label: 'Fullført oppdrag',
        assignmentId: '4',
        sequenceNumber: 1,
        location: { lat: 63.4102, lon: 10.4399 },
      },
      {
        id: 'end',
        kind: 'end',
        label: 'Slutt',
        location: { lat: 63.35514, lon: 10.35346 },
      },
    ];
    component.allDayMapStops = component.mapStops;
    component.routeSegments = [
      {
        id: buildRouteSegmentId('start', 'assignment-4'),
        fromStopId: 'start',
        toStopId: 'assignment-4',
        coordinates: [
          [10.35346, 63.35514],
          [10.4399, 63.4102],
        ],
      },
    ];
    component.allRouteSegments = component.routeSegments;

    component.onMarkerClicked({
      id: '4',
      name: 'Fullført oppdrag',
      location: { lat: 63.4102, lon: 10.4399 },
    });

    expect(component.activeRouteSegmentId).toBe(buildRouteSegmentId('start', 'assignment-4'));
    expect(focusAssignmentLeg).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStop: expect.objectContaining({ id: 'start' }),
        toStop: expect.objectContaining({ id: 'assignment-4' }),
        routeSegment: expect.objectContaining({
          id: buildRouteSegmentId('start', 'assignment-4'),
        }),
      }),
    );
    expect(focusAssignment).not.toHaveBeenCalled();
  });

  it('should reuse marker click flow when mini card directions is clicked', () => {
    const markerClickSpy = vi.spyOn(component, 'onMarkerClicked');

    component.onMiniAssignmentDirectionsClick(MOCK_CARDS[1]);

    expect(markerClickSpy).toHaveBeenCalledWith(component.mapAssignments[1]);
  });

  it('should build fallback map assignment when mini card is missing from mapAssignments', () => {
    const markerClickSpy = vi.spyOn(component, 'onMarkerClicked');
    component.mapAssignments = [];

    component.onMiniAssignmentDirectionsClick(MOCK_CARDS[2]);

    expect(markerClickSpy).toHaveBeenCalledWith({
      id: '3',
      name: 'Kommende oppdrag',
      location: { lat: 63.4105, lon: 10.3772 },
      description: 'Adresse 3, 7021 Trondheim',
      status: 'upcoming',
    });
  });

  it('should show completed assignments in the map when the map filter is toggled', () => {
    component.onCompletedAssignmentsToggle();

    expect(component.showCompletedAssignments).toBe(true);
    expect(component.mapAssignments.map((assignment) => assignment.id)).toEqual(['1', '2', '3', '4']);
    expect(component.mapStops.map((stop) => stop.id)).toEqual([
      'start',
      'assignment-4',
      'assignment-1',
      'assignment-2',
      'assignment-3',
      'end',
    ]);
    expect(
      component.mapStops
        .filter((stop) => stop.kind === 'assignment')
        .map((stop) => stop.sequenceNumber),
    ).toEqual([1, 2, 3, 4]);
    expect(component.allDayMapStops.map((stop) => stop.id)).toEqual([
      'start',
      'assignment-4',
      'assignment-1',
      'assignment-2',
      'assignment-3',
      'end',
    ]);
  });

  it('should preserve original day numbers when a hidden completed assignment creates a gap', () => {
    component.assignmentCards = [MOCK_CARDS[0], MOCK_CARDS[3], MOCK_CARDS[1], MOCK_CARDS[2]];
    component.assignmentSequenceNumbers = {
      '1': 1,
      '4': 2,
      '2': 3,
      '3': 4,
    };
    component.showCompletedAssignments = false;

    (
      component as unknown as {
        refreshMapData: (loadVersion: number) => void;
      }
    ).refreshMapData(1);

    expect(component.mapAssignments.map((assignment) => assignment.id)).toEqual(['1', '2', '3']);
    expect(component.mapStops.map((stop) => stop.id)).toEqual([
      'start',
      'assignment-1',
      'assignment-2',
      'assignment-3',
      'end',
    ]);
    expect(
      component.mapStops
        .filter((stop) => stop.kind === 'assignment')
        .map((stop) => stop.sequenceNumber),
    ).toEqual([1, 3, 4]);
  });

  it('should show the route from home for the first assignment of the day', () => {
    component.isListView = false;
    component.assignmentSequenceNumbers = { '1': 1, '2': 2 };
    component.mapStops = [
      {
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: { lat: 63.35514, lon: 10.35346 },
      },
      {
        id: 'assignment-1',
        kind: 'assignment',
        label: 'Pågående oppdrag',
        assignmentId: '1',
        sequenceNumber: 1,
        location: { lat: 63.4305, lon: 10.3951 },
      },
      {
        id: 'end',
        kind: 'end',
        label: 'Slutt',
        location: { lat: 63.35514, lon: 10.35346 },
      },
    ];
    component.allDayMapStops = component.mapStops;
    component.routeSegments = [
      {
        id: buildRouteSegmentId('start', 'assignment-1'),
        fromStopId: 'start',
        toStopId: 'assignment-1',
        coordinates: [
          [10.35346, 63.35514],
          [10.3951, 63.4305],
        ],
      },
    ];
    component.allRouteSegments = component.routeSegments;

    const focusAssignmentLeg = vi.fn();
    const focusAssignment = vi.fn();

    (component as unknown as Record<string, unknown>)['assignmentMap'] = {
      focusAssignmentLeg,
      focusAssignment,
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
      }),
    );
    expect(focusAssignment).not.toHaveBeenCalled();
  });

  it('should show the true previous assignment route even when that assignment is hidden from the map', () => {
    component.isListView = false;
    component.assignmentSequenceNumbers = {
      '1': 1,
      '2': 2,
      '3': 3,
    };
    component.mapStops = [
      {
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: { lat: 63.35514, lon: 10.35346 },
      },
      {
        id: 'assignment-2',
        kind: 'assignment',
        label: 'Neste oppdrag',
        assignmentId: '2',
        sequenceNumber: 2,
        location: { lat: 63.4365, lon: 10.4512 },
      },
      {
        id: 'assignment-3',
        kind: 'assignment',
        label: 'Kommende oppdrag',
        assignmentId: '3',
        sequenceNumber: 3,
        location: { lat: 63.4105, lon: 10.3772 },
      },
      {
        id: 'end',
        kind: 'end',
        label: 'Slutt',
        location: { lat: 63.35514, lon: 10.35346 },
      },
    ];
    component.allDayMapStops = [
      {
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: { lat: 63.35514, lon: 10.35346 },
      },
      {
        id: 'assignment-1',
        kind: 'assignment',
        label: 'Første oppdrag',
        assignmentId: '1',
        sequenceNumber: 1,
        location: { lat: 63.4305, lon: 10.3951 },
      },
      {
        id: 'assignment-2',
        kind: 'assignment',
        label: 'Neste oppdrag',
        assignmentId: '2',
        sequenceNumber: 2,
        location: { lat: 63.4365, lon: 10.4512 },
      },
      {
        id: 'assignment-3',
        kind: 'assignment',
        label: 'Kommende oppdrag',
        assignmentId: '3',
        sequenceNumber: 3,
        location: { lat: 63.4105, lon: 10.3772 },
      },
      {
        id: 'end',
        kind: 'end',
        label: 'Slutt',
        location: { lat: 63.35514, lon: 10.35346 },
      },
    ];
    component.routeSegments = [
      {
        id: buildRouteSegmentId('assignment-2', 'assignment-3'),
        fromStopId: 'assignment-2',
        toStopId: 'assignment-3',
        coordinates: [
          [10.4512, 63.4365],
          [10.3772, 63.4105],
        ],
      },
    ];
    component.allRouteSegments = [
      {
        id: buildRouteSegmentId('start', 'assignment-1'),
        fromStopId: 'start',
        toStopId: 'assignment-1',
        coordinates: [
          [10.35346, 63.35514],
          [10.3951, 63.4305],
        ],
      },
      {
        id: buildRouteSegmentId('assignment-1', 'assignment-2'),
        fromStopId: 'assignment-1',
        toStopId: 'assignment-2',
        coordinates: [
          [10.3951, 63.4305],
          [10.4512, 63.4365],
        ],
      },
      {
        id: buildRouteSegmentId('assignment-2', 'assignment-3'),
        fromStopId: 'assignment-2',
        toStopId: 'assignment-3',
        coordinates: [
          [10.4512, 63.4365],
          [10.3772, 63.4105],
        ],
      },
    ];

    const focusAssignmentLeg = vi.fn();
    const focusAssignment = vi.fn();

    (component as unknown as Record<string, unknown>)['assignmentMap'] = {
      focusAssignmentLeg,
      focusAssignment,
    };
    (component as unknown as Record<string, unknown>)['mapBottomSheet'] = {
      snapTo: vi.fn(),
      scrollToElement: vi.fn(),
    };
    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: () => undefined,
    };

    component.onMarkerClicked({
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4365, lon: 10.4512 },
    });

    expect(component.activeRouteSegmentId).toBe(
      buildRouteSegmentId('assignment-1', 'assignment-2'),
    );
    expect(component.displayedRouteSegments.map((segment) => segment.id)).toContain(
      buildRouteSegmentId('assignment-1', 'assignment-2'),
    );
    expect(focusAssignmentLeg).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStop: expect.objectContaining({ id: 'assignment-1' }),
        toStop: expect.objectContaining({ id: 'assignment-2' }),
        routeSegment: expect.objectContaining({
          id: buildRouteSegmentId('assignment-1', 'assignment-2'),
        }),
      }),
    );
    expect(focusAssignment).not.toHaveBeenCalled();
  });

  it('should pass fixed day sequence numbers to mini assignment cards in map view', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const mapFixture = TestBed.createComponent(DashboardPage);
    const mapComponent = mapFixture.componentInstance;
    mapComponent.isListView = false;
    mapFixture.detectChanges();
    await mapFixture.whenStable();
    mapFixture.detectChanges();

    const miniCards = mapFixture.debugElement.queryAll(By.directive(MiniAssignmentCard));
    expect(miniCards).toHaveLength(4);
    expect(miniCards.map((card) => card.componentInstance.sequenceNumber)).toEqual([2, 3, 4, 1]);
  });

  it('should clear focus when the completed filter removes the focused assignment', () => {
    component.showCompletedAssignments = true;
    component.focusedAssignmentId = '4';
    component.activeRouteSegmentId = buildRouteSegmentId('assignment-3', 'assignment-4');

    component.onCompletedAssignmentsToggle();

    expect(component.focusedAssignmentId).toBeNull();
    expect(component.activeRouteSegmentId).toBeNull();
  });

  it('should reveal completed assignments on the map when directions are requested for a hidden completed card', () => {
    const markerClickSpy = vi.spyOn(component, 'onMarkerClicked');
    component.showCompletedAssignments = false;
    (
      component as unknown as {
        refreshMapData: (loadVersion: number) => void;
      }
    ).refreshMapData(1);

    component.onMiniAssignmentDirectionsClick(MOCK_CARDS[3]);

    expect(component.showCompletedAssignments).toBe(true);
    expect(markerClickSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '4',
        status: 'completed',
      }),
    );
  });

  it('should clear the active route segment when the selected day changes', () => {
    component.activeRouteSegmentId = buildRouteSegmentId('assignment-1', 'assignment-2');
    component.focusedAssignmentId = '2';

    component.onDayChange('tomorrow');

    expect(component.selectedDay).toBe('tomorrow');
    expect(component.activeRouteSegmentId).toBeNull();
    expect(component.focusedAssignmentId).toBeNull();
    expect(routingServiceMock.getRouteSegments).toHaveBeenCalledTimes(4);
  });

  it('should clear focused assignment state when switching views', () => {
    component.focusedAssignmentId = '2';
    component.activeRouteSegmentId = buildRouteSegmentId('assignment-1', 'assignment-2');

    component.onViewChange(false);

    expect(component.focusedAssignmentId).toBeNull();
    expect(component.activeRouteSegmentId).toBeNull();
  });

  it('should clear focused assignment and active route when clicking empty map space', () => {
    component.focusedAssignmentId = '2';
    component.activeRouteSegmentId = buildRouteSegmentId('assignment-1', 'assignment-2');
    component.focusedRouteSegment = {
      id: buildRouteSegmentId('assignment-1', 'assignment-2'),
      fromStopId: 'assignment-1',
      toStopId: 'assignment-2',
      coordinates: [],
    };

    component.onMapBackgroundClicked();

    expect(component.focusedAssignmentId).toBeNull();
    expect(component.activeRouteSegmentId).toBeNull();
    expect(component.focusedRouteSegment).toBeNull();
  });

  it('should keep map markers functional when route data is unavailable', async () => {
    routingServiceMock.getRouteSegments.mockReturnValueOnce(of([]));

    const routeFixture = TestBed.createComponent(DashboardPage);
    const routeComponent = routeFixture.componentInstance;

    routeFixture.detectChanges();
    await routeFixture.whenStable();
    routeFixture.detectChanges();

    expect(routeComponent.mapAssignments.length).toBe(3);
    expect(routeComponent.routeSegments).toEqual([]);
  });

  it('should place availability card between two upcoming assignments', () => {
    const cardsWithTwoUpcoming: Assignment[] = [
      ...MOCK_CARDS.slice(0, 3),
      {
        id: '5',
        fieldTechId: 40231,
        title: 'Kommende oppdrag 2',
        shortDescription: 'Beskrivelse 5',
        time: '15:00',
        address: 'Adresse 5, 7032 Trondheim',
        phoneNumber: '33333333',
        status: 'upcoming',
        date: '2026-03-20',
        locationPoint: { x: 10.4301, y: 63.4058 },
      },
      MOCK_CARDS[3],
    ];

    assignmentServiceMock.getAssignmentCardsByDesiredDate.mockReturnValueOnce(
      of(cardsWithTwoUpcoming),
    );
    assignmentServiceMock.getTravelTimesByDesiredDate.mockReturnValueOnce(of([15, 12, 10, 9, 8]));
    availabilityServiceMock.getAvailabilitiesByDate.mockReturnValueOnce(
      of([
        {
          start: '2026-03-20T14:15:00',
          stop: '2026-03-20T14:45:00',
          title: 'Tannlegetime',
          shortDescription: 'Privat avtale.',
          address: 'Tannlege',
          phoneNumber: '',
          calculatedTraveltime: 12,
          available: false,
          allDay: false,
          absenceWithoutGoingHome: false,
          locationPoint: null,
        },
      ]),
    );

    component.onDayChange('today');

    const titles = component.assignmentCards.map((card) => card.title);
    expect(titles).toEqual([
      'Pågående oppdrag',
      'Neste oppdrag',
      'Kommende oppdrag',
      'Tannlegetime',
      'Kommende oppdrag 2',
      'Fullført oppdrag',
    ]);

    const availabilityCard = component.assignmentCards.find(
      (card) => card.title === 'Tannlegetime',
    );
    expect(availabilityCard).toBeTruthy();
    expect(component.getTravelTimeForCard(availabilityCard!)).toBe(12);
  });
});
