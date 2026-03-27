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
export class MapBottomSheet implements OnInit, AfterViewInit {
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

    requestAnimationFrame(() => {
      this.isAnimating = true;
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calculateSnapPoints();
    this.currentTranslateY = this.snapPoints[this.currentSnap];
  }

  onPointerDown(event: PointerEvent): void {
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
