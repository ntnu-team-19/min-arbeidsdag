import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { DayOption } from './day-selector.types';

interface SelectorItem {
  label: string;
  value: DayOption;
}

@Component({
  selector: 'app-day-selector',
  standalone: true,
  imports: [NgClass],
  templateUrl: './day-selector.html',
})
export class DaySelector {
  @Input() selectedDay: DayOption = 'today';
  @Input() showYesterday = true;
  @Input() fullWidth = true;

  @Output() selectedDayChange = new EventEmitter<DayOption>();

  get options(): SelectorItem[] {
    const items: SelectorItem[] = [];

    if (this.showYesterday) {
      items.push({ label: 'I går', value: 'yesterday' });
    }

    items.push({ label: 'I dag', value: 'today' }, { label: 'I morgen', value: 'tomorrow' });

    return items;
  }

  selectDay(day: DayOption): void {
    if (day === this.selectedDay) return;

    this.selectedDay = day;
    this.selectedDayChange.emit(day);
  }

  isSelected(day: DayOption): boolean {
    return this.selectedDay === day;
  }
}
