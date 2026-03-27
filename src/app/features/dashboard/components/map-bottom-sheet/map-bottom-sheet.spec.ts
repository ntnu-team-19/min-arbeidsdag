import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { MapBottomSheet } from './map-bottom-sheet';

describe('MapBottomSheet', () => {
  let component: MapBottomSheet;
  let mockContentElement: {
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
    scrollTo: ReturnType<typeof vi.fn>;
    getBoundingClientRect: () => { top: number; height: number };
  };

  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();

  beforeEach(() => {
    component = new MapBottomSheet();

    const mockSheetElement = {
      setPointerCapture,
      releasePointerCapture,
      getBoundingClientRect: () => ({
        height: 1000,
      }),
    };

    mockContentElement = {
      scrollTop: 0,
      clientHeight: 400,
      scrollHeight: 1200,
      scrollTo: vi.fn(),
      getBoundingClientRect: () => ({
        top: 100,
        height: 400,
      }),
    };

    component.sheetRef = {
      nativeElement: mockSheetElement,
    } as unknown as ElementRef<HTMLDivElement>;

    component.contentRef = {
      nativeElement: mockContentElement,
    } as unknown as ElementRef<HTMLDivElement>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setPointerCapture.mockReset();
    releasePointerCapture.mockReset();
    mockContentElement.scrollTo.mockReset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with peek snap by default', () => {
    component.initialSnap = 'peek';

    component.ngOnInit();

    expect(component.currentSnap).toBe('peek');
    expect(component.currentTranslateY).toBe(520);
  });

  it('should initialize with collapsed snap when initialSnap is collapsed', () => {
    component.initialSnap = 'collapsed';

    component.ngOnInit();

    expect(component.currentSnap).toBe('collapsed');
    expect(component.currentTranslateY).toBe(844);
  });

  it('should initialize with expanded snap when initialSnap is expanded', () => {
    component.initialSnap = 'expanded';

    component.ngOnInit();

    expect(component.currentSnap).toBe('expanded');
    expect(component.currentTranslateY).toBe(100);
  });

  it('should enable animation after view init', () => {
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback): number => {
        cb(0);
        return 1;
      });

    component.initialSnap = 'peek';
    component.ngOnInit();
    component.isAnimating = false;

    component.ngAfterViewInit();

    expect(rafSpy).toHaveBeenCalled();
    expect(component.isAnimating).toBe(true);
  });

  it('should recalculate snap position on resize', () => {
    component.initialSnap = 'peek';
    component.ngOnInit();

    const newHeight = 800;
    vi.spyOn(component.sheetRef.nativeElement, 'getBoundingClientRect').mockReturnValue({
      height: newHeight,
      width: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    component.onResize();

    expect(component.currentTranslateY).toBe(Math.round(newHeight * 0.52));
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

    expect(component.currentTranslateY).toBe(620);
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

    expect(component.currentTranslateY).toBe(100);
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

    expect(component.currentTranslateY).toBe(844);
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
    component.currentTranslateY = 530;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(component.isDragging).toBe(false);
    expect(component.isAnimating).toBe(true);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(component.currentSnap).toBe('peek');
    expect(component.currentTranslateY).toBe(520);
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
    expect(component.currentTranslateY).toBe(100);
    expect(emitSpy).toHaveBeenCalledWith('expanded');
  });

  it('should snap to collapsed when closest on pointer up', () => {
    const emitSpy = vi.spyOn(component.snapChanged, 'emit');

    component.ngOnInit();
    component.isDragging = true;
    component.currentTranslateY = 820;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(component.currentSnap).toBe('collapsed');
    expect(component.currentTranslateY).toBe(844);
    expect(emitSpy).toHaveBeenCalledWith('collapsed');
  });

  it('should reset content scroll when snapping to collapsed', () => {
    component.ngOnInit();
    component.contentRef.nativeElement.scrollTop = 100;
    component.isDragging = true;
    component.currentTranslateY = 820;

    component.onPointerUp({
      pointerId: 1,
    } as PointerEvent);

    expect(component.contentRef.nativeElement.scrollTop).toBe(0);
  });

  it('should allow programmatic snapping to peek', () => {
    const emitSpy = vi.spyOn(component.snapChanged, 'emit');

    component.ngOnInit();
    component.currentSnap = 'collapsed';
    component.currentTranslateY = 844;

    component.snapTo('peek');

    expect(component.currentSnap).toBe('peek');
    expect(component.currentTranslateY).toBe(520);
    expect(emitSpy).toHaveBeenCalledWith('peek');
  });

  it('should scroll only the sheet content to a target element', () => {
    component.ngOnInit();

    const targetElement = {
      getBoundingClientRect: () => ({
        top: 340,
        height: 120,
      }),
    } as HTMLElement;

    component.scrollToElement(targetElement);

    expect(component.contentRef.nativeElement.scrollTo).toHaveBeenCalledWith({
      top: 240,
      behavior: 'smooth',
    });
  });

  it('should clamp scroll-to-element to the top of the list', () => {
    component.ngOnInit();

    const targetElement = {
      getBoundingClientRect: () => ({
        top: 80,
        height: 120,
      }),
    } as HTMLElement;

    component.scrollToElement(targetElement);

    expect(component.contentRef.nativeElement.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('should clamp scroll-to-element to the bottom of the list', () => {
    component.ngOnInit();

    const targetElement = {
      getBoundingClientRect: () => ({
        top: 1140,
        height: 120,
      }),
    } as HTMLElement;

    component.scrollToElement(targetElement);

    expect(component.contentRef.nativeElement.scrollTo).toHaveBeenCalledWith({
      top: 800,
      behavior: 'smooth',
    });
  });
});
