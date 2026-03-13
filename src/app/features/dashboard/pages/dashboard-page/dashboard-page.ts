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
import { MapBottomSheet } from '../../components/map-bottom-sheet/map-bottom-sheet';
import { TodaysProgressInfobox } from '../../components/todays-progress-infobox/todays-progress-infobox';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    AssignmentMap,
    FloatingButton,
    DaySelector,
    AssignmentCard,
    MapBottomSheet,
    TodaysProgressInfobox,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit {
  private readonly progressDateByDay: Record<DayOption, string> = {
    yesterday: '2026-02-19',
    today: '2026-02-20',
    tomorrow: '2026-02-21',
  };

  selectedDay: DayOption = 'today';
  selectedProgressDate = this.progressDateByDay.today;
  selectedFieldTechId = 40231;
  isListView = true;
  assignmentCards: Assignment[] = [];

  mapAssignments: MapAssignment[] = [
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

  private assignmentService = inject(AssignmentService);

  ngOnInit() {
    this.assignmentService.getAssignmentCards().subscribe((cards) => {
      this.assignmentCards = cards;
    });
  }

  onDayChange(day: DayOption) {
    this.selectedDay = day;
    this.selectedProgressDate = this.progressDateByDay[day];
    console.log('Valgt dag:', day);
  }

  onMarkerClicked(assignment: MapAssignment) {
    console.log('Marker clicked:', assignment);
  }

  onViewChange(listView: boolean) {
    this.isListView = listView;
  }

  onSnapChanged(snap: 'collapsed' | 'peek' | 'expanded') {
    console.log('Bottom sheet snap:', snap);
  }
}
