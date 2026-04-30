import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterModule, convertToParamMap, ParamMap } from '@angular/router';
import { of, ReplaySubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { DashboardPage } from './dashboard-page';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { AvailabilityService } from '../../../../core/services/availability.service';
import { RoutingService } from '../../../../core/services/routing.service';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../../core/models/daily-progress.model';
import { TechnicianLocation } from '../../../../core/models/tech-location.model';
import { buildRouteSegmentId, MapRouteSegment } from '../../../../shared/components/map/map.models';

const MOCK_CARDS: Assignment[] = [
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
  let fixture: ComponentFixture<DashboardPage>;
  let component: DashboardPage;
  let queryParamSubject: ReplaySubject<ParamMap>;
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

  beforeEach(async () => {
    queryParamSubject = new ReplaySubject<ParamMap>(1);
    assignmentServiceMock = {
      getAssignmentCardsByDesiredDate: vi.fn().mockReturnValue(of(MOCK_CARDS)),
      getDailyProgressByDesiredDate: vi.fn().mockReturnValue(of(MOCK_DAILY_PROGRESS)),
      getTechnicianLocationsByDesiredDate: vi.fn().mockReturnValue(of(MOCK_TECHNICIAN_LOCATIONS)),
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

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RouterModule.forRoot([])],
      providers: [
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
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
            queryParamMap: queryParamSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      sheet: {
        today: 'i dag',
        tomorrow: 'i morgen',
        assignmentCountText: 'Oppdrag',
        assignmentCountTextPlural: 'Oppdrag',
      },
      travelTime: {
        departureUnavailable: 'Avreisetid er ikke tilgjengelig akkurat nå',
        travelUnavailableTitle: 'Kjøretid er ikke tilgjengelig',
        travelUnavailableMessage: 'Rute og kjøretid er ikke tilgjengelig akkurat nå.',
      },
      location: {
        leaveBy: 'Dra hjemmefra',
        leaveUnknown: 'Ukjent avreisetid',
        start: 'Start',
        end: 'Slutt',
        temporary: 'Midlertidig',
        allDay: 'Hele dagen',
        unknownTime: 'Ukjent tidspunkt',
      },
      map: {
        showCompletedAssignments: 'Vis fullførte i kartet',
        hideCompletedAssignments: 'Skjul fullførte i kartet',
      },
    });
    translateService.use('no');
  });

  afterEach(() => {
    fixture?.destroy();
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overscroll-behavior');
    document.documentElement.style.removeProperty('overscroll-behavior');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function createDashboard(initialQuery: Record<string, string> = {}) {
    queryParamSubject.next(convertToParamMap(initialQuery));
    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should apply query params from the route on init', async () => {
    await createDashboard({ day: 'tomorrow', view: 'map' });

    expect(component.selectedDay).toBe('tomorrow');
    expect(component.isListView).toBe(false);
  });

  it('should lock page scrolling when map view is active', async () => {
    await createDashboard({ view: 'map' });

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('should unlock page scrolling when switching back to list view', async () => {
    await createDashboard({ view: 'map' });

    component.onViewChange(true);

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('should navigate to assignment details with the current day and view', async () => {
    await createDashboard({ day: 'today', view: 'map' });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToAssignmentDetails('2');

    expect(navigateSpy).toHaveBeenCalledWith(['/assignments', '2'], {
      queryParams: {
        day: 'today',
        view: 'map',
      },
    });
  });

  it('should update query params when the day changes', async () => {
    await createDashboard();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onDayChange('tomorrow');

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        day: 'tomorrow',
        view: 'list',
      },
      queryParamsHandling: 'merge',
    });
  });

  it('should delegate marker clicks to the map focus API and peek the bottom sheet', async () => {
    await createDashboard({ view: 'map' });

    const focusAssignmentLeg = vi.fn();
    const snapTo = vi.fn();
    (component as unknown as { assignmentMap: { focusAssignmentLeg: () => void } }).assignmentMap = {
      focusAssignmentLeg,
    };
    (component as unknown as { mapBottomSheet: { snapTo: (value: string) => void } }).mapBottomSheet = {
      snapTo,
    };
    vi.spyOn(component as unknown as { scrollToAssignmentCard: (id: string) => void }, 'scrollToAssignmentCard').mockImplementation(() => undefined);

    component.onMarkerClicked({
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4365, lon: 10.4512 },
      description: 'Adresse 2',
      status: 'next',
    });

    expect(focusAssignmentLeg).toHaveBeenCalled();
    expect(snapTo).toHaveBeenCalledWith('peek');
  });

  it('should clear selection and collapse the bottom sheet when the map background is clicked', async () => {
    await createDashboard({ view: 'map' });

    const snapTo = vi.fn();
    (component as unknown as { mapBottomSheet: { snapTo: (value: string) => void } }).mapBottomSheet = {
      snapTo,
    };

    component.onMarkerClicked({
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4365, lon: 10.4512 },
      description: 'Adresse 2',
      status: 'next',
    });
    component.onMapBackgroundClicked();

    expect(component.focusedAssignmentId).toBeNull();
    expect(component.activeRouteSegmentId).toBeNull();
    expect(snapTo).toHaveBeenCalledWith('collapsed');
  });

  it('should delegate tomorrow confirmation toggles to the assignment service facade flow', async () => {
    await createDashboard();

    component.onTomorrowConfirmationChange('2', true);

    expect(assignmentServiceMock.updateTomorrowConfirmation).toHaveBeenCalledWith('2', true);
  });
});
