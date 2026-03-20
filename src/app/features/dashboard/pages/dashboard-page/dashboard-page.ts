import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AssignmentMap, Assignment as MapAssignment } from '../../../../shared/components/map/map';
import { FloatingButton } from '../../components/floating-button/floating-button';
import { DaySelector } from '../../components/day-selector/day-selector';
import { DayOption } from '../../components/day-selector/day-selector.types';
import { AssignmentCard } from '../../components/assignment-card/assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { MapBottomSheet } from '../../components/map-bottom-sheet/map-bottom-sheet';
import { TravelTimeIndicator } from '../../components/travel-time-indicator/travel-time-indicator';
import { MiniAssignmentCard } from '../../components/mini-assignment-card/mini-assignment-card';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    AssignmentMap,
    FloatingButton,
    DaySelector,
    AssignmentCard,
    MapBottomSheet,
    TravelTimeIndicator,
    MiniAssignmentCard,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit, OnDestroy {
  selectedDay: DayOption = 'today';
  isListView = true;
  assignmentCards: Assignment[] = [];
  travelTimes: number[] = [];

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
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  get sheetTitle(): string {
    const count = this.assignmentCards.length;
    const dayText = this.selectedDay === 'today' ? 'i dag' : 'i morgen';
    return `${count} Oppdrag ${dayText}`;
  }

  ngOnInit() {
    this.assignmentService.getAssignmentCards().subscribe((cards) => {
      this.assignmentCards = cards;
    });

    this.assignmentService.getTravelTimes().subscribe((times) => {
      this.travelTimes = times;
    });

    this.updatePageScrollLock();
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  onDayChange(day: DayOption) {
    console.log('Valgt dag:', day);
  }

  onMarkerClicked(assignment: MapAssignment) {
    console.log('Marker clicked:', assignment);
  }

  onViewChange(listView: boolean) {
    this.isListView = listView;
    this.updatePageScrollLock();
  }

  onSnapChanged(snap: 'collapsed' | 'peek' | 'expanded') {
    console.log('Bottom sheet snap:', snap);
  }

  goToAssignmentDetails(id: string): void {
    this.router.navigate(['/assignments', id]);
  }

  private updatePageScrollLock(): void {
    if (this.isListView) {
      this.unlockPageScroll();
      return;
    }

    this.lockPageScroll();
  }

  private lockPageScroll(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.document.documentElement, 'overflow', 'hidden');
    this.renderer.setStyle(this.document.body, 'overscroll-behavior', 'none');
    this.renderer.setStyle(this.document.documentElement, 'overscroll-behavior', 'none');
  }

  private unlockPageScroll(): void {
    this.renderer.removeStyle(this.document.body, 'overflow');
    this.renderer.removeStyle(this.document.documentElement, 'overflow');
    this.renderer.removeStyle(this.document.body, 'overscroll-behavior');
    this.renderer.removeStyle(this.document.documentElement, 'overscroll-behavior');
  }
}
