import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-travel-time-indicator',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './travel-time-indicator.html',
  styleUrl: './travel-time-indicator.css',
})
export class TravelTimeIndicator {
  @Input() travelTimeMinutes?: number;
  @Input() loading = false;
}
