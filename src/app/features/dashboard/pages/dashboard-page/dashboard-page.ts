import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  forwardRef,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
  AssignmentMap,
  Assignment as MapAssignment,
  MapRouteSegment,
  MapStop,
} from '../../../../shared/components/map/map';
import { FloatingButton } from '../../components/floating-button/floating-button';
import { DaySelector } from '../../components/day-selector/day-selector';
import { DayOption } from '../../components/day-selector/day-selector.types';
import { AssignmentCard } from '../../components/assignment-card/assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';
import {
  DailyProgressSummary,
  EMPTY_DAILY_PROGRESS_SUMMARY,
} from '../../../../core/models/daily-progress.model';
import { AssignmentService } from '../../../../core/services/assignment.service';
import {
  MAP_BOTTOM_SHEET_COLLAPSED_VISIBLE_HEIGHT,
  MAP_BOTTOM_SHEET_EXPANDED_RATIO,
  MAP_BOTTOM_SHEET_PEEK_RATIO,
  MapBottomSheet,
  SnapPoint,
} from '../../components/map-bottom-sheet/map-bottom-sheet';
import { TravelTimeIndicator } from '../../components/travel-time-indicator/travel-time-indicator';
import { MiniAssignmentCard } from '../../components/mini-assignment-card/mini-assignment-card';
import { DailyProgressInfobox } from '../../components/daily-progress-infobox/daily-progress-infobox';
import { HomeLocationCard } from '../../components/home-location-card/home-location-card';
import { DEFAULT_TECHNICIAN_BASE } from '../../../../core/data/mock-technician-bases';
import { RoutingService } from '../../../../core/services/routing.service';
import { buildRouteSegmentId, MapLocation } from '../../../../shared/components/map/map.models';
import { AvailabilityService } from '../../../../core/services/availability.service';
import {
  AvailabilityCardFormattingOptions,
  isAvailabilityCardId,
  mapAvailabilityDtoToAssignmentCardModel,
} from '../../../../core/mappers/availability-card.mapper';
import { TechnicianLocation } from '../../../../core/models/tech-location.model';
import { DashboardTravelState } from '../../../../core/models/dashboard-travel-state.model';

