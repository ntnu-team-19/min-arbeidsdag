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

    if (emit) {
      this.snapChanged.emit(point);
    }
  }

  private calculateSnapPoints(): void {
    const vh = window.innerHeight;

    this.snapPoints = {
      expanded: vh * 0.12,
      peek: vh * 0.6,
      collapsed: vh * 0.95,
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
