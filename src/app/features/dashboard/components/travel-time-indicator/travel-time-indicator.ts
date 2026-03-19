import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-travel-time-indicator',
  standalone: true,
  templateUrl: './travel-time-indicator.html',
  styleUrl: './travel-time-indicator.css',
})
export class TravelTimeIndicator {
  @Input({ required: true }) travelTimeMinutes!: number;
}
