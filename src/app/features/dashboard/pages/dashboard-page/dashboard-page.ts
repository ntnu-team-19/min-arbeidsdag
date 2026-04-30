import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
  forwardRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
  AssignmentMap,
  Assignment as MapAssignment,
  MapRouteSegment,
} from '../../../../shared/components/map/map';
import { MapLocation } from '../../../../shared/components/map/map.models';
import { FloatingButton } from '../../components/floating-button/floating-button';
import { DaySelector } from '../../components/day-selector/day-selector';
import { DayOption } from '../../components/day-selector/day-selector.types';
import { AssignmentCard } from '../../components/assignment-card/assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../../core/models/daily-progress.model';
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
import { TechnicianLocation } from '../../../../core/models/tech-location.model';
import { DashboardTravelState } from '../../models/dashboard-travel-state.model';
import { isAvailabilityCardId } from '../../../../core/mappers/availability-card.mapper';
import { DashboardFacade } from '../../services/dashboard-facade';
import { DashboardSelectionContext } from '../../services/dashboard-facade.models';

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
  providers: [DashboardFacade],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild(AssignmentMap) private assignmentMap?: AssignmentMap;
  @ViewChild(MapBottomSheet) private mapBottomSheet?: MapBottomSheet;
  @ViewChild('mapStage', { read: ElementRef }) private mapStageRef?: ElementRef<HTMLElement>;
  @ViewChildren('miniAssignmentCardRow', { read: ElementRef })
  private miniAssignmentCardRows?: QueryList<ElementRef<HTMLElement>>;

  currentMapSheetSnap: SnapPoint = 'peek';

  private readonly dashboard = inject(DashboardFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private highlightedCardElement?: HTMLElement;
  private pendingCardScrollTimeoutId?: ReturnType<typeof setTimeout>;
  private pendingCardHighlightTimeoutId?: ReturnType<typeof setTimeout>;

  get selectedDay(): DayOption {
    return this.dashboard.selectedDay();
  }

  get isListView(): boolean {
    return this.dashboard.isListView();
  }

  get assignmentCards(): Assignment[] {
    return this.dashboard.assignmentCards();
  }

  get travelState(): DashboardTravelState {
    return this.dashboard.travelState();
  }

  get dailyProgress(): DailyProgressSummary {
    return this.dashboard.dailyProgress();
  }

  get technicianLocations(): TechnicianLocation[] {
    return this.dashboard.technicianLocations();
  }

  get mapAssignments(): MapAssignment[] {
    return this.dashboard.mapAssignments();
  }

  get mapStops() {
    return this.dashboard.mapStops();
  }

  get routeSegments() {
    return this.dashboard.routeSegments();
  }

  get displayedRouteSegments(): MapRouteSegment[] {
    return this.dashboard.displayedRouteSegments();
  }

  get activeRouteSegmentId(): string | null {
    return this.dashboard.activeRouteSegmentId();
  }

  get focusedAssignmentId(): string | null {
    return this.dashboard.focusedAssignmentId();
  }

  get showCompletedAssignments(): boolean {
    return this.dashboard.showCompletedAssignments();
  }

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
    return this.dashboard.startTechnicianLocation();
  }

  get fallbackUserLocation(): MapLocation | null {
    return this.dashboard.fallbackUserLocation();
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

  get shouldShowStartLocationCard(): boolean {
    return this.dashboard.shouldShowStartLocationCard();
  }

  get shouldShowTravelUnavailableNotice(): boolean {
    return this.dashboard.shouldShowTravelUnavailableNotice();
  }

  get travelUnavailableTitle(): string {
    return this.translate.instant('travelTime.travelUnavailableTitle');
  }

  get travelUnavailableMessage(): string {
    return this.translate.instant('travelTime.travelUnavailableMessage');
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const dayParam = params.get('day');
      const viewParam = params.get('view');
      const nextDay = dayParam === 'today' || dayParam === 'tomorrow' ? dayParam : this.selectedDay;
      const nextIsListView =
        viewParam === 'list' || viewParam === 'map' ? viewParam === 'list' : this.isListView;

      this.dashboard.applyQueryState(nextDay, nextIsListView);
      this.updatePageScrollLock();
    });
  }

  ngOnDestroy(): void {
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.clearMarkerCardFocus();
    this.unlockPageScroll();
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

    const travelMinutes = firstAssignment
      ? this.dashboard.getTravelTimeForCard(firstAssignment.id)
      : undefined;

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
    return this.dashboard.getAssignmentSequenceNumber(assignmentId);
  }

  getTravelTimeForCard(card: Assignment): number | undefined {
    return this.dashboard.getTravelTimeForCard(card.id);
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

  onDayChange(day: DayOption): void {
    this.dashboard.setSelectedDay(day);
    this.updateQueryParams();
  }

  onMarkerClicked(assignment: MapAssignment): void {
    if (this.isListView) {
      return;
    }

    const selectionContext = this.dashboard.selectAssignment(String(assignment.id));
    this.focusMapSelection(assignment, selectionContext);
    this.mapBottomSheet?.snapTo('peek');
    this.scrollToAssignmentCard(String(assignment.id));
  }

  onMiniAssignmentDirectionsClick(assignment: Assignment): void {
    const selection = this.dashboard.prepareSelectionFromCard(assignment);
    this.focusMapSelection(selection.mapAssignment, selection.selectionContext);
    this.mapBottomSheet?.snapTo('peek');
    this.scrollToAssignmentCard(assignment.id);
  }

  onViewChange(listView: boolean): void {
    this.dashboard.setListView(listView);
    this.clearCardInteractionState();
    this.dashboard.clearMapSelection();
    this.updateQueryParams();
    this.updatePageScrollLock();
  }

  onCompletedAssignmentsToggle(): void {
    this.dashboard.toggleCompletedAssignments();
    this.clearCardInteractionState();
  }

  onSnapChanged(snap: SnapPoint): void {
    this.currentMapSheetSnap = snap;
  }

  onMapBackgroundClicked(): void {
    this.clearCardInteractionState();
    this.dashboard.clearMapSelection();
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
    this.dashboard.updateTomorrowConfirmation(id, confirmed);
  }

  private focusMapSelection(
    assignment: MapAssignment,
    selectionContext: DashboardSelectionContext | null,
  ): void {
    if (
      selectionContext?.currentStop &&
      selectionContext.previousStop &&
      selectionContext.routeSegment
    ) {
      this.assignmentMap?.focusAssignmentLeg({
        fromStop: selectionContext.previousStop,
        toStop: selectionContext.currentStop,
        routeSegment: selectionContext.routeSegment,
        targetYRatio: MAP_MARKER_FOCUS_TARGET_Y_RATIO,
      });
      return;
    }

    this.assignmentMap?.focusAssignment(assignment, {
      targetYRatio: MAP_MARKER_FOCUS_TARGET_Y_RATIO,
    });
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
}
