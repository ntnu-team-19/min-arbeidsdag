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
import { AssignmentMap, Assignment as MapAssignment } from '../../../../shared/components/map/map';
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

  private assignmentService = inject(AssignmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private highlightedCardElement?: HTMLElement;
  private pendingCardScrollTimeoutId?: ReturnType<typeof setTimeout>;
  private pendingCardHighlightTimeoutId?: ReturnType<typeof setTimeout>;

  get sheetTitle(): string {
    const count = this.assignmentCards.length;
    const dayText = this.selectedDay === 'today' ? 'i dag' : 'i morgen';
    return `${count} Oppdrag ${dayText}`;
  }

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const dayParam = params.get('day');
      const viewParam = params.get('view');

      if (dayParam === 'today' || dayParam === 'tomorrow') {
        this.selectedDay = dayParam;
      }

      if (viewParam === 'list' || viewParam === 'map') {
        this.isListView = viewParam === 'list';
      }

      this.loadAssignmentsForSelectedDay();
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
    this.updateQueryParams();
    this.loadAssignmentsForSelectedDay();
  }

  onMarkerClicked(assignment: MapAssignment) {
    if (this.isListView) {
      return;
    }

    const assignmentId = String(assignment.id);
    this.assignmentMap?.focusAssignment(assignment, {
      targetYRatio: MAP_MARKER_FOCUS_TARGET_Y_RATIO,
    });
    this.mapBottomSheet?.snapTo('peek');
    this.scrollToAssignmentCard(assignmentId);
  }

  onViewChange(listView: boolean) {
    this.isListView = listView;
    if (listView) {
      this.clearPendingCardScroll();
      this.clearPendingCardHighlight();
      this.clearMarkerCardFocus();
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
    this.clearPendingCardScroll();
    this.clearPendingCardHighlight();
    this.clearMarkerCardFocus();
    const date = this.getDateForDay(this.selectedDay);

    this.assignmentService.getAssignmentCardsByDesiredDate(date).subscribe((cards) => {
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
    });

    this.assignmentService.getTravelTimesByDesiredDate(date).subscribe((times) => {
      this.travelTimes = times;
    });

    this.assignmentService.getDailyProgressByDesiredDate(date).subscribe((progress) => {
      this.dailyProgress = progress;
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
