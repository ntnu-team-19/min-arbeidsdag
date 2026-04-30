import { Injectable } from '@angular/core';
import { DEFAULT_TECHNICIAN_BASE } from '../../../core/data/mock-technician-bases';
import { Assignment } from '../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../core/models/daily-progress.model';
import { TechnicianLocation } from '../../../core/models/tech-location.model';
import {
  Assignment as MapAssignment,
  MapRouteSegment,
  MapStop,
} from '../../../shared/components/map/map';
import { buildRouteSegmentId, MapLocation } from '../../../shared/components/map/map.models';
import { DashboardMapState, DashboardRouteState, DashboardSelectionContext } from './dashboard-facade.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardDerivedStateService {
  mergeCardsWithAvailability(
    assignmentCards: Assignment[],
    availabilityCards: Assignment[],
  ): Assignment[] {
    if (availabilityCards.length === 0) {
      return assignmentCards;
    }

    const firstUpcomingIndex = assignmentCards.findIndex((card) => card.status === 'upcoming');
    const secondUpcomingIndex = assignmentCards.findIndex(
      (card, index) => index > firstUpcomingIndex && card.status === 'upcoming',
    );

    if (firstUpcomingIndex === -1 || secondUpcomingIndex === -1) {
      return [...assignmentCards, ...availabilityCards];
    }

    return [
      ...assignmentCards.slice(0, secondUpcomingIndex),
      ...availabilityCards,
      ...assignmentCards.slice(secondUpcomingIndex),
    ];
  }

  buildMapState(args: {
    assignmentCards: Assignment[];
    technicianLocations: TechnicianLocation[];
    showCompletedAssignments: boolean;
  }): DashboardMapState {
    const assignmentSequenceNumbers = this.buildAssignmentSequenceNumbers(args.assignmentCards);
    const visibleCards = this.getVisibleMapAssignments(
      args.assignmentCards,
      args.showCompletedAssignments,
    );

    return {
      visibleCards,
      assignmentSequenceNumbers,
      mapAssignments: visibleCards
        .filter((card) => card.locationPoint)
        .map((card) => this.toMapAssignment(card)),
      mapStops: this.buildMapStops(visibleCards, args.technicianLocations, assignmentSequenceNumbers),
      allDayMapStops: this.buildMapStops(
        args.assignmentCards,
        args.technicianLocations,
        assignmentSequenceNumbers,
      ),
    };
  }

  buildRouteState(args: {
    visibleStops: MapStop[];
    allStops: MapStop[];
    visibleSegments: MapRouteSegment[];
    allSegments?: MapRouteSegment[];
    baseSummary: DailyProgressSummary;
    assignmentCards: Assignment[];
  }): DashboardRouteState {
    const allRouteSegments = args.allSegments ?? args.visibleSegments;
    const travelTimesByAssignmentId = this.buildTravelTimesFromRouteSegments(
      args.allStops,
      allRouteSegments,
    );

    return {
      routeSegments: args.visibleSegments,
      allRouteSegments,
      travelTimesByAssignmentId,
      travelState: travelTimesByAssignmentId.size > 0 ? 'ready' : 'unavailable',
      dailyProgress: this.buildDailyProgressWithRouteTravel(
        args.baseSummary,
        args.allStops,
        allRouteSegments,
        args.assignmentCards,
      ),
    };
  }

  buildPendingRouteState(summary: DailyProgressSummary, hasAssignments: boolean): DashboardRouteState {
    return {
      routeSegments: [],
      allRouteSegments: [],
      travelTimesByAssignmentId: new Map(),
      travelState: hasAssignments ? 'loading' : 'unavailable',
      dailyProgress: this.clearTravelMetrics(summary),
    };
  }

  resolveSelectionContext(args: {
    assignmentId: string;
    mapStops: MapStop[];
    allDayMapStops: MapStop[];
    routeSegments: MapRouteSegment[];
    allRouteSegments: MapRouteSegment[];
    assignmentSequenceNumbers: Record<string, number>;
  }): DashboardSelectionContext | null {
    const currentStop =
      this.findAssignmentStopIn(args.allDayMapStops, args.assignmentId) ??
      this.findAssignmentStopIn(args.mapStops, args.assignmentId);

    if (!currentStop) {
      return {
        assignmentId: args.assignmentId,
        activeRouteSegmentId: null,
        focusedRouteSegment: null,
      };
    }

    const previousStop = this.findValidPreviousStopForAssignment(
      args.assignmentId,
      currentStop.id,
      args.allDayMapStops,
      args.assignmentSequenceNumbers,
    );
    const routeSegmentId = previousStop
      ? buildRouteSegmentId(previousStop.id, currentStop.id)
      : null;
    const routeSegment = routeSegmentId
      ? this.findRouteSegmentById(routeSegmentId, args.allRouteSegments, args.routeSegments)
      : undefined;

    return {
      assignmentId: args.assignmentId,
      currentStop,
      previousStop,
      routeSegment,
      activeRouteSegmentId: routeSegment?.id ?? null,
      focusedRouteSegment: routeSegment ?? null,
    };
  }

  toMapAssignment(card: Assignment): MapAssignment {
    const location = this.toMapLocation(card);

    return {
      id: card.id,
      name: card.title,
      location,
      description: card.address,
      status: card.status,
    };
  }

  clearTravelMetrics(summary: DailyProgressSummary): DailyProgressSummary {
    return {
      ...summary,
      completedTravelMinutes: 0,
      totalTravelMinutes: 0,
    };
  }

  buildAssignmentSequenceNumbers(cards: Assignment[]): Record<string, number> {
    const orderedCards = this.sortCardsByTime(cards);

    return orderedCards.reduce<Record<string, number>>((lookup, entry, index) => {
      lookup[entry.card.id] = index + 1;
      return lookup;
    }, {});
  }

  haveSameStopIds(firstStops: MapStop[], secondStops: MapStop[]): boolean {
    if (firstStops.length !== secondStops.length) {
      return false;
    }

    return firstStops.every((stop, index) => stop.id === secondStops[index]?.id);
  }

  isFocusedAssignmentVisible(focusedAssignmentId: string | null, visibleCards: Assignment[]): boolean {
    return !focusedAssignmentId || visibleCards.some((card) => card.id === focusedAssignmentId);
  }

  private buildTravelTimesFromRouteSegments(
    orderedStops: MapStop[],
    routeSegments: MapRouteSegment[],
  ): Map<string, number> {
    const segmentById = new Map(routeSegments.map((segment) => [segment.id, segment]));
    const lookup = new Map<string, number>();

    for (let index = 1; index < orderedStops.length; index += 1) {
      const currentStop = orderedStops[index];
      const previousStop = orderedStops[index - 1];

      if (
        !currentStop ||
        !previousStop ||
        currentStop.kind !== 'assignment' ||
        !currentStop.assignmentId
      ) {
        continue;
      }

      const segmentId = buildRouteSegmentId(previousStop.id, currentStop.id);
      const segmentDuration = segmentById.get(segmentId)?.durationMinutes;

      if (typeof segmentDuration !== 'number' || !Number.isFinite(segmentDuration)) {
        continue;
      }

      lookup.set(currentStop.assignmentId, segmentDuration);
    }

    return lookup;
  }

  private buildDailyProgressWithRouteTravel(
    baseSummary: DailyProgressSummary,
    orderedStops: MapStop[],
    routeSegments: MapRouteSegment[],
    assignmentCards: Assignment[],
  ): DailyProgressSummary {
    if (orderedStops.length < 2 || routeSegments.length === 0) {
      return this.clearTravelMetrics(baseSummary);
    }

    const segmentById = new Map(routeSegments.map((segment) => [segment.id, segment]));
    const cardById = new Map(assignmentCards.map((card) => [card.id, card]));
    let totalTravelMinutes = 0;
    let completedTravelMinutes = 0;
    let hasAnyResolvedTravelLeg = false;

    for (let index = 1; index < orderedStops.length; index += 1) {
      const currentStop = orderedStops[index];
      const previousStop = orderedStops[index - 1];

      if (
        !currentStop ||
        !previousStop ||
        currentStop.kind !== 'assignment' ||
        !currentStop.assignmentId
      ) {
        continue;
      }

      const segmentId = buildRouteSegmentId(previousStop.id, currentStop.id);
      const legMinutes = segmentById.get(segmentId)?.durationMinutes;

      if (typeof legMinutes !== 'number' || !Number.isFinite(legMinutes)) {
        continue;
      }

      hasAnyResolvedTravelLeg = true;
      totalTravelMinutes += Math.max(0, Math.round(legMinutes));

      if (cardById.get(currentStop.assignmentId)?.status === 'completed') {
        completedTravelMinutes += Math.max(0, Math.round(legMinutes));
      }
    }

    if (!hasAnyResolvedTravelLeg) {
      return this.clearTravelMetrics(baseSummary);
    }

    return {
      ...baseSummary,
      completedTravelMinutes,
      totalTravelMinutes,
    };
  }

  private getVisibleMapAssignments(
    cards: Assignment[],
    showCompletedAssignments: boolean,
  ): Assignment[] {
    if (showCompletedAssignments) {
      return cards;
    }

    return cards.filter((card) => card.status !== 'completed');
  }

  private buildMapStops(
    cards: Assignment[],
    technicianLocations: TechnicianLocation[],
    sequenceNumbers: Record<string, number>,
  ): MapStop[] {
    if (cards.length === 0) {
      return [];
    }

    const orderedCards = this.sortCardsBySequenceNumber(cards, sequenceNumbers);
    const startLocation = technicianLocations.find((location) => location.role === 'start');
    const endLocation = technicianLocations.find((location) => location.role === 'end');
    const baseLocation = startLocation?.location ?? this.toMapLocation(orderedCards[0]);
    const terminalLocation = endLocation?.location ?? baseLocation;
    const assignmentStops = orderedCards.map((card) =>
      this.buildAssignmentStop(card, sequenceNumbers[card.id] ?? null),
    );

    return [
      {
        id: 'start',
        kind: 'start',
        label: startLocation?.label ?? 'Start',
        location: baseLocation,
      },
      ...assignmentStops,
      {
        id: 'end',
        kind: 'end',
        label: endLocation?.label ?? 'Slutt',
        location: terminalLocation,
      },
    ];
  }

  private buildAssignmentStop(card: Assignment, sequenceNumber: number | null): MapStop {
    return {
      id: `assignment-${card.id}`,
      kind: 'assignment',
      label: card.title,
      assignmentId: card.id,
      sequenceNumber: sequenceNumber ?? undefined,
      location: this.toMapLocation(card),
    };
  }

  private toMapLocation(card: Assignment): MapLocation {
    if (!card.locationPoint) {
      return DEFAULT_TECHNICIAN_BASE;
    }

    return {
      lat: card.locationPoint.y,
      lon: card.locationPoint.x,
    };
  }

  private sortCardsBySequenceNumber(
    cards: Assignment[],
    sequenceNumbers: Record<string, number>,
  ): Assignment[] {
    return [...cards].sort((firstCard, secondCard) => {
      const firstSequence = sequenceNumbers[firstCard.id] ?? Number.MAX_SAFE_INTEGER;
      const secondSequence = sequenceNumbers[secondCard.id] ?? Number.MAX_SAFE_INTEGER;

      if (firstSequence !== secondSequence) {
        return firstSequence - secondSequence;
      }

      return this.toTimeOfDayMinutes(firstCard.time) - this.toTimeOfDayMinutes(secondCard.time);
    });
  }

  private sortCardsByTime(cards: Assignment[]): {
    card: Assignment;
    index: number;
    minutes: number;
  }[] {
    return [...cards]
      .map((card, index) => ({
        card,
        index,
        minutes: this.toTimeOfDayMinutes(card.time),
      }))
      .sort((firstEntry, secondEntry) => {
        const timeDiff = firstEntry.minutes - secondEntry.minutes;
        if (timeDiff !== 0) {
          return timeDiff;
        }

        return firstEntry.index - secondEntry.index;
      });
  }

  private toTimeOfDayMinutes(timeValue: string | undefined): number {
    if (!timeValue) {
      return Number.MAX_SAFE_INTEGER;
    }

    const match = /(\d{1,2}):(\d{2})/.exec(timeValue.trim());
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return Number.MAX_SAFE_INTEGER;
    }

    return hours * 60 + minutes;
  }

  private findAssignmentStopIn(stops: MapStop[], assignmentId: string): MapStop | undefined {
    return stops.find((stop) => stop.kind === 'assignment' && stop.assignmentId === assignmentId);
  }

  private findValidPreviousStopForAssignment(
    assignmentId: string,
    currentStopId: string,
    stops: MapStop[],
    assignmentSequenceNumbers: Record<string, number>,
  ): MapStop | undefined {
    const currentSequenceNumber = assignmentSequenceNumbers[assignmentId];
    if (!Number.isInteger(currentSequenceNumber) || currentSequenceNumber <= 0) {
      return undefined;
    }

    if (currentSequenceNumber === 1) {
      return stops.find((stop) => stop.id === 'start');
    }

    const previousAssignmentId = Object.entries(assignmentSequenceNumbers).find(
      ([, sequenceNumber]) => sequenceNumber === currentSequenceNumber - 1,
    )?.[0];

    if (!previousAssignmentId) {
      return undefined;
    }

    const previousStop = this.findAssignmentStopIn(stops, previousAssignmentId);
    if (!previousStop || previousStop.id === currentStopId) {
      return undefined;
    }

    return previousStop;
  }

  private findRouteSegmentById(
    segmentId: string,
    allRouteSegments: MapRouteSegment[],
    routeSegments: MapRouteSegment[],
  ): MapRouteSegment | undefined {
    return (
      allRouteSegments.find((segment) => segment.id === segmentId) ??
      routeSegments.find((segment) => segment.id === segmentId)
    );
  }
}
