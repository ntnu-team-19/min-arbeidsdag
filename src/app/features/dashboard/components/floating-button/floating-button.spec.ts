import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { FloatingButton } from './floating-button';

describe('FloatingButton', () => {
  let component: FloatingButton;
  let fixture: ComponentFixture<FloatingButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingButton],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to list view', () => {
    expect(component.isListView).toBe(true);
  });

  it('should show map icon when in list view', () => {
    component.isListView = true;
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('.pi-map'));
    expect(icon).toBeTruthy();
  });

  it('should show list icon when in map view', () => {
    component.isListView = false;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('.pi-list'));
    expect(icon).toBeTruthy();
  });

  it('should toggle from list view to map view on click', () => {
    component.isListView = true;
    component.toggle();
    expect(component.isListView).toBe(false);
  });

  it('should toggle from map view to list view on click', () => {
    component.isListView = false;
    component.toggle();
    expect(component.isListView).toBe(true);
  });

  it('should emit viewChange on toggle', () => {
    let emittedValue: boolean | undefined;
    component.viewChange.subscribe((value: boolean) => {
      emittedValue = value;
    });
    component.isListView = true;
    component.toggle();
    expect(emittedValue).toBe(false);
  });

  it('should have correct aria-label for list view', () => {
    component.isListView = true;
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button'));
    expect(button.nativeElement.getAttribute('aria-label')).toBe('Åpne kartvisning');
  });

  it('should have correct aria-label for map view', () => {
    component.isListView = false;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button'));
    expect(button.nativeElement.getAttribute('aria-label')).toBe('Åpne listevisning');
  });
});
