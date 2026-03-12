import { Component } from '@angular/core';
import { AssignmentMap, Assignment } from '../../components/assignment-map/assignment-map';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AssignmentMap],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  assignments: Assignment[] = [
    {
      id: 1,
      name: 'Assignment 1',
      location: { lat: 63.4298254455268, lon: 10.3862247991623 },
      description: 'Description for Assignment 1',
    },
    {
      id: 2,
      name: 'Assignment 2',
      location: { lat: 63.40236993788918, lon: 10.420739477399872 },
      description: 'Description for Assignment 2',
    },
  ];

  onMarkerClicked(assignment: Assignment) {
    console.log('Marker clicked:', assignment);
  }
}
