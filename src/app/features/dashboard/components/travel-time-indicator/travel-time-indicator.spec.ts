import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { TravelTimeIndicator } from './travel-time-indicator';

@Component({
  standalone: true,
  imports: [TravelTimeIndicator],
  template: `<app-travel-time-indicator [travelTimeMinutes]="minutes" [loading]="loading" />`,
})
class TestHostComponent {
  minutes = 45;
  loading = false;
}

describe('TravelTimeIndicator', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let translateService: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      travelTime: {
        minutesDriving: '{{minutes}} min kjøring',
        hoursDriving: '{{hours}} t kjøring',
        hoursMinutesDriving: '{{hours}} t {{minutes}} min kjøring',
      },
    });
    translateService.use('no');

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
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

  it('should display 1 t kjøring for exact whole hours', () => {
    host.minutes = 60;
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.textContent.trim()).toBe('1 t kjøring');
  });

  it('should display 1 t 30 min kjøring for hours and minutes', () => {
    host.minutes = 90;
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.textContent.trim()).toBe('1 t 30 min kjøring');
  });

  it('should display a placeholder while travel time is loading', () => {
    host.loading = true;
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('span'));
    expect(span.nativeElement.textContent.trim()).toBe('...');
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
