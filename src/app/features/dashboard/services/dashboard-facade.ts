import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, map, Subscription } from 'rxjs';
import { AvailabilityService } from '../../../core/services/availability.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { RoutingService } from '../../../core/services/routing.service';
import { Assignment } from '../../../core/models/assignment-card.model';
import {
  DailyProgressSummary,
  EMPTY_DAILY_PROGRESS_SUMMARY,
} from '../../../core/models/daily-progress.model';
import { TechnicianLocation } from '../../../core/models/tech-location.model';
import {
  Assignment as MapAssignment,
  MapRouteSegment,
  MapStop,
} from '../../../shared/components/map/map';
import { MapLocation } from '../../../shared/components/map/map.models';
import { DEFAULT_TECHNICIAN_BASE } from '../../../core/data/mock-technician-bases';
import {
  AvailabilityCardFormattingOptions,
  mapAvailabilityDtoToAssignmentCardModel,
} from '../../../core/mappers/availability-card.mapper';
import { DayOption } from '../components/day-selector/day-selector.types';
import { DashboardTravelState } from '../models/dashboard-travel-state.model';
import { DashboardDerivedStateService } from './dashboard-derived-state.service';
import {
  DashboardMapState,
  DashboardRouteState,
  DashboardSelectionContext,
} from './dashboard-facade.models';

@Injectable()
export class DashboardFacade implements OnDestroy {
  private readonly assignmentService = inject(AssignmentService);
  private readonly availabilityService = inject(AvailabilityService);
  private readonly routingService = inject(RoutingService);
  private readonly translate = inject(TranslateService);
  private readonly derivedState = inject(DashboardDerivedStateService);

  private readonly _selectedDay = signal<DayOption>('today');
  readonly selectedDay = this._selectedDay.asReadonly();

  private readonly _isListView = signal(true);
  readonly isListView = this._isListView.asReadonly();

  private readonly _assignmentCards = signal<Assignment[]>([]);
  readonly assignmentCards = this._assignmentCards.asReadonly();

  private readonly _travelTimesByAssignmentId = signal(new Map<string, number>());
  readonly travelTimesByAssignmentId = this._travelTimesByAssignmentId.asReadonly();

  private readonly _travelState = signal<DashboardTravelState>('unavailable');
  readonly travelState = this._travelState.asReadonly();

  private readonly _dailyProgress = signal<DailyProgressSummary>(EMPTY_DAILY_PROGRESS_SUMMARY);
  readonly dailyProgress = this._dailyProgress.asReadonly();

  private readonly _technicianLocations = signal<TechnicianLocation[]>([]);
  readonly technicianLocations = this._technicianLocations.asReadonly();

  private readonly _mapAssignments = signal<MapAssignment[]>([]);
  readonly mapAssignments = this._mapAssignments.asReadonly();

  private readonly _mapStops = signal<MapStop[]>([]);
  readonly mapStops = this._mapStops.asReadonly();

  private readonly _allDayMapStops = signal<MapStop[]>([]);
  readonly allDayMapStops = this._allDayMapStops.asReadonly();

  private readonly _routeSegments = signal<MapRouteSegment[]>([]);
  readonly routeSegments = this._routeSegments.asReadonly();

  private readonly _allRouteSegments = signal<MapRouteSegment[]>([]);
  readonly allRouteSegments = this._allRouteSegments.asReadonly();

  private readonly _focusedRouteSegment = signal<MapRouteSegment | null>(null);
  readonly focusedRouteSegment = this._focusedRouteSegment.asReadonly();

  private readonly _activeRouteSegmentId = signal<string | null>(null);
  readonly activeRouteSegmentId = this._activeRouteSegmentId.asReadonly();

  private readonly _focusedAssignmentId = signal<string | null>(null);
  readonly focusedAssignmentId = this._focusedAssignmentId.asReadonly();

  private readonly _showCompletedAssignments = signal(false);
  readonly showCompletedAssignments = this._showCompletedAssignments.asReadonly();

  private readonly _assignmentSequenceNumbers = signal<Record<string, number>>({});
  readonly assignmentSequenceNumbers = this._assignmentSequenceNumbers.asReadonly();

  readonly displayedRouteSegments = computed(() => {
    const focusedRouteSegment = this._focusedRouteSegment();
    const routeSegments = this._routeSegments();

    if (!focusedRouteSegment) {
      return routeSegments;
    }

    return routeSegments.some((segment) => segment.id === focusedRouteSegment.id)
      ? routeSegments
      : [...routeSegments, focusedRouteSegment];
  });

  readonly startTechnicianLocation = computed(() =>
    this._technicianLocations().find((location) => location.role === 'start'),
  );

