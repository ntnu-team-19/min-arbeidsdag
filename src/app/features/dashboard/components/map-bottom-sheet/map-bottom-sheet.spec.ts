import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { MapBottomSheet } from './map-bottom-sheet';

describe('MapBottomSheet', () => {
  let component: MapBottomSheet;

  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();

  beforeEach(() => {
    component = new MapBottomSheet();

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 1000,
    });

    component.sheetRef = {
      nativeElement: {
        setPointerCapture,
        releasePointerCapture,
      },
    } as unknown as ElementRef<HTMLDivElement>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setPointerCapture.mockReset();
    releasePointerCapture.mockReset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with peek snap by default', () => {
    component.initialSnap = 'peek';

    component.ngOnInit();

    expect(component.currentSnap).toBe('peek');
    expect(component.currentTranslateY).toBe(600);
  });

  it('should initialize with collapsed snap when initialSnap is collapsed', () => {
    component.initialSnap = 'collapsed';

    component.ngOnInit();

    expect(component.currentSnap).toBe('collapsed');
    expect(component.currentTranslateY).toBe(950);
  });

  it('should initialize with expanded snap when initialSnap is expanded', () => {
    component.initialSnap = 'expanded';

    component.ngOnInit();

    expect(component.currentSnap).toBe('expanded');
    expect(component.currentTranslateY).toBe(120);
  });

  it('should enable animation after view init', () => {
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback): number => {
        cb(0);
        return 1;
      });

    component.isAnimating = false;

    component.ngAfterViewInit();

    expect(rafSpy).toHaveBeenCalled();
    expect(component.isAnimating).toBe(true);
  });

  it('should recalculate snap position on resize', () => {
    component.initialSnap = 'peek';
    component.ngOnInit();

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });

    component.onResize();

    expect(component.currentTranslateY).toBe(480);
  });

  it('should start dragging on pointer down', () => {
    component.ngOnInit();

    const event = {
      clientY: 300,
      pointerId: 1,
    } as PointerEvent;

    component.onPointerDown(event);

    expect(component.isDragging).toBe(true);
    expect(component.isAnimating).toBe(false);
    expect(setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('should not move if not dragging', () => {
    component.ngOnInit();
    component.currentTranslateY = 600;

    const event = {
      clientY: 400,
    } as PointerEvent;

    component.onPointerMove(event);

    expect(component.currentTranslateY).toBe(600);
  });

  it('should move while dragging', () => {
    component.ngOnInit();

    component.onPointerDown({
      clientY: 200,
      pointerId: 1,
    } as PointerEvent);

    component.onPointerMove({
      clientY: 300,
    } as PointerEvent);

    expect(component.currentTranslateY).toBe(700);
  });

  it('should clamp movement to expanded snap point minimum', () => {
    component.ngOnInit();

    component.onPointerDown({
      clientY: 600,
      pointerId: 1,
    } as PointerEvent);

    component.onPointerMove({
      clientY: -1000,
    } as PointerEvent);

    expect(component.currentTranslateY).toBe(120);
  });

  it('should clamp movement to collapsed snap point maximum', () => {
    component.ngOnInit();

    component.onPointerDown({
      clientY: 200,
      pointerId: 1,
    } as PointerEvent);

    component.onPointerMove({
      clientY: 2000,
    } as PointerEvent);

    expect(component.currentTranslateY).toBe(950);
  });

  it('should do nothing on pointer up if not dragging', () => {
    component.isDragging = false;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(releasePointerCapture).not.toHaveBeenCalled();
  });

  it('should snap to nearest point and emit on pointer up', () => {
    const emitSpy = vi.spyOn(component.snapChanged, 'emit');

    component.ngOnInit();
    component.isDragging = true;
    component.currentTranslateY = 620;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(component.isDragging).toBe(false);
    expect(component.isAnimating).toBe(true);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(component.currentSnap).toBe('peek');
    expect(component.currentTranslateY).toBe(600);
    expect(emitSpy).toHaveBeenCalledWith('peek');
  });

  it('should snap to expanded when closest on pointer up', () => {
    const emitSpy = vi.spyOn(component.snapChanged, 'emit');

    component.ngOnInit();
    component.isDragging = true;
    component.currentTranslateY = 150;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(component.currentSnap).toBe('expanded');
    expect(component.currentTranslateY).toBe(120);
    expect(emitSpy).toHaveBeenCalledWith('expanded');
  });

  it('should snap to collapsed when closest on pointer up', () => {
    const emitSpy = vi.spyOn(component.snapChanged, 'emit');

    component.ngOnInit();
    component.isDragging = true;
    component.currentTranslateY = 920;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(component.currentSnap).toBe('collapsed');
    expect(component.currentTranslateY).toBe(950);
    expect(emitSpy).toHaveBeenCalledWith('collapsed');
  });
});
