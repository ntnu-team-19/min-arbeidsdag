import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { DayOption } from './day-selector.types';

@Component({
  selector: 'app-day-selector',
  standalone: true,
  imports: [NgClass],
  templateUrl: './day-selector.html',
})
export class DaySelector {
  @Input() selectedDay: DayOption = 'today';
  @Output() selectedDayChange = new EventEmitter<DayOption>();

  selectDay(day: DayOption): void {
    if (day === this.selectedDay) return;
    this.selectedDayChange.emit(day);
  }

  get todayDateLabel(): string {
    return this.formatDate(new Date());
  }

  get tomorrowDateLabel(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return this.formatDate(date);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  dayCardClasses(isSelected: boolean): string {
    return isSelected
      ? 'border-[color:var(--day-selected-border)] bg-[color:var(--day-selected-bg)] shadow-[0_2px_8px_rgba(15,23,42,0.08)]'
      : 'border-theme-2 surface-1 shadow-none hover:border-[color:var(--border-1)] hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)]';
  }

  dayTitleClasses(isSelected: boolean): string {
    return isSelected
      ? 'text-[clamp(1.1rem,4.2vw,1.65rem)] sm:text-[1.75rem] md:text-[2rem] font-bold leading-[1.05] tracking-[-0.015em] text-theme-primary'
      : 'text-[clamp(0.95rem,3.2vw,1.2rem)] sm:text-[1.25rem] md:text-[1.5rem] font-normal leading-[1.2] tracking-[-0.01em] text-theme-secondary';
  }

  dayDateClasses(isSelected: boolean): string {
    return isSelected
      ? 'text-theme-secondary mt-2 text-sm font-normal lowercase'
      : 'text-theme-secondary mt-2 text-sm font-normal lowercase';
  }
}
