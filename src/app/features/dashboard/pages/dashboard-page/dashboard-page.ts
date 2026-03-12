import { Component } from '@angular/core';
import { AssignmentMap, Assignment } from '../../components/assignment-map/assignment-map';
import { MapBottomSheet } from '../../components/map-bottom-sheet/map-bottom-sheet';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AssignmentMap, MapBottomSheet],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  assignments: Assignment[] = [
    {
      id: 1,
      name: 'Assignment 1',
      location: { lat: 59.9139, lon: 10.7522 },
      description: 'Description for Assignment 1',
    },
    {
      id: 2,
      name: 'Assignment 2',
      location: { lat: 59.95, lon: 10.75 },
      description: 'Description for Assignment 2',
    },
  ];

  onMarkerClicked(assignment: Assignment) {
    console.log('Marker clicked:', assignment);
  }
  onSnapChanged(snap: 'collapsed' | 'peek' | 'expanded') {
    console.log('Bottom sheet snap:', snap);
  }
}
