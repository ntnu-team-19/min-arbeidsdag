import { describe, expect, it } from 'vitest';
import { Assignment } from '../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../core/models/daily-progress.model';
import { TechnicianLocation } from '../../../core/models/tech-location.model';
import { buildAvailabilityCardId } from '../../../core/mappers/availability-card.mapper';
import { buildRouteSegmentId, MapRouteSegment } from '../../../shared/components/map/map.models';
import { DashboardDerivedStateService } from './dashboard-derived-state.service';

const ASSIGNMENT_CARDS: Assignment[] = [
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

const BASE_SUMMARY: DailyProgressSummary = {
  completedAssignments: 1,
  totalAssignments: 4,
  completedTravelMinutes: 15,
  totalTravelMinutes: 45,
  typeBreakdown: [
    { label: 'Fiber', count: 2 },
    { label: 'El-nett', count: 1 },
  ],
};

function createRouteSegment(
  fromStopId: string,
  toStopId: string,
  durationMinutes?: number,
): MapRouteSegment {
  return {
    id: buildRouteSegmentId(fromStopId, toStopId),
    fromStopId,
    toStopId,
    coordinates: [
      [10.3, 63.4],
      [10.4, 63.5],
    ],
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
  };
}

describe('DashboardDerivedStateService', () => {
  const service = new DashboardDerivedStateService();

  it('should merge availability cards between the first two upcoming assignments', () => {
    const availabilityCard: Assignment = {
      id: buildAvailabilityCardId('2026-03-20T14:15:00'),
      title: 'Tannlegetime',
      shortDescription: 'Privat avtale',
      time: '14:15-14:45',
      duration: '30 min',
      address: 'Tannlegeveien 5',
      phoneNumber: '',
      status: 'absence',
      date: '2026-03-20',
      isAvailability: true,
    };

    const mergedCards = service.mergeCardsWithAvailability(
      [...ASSIGNMENT_CARDS.slice(0, 3), { ...ASSIGNMENT_CARDS[2], id: '5', time: '15:00' }, ASSIGNMENT_CARDS[3]],
      [availabilityCard],
    );

    expect(mergedCards.map((card) => card.title)).toEqual([
      'Pågående oppdrag',
      'Neste oppdrag',
      'Kommende oppdrag',
      'Tannlegetime',
      'Kommende oppdrag',
      'Fullført oppdrag',
    ]);
  });

  it('should build assignment sequence numbers from time order', () => {
    const sequenceNumbers = service.buildAssignmentSequenceNumbers([
      ASSIGNMENT_CARDS[1],
      ASSIGNMENT_CARDS[3],
      ASSIGNMENT_CARDS[0],
      ASSIGNMENT_CARDS[2],
    ]);

    expect(sequenceNumbers).toEqual({
      '1': 2,
      '2': 3,
      '3': 4,
      '4': 1,
    });
  });

  it('should build visible and all-day map state with completed cards filtered from the visible map', () => {
    const mapState = service.buildMapState({
      assignmentCards: ASSIGNMENT_CARDS,
      technicianLocations: TECHNICIAN_LOCATIONS,
      showCompletedAssignments: false,
    });

    expect(mapState.visibleCards.map((card) => card.id)).toEqual(['1', '2', '3']);
    expect(mapState.mapAssignments.map((assignment) => assignment.id)).toEqual(['1', '2', '3']);
    expect(mapState.mapStops.map((stop) => stop.id)).toEqual([
      'start',
      'assignment-1',
      'assignment-2',
      'assignment-3',
      'end',
    ]);
    expect(mapState.allDayMapStops.map((stop) => stop.id)).toEqual([
      'start',
      'assignment-4',
      'assignment-1',
      'assignment-2',
      'assignment-3',
      'end',
    ]);
  });

  it('should resolve the focused route selection from the all-day stop order', () => {
    const mapState = service.buildMapState({
      assignmentCards: ASSIGNMENT_CARDS,
      technicianLocations: TECHNICIAN_LOCATIONS,
      showCompletedAssignments: false,
    });
    const allRouteSegments = [
      createRouteSegment('start', 'assignment-4', 3),
      createRouteSegment('assignment-4', 'assignment-1', 7),
      createRouteSegment('assignment-1', 'assignment-2', 11),
      createRouteSegment('assignment-2', 'assignment-3', 13),
    ];

    const selectionContext = service.resolveSelectionContext({
      assignmentId: '2',
      mapStops: mapState.mapStops,
      allDayMapStops: mapState.allDayMapStops,
      routeSegments: allRouteSegments,
      allRouteSegments,
      assignmentSequenceNumbers: mapState.assignmentSequenceNumbers,
    });

    expect(selectionContext?.previousStop?.id).toBe('assignment-1');
    expect(selectionContext?.currentStop?.id).toBe('assignment-2');
    expect(selectionContext?.activeRouteSegmentId).toBe(
      buildRouteSegmentId('assignment-1', 'assignment-2'),
    );
  });

  it('should aggregate per-card travel times and recompute progress from resolved route legs', () => {
    const mapState = service.buildMapState({
      assignmentCards: ASSIGNMENT_CARDS,
      technicianLocations: TECHNICIAN_LOCATIONS,
      showCompletedAssignments: true,
    });

    const routeState = service.buildRouteState({
      visibleStops: mapState.mapStops,
      allStops: mapState.allDayMapStops,
      visibleSegments: [
        createRouteSegment('start', 'assignment-4', 3),
        createRouteSegment('assignment-4', 'assignment-1', 7),
        createRouteSegment('assignment-1', 'assignment-2', 11),
        createRouteSegment('assignment-2', 'assignment-3', 13),
        createRouteSegment('assignment-3', 'end', 5),
      ],
      baseSummary: BASE_SUMMARY,
      assignmentCards: ASSIGNMENT_CARDS,
    });

    expect(routeState.travelState).toBe('ready');
    expect(routeState.travelTimesByAssignmentId.get('4')).toBe(3);
    expect(routeState.travelTimesByAssignmentId.get('1')).toBe(7);
    expect(routeState.travelTimesByAssignmentId.get('2')).toBe(11);
    expect(routeState.travelTimesByAssignmentId.get('3')).toBe(13);
    expect(routeState.dailyProgress.completedTravelMinutes).toBe(3);
    expect(routeState.dailyProgress.totalTravelMinutes).toBe(34);
  });

  it('should clear travel metrics when route durations are unavailable and keep partial totals when only some legs resolve', () => {
    const mapState = service.buildMapState({
      assignmentCards: ASSIGNMENT_CARDS,
      technicianLocations: TECHNICIAN_LOCATIONS,
      showCompletedAssignments: false,
    });

    const unavailableRouteState = service.buildRouteState({
      visibleStops: mapState.mapStops,
      allStops: mapState.allDayMapStops,
      visibleSegments: [
        createRouteSegment('start', 'assignment-4'),
        createRouteSegment('assignment-4', 'assignment-1'),
      ],
      baseSummary: BASE_SUMMARY,
      assignmentCards: ASSIGNMENT_CARDS,
    });

    expect(unavailableRouteState.travelState).toBe('unavailable');
    expect(unavailableRouteState.dailyProgress.completedTravelMinutes).toBe(0);
    expect(unavailableRouteState.dailyProgress.totalTravelMinutes).toBe(0);

    const partialRouteState = service.buildRouteState({
      visibleStops: mapState.mapStops,
      allStops: mapState.allDayMapStops,
      visibleSegments: [
        createRouteSegment('start', 'assignment-4', 3),
        createRouteSegment('assignment-4', 'assignment-1', 7),
        createRouteSegment('assignment-1', 'assignment-2'),
        createRouteSegment('assignment-2', 'assignment-3', 13),
      ],
      baseSummary: BASE_SUMMARY,
      assignmentCards: ASSIGNMENT_CARDS,
    });

    expect(partialRouteState.travelState).toBe('ready');
    expect(partialRouteState.dailyProgress.completedTravelMinutes).toBe(3);
    expect(partialRouteState.dailyProgress.totalTravelMinutes).toBe(23);
  });
});