  readonly fallbackUserLocation = computed<MapLocation | null>(
    () => this.startTechnicianLocation()?.location ?? DEFAULT_TECHNICIAN_BASE,
  );

  readonly shouldShowStartLocationCard = computed(() => {
    const startTechnicianLocation = this.startTechnicianLocation();
    if (!startTechnicianLocation) {
      return false;
    }

    if (this._selectedDay() === 'tomorrow') {
      return true;
    }

    return this._assignmentCards()[0]?.status === 'next';
  });

  readonly shouldShowTravelUnavailableNotice = computed(
    () => this._travelState() === 'unavailable' && this._assignmentCards().length > 0,
  );

  private loadVersion = 0;
  private serviceDailyProgress: DailyProgressSummary = EMPTY_DAILY_PROGRESS_SUMMARY;
  private assignmentsSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private confirmationSubscription?: Subscription;

  ngOnDestroy(): void {
    this.assignmentsSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
    this.confirmationSubscription?.unsubscribe();
  }

  applyQueryState(day: DayOption, isListView: boolean): void {
    const shouldLoad = this._assignmentCards().length === 0 || day !== this._selectedDay();

    this._selectedDay.set(day);
    this._isListView.set(isListView);

    if (shouldLoad) {
      this.loadAssignmentsForSelectedDay();
    }
  }

  setSelectedDay(day: DayOption): void {
    if (day === this._selectedDay()) {
      return;
    }

    this._selectedDay.set(day);
    this.loadAssignmentsForSelectedDay();
  }

  setListView(isListView: boolean): void {
    this._isListView.set(isListView);
  }

  toggleCompletedAssignments(): void {
    this._showCompletedAssignments.update((value) => !value);
    this.refreshMapData(this.loadVersion);
  }

  clearMapSelection(): void {
    this._activeRouteSegmentId.set(null);
    this._focusedAssignmentId.set(null);
    this._focusedRouteSegment.set(null);
  }

  selectAssignment(assignmentId: string): DashboardSelectionContext | null {
    this._focusedAssignmentId.set(assignmentId);
    return this.syncFocusedRouteSelection();
  }

  prepareSelectionFromCard(
    assignment: Assignment,
  ): { mapAssignment: MapAssignment; selectionContext: DashboardSelectionContext | null } {
    if (assignment.status === 'completed' && !this._showCompletedAssignments()) {
      this._showCompletedAssignments.set(true);
      this.refreshMapData(this.loadVersion);
    }

    const mapAssignment =
      this._mapAssignments().find((entry) => String(entry.id) === assignment.id) ??
      this.derivedState.toMapAssignment(assignment);

    return {
      mapAssignment,
      selectionContext: this.selectAssignment(assignment.id),
    };
  }

  updateTomorrowConfirmation(id: string, confirmed: boolean): void {
    this.confirmationSubscription?.unsubscribe();
    this.confirmationSubscription = this.assignmentService
      .updateTomorrowConfirmation(id, confirmed)
      .subscribe(() => {
        this.loadAssignmentsForSelectedDay();
      });
  }

  getTravelTimeForCard(assignmentId: string): number | undefined {
    return this._travelTimesByAssignmentId().get(assignmentId);
  }

  getAssignmentSequenceNumber(assignmentId: string): number | null {
    return this._assignmentSequenceNumbers()[assignmentId] ?? null;
  }

  private loadAssignmentsForSelectedDay(): void {
    const loadVersion = ++this.loadVersion;
    const date = this.getDateForDay(this._selectedDay());

    this.assignmentsSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
    this.clearMapSelection();
    this._mapStops.set([]);
    this._allDayMapStops.set([]);
    this._routeSegments.set([]);
    this._allRouteSegments.set([]);
    this._travelTimesByAssignmentId.set(new Map());
    this._travelState.set('unavailable');

    this.assignmentsSubscription = forkJoin({
      cards: this.assignmentService.getAssignmentCardsByDesiredDate(date),
      availabilities: this.availabilityService.getAvailabilitiesByDate(date),
      progress: this.assignmentService.getDailyProgressByDesiredDate(date),
      technicianLocations: this.assignmentService.getTechnicianLocationsByDesiredDate(date),
    }).subscribe(({ cards, availabilities, progress, technicianLocations }) => {
      if (loadVersion !== this.loadVersion) {
        return;
      }

      const availabilityFormattingOptions = this.getAvailabilityFormattingOptions();
      const availabilityCards = availabilities.map((availability) =>
        mapAvailabilityDtoToAssignmentCardModel(availability, availabilityFormattingOptions),
      );
      const mergedCards = this.derivedState.mergeCardsWithAvailability(cards, availabilityCards);
      const pendingRouteState = this.derivedState.buildPendingRouteState(
        progress,
        mergedCards.length > 0,
      );

      this._assignmentCards.set(mergedCards);
      this.serviceDailyProgress = progress;
      this._dailyProgress.set(pendingRouteState.dailyProgress);
      this._travelTimesByAssignmentId.set(pendingRouteState.travelTimesByAssignmentId);
      this._travelState.set(pendingRouteState.travelState);
      this._routeSegments.set(pendingRouteState.routeSegments);
      this._allRouteSegments.set(pendingRouteState.allRouteSegments);
      this._technicianLocations.set(technicianLocations);

      this.refreshMapData(loadVersion);
    });
  }

