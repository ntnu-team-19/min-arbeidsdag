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
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MapBottomSheet } from '../../components/map-bottom-sheet/map-bottom-sheet';
import { MAP_BOTTOM_SHEET_PEEK_RATIO } from '../../components/map-bottom-sheet/map-bottom-sheet';
import { TravelTimeIndicator } from '../../components/travel-time-indicator/travel-time-indicator';
import { MiniAssignmentCard } from '../../components/mini-assignment-card/mini-assignment-card';
import { DailyProgressInfobox } from '../../components/daily-progress-infobox/daily-progress-infobox';
import { getTechnicianBase } from '../../../../core/data/mock-technician-bases';
import { RoutingService } from '../../../../core/services/routing.service';
import { buildRouteSegmentId, MapLocation } from '../../../../shared/components/map/map.models';

const MAP_MARKER_FOCUS_TARGET_Y_RATIO = MAP_BOTTOM_SHEET_PEEK_RATIO / 2;
const MAP_BOTTOM_SHEET_SCROLL_DELAY_MS = 280;
const CARD_HIGHLIGHT_DELAY_AFTER_SCROLL_MS = 180;

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    AssignmentMap,
    FloatingButton,
    DaySelector,
    AssignmentCard,
    MapBottomSheet,
    TravelTimeIndicator,
    MiniAssignmentCard,
    DailyProgressInfobox,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild(AssignmentMap) private assignmentMap?: AssignmentMap;
  @ViewChild(MapBottomSheet) private mapBottomSheet?: MapBottomSheet;
  @ViewChildren('miniAssignmentCardRow', { read: ElementRef })
  private miniAssignmentCardRows?: QueryList<ElementRef<HTMLElement>>;

  selectedDay: DayOption = 'today';
  isListView = true;
  assignmentCards: Assignment[] = [];
  travelTimes: number[] = [];
  dailyProgress: DailyProgressSummary = EMPTY_DAILY_PROGRESS_SUMMARY;
  mapAssignments: MapAssignment[] = [];
  mapStops: MapStop[] = [];
  routeSegments: MapRouteSegment[] = [];
  activeRouteSegmentId: string | null = null;

  private assignmentService = inject(AssignmentService);
  private routingService = inject(RoutingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private highlightedCardElement?: HTMLElement;
  private pendingCardScrollTimeoutId?: ReturnType<typeof setTimeout>;
  private pendingCardHighlightTimeoutId?: ReturnType<typeof setTimeout>;
  private loadVersion = 0;

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
    const currentStop = this.findAssignmentStop(assignmentId);
    const previousStop = currentStop ? this.findPreviousStop(currentStop.id) : undefined;
    this.activeRouteSegmentId = currentStop && previousStop
      ? buildRouteSegmentId(previousStop.id, currentStop.id)
      : null;
    const activeRouteSegment = this.activeRouteSegmentId
      ? this.routeSegments.find((segment) => segment.id === this.activeRouteSegmentId)
      : undefined;

    if (currentStop) {
      this.assignmentMap?.focusAssignmentLeg({
        fromStop: previousStop,
        toStop: currentStop,
        routeSegment: activeRouteSegment,
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

  onViewChange(listView: boolean) {
    this.isListView = listView;
    if (listView) {
      this.clearPendingCardScroll();
      this.clearPendingCardHighlight();
      this.clearMarkerCardFocus();
      this.activeRouteSegmentId = null;
    }
    this.updateQueryParams();
    this.updatePageScrollLock();
  }

  onSnapChanged(snap: 'collapsed' | 'peek' | 'expanded') {
    console.log('Bottom sheet snap:', snap);
  }

  @HostListener('document:pointerdown')
  @HostListener('document:wheel')
  onUserInteractionStart(): void {
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.clearMarkerCardFocus();
  }

  goToAssignmentDetails(id: string): void {
    this.router.navigate(['/assignments', id], {
      queryParams: {
        day: this.selectedDay,
        view: this.isListView ? 'list' : 'map',
      },
    });
  }

  onTomorrowConfirmationChange(id: string, confirmed: boolean): void {
    this.assignmentService.updateTomorrowConfirmation(id, confirmed).subscribe(() => {
      this.loadAssignmentsForSelectedDay();
    });
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

  private loadAssignmentsForSelectedDay(): void {
    const loadVersion = ++this.loadVersion;
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.clearMarkerCardFocus();
    this.activeRouteSegmentId = null;
    this.routeSegments = [];
    const date = this.getDateForDay(this.selectedDay);

    this.assignmentService.getAssignmentCardsByDesiredDate(date).subscribe((cards) => {
      if (loadVersion !== this.loadVersion) {
        return;
      }

      this.assignmentCards = cards;
      this.mapAssignments = cards
        .filter((card) => card.locationPoint)
        .map((card) => ({
          id: card.id,
          name: card.title,
          location: {
            lat: card.locationPoint!.y,
            lon: card.locationPoint!.x,
          },
          description: card.address,
        }));
      this.mapStops = this.buildMapStops(cards);
      this.loadRouteSegments(this.mapStops, loadVersion);
    });

    this.assignmentService.getTravelTimesByDesiredDate(date).subscribe((times) => {
      if (loadVersion !== this.loadVersion) {
        return;
      }

      this.travelTimes = times;
    });

    this.assignmentService.getDailyProgressByDesiredDate(date).subscribe((progress) => {
      if (loadVersion !== this.loadVersion) {
        return;
      }

      this.dailyProgress = progress;
    });
  }

  private loadRouteSegments(stops: MapStop[], loadVersion: number): void {
    this.routingService
      .getRouteSegments(stops)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((segments) => {
        if (loadVersion !== this.loadVersion) {
          return;
        }

        this.routeSegments = segments;
      });
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

  private buildMapStops(cards: Assignment[]): MapStop[] {
    if (cards.length === 0) {
      return [];
    }

    const baseLocation = getTechnicianBase(cards[0].fieldTechId);
    const assignmentStops = cards.map((card, index) => this.buildAssignmentStop(card, index + 1));

    return [
      {
        id: 'start',
        kind: 'start',
        label: 'Start',
        location: baseLocation,
      },
      ...assignmentStops,
      {
        id: 'end',
        kind: 'end',
        label: 'Slutt',
        location: baseLocation,
      },
    ];
  }

  private buildAssignmentStop(card: Assignment, sequenceNumber: number): MapStop {
    return {
      id: `assignment-${card.id}`,
      kind: 'assignment',
      label: card.title,
      assignmentId: card.id,
      sequenceNumber,
      location: this.toMapLocation(card),
    };
  }

  private toMapLocation(card: Assignment): MapLocation | undefined {
    if (!card.locationPoint) {
      return undefined;
    }

    return {
      lat: card.locationPoint.y,
      lon: card.locationPoint.x,
    };
  }

  private getIncomingSegmentIdForAssignment(assignmentId: string): string | null {
    const currentStop = this.findAssignmentStop(assignmentId);
    if (!currentStop) {
      return null;
    }

    const previousStop = this.findPreviousStop(currentStop.id);
    if (!previousStop) {
      return null;
    }

    return buildRouteSegmentId(previousStop.id, currentStop.id);
  }

  private findAssignmentStop(assignmentId: string): MapStop | undefined {
    return this.mapStops.find(
      (stop) => stop.kind === 'assignment' && stop.assignmentId === assignmentId,
    );
  }

  private findPreviousStop(stopId: string): MapStop | undefined {
    const currentStopIndex = this.mapStops.findIndex((stop) => stop.id === stopId);
    if (currentStopIndex <= 0) {
      return undefined;
    }

    return this.mapStops[currentStopIndex - 1];
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
}
