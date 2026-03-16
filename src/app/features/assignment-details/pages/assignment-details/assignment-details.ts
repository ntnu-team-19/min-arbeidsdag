import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { AssignmentDetails } from '../../../../core/models/assignment-details.model';
import {
  AssignmentMap,
  Assignment as MapAssignment,
} from '../../../../shared/components/map/map';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assignment-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AssignmentMap,
    ButtonModule,
    CheckboxModule,
    TextareaModule,
    TagModule,
  ],
  templateUrl: './assignment-details.html',
})
export class AssignmentDetailsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly assignmentService = inject(AssignmentService);
  private readonly destroyRef = inject(DestroyRef);

  assignment?: AssignmentDetails;
  isLoading = true;
  notFound = false;

  mapAssignments: MapAssignment[] = [];

  // Temporary mock coordinates until backend/mock data contains real lat/lon
  // Or until we implement geocoding based on the address
  private readonly coordinatesByAssignmentId: Record<string, { lat: number; lon: number }> = {
    '1315598': { lat: 63.43049, lon: 10.39506 },
    '1316076': { lat: 63.42262, lon: 10.43138 },
    '1315118': { lat: 63.41025, lon: 10.43291 },
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.isLoading = false;
      this.notFound = true;
      return;
    }

    this.assignmentService
      .getAssignmentDetailsViewById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((assignment) => {
        this.assignment = assignment;
        this.notFound = !assignment;
        this.isLoading = false;
        this.updateMapAssignments();
      });
  }

  goBack(): void {
    this.location.back();
  }

  get dayLabelText(): string {
    switch (this.assignment?.dayLabel) {
      case 'today':
        return 'I dag';
      case 'tomorrow':
        return 'I morgen';
      default:
        return 'Oppdrag';
    }
  }

  get statusLabel(): string {
    switch (this.assignment?.status) {
      case 'upcoming':
        return 'Kommende oppdrag';
      case 'confirmed':
        return 'Bekreftet';
      case 'completed':
        return 'Fullført';
      case 'cancelled':
        return 'Avlyst';
      case 'unconfirmed':
      default:
        return 'Ubekreftet';
    }
  }

  get statusDotClass(): string {
    switch (this.assignment?.status) {
      case 'completed':
        return 'bg-green-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'unconfirmed':
        return 'bg-yellow-500';
      case 'upcoming':
      default:
        return 'bg-green-500';
    }
  }

  openDirections(): void {
    if (!this.assignment) return;

    const destination = encodeURIComponent(this.assignment.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  }

  onContactedChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!this.assignment) return;

    this.assignment = {
      ...this.assignment,
      contacted: target.checked,
    };
  }

  onMarkerClicked(marker: MapAssignment): void {
    console.log('Marker clicked:', marker);
  }

  private updateMapAssignments(): void {
    if (!this.assignment) {
      this.mapAssignments = [];
      return;
    }

    const coordinates = this.coordinatesByAssignmentId[this.assignment.id] ?? {
      lat: 63.43049,
      lon: 10.39506,
    };

    this.mapAssignments = [
      {
        id: Number(this.assignment.id),
        name: this.assignment.title,
        location: coordinates,
        description: this.assignment.address,
      },
    ];
  }
}
