import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AssignmentService } from '../../../core/services/assignment.service';
import { AvailabilityService } from '../../../core/services/availability.service';
import { RoutingService } from '../../../core/services/routing.service';
import { Assignment } from '../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../core/models/daily-progress.model';
import { TechnicianLocation } from '../../../core/models/tech-location.model';
import { buildRouteSegmentId, MapRouteSegment } from '../../../shared/components/map/map.models';
import { DashboardFacade } from './dashboard-facade';
import { DashboardDerivedStateService } from './dashboard-derived-state.service';

const TODAY_CARDS: Assignment[] = [
  {
    id: '1',
    title: 'Pågående oppdrag',
    time: '11:30',
    address: 'Adresse 1',
    phoneNumber: '12345678',
    status: 'ongoing',
    date: '2026-03-20',
    locationPoint: { x: 10.3951, y: 63.4305 },
  },
  {
    id: '2',
    title: 'Neste oppdrag',
    time: '12:30',
    address: 'Adresse 2',
    phoneNumber: '87654321',
    status: 'next',
    date: '2026-03-20',
    locationPoint: { x: 10.4512, y: 63.4365 },
  },
  {
    id: '3',
    title: 'Kommende oppdrag',
    time: '13:45',
    address: 'Adresse 3',
    phoneNumber: '11111111',
    status: 'upcoming',
    date: '2026-03-20',
    locationPoint: { x: 10.3772, y: 63.4105 },
  },
  {
    id: '4',
    title: 'Fullført oppdrag',
    time: '07:00',
    address: 'Adresse 4',
    phoneNumber: '22222222',
    status: 'completed',
    date: '2026-03-20',
    locationPoint: { x: 10.4399, y: 63.4102 },
  },
];

const TOMORROW_CARDS: Assignment[] = [
  {
    id: '10',
    title: 'Morgendagens oppdrag',
    time: '08:15',
    address: 'Adresse 10',
    phoneNumber: '99999999',
    status: 'confirmed',
    date: '2026-03-21',
    locationPoint: { x: 10.4, y: 63.44 },
  },
];

const TECHNICIAN_LOCATIONS: TechnicianLocation[] = [
  {
    fieldTechId: 1,
    role: 'start',
    label: 'Hjem',
    location: { lat: 63.35514, lon: 10.35346 },
    startTime: '2026-03-20T00:00:00',
    stopTime: '2026-03-20T11:30:00',
    isAllDay: false,
    isTemporary: false,
  },
];

const DAILY_PROGRESS: DailyProgressSummary = {
  completedAssignments: 1,
  totalAssignments: 4,
  completedTravelMinutes: 15,
  totalTravelMinutes: 45,
  typeBreakdown: [
    { label: 'Fiber', count: 2 },
    { label: 'El-nett', count: 1 },
  ],
};

const VISIBLE_ROUTE_SEGMENTS: MapRouteSegment[] = [
  {
    id: buildRouteSegmentId('start', 'assignment-1'),
    fromStopId: 'start',
    toStopId: 'assignment-1',
    durationMinutes: 7,
    coordinates: [
      [10.3951, 63.4305],
      [10.396, 63.431],
    ],
  },
  {
    id: buildRouteSegmentId('assignment-1', 'assignment-2'),
    fromStopId: 'assignment-1',
    toStopId: 'assignment-2',
    durationMinutes: 11,
    coordinates: [
      [10.3951, 63.4305],
      [10.421, 63.432],
    ],
  },
  {
    id: buildRouteSegmentId('assignment-2', 'assignment-3'),
    fromStopId: 'assignment-2',
    toStopId: 'assignment-3',
    durationMinutes: 13,
    coordinates: [
      [10.4512, 63.4365],
      [10.421, 63.425],
    ],
  },
];

const ALL_DAY_ROUTE_SEGMENTS: MapRouteSegment[] = [
  {
    id: buildRouteSegmentId('start', 'assignment-4'),
    fromStopId: 'start',
    toStopId: 'assignment-4',
    durationMinutes: 3,
    coordinates: [
      [10.35346, 63.35514],
      [10.4399, 63.4102],
    ],
  },
  {
    id: buildRouteSegmentId('assignment-4', 'assignment-1'),
    fromStopId: 'assignment-4',
    toStopId: 'assignment-1',
    durationMinutes: 7,
    coordinates: [
      [10.4399, 63.4102],
      [10.3951, 63.4305],
    ],
  },
  {
    id: buildRouteSegmentId('assignment-1', 'assignment-2'),
    fromStopId: 'assignment-1',
    toStopId: 'assignment-2',
    durationMinutes: 11,
    coordinates: [
      [10.3951, 63.4305],
      [10.421, 63.432],
    ],
  },
  {
    id: buildRouteSegmentId('assignment-2', 'assignment-3'),
    fromStopId: 'assignment-2',
    toStopId: 'assignment-3',
    durationMinutes: 13,
    coordinates: [
      [10.4512, 63.4365],
      [10.421, 63.425],
    ],
  },
];

function getDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

describe('DashboardFacade', () => {
  let service: DashboardFacade;
  let assignmentServiceMock: {
    getAssignmentCardsByDesiredDate: ReturnType<typeof vi.fn>;
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

  beforeEach(() => {
    assignmentServiceMock = {
      getAssignmentCardsByDesiredDate: vi.fn().mockReturnValue(of(TODAY_CARDS)),
      getDailyProgressByDesiredDate: vi.fn().mockReturnValue(of(DAILY_PROGRESS)),
      getTechnicianLocationsByDesiredDate: vi.fn().mockReturnValue(of(TECHNICIAN_LOCATIONS)),
      updateTomorrowConfirmation: vi.fn().mockReturnValue(of(undefined)),
    };
    routingServiceMock = {
      getRouteSegments: vi
        .fn()
        .mockImplementation((stops: { id: string }[]) =>
          of(
            stops.some((stop) => stop.id === 'assignment-4')
              ? ALL_DAY_ROUTE_SEGMENTS
              : VISIBLE_ROUTE_SEGMENTS,
          ),
        ),
    };
    availabilityServiceMock = {
      getAvailabilitiesByDate: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        DashboardDerivedStateService,
        provideTranslateService(),
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
      ],
    });

    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      location: {
        allDay: 'Hele dagen',
        unknownTime: 'Ukjent tidspunkt',
      },
    });
    translateService.use('no');

    service = TestBed.inject(DashboardFacade);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('should load dashboard state on initial query application', () => {
    service.applyQueryState('today', true);

    expect(service.selectedDay()).toBe('today');
    expect(service.isListView()).toBe(true);
    expect(service.assignmentCards()).toHaveLength(4);
    expect(service.travelState()).toBe('ready');
    expect(service.getTravelTimeForCard('1')).toBe(7);
    expect(service.dailyProgress().totalTravelMinutes).toBe(34);
  });

  it('should apply view changes from query state without reloading the same day', () => {
    service.applyQueryState('today', true);
    service.applyQueryState('today', false);

    expect(service.isListView()).toBe(false);
    expect(assignmentServiceMock.getAssignmentCardsByDesiredDate).toHaveBeenCalledTimes(1);
  });

  it('should reload assignments when the selected day changes', () => {
    assignmentServiceMock.getAssignmentCardsByDesiredDate
      .mockReturnValueOnce(of(TODAY_CARDS))
      .mockReturnValueOnce(of(TOMORROW_CARDS));

    service.applyQueryState('today', true);
    service.setSelectedDay('tomorrow');

    expect(service.selectedDay()).toBe('tomorrow');
    expect(service.assignmentCards()).toEqual(TOMORROW_CARDS);
    expect(assignmentServiceMock.getAssignmentCardsByDesiredDate).toHaveBeenNthCalledWith(
      1,
      getDateString(0),
    );
    expect(assignmentServiceMock.getAssignmentCardsByDesiredDate).toHaveBeenNthCalledWith(
      2,
      getDateString(1),
    );
  });

  it('should keep the newest load when an older request resolves late', () => {
    const firstCards$ = new Subject<Assignment[]>();
    const secondCards$ = new Subject<Assignment[]>();

    assignmentServiceMock.getAssignmentCardsByDesiredDate
      .mockReturnValueOnce(firstCards$.asObservable())
      .mockReturnValueOnce(secondCards$.asObservable());

    service.applyQueryState('today', true);
    service.setSelectedDay('tomorrow');

    secondCards$.next(TOMORROW_CARDS);
    secondCards$.complete();
    firstCards$.next(TODAY_CARDS);
    firstCards$.complete();

    expect(service.selectedDay()).toBe('tomorrow');
    expect(service.assignmentCards()).toEqual(TOMORROW_CARDS);
  });

  it('should toggle completed visibility and clear focused selection when a hidden assignment drops out of the visible map', () => {
    service.applyQueryState('today', true);

    const selection = service.prepareSelectionFromCard(TODAY_CARDS[3]);
    expect(service.showCompletedAssignments()).toBe(true);
    expect(selection.selectionContext?.assignmentId).toBe('4');
    expect(service.focusedAssignmentId()).toBe('4');

    service.toggleCompletedAssignments();

    expect(service.showCompletedAssignments()).toBe(false);
    expect(service.focusedAssignmentId()).toBeNull();
    expect(service.activeRouteSegmentId()).toBeNull();
  });

  it('should reload the current day after updating tomorrow confirmation', () => {
    service.applyQueryState('today', true);
    service.updateTomorrowConfirmation('1', true);

    expect(assignmentServiceMock.updateTomorrowConfirmation).toHaveBeenCalledWith('1', true);
    expect(assignmentServiceMock.getAssignmentCardsByDesiredDate).toHaveBeenCalledTimes(2);
  });
});