  private refreshMapData(loadVersion: number): void {
    const mapState = this.derivedState.buildMapState({
      assignmentCards: this._assignmentCards(),
      technicianLocations: this._technicianLocations(),
      showCompletedAssignments: this._showCompletedAssignments(),
    });

    this.applyMapState(mapState);
    this.loadRouteSegments(mapState, loadVersion);
  }

  private applyMapState(mapState: DashboardMapState): void {
    this._assignmentSequenceNumbers.set(mapState.assignmentSequenceNumbers);
    this._mapAssignments.set(mapState.mapAssignments);
    this._mapStops.set(mapState.mapStops);
    this._allDayMapStops.set(mapState.allDayMapStops);

    if (!this.derivedState.isFocusedAssignmentVisible(this._focusedAssignmentId(), mapState.visibleCards)) {
      this.clearMapSelection();
      return;
    }

    this.syncFocusedRouteSelection();
  }

  private loadRouteSegments(mapState: DashboardMapState, loadVersion: number): void {
    const visibleSegments$ = this.routingService.getRouteSegments(mapState.mapStops);
    const useSharedSegments = this.derivedState.haveSameStopIds(
      mapState.mapStops,
      mapState.allDayMapStops,
    );
    const routeSegments$ = useSharedSegments
      ? forkJoin({
          visibleSegments: visibleSegments$,
        }).pipe(
          map(({ visibleSegments }) => ({
            visibleSegments,
            allSegments: visibleSegments,
          })),
        )
      : forkJoin({
          visibleSegments: visibleSegments$,
          allSegments: this.routingService.getRouteSegments(mapState.allDayMapStops),
        });

    this.routeSubscription?.unsubscribe();
    this.routeSubscription = routeSegments$.subscribe(({ visibleSegments, allSegments }) => {
      if (loadVersion !== this.loadVersion) {
        return;
      }

      const routeState = this.derivedState.buildRouteState({
        visibleStops: mapState.mapStops,
        allStops: mapState.allDayMapStops,
        visibleSegments,
        allSegments,
        baseSummary: this.serviceDailyProgress,
        assignmentCards: this._assignmentCards(),
      });

      this.applyRouteState(routeState);
      this.syncFocusedRouteSelection();
    });
  }

  private applyRouteState(routeState: DashboardRouteState): void {
    this._routeSegments.set(routeState.routeSegments);
    this._allRouteSegments.set(routeState.allRouteSegments);
    this._travelTimesByAssignmentId.set(routeState.travelTimesByAssignmentId);
    this._dailyProgress.set(routeState.dailyProgress);
    this._travelState.set(routeState.travelState);
  }

  private syncFocusedRouteSelection(): DashboardSelectionContext | null {
    const focusedAssignmentId = this._focusedAssignmentId();
    if (!focusedAssignmentId) {
      this._activeRouteSegmentId.set(null);
      this._focusedRouteSegment.set(null);
      return null;
    }

    const selectionContext = this.derivedState.resolveSelectionContext({
      assignmentId: focusedAssignmentId,
      mapStops: this._mapStops(),
      allDayMapStops: this._allDayMapStops(),
      routeSegments: this._routeSegments(),
      allRouteSegments: this._allRouteSegments(),
      assignmentSequenceNumbers: this._assignmentSequenceNumbers(),
    });

    this._activeRouteSegmentId.set(selectionContext?.activeRouteSegmentId ?? null);
    this._focusedRouteSegment.set(selectionContext?.focusedRouteSegment ?? null);
    return selectionContext;
  }

  private getDateForDay(day: DayOption): string {
    const date = new Date();
    if (day === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    return date.toISOString().slice(0, 10);
  }

  private getAvailabilityFormattingOptions(): AvailabilityCardFormattingOptions {
    const activeLang = this.translate.currentLang || this.translate.getDefaultLang();

    return {
      locale: activeLang === 'no' || activeLang === 'nb' ? 'nb-NO' : 'en-GB',
      allDayLabel: this.translate.instant('location.allDay'),
      unknownTimeLabel: this.translate.instant('location.unknownTime'),
    };
  }
}
