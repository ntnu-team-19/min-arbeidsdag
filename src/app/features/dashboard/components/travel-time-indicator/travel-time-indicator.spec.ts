import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { TravelTimeIndicator } from './travel-time-indicator';

@Component({
  standalone: true,
  imports: [TravelTimeIndicator],
  template: `<app-travel-time-indicator [travelTimeMinutes]="minutes" />`,
})
class TestHostComponent {
  minutes = 45;
}

describe('TravelTimeIndicator', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    const indicator = fixture.debugElement.query(By.directive(TravelTimeIndicator));
    expect(indicator).toBeTruthy();
  });

  it('should display the travel time in minutes', () => {
    fixture.detectChanges();
    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.textContent.trim()).toBe('45 min kjøring');
  });

  it('should display 12 min kjøring', () => {
    host.minutes = 12;
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.textContent.trim()).toBe('12 min kjøring');
  });

  it('should display 0 min kjøring', () => {
    host.minutes = 0;
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.textContent.trim()).toBe('0 min kjøring');
  });

  it('should render a car icon', () => {
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('.pi-car'));
    expect(icon).toBeTruthy();
  });

  it('should render a vertical line', () => {
    fixture.detectChanges();
    const line = fixture.debugElement.query(By.css('.bg-\\[color\\:var\\(--travel-line\\)\\]'));
    expect(line).toBeTruthy();
  });
});
