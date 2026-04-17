import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-home-location-card',
  standalone: true,
  templateUrl: './home-location-card.html',
})
export class HomeLocationCard {
  @Input({ required: true }) roleLabel!: string;
  @Input({ required: true }) locationLabel!: string;
  @Input({ required: true }) departureLabel!: string;
  @Input() contextLabel = '';
  @Input() isTemporary = false;
  @Input() withBottomMargin = false;
}
