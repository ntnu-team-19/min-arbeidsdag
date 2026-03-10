import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DaySelector } from './day-selector';
import { DayOption } from './day-selector.types';

@Component({
  standalone: true,
  imports: [DaySelector],
  template: `
    <app-day-selector
      [selectedDay]="selectedDay"
      [showYesterday]="showYesterday"
      [fullWidth]="fullWidth"
      (selectedDayChange)="onDayChange($event)"
    />
  `,
})
class TestHostComponent {
  selectedDay: DayOption = 'today';
  showYesterday = true;
  fullWidth = true;

  onDayChange(day: DayOption): void {
    this.selectedDay = day;
  }
}

describe('DaySelector', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show yesterday, today and tomorrow by default', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const texts = buttons.map(button =>
      button.nativeElement.textContent.trim()
    );

    expect(texts).toEqual(['I går', 'I dag', 'I morgen']);
  });

  it('should mark the selected day with aria-selected=true', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const todayButton = buttons[1].nativeElement as HTMLButtonElement;

    expect(todayButton.getAttribute('aria-selected')).toBe('true');
  });

  it('should update selected day when clicking tomorrow', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const tomorrowButton = buttons[2];

    tomorrowButton.triggerEventHandler('click');
    fixture.detectChanges();

    expect(host.selectedDay).toBe('tomorrow');
  });

  it('should not emit or change state when clicking already selected day', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const todayButton = buttons[1];

    todayButton.triggerEventHandler('click');
    fixture.detectChanges();

    expect(host.selectedDay).toBe('today');
  });

  it('should have today selected by default', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(buttons[0].nativeElement.getAttribute('aria-selected')).toBe('false');
    expect(buttons[1].nativeElement.getAttribute('aria-selected')).toBe('true');
    expect(buttons[2].nativeElement.getAttribute('aria-selected')).toBe('false');
  });
});
