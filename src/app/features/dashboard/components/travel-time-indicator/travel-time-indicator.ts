import { Component, Input, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-travel-time-indicator',
  standalone: true,
  templateUrl: './travel-time-indicator.html',
  styleUrl: './travel-time-indicator.css',
})
export class TravelTimeIndicator {
  private readonly translate = inject(TranslateService);

  @Input() travelTimeMinutes?: number;
  @Input() loading = false;

  get travelTimeLabel(): string {
    if (typeof this.travelTimeMinutes !== 'number' || !Number.isFinite(this.travelTimeMinutes)) {
      return '';
    }

    const roundedMinutes = Math.max(0, Math.round(this.travelTimeMinutes));

    if (roundedMinutes < 60) {
      return this.translate.instant('travelTime.minutesDriving', {
        minutes: roundedMinutes,
      });
    }

    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;

    if (minutes === 0) {
      return this.translate.instant('travelTime.hoursDriving', {
        hours,
      });
    }

    return this.translate.instant('travelTime.hoursMinutesDriving', {
      hours,
      minutes,
    });
  }
}
