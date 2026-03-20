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

type SnapPoint = 'collapsed' | 'peek' | 'expanded';

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

  private snapTo(point: SnapPoint, emit = true): void {
    this.currentSnap = point;
    this.currentTranslateY = this.snapPoints[point];

    if (point === 'collapsed' && this.contentRef?.nativeElement) {
      this.contentRef.nativeElement.scrollTop = 0;
    }

    if (emit) {
      this.snapChanged.emit(point);
    }
  }

  private calculateSnapPoints(): void {
    const sheetHeight =
      this.sheetRef?.nativeElement?.getBoundingClientRect().height || window.innerHeight;
    const collapsedVisibleHeight = 156;
    const collapsed = Math.max(0, sheetHeight - collapsedVisibleHeight);
    const expanded = sheetHeight * 0.1;
    const peekRaw = sheetHeight * 0.52;

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
