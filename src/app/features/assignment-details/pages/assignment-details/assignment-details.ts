import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { AssignmentDetails } from '../../../../core/models/assignment-details.model';
import { AssignmentMap, Assignment as MapAssignment } from '../../../../shared/components/map/map';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

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
    TranslatePipe,
  ],
  templateUrl: './assignment-details.html',
  styleUrl: './assignment-details.css',
})
export class AssignmentDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assignmentService = inject(AssignmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  assignment?: AssignmentDetails;
  isLoading = true;
  notFound = false;
  personalNoteDraft = '';
  noteSaveState: 'idle' | 'saving' | 'saved' = 'idle';

  mapAssignments: MapAssignment[] = [];
  private noteSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly noteSaveDelayMs = 500;

  ngOnInit(): void {
    this.resetScrollPosition();

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
        this.loadPersonalNote();
      });
  }

  private resetScrollPosition(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  goBack(): void {
    const requestedDay = this.route.snapshot.queryParamMap.get('day');
    const requestedView = this.route.snapshot.queryParamMap.get('view');
    const assignmentDay = this.assignment?.dayLabel;

    const day =
      requestedDay === 'today' || requestedDay === 'tomorrow'
        ? requestedDay
        : assignmentDay === 'tomorrow'
          ? 'tomorrow'
          : 'today';

    const queryParams: { day: 'today' | 'tomorrow'; view?: 'list' | 'map' } = { day };

    if (requestedView === 'list' || requestedView === 'map') {
      queryParams.view = requestedView;
    }

    this.router.navigate(['/'], {
      queryParams,
    });
  }

  get dayLabelText(): string {
    switch (this.assignment?.dayLabel) {
      case 'today':
        return 'assignment.today';
      case 'tomorrow':
        return 'assignment.tomorrow';
      default:
        return 'assignment.label';
    }
  }

  get statusLabel(): string {
    switch (this.assignment?.status) {
      case 'ongoing':
        return 'status.ongoing';
      case 'next':
        return 'status.next';
      case 'upcoming':
        return 'status.upcoming';
      case 'confirmed':
        return 'status.confirmedShort';
      case 'completed':
        return 'status.completed';
      case 'cancelled':
        return 'status.cancelledShort';
      case 'unconfirmed':
      default:
        return 'status.unconfirmedDetails';
    }
  }

  get statusBannerClass(): string {
    switch (this.assignment?.status) {
      case 'ongoing':
        return 'bg-[#FFD68A] text-black';
      case 'next':
        return 'bg-[#1F4E79] text-white';
      case 'completed':
        return 'bg-[#54DA8C] text-black';
      case 'confirmed':
        return 'bg-[#1F4E79] text-white';
      case 'cancelled':
        return 'bg-[#DC8A8A] text-black';
      case 'unconfirmed':
        return 'bg-[#FFD68A] text-black';
      case 'upcoming':
      default:
        return 'bg-[#B0C4D7] text-black';
    }
  }

  get statusIcon(): string {
    switch (this.assignment?.status) {
      case 'ongoing':
        return 'pi pi-circle';
      case 'next':
        return 'pi pi-arrow-circle-right';
      case 'completed':
        return 'pi pi-check-circle';
      case 'confirmed':
        return 'pi pi-check-circle';
      case 'cancelled':
        return 'pi pi-times-circle';
      case 'unconfirmed':
        return 'pi pi-circle';
      case 'upcoming':
      default:
        return 'pi pi-circle';
    }
  }

  get statusIconClass(): string {
    switch (this.assignment?.status) {
      case 'ongoing':
        return 'text-[#FFD68A]';
      case 'next':
        return 'text-[#1F4E79]';
      case 'completed':
        return 'text-[#54DA8C]';
      case 'confirmed':
        return 'text-[#1F4E79]';
      case 'cancelled':
        return 'text-[#DC8A8A]';
      case 'unconfirmed':
        return 'text-[#D9A441]';
      case 'upcoming':
      default:
        return 'text-[#B0C4D7]';
    }
  }

  get statusButtonClass(): string {
    switch (this.assignment?.status) {
      case 'ongoing':
        return 'bg-[#FFD68A] text-black';
      case 'next':
        return 'bg-[#1F4E79] text-white';
      case 'completed':
        return 'bg-[#54DA8C] text-black';
      case 'confirmed':
        return 'bg-[#1F4E79] text-white';
      case 'cancelled':
        return 'bg-[#DC8A8A] text-black';
      case 'unconfirmed':
        return 'bg-[#FFD68A] text-black';
      case 'upcoming':
      default:
        return 'bg-[#B0C4D7] text-black';
    }
  }

  readonly statusTagClass = 'bg-gray-200 text-gray-700';

  openDirections(): void {
    if (!this.assignment) return;

    const destination = encodeURIComponent(this.assignment.address);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  onContactedChange(contacted: boolean): void {
    if (!this.assignment) return;

    const updatedStatus = contacted ? 'confirmed' : 'unconfirmed';

    this.assignment = {
      ...this.assignment,
      contacted,
      status: this.assignment.dayLabel === 'tomorrow' ? updatedStatus : this.assignment.status,
    };

    this.assignmentService
      .updateTomorrowConfirmation(this.assignment.id, contacted)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  onPersonalNoteChange(note: string): void {
    if (!this.assignment) {
      this.personalNoteDraft = note;
      return;
    }

    const assignmentId = this.assignment.id;
    this.personalNoteDraft = note;
    this.noteSaveState = 'saving';

    if (this.noteSaveTimeout) {
      clearTimeout(this.noteSaveTimeout);
      this.noteSaveTimeout = null;
    }

    this.noteSaveTimeout = setTimeout(() => {
      this.assignmentService
        .savePersonalNote(assignmentId, this.personalNoteDraft)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.noteSaveState = 'saved';
          this.cdr.detectChanges();
        });
      this.noteSaveTimeout = null;
      this.cdr.detectChanges();
    }, this.noteSaveDelayMs);
  }

  onMarkerClicked(marker: MapAssignment): void {
    console.log('Marker clicked:', marker);
  }

  private updateMapAssignments(): void {
    if (!this.assignment) {
      this.mapAssignments = [];
      return;
    }

    const locationPoint = this.assignment.locationPoint;

    if (!locationPoint) {
      this.mapAssignments = [];
      return;
    }

    this.mapAssignments = [
      {
        id: Number(this.assignment.id),
        name: this.assignment.title,
        location: {
          lat: locationPoint.y,
          lon: locationPoint.x,
        },
        description: this.assignment.address,
      },
    ];
  }

  private loadPersonalNote(): void {
    if (!this.assignment) {
      this.personalNoteDraft = '';
      this.noteSaveState = 'idle';
      return;
    }

    this.assignmentService
      .getPersonalNote(this.assignment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((note) => {
        this.personalNoteDraft = note;
        this.noteSaveState = note ? 'saved' : 'idle';
      });
  }

  get formattedPhone(): string {
    if (!this.assignment?.contactPhone) return '';
    const digits = this.assignment.contactPhone.replace(/\D/g, '');
    if (digits.length === 8) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
    }
    return this.assignment.contactPhone;
  }

  get hasCoordinatorMessage(): boolean {
    return !!this.assignment?.coordinatorMessage?.trim();
  }
}
