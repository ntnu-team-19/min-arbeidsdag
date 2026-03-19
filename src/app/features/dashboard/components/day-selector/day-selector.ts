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
      ? 'border-slate-500 bg-[#EAF8FE] shadow-[0_2px_8px_rgba(15,23,42,0.08)]'
      : 'border-slate-200 bg-white shadow-none hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)]';
  }

  dayTitleClasses(isSelected: boolean): string {
    return isSelected
      ? 'text-[2.2rem] font-bold leading-none tracking-[-0.02em] text-black md:text-[2.0rem]'
      : 'text-[1.5rem] font-normal leading-tight tracking-[-0.01em] text-slate-700 md:text-[1.5rem]';
  }

  dayDateClasses(isSelected: boolean): string {
    return isSelected
      ? 'mt-2 text-sm font-normal text-slate-700 lowercase'
      : 'mt-2 text-sm font-normal text-slate-700 lowercase';
  }
}
