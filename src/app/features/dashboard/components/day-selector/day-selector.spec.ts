import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  provideTranslateService,
  TranslateLoader,
  TranslateNoOpLoader,
  TranslateService,
} from '@ngx-translate/core';

import { DaySelector } from './day-selector';
import { DayOption } from './day-selector.types';

@Component({
  standalone: true,
  imports: [DaySelector],
  template: `
    <app-day-selector [selectedDay]="selectedDay" (selectedDayChange)="onDayChange($event)" />
  `,
})
class TestHostComponent {
  selectedDay: DayOption = 'today';

  onDayChange(day: DayOption): void {
    this.selectedDay = day;
  }
}

describe('DaySelector', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideTranslateService({
          fallbackLang: 'no',
          loader: { provide: TranslateLoader, useClass: TranslateNoOpLoader },
        }),
      ],
    }).compileComponents();

    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      daySelector: {
        todayOverview: 'Dagens Oversikt',
        tomorrowOverview: 'Morgendagens Oversikt',
      },
    });
    translateService.use('no');
  });

  function createHost(selectedDay: DayOption = 'today') {
    const fixture = TestBed.createComponent(TestHostComponent);
    const host = fixture.componentInstance;
    host.selectedDay = selectedDay;
    fixture.detectChanges();
    return { fixture, host };
  }

  it('should show today and tomorrow cards', () => {
    const { fixture } = createHost();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const texts = buttons.map((button) =>
      button.nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    );

    const formatter = new Intl.DateTimeFormat('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expectedToday = formatter.format(today);
    const expectedTomorrow = formatter.format(tomorrow);

    expect(buttons).toHaveLength(2);
    expect(texts[0]).toContain(`Dagens Oversikt ${expectedToday}`);
    expect(texts[1]).toContain(`Morgendagens Oversikt ${expectedTomorrow}`);
  });

  it('should have today selected by default', () => {
    const { fixture } = createHost();

    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(buttons[0].nativeElement.getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].nativeElement.getAttribute('aria-selected')).toBe('false');
  });

  it('should mark tomorrow as selected when selectedDay is tomorrow', () => {
    const { fixture } = createHost('tomorrow');

    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(buttons[0].nativeElement.getAttribute('aria-selected')).toBe('false');
    expect(buttons[1].nativeElement.getAttribute('aria-selected')).toBe('true');
  });

  it('should update selected day when clicking tomorrow', () => {
    const { fixture, host } = createHost('today');

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[1].triggerEventHandler('click');

    fixture.detectChanges();

    expect(host.selectedDay).toBe('tomorrow');
  });

  it('should update selected day when clicking today from tomorrow', () => {
    const { fixture, host } = createHost('tomorrow');

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].triggerEventHandler('click');

    fixture.detectChanges();

    expect(host.selectedDay).toBe('today');
  });

  it('should not change state when clicking already selected day', () => {
    const { fixture, host } = createHost('today');

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].triggerEventHandler('click');

    fixture.detectChanges();

    expect(host.selectedDay).toBe('today');
  });

  it('should render a date label for both cards', () => {
    const { fixture } = createHost();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const texts = buttons.map((button) =>
      button.nativeElement.textContent.replace(/\s+/g, ' ').trim(),
    );

    expect(texts[0]).toMatch(/\d{1,2}\./);
    expect(texts[1]).toMatch(/\d{1,2}\./);
  });

  it('should apply selected styling class to today card by default', () => {
    const { fixture } = createHost('today');

    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(buttons[0].nativeElement.className).toContain('bg-[#EAF8FE]');
    expect(buttons[1].nativeElement.className).toContain('bg-white');
  });

  it('should apply selected styling class to tomorrow card when selected', () => {
    const { fixture } = createHost('tomorrow');

    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(buttons[0].nativeElement.className).toContain('bg-white');
    expect(buttons[1].nativeElement.className).toContain('bg-[#EAF8FE]');
  });
});
