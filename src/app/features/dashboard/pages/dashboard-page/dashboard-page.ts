import { Component, OnInit, inject } from '@angular/core';
import {
  AssignmentMap,
  Assignment as MapAssignment,
} from '../../components/assignment-map/assignment-map';
import { FloatingButton } from '../../components/floating-button/floating-button';
import { DaySelector } from '../../components/day-selector/day-selector';
import { DayOption } from '../../components/day-selector/day-selector.types';
import { AssignmentCard } from '../../components/assignment-card/assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { AssignmentService } from '../../../../core/services/assignment.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AssignmentMap, FloatingButton, DaySelector, AssignmentCard],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit {
  selectedDay: DayOption = 'today';
  isListView = true;
  assignmentCards: Assignment[] = [];

  mapAssignments: MapAssignment[] = [
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

  private assignmentService = inject(AssignmentService);

  ngOnInit() {
    this.assignmentService.getAssignmentCards().subscribe((cards) => {
      this.assignmentCards = cards;
    });
  }

  onDayChange(day: DayOption) {
    console.log('Valgt dag:', day);
  }

  onMarkerClicked(assignment: MapAssignment) {
    console.log('Marker clicked:', assignment);
  }

  onViewChange(listView: boolean) {
    this.isListView = listView;
  }
}
