import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

export type SnapPoint = 'collapsed' | 'peek' | 'expanded';

export const MAP_BOTTOM_SHEET_EXPANDED_RATIO = 0.1;
export const MAP_BOTTOM_SHEET_PEEK_RATIO = 0.52;
export const MAP_BOTTOM_SHEET_COLLAPSED_VISIBLE_HEIGHT = 156;

@Component({
  selector: 'app-map-bottom-sheet',
  standalone: true,
  templateUrl: './map-bottom-sheet.html',
  styleUrl: './map-bottom-sheet.css',
})
export class MapBottomSheet implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sheet') sheetRef!: ElementRef<HTMLDivElement>;
  @ViewChild('content') contentRef!: ElementRef<HTMLDivElement>;

  @Input() initialSnap: SnapPoint = 'peek';
  @Output() snapChanged = new EventEmitter<SnapPoint>();

  currentSnap: SnapPoint = 'peek';
  currentTranslateY = 0;

  isDragging = false;
  isAnimating = false;

  private startPointerY = 0;
  private startTranslateY = 0;
  private touchStartY: number | null = null;
  private touchDragStartTranslateY = 0;
  private isTopPullDragging = false;
  private wheelSnapTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private snapPoints: Record<SnapPoint, number> = {
    expanded: 0,
    peek: 0,
    collapsed: 0,
  };

  ngOnInit(): void {
    this.calculateSnapPoints();
    this.currentSnap = this.initialSnap;
    this.currentTranslateY = this.snapPoints[this.initialSnap];
  }

  ngAfterViewInit(): void {
    this.calculateSnapPoints();
    this.currentTranslateY = this.snapPoints[this.currentSnap];
    this.bindContentListeners();

    requestAnimationFrame(() => {
      this.isAnimating = true;
    });
  }

  ngOnDestroy(): void {
    this.clearWheelSnapTimeout();
    this.unbindContentListeners();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calculateSnapPoints();
    this.currentTranslateY = this.snapPoints[this.currentSnap];
  }

  onPointerDown(event: PointerEvent): void {
    this.clearWheelSnapTimeout();
    this.isDragging = true;
    this.isAnimating = false;
    this.startPointerY = event.clientY;
    this.startTranslateY = this.currentTranslateY;

    this.sheetRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const deltaY = event.clientY - this.startPointerY;
    const next = this.startTranslateY + deltaY;

    this.currentTranslateY = this.clamp(next, this.snapPoints.expanded, this.snapPoints.collapsed);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.isAnimating = true;
    this.sheetRef.nativeElement.releasePointerCapture(event.pointerId);

    const nearest = this.getNearestSnapPoint(this.currentTranslateY);
    this.snapTo(nearest);
  }

  snapTo(point: SnapPoint, emit = true): void {
    this.currentSnap = point;
    this.currentTranslateY = this.snapPoints[point];
    this.isTopPullDragging = false;

    if (point === 'collapsed' && this.contentRef?.nativeElement) {
      this.contentRef.nativeElement.scrollTop = 0;
    }

    if (emit) {
      this.snapChanged.emit(point);
    }
  }

  scrollToElement(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
    const contentElement = this.contentRef?.nativeElement;
    if (!contentElement) {
      return;
    }

    const contentRect = contentElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const elementTop = elementRect.top - contentRect.top + contentElement.scrollTop;
    const maxScrollTop = Math.max(0, contentElement.scrollHeight - contentElement.clientHeight);
    const targetTop = this.clamp(elementTop, 0, maxScrollTop);

    contentElement.scrollTo({
      top: targetTop,
      behavior,
    });
  }

  private calculateSnapPoints(): void {
    const sheetHeight =
      this.sheetRef?.nativeElement?.getBoundingClientRect().height || window.innerHeight;
    const collapsed = Math.max(0, sheetHeight - MAP_BOTTOM_SHEET_COLLAPSED_VISIBLE_HEIGHT);
    const expanded = sheetHeight * MAP_BOTTOM_SHEET_EXPANDED_RATIO;
    const peekRaw = sheetHeight * MAP_BOTTOM_SHEET_PEEK_RATIO;

    this.snapPoints = {
      expanded,
      peek: this.clamp(peekRaw, expanded, collapsed),
      collapsed,
    };
  }

  private bindContentListeners(): void {
    const content = this.contentRef?.nativeElement;
    if (!content) {
      return;
    }

    content.addEventListener('wheel', this.onContentWheel as EventListener, { passive: true });
    content.addEventListener('touchstart', this.onContentTouchStart as EventListener, {
      passive: true,
    });
    content.addEventListener('touchmove', this.onContentTouchMove as EventListener, {
      passive: false,
    });
    content.addEventListener('touchend', this.onContentTouchEnd as EventListener, {
      passive: true,
    });
    content.addEventListener('touchcancel', this.onContentTouchEnd as EventListener, {
      passive: true,
    });
  }

  private unbindContentListeners(): void {
    const content = this.contentRef?.nativeElement;
    if (!content) {
      return;
    }

    content.removeEventListener('wheel', this.onContentWheel as EventListener);
    content.removeEventListener('touchstart', this.onContentTouchStart as EventListener);
    content.removeEventListener('touchmove', this.onContentTouchMove as EventListener);
    content.removeEventListener('touchend', this.onContentTouchEnd as EventListener);
    content.removeEventListener('touchcancel', this.onContentTouchEnd as EventListener);
  }

  private onContentWheel = (event: WheelEvent): void => {
    if (this.isDragging) {
      return;
    }

    const content = this.contentRef?.nativeElement;
    if (!content || content.scrollTop > 0 || event.deltaY >= 0) {
      this.clearWheelSnapTimeout();
      return;
    }

    this.isAnimating = false;
    const next = this.currentTranslateY + Math.abs(event.deltaY);
    this.currentTranslateY = this.clamp(next, this.snapPoints.expanded, this.snapPoints.collapsed);

    this.clearWheelSnapTimeout();
    this.wheelSnapTimeoutId = setTimeout(() => {
      this.isAnimating = true;
      this.snapTo(this.getNearestSnapPoint(this.currentTranslateY));
    }, 120);
  };

  private onContentTouchStart = (event: TouchEvent): void => {
    this.clearWheelSnapTimeout();
    const firstTouch = event.touches.item(0);
    this.touchStartY = firstTouch?.clientY ?? null;
    this.touchDragStartTranslateY = this.currentTranslateY;
    this.isTopPullDragging = false;
  };

  private onContentTouchMove = (event: TouchEvent): void => {
    if (this.isDragging) {
      return;
    }

    const content = this.contentRef?.nativeElement;
    const firstTouch = event.touches.item(0);
    if (!content || !firstTouch || this.touchStartY === null) {
      return;
    }

    const deltaY = firstTouch.clientY - this.touchStartY;

    if (content.scrollTop > 0 && !this.isTopPullDragging) {
      this.touchStartY = firstTouch.clientY;
      this.touchDragStartTranslateY = this.currentTranslateY;
      return;
    }

    if (!this.isTopPullDragging && content.scrollTop <= 0 && deltaY > 0) {
      this.isTopPullDragging = true;
      this.isAnimating = false;
      this.touchDragStartTranslateY = this.currentTranslateY;
    }

    if (!this.isTopPullDragging) {
      return;
    }

    const next = this.touchDragStartTranslateY + deltaY;
    this.currentTranslateY = this.clamp(next, this.snapPoints.expanded, this.snapPoints.collapsed);
    event.preventDefault();
  };

  private onContentTouchEnd = (): void => {
    if (this.isTopPullDragging) {
      this.isAnimating = true;
      this.snapTo(this.getNearestSnapPoint(this.currentTranslateY));
    }

    this.touchStartY = null;
    this.isTopPullDragging = false;
    this.touchDragStartTranslateY = this.currentTranslateY;
  };

  private clearWheelSnapTimeout(): void {
    if (!this.wheelSnapTimeoutId) {
      return;
    }

    clearTimeout(this.wheelSnapTimeoutId);
    this.wheelSnapTimeoutId = null;
  }

  private getNearestSnapPoint(value: number): SnapPoint {
    const entries = Object.entries(this.snapPoints) as [SnapPoint, number][];

    return entries.reduce((closest, current) => {
      return Math.abs(value - current[1]) < Math.abs(value - closest[1]) ? current : closest;
    })[0];
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