const MAP_MARKER_FOCUS_TARGET_Y_RATIO = MAP_BOTTOM_SHEET_PEEK_RATIO / 2;
const MAP_BOTTOM_SHEET_SCROLL_DELAY_MS = 280;
const CARD_HIGHLIGHT_DELAY_AFTER_SCROLL_MS = 180;

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    forwardRef(() => AssignmentMap),
    forwardRef(() => FloatingButton),
    forwardRef(() => DaySelector),
    forwardRef(() => AssignmentCard),
    forwardRef(() => MapBottomSheet),
    forwardRef(() => TravelTimeIndicator),
    forwardRef(() => MiniAssignmentCard),
    forwardRef(() => DailyProgressInfobox),
    forwardRef(() => HomeLocationCard),
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild(AssignmentMap) private assignmentMap?: AssignmentMap;
  @ViewChild(MapBottomSheet) private mapBottomSheet?: MapBottomSheet;
  @ViewChild('mapStage', { read: ElementRef }) private mapStageRef?: ElementRef<HTMLElement>;
  @ViewChildren('miniAssignmentCardRow', { read: ElementRef })
  private miniAssignmentCardRows?: QueryList<ElementRef<HTMLElement>>;

  selectedDay: DayOption = 'today';
  isListView = true;
  assignmentCards: Assignment[] = [];
  travelTimesByAssignmentId = new Map<string, number>();
  travelState: DashboardTravelState = 'unavailable';
  dailyProgress: DailyProgressSummary = EMPTY_DAILY_PROGRESS_SUMMARY;
  technicianLocations: TechnicianLocation[] = [];
  mapAssignments: MapAssignment[] = [];
  mapStops: MapStop[] = [];
  allDayMapStops: MapStop[] = [];
  routeSegments: MapRouteSegment[] = [];
  allRouteSegments: MapRouteSegment[] = [];
  focusedRouteSegment: MapRouteSegment | null = null;
  activeRouteSegmentId: string | null = null;
  focusedAssignmentId: string | null = null;
  showCompletedAssignments = false;
  currentMapSheetSnap: SnapPoint = 'peek';
  assignmentSequenceNumbers: Record<string, number> = {};

  private assignmentService = inject(AssignmentService);
  private availabilityService = inject(AvailabilityService);
  private routingService = inject(RoutingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private highlightedCardElement?: HTMLElement;
  private pendingCardScrollTimeoutId?: ReturnType<typeof setTimeout>;
  private pendingCardHighlightTimeoutId?: ReturnType<typeof setTimeout>;
  private loadVersion = 0;
  private serviceDailyProgress: DailyProgressSummary = EMPTY_DAILY_PROGRESS_SUMMARY;

  get sheetTitle(): string {
    const count = this.assignmentCards.length;
    const dayKey = this.selectedDay === 'today' ? 'sheet.today' : 'sheet.tomorrow';
    const dayText = this.translate.instant(dayKey);
    const countText =
      count === 1
        ? this.translate.instant('sheet.assignmentCountText')
        : this.translate.instant('sheet.assignmentCountTextPlural');
    return `${count} ${countText} ${dayText}`;
  }

  get startTechnicianLocation(): TechnicianLocation | undefined {
    return this.technicianLocations.find((location) => location.role === 'start');
  }

  get fallbackUserLocation(): MapLocation | null {
    return this.startTechnicianLocation?.location ?? DEFAULT_TECHNICIAN_BASE;
  }

  get overviewBottomInsetRatio(): number {
    switch (this.currentMapSheetSnap) {
      case 'expanded':
        return 1 - MAP_BOTTOM_SHEET_EXPANDED_RATIO;
      case 'collapsed':
        return MAP_BOTTOM_SHEET_COLLAPSED_VISIBLE_HEIGHT / this.getMapStageHeight();
      case 'peek':
      default:
        return 1 - MAP_BOTTOM_SHEET_PEEK_RATIO;
    }
  }

  get enableOverviewAutoFit(): boolean {
    return this.currentMapSheetSnap !== 'expanded';
  }

  get displayedRouteSegments(): MapRouteSegment[] {
    if (!this.focusedRouteSegment) {
      return this.routeSegments;
    }

    return this.routeSegments.some((segment) => segment.id === this.focusedRouteSegment!.id)
      ? this.routeSegments
      : [...this.routeSegments, this.focusedRouteSegment];
  }

  get shouldShowStartLocationCard(): boolean {
    if (!this.startTechnicianLocation) {
      return false;
    }

    if (this.selectedDay === 'tomorrow') {
      return true;
    }

    return this.assignmentCards[0]?.status === 'next';
  }

  getTechnicianLocationLabel(location: TechnicianLocation): string {
    return (
      location.label ||
      this.translate.instant(location.role === 'start' ? 'location.start' : 'location.end')
    );
  }

  getTechnicianLocationRoleLabel(location: TechnicianLocation): string {
    return this.translate.instant(location.role === 'start' ? 'location.start' : 'location.end');
  }

  getTechnicianLocationContextLabel(location: TechnicianLocation): string {
    return location.isTemporary ? this.translate.instant('location.temporary') : '';
  }

  getStartLocationDepartureLabel(): string {
    const firstAssignment = this.assignmentCards[0];

    if (this.travelState === 'loading' && firstAssignment) {
      return '...';
    }

    if (this.travelState === 'unavailable' && firstAssignment) {
      return this.translate.instant('travelTime.departureUnavailable');
    }

    const travelMinutes = firstAssignment ? this.getTravelTimeForCard(firstAssignment) : undefined;

    if (!firstAssignment || typeof travelMinutes !== 'number' || !Number.isFinite(travelMinutes)) {
      return this.translate.instant('location.leaveUnknown');
    }

    const assignmentStartDate = this.parseAssignmentStartTime(firstAssignment.time);
    if (!assignmentStartDate) {
      return this.translate.instant('location.leaveUnknown');
    }

    const leaveDate = new Date(assignmentStartDate.getTime() - Math.round(travelMinutes) * 60_000);
    const leaveTime = leaveDate.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${this.translate.instant('location.leaveBy')} ${leaveTime}`;
  }

  getAssignmentSequenceNumber(assignmentId: string): number | null {
    return this.assignmentSequenceNumbers[assignmentId] ?? null;
  }

  get shouldShowTravelUnavailableNotice(): boolean {
    return this.travelState === 'unavailable' && this.assignmentCards.length > 0;
  }

  get travelUnavailableTitle(): string {
    return this.translate.instant('travelTime.travelUnavailableTitle');
  }

  get travelUnavailableMessage(): string {
    return this.translate.instant('travelTime.travelUnavailableMessage');
  }

  shouldShowTravelTimeIndicator(assignment: Assignment): boolean {
    if (assignment.status === 'completed') {
      return false;
    }

    if (this.travelState === 'loading') {
      return true;
    }

    if (this.travelState === 'unavailable') {
      return false;
    }

    const travelMinutes = this.getTravelTimeForCard(assignment);

    return typeof travelMinutes === 'number' && Number.isFinite(travelMinutes);
  }

  isTravelTimeLoading(assignment: Assignment): boolean {
    return this.travelState === 'loading' && assignment.status !== 'completed';
  }

  private parseAssignmentStartTime(timeValue: string | undefined): Date | undefined {
    if (!timeValue) {
      return undefined;
    }

    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
    if (!timeMatch) {
      return undefined;
    }

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return undefined;
    }

    const assignmentDate = this.getDateForDay(this.selectedDay);
    const parsedDate = new Date(
      `${assignmentDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return undefined;
    }

    return parsedDate;
  }

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const dayParam = params.get('day');
      const viewParam = params.get('view');
      const nextDay = dayParam === 'today' || dayParam === 'tomorrow' ? dayParam : this.selectedDay;
      const nextIsListView =
        viewParam === 'list' || viewParam === 'map' ? viewParam === 'list' : this.isListView;
      const shouldLoadAssignments =
        this.assignmentCards.length === 0 || nextDay !== this.selectedDay;

      this.selectedDay = nextDay;
      this.isListView = nextIsListView;

      if (shouldLoadAssignments) {
        this.loadAssignmentsForSelectedDay();
      }
      this.updatePageScrollLock();
    });
  }

  ngOnDestroy(): void {
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.clearMarkerCardFocus();
    this.unlockPageScroll();
  }

  onDayChange(day: DayOption) {
    this.selectedDay = day;
    this.loadAssignmentsForSelectedDay();
    this.updateQueryParams();
  }

  onMarkerClicked(assignment: MapAssignment) {
    if (this.isListView) {
      return;
    }

    const assignmentId = String(assignment.id);
    this.focusedAssignmentId = assignmentId;
    const { currentStop, previousStop, routeSegment } =
      this.resolveFocusedRouteContext(assignmentId);

    if (currentStop && previousStop && routeSegment) {
      this.assignmentMap?.focusAssignmentLeg({
        fromStop: previousStop,
        toStop: currentStop,
        routeSegment,
        targetYRatio: MAP_MARKER_FOCUS_TARGET_Y_RATIO,
      });
    } else {
      this.assignmentMap?.focusAssignment(assignment, {
        targetYRatio: MAP_MARKER_FOCUS_TARGET_Y_RATIO,
      });
    }
    this.mapBottomSheet?.snapTo('peek');
    this.scrollToAssignmentCard(assignmentId);
  }

  onMiniAssignmentDirectionsClick(assignment: Assignment): void {
    if (assignment.status === 'completed' && !this.showCompletedAssignments) {
      this.showCompletedAssignments = true;
      this.refreshMapData(this.loadVersion);
    }

    const matchingMapAssignment = this.mapAssignments.find(
      (mapAssignment) => String(mapAssignment.id) === assignment.id,
    );

    if (matchingMapAssignment) {
      this.onMarkerClicked(matchingMapAssignment);
      return;
    }

    const location = this.toMapLocation(assignment);
    if (!location) {
      return;
    }

    this.onMarkerClicked({
      id: assignment.id,
      name: assignment.title,
      location,
      description: assignment.address,
      status: assignment.status,
    });
  }

  onViewChange(listView: boolean) {
    this.isListView = listView;
    this.clearCardInteractionState();
    this.clearMapSelectionState();
    this.updateQueryParams();
    this.updatePageScrollLock();
  }

  onCompletedAssignmentsToggle(): void {
    this.showCompletedAssignments = !this.showCompletedAssignments;
    this.clearCardInteractionState();
    this.refreshMapData(this.loadVersion);
  }

  onSnapChanged(snap: SnapPoint) {
    this.currentMapSheetSnap = snap;
  }

  onMapBackgroundClicked(): void {
    this.clearCardInteractionState();
    this.clearMapSelectionState();
    this.mapBottomSheet?.snapTo('collapsed');
  }

  @HostListener('document:pointerdown')
  @HostListener('document:wheel')
  onUserInteractionStart(): void {
    this.clearCardInteractionState();
  }

  goToAssignmentDetails(id: string): void {
    if (isAvailabilityCardId(id)) {
      return;
    }

    this.router.navigate(['/assignments', id], {
      queryParams: {
        day: this.selectedDay,
        view: this.isListView ? 'list' : 'map',
      },
    });
  }

  onTomorrowConfirmationChange(id: string, confirmed: boolean): void {
    if (this.selectedDay === 'tomorrow') {
      const assignment = this.assignmentCards.find((card) => card.id === id);
      if (assignment) {
        assignment.status = confirmed ? 'confirmed' : 'unconfirmed';
        this.cdr.detectChanges();
      }
      this.assignmentService.updateTomorrowConfirmation(id, confirmed).subscribe();
    } else {
      this.assignmentService.updateTomorrowConfirmation(id, confirmed).subscribe(() => {
        this.loadAssignmentsForSelectedDay();
      });
    }
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        day: this.selectedDay,
        view: this.isListView ? 'list' : 'map',
      },
      queryParamsHandling: 'merge',
    });
  }

  private updatePageScrollLock(): void {
    if (this.isListView) {
      this.unlockPageScroll();
      return;
    }

    this.lockPageScroll();
  }

  private lockPageScroll(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.document.documentElement, 'overflow', 'hidden');
    this.renderer.setStyle(this.document.body, 'overscroll-behavior', 'none');
    this.renderer.setStyle(this.document.documentElement, 'overscroll-behavior', 'none');
  }

  private unlockPageScroll(): void {
    this.renderer.removeStyle(this.document.body, 'overflow');
    this.renderer.removeStyle(this.document.documentElement, 'overflow');
    this.renderer.removeStyle(this.document.body, 'overscroll-behavior');
    this.renderer.removeStyle(this.document.documentElement, 'overscroll-behavior');
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

  private loadAssignmentsForSelectedDay(): void {
    const loadVersion = ++this.loadVersion;
    this.clearCardInteractionState();
    this.clearMapSelectionState();
    this.mapStops = [];
    this.allDayMapStops = [];
    this.routeSegments = [];
    this.allRouteSegments = [];
    this.travelTimesByAssignmentId = new Map();
    this.travelState = 'unavailable';
    const date = this.getDateForDay(this.selectedDay);

    forkJoin({
      cards: this.assignmentService.getAssignmentCardsByDesiredDate(date),
      availabilities: this.availabilityService.getAvailabilitiesByDate(date),
      progress: this.assignmentService.getDailyProgressByDesiredDate(date),
      technicianLocations: this.assignmentService.getTechnicianLocationsByDesiredDate(date),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ cards, availabilities, progress, technicianLocations }) => {
        if (loadVersion !== this.loadVersion) {
          return;
        }

        const availabilityFormattingOptions = this.getAvailabilityFormattingOptions();
        const availabilityCards = availabilities.map((availability) =>
          mapAvailabilityDtoToAssignmentCardModel(availability, availabilityFormattingOptions),
        );

        this.assignmentCards = this.mergeCardsWithAvailability(cards, availabilityCards);
        this.assignmentSequenceNumbers = this.buildAssignmentSequenceNumbers(this.assignmentCards);
        this.serviceDailyProgress = progress;
        this.dailyProgress = this.clearTravelMetrics(progress);
        this.travelState = this.assignmentCards.length > 0 ? 'loading' : 'unavailable';
        this.technicianLocations = technicianLocations;
        this.refreshMapData(loadVersion);
        this.cdr.detectChanges();
      });
  }

  private refreshMapData(loadVersion: number): void {
    const visibleCards = this.getVisibleMapAssignments(this.assignmentCards);
    this.allDayMapStops = this.buildMapStops(
      this.assignmentCards,
      this.technicianLocations,
      this.assignmentSequenceNumbers,
    );

    this.mapAssignments = visibleCards
      .filter((card) => card.locationPoint)
      .map((card) => ({
        id: card.id,
        name: card.title,
        location: {
          lat: card.locationPoint!.y,
          lon: card.locationPoint!.x,
        },
        description: card.address,
        status: card.status,
      }));

    this.mapStops = this.buildMapStops(
      visibleCards,
      this.technicianLocations,
      this.assignmentSequenceNumbers,
    );

    if (
      this.focusedAssignmentId &&
      !visibleCards.some((card) => card.id === this.focusedAssignmentId)
    ) {
      this.focusedAssignmentId = null;
      this.activeRouteSegmentId = null;
      this.focusedRouteSegment = null;
    }

    this.loadRouteSegments(this.mapStops, this.allDayMapStops, loadVersion);
  }

  private loadRouteSegments(
    visibleStops: MapStop[],
    allStops: MapStop[],
    loadVersion: number,
  ): void {
    const visibleSegments$ = this.routingService.getRouteSegments(visibleStops);
    const useSharedSegments = this.haveSameStopIds(visibleStops, allStops);

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
          allSegments: this.routingService.getRouteSegments(allStops),
        });

    routeSegments$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ visibleSegments, allSegments }) => {
        if (loadVersion !== this.loadVersion) {
          return;
        }

        this.routeSegments = visibleSegments;
        this.allRouteSegments = allSegments ?? visibleSegments;
        this.travelTimesByAssignmentId = this.buildTravelTimesFromRouteSegments(
          this.allDayMapStops,
          this.allRouteSegments,
        );
        this.dailyProgress = this.buildDailyProgressWithRouteTravel(
          this.serviceDailyProgress,
          this.allDayMapStops,
          this.allRouteSegments,
          this.assignmentCards,
        );
        this.travelState = this.travelTimesByAssignmentId.size > 0 ? 'ready' : 'unavailable';
        this.syncFocusedRouteSelection();
        this.cdr.detectChanges();
      });
  }

  getTravelTimeForCard(card: Assignment): number | undefined {
    return this.travelTimesByAssignmentId.get(card.id);
  }

  private mergeCardsWithAvailability(
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

  private clearTravelMetrics(summary: DailyProgressSummary): DailyProgressSummary {
    return {
      ...summary,
      completedTravelMinutes: 0,
      totalTravelMinutes: 0,
    };
  }

  private scrollToAssignmentCard(assignmentId: string): void {
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.pendingCardScrollTimeoutId = window.setTimeout(() => {
      const cardElement = this.findAssignmentCardRow(assignmentId);
      if (!cardElement) {
        this.pendingCardScrollTimeoutId = undefined;
        return;
      }

      this.mapBottomSheet?.scrollToElement(cardElement);
      this.pendingCardScrollTimeoutId = undefined;
      this.pendingCardHighlightTimeoutId = window.setTimeout(() => {
        this.highlightAssignmentCard(assignmentId);
        this.pendingCardHighlightTimeoutId = undefined;
      }, CARD_HIGHLIGHT_DELAY_AFTER_SCROLL_MS);
    }, MAP_BOTTOM_SHEET_SCROLL_DELAY_MS);
  }

  private highlightAssignmentCard(assignmentId: string): void {
    const cardElement = this.findAssignmentCardRow(assignmentId);
    if (!cardElement) {
      return;
    }

    this.clearMarkerCardFocus();

    // Force a reflow so the focus animation restarts when the same marker is tapped again.
    void cardElement.offsetWidth;
    cardElement.classList.add('marker-focused');
    this.highlightedCardElement = cardElement;
  }

  private findAssignmentCardRow(assignmentId: string): HTMLElement | undefined {
    return this.miniAssignmentCardRows?.find(
      (row) => row.nativeElement.dataset['assignmentId'] === assignmentId,
    )?.nativeElement;
  }

  private clearMarkerCardFocus(): void {
    if (!this.highlightedCardElement) {
      return;
    }

    this.highlightedCardElement.classList.remove('marker-focused');
    this.highlightedCardElement = undefined;
  }

  private clearCardInteractionState(): void {
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.clearMarkerCardFocus();
  }

  private clearMapSelectionState(): void {
    this.activeRouteSegmentId = null;
    this.focusedAssignmentId = null;
    this.focusedRouteSegment = null;
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

  private buildAssignmentSequenceNumbers(cards: Assignment[]): Record<string, number> {
    const orderedCards = this.sortCardsByTime(cards);

    return orderedCards.reduce<Record<string, number>>((lookup, entry, index) => {
      const { card } = entry;
      lookup[card.id] = index + 1;
      return lookup;
    }, {});
  }

  private toTimeOfDayMinutes(timeValue: string | undefined): number {
    if (!timeValue) {
      return Number.MAX_SAFE_INTEGER;
    }

    // Support both simple times (HH:mm) and ranges (HH:mm-HH:mm) by reading the first time.
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
      .sort((a, b) => {
        const timeDiff = a.minutes - b.minutes;
        if (timeDiff !== 0) {
          return timeDiff;
        }

        return a.index - b.index;
      });
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

  private findAssignmentStop(assignmentId: string): MapStop | undefined {
    return this.findAssignmentStopIn(this.mapStops, assignmentId);
  }

  private findAssignmentStopIn(stops: MapStop[], assignmentId: string): MapStop | undefined {
    return stops.find((stop) => stop.kind === 'assignment' && stop.assignmentId === assignmentId);
  }

  private findValidPreviousStopForAssignment(
    assignmentId: string,
    currentStopId: string,
    stops: MapStop[] = this.mapStops,
  ): MapStop | undefined {
    const currentSequenceNumber = this.assignmentSequenceNumbers[assignmentId];
    if (!Number.isInteger(currentSequenceNumber) || currentSequenceNumber <= 0) {
      return undefined;
    }

    if (currentSequenceNumber === 1) {
      return stops.find((stop) => stop.id === 'start');
    }

    const previousAssignmentId = Object.entries(this.assignmentSequenceNumbers).find(
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

  private resolveFocusedRouteContext(assignmentId: string): {
    currentStop?: MapStop;
    previousStop?: MapStop;
    routeSegment?: MapRouteSegment;
  } {
    const currentStop =
      this.findAssignmentStopIn(this.allDayMapStops, assignmentId) ??
      this.findAssignmentStop(assignmentId);

    if (!currentStop) {
      this.activeRouteSegmentId = null;
      this.focusedRouteSegment = null;
      return {};
    }

    const previousStop = this.findValidPreviousStopForAssignment(
      assignmentId,
      currentStop.id,
      this.allDayMapStops,
    );
    const routeSegmentId = previousStop
      ? buildRouteSegmentId(previousStop.id, currentStop.id)
      : null;
    const routeSegment = routeSegmentId ? this.findRouteSegmentById(routeSegmentId) : undefined;

    this.activeRouteSegmentId = routeSegment?.id ?? null;
    this.focusedRouteSegment = routeSegment ?? null;

    return {
      currentStop,
      previousStop,
      routeSegment,
    };
  }

  private findRouteSegmentById(segmentId: string): MapRouteSegment | undefined {
    return (
      this.allRouteSegments.find((segment) => segment.id === segmentId) ??
      this.routeSegments.find((segment) => segment.id === segmentId)
    );
  }

  private syncFocusedRouteSelection(): void {
    if (!this.focusedAssignmentId) {
      this.activeRouteSegmentId = null;
      this.focusedRouteSegment = null;
      return;
    }

    this.resolveFocusedRouteContext(this.focusedAssignmentId);
  }

  private clearPendingCardScroll(): void {
    if (!this.pendingCardScrollTimeoutId) {
      return;
    }

    clearTimeout(this.pendingCardScrollTimeoutId);
    this.pendingCardScrollTimeoutId = undefined;
  }

  private clearPendingCardHighlight(): void {
    if (!this.pendingCardHighlightTimeoutId) {
      return;
    }

    clearTimeout(this.pendingCardHighlightTimeoutId);
    this.pendingCardHighlightTimeoutId = undefined;
  }

  private getMapStageHeight(): number {
    const stageHeight = this.mapStageRef?.nativeElement.getBoundingClientRect().height;
    if (typeof stageHeight === 'number' && Number.isFinite(stageHeight) && stageHeight > 0) {
      return stageHeight;
    }

    if (
      typeof window !== 'undefined' &&
      Number.isFinite(window.innerHeight) &&
      window.innerHeight > 0
    ) {
      return window.innerHeight;
    }

    return 1;
  }

  private getVisibleMapAssignments(cards: Assignment[]): Assignment[] {
    if (this.showCompletedAssignments) {
      return cards;
    }

    return cards.filter((card) => card.status !== 'completed');
  }

  private haveSameStopIds(firstStops: MapStop[], secondStops: MapStop[]): boolean {
    if (firstStops.length !== secondStops.length) {
      return false;
    }

    return firstStops.every((stop, index) => stop.id === secondStops[index]?.id);
  }
}
