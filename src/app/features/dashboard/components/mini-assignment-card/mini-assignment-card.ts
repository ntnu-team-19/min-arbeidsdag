import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Assignment } from '../../../../core/models/assignment-card.model';

@Component({
  selector: 'app-mini-assignment-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './mini-assignment-card.html',
})
export class MiniAssignmentCard {
  @Input({ required: true }) assignment!: Assignment;
  @Input() sequenceNumber: number | null = null;

  @Output() cardClick = new EventEmitter<string>();
  @Output() directionsClick = new EventEmitter<Assignment>();

  private readonly statusConfig: Record<
    Assignment['status'],
    {
      label: string;
      badgeClass: string;
      dotClass: string;
    }
  > = {
    ongoing: {
      label: 'status.ongoing',
      badgeClass: 'bg-[#F2CD7A] text-black',
      dotClass: 'border-[#D9A441] text-[#D9A441]',
    },
    upcoming: {
      label: 'status.upcoming',
      badgeClass: 'bg-[#547FA9] text-white',
      dotClass: 'border-[#1F4E79] text-[#1F4E79]',
    },
    absence: {
      label: 'status.absenceShort',
      badgeClass: 'bg-[#C7A27B] text-black',
      dotClass: 'border-[#6E4A2D] text-[#6E4A2D]',
    },
    next: {
      label: 'status.next',
      badgeClass: 'bg-[#1F4E79] text-white',
      dotClass: 'text-[#1F4E79]',
    },
    completed: {
      label: 'status.completedShort',
      badgeClass: 'bg-[#54DA8C] text-black',
      dotClass: 'border-[#54DA8C] text-[#54DA8C]',
    },
    cancelled: {
      label: 'status.cancelledShort',
      badgeClass: 'bg-[#DC8A8A] text-black',
      dotClass: 'border-[#DC8A8A] text-[#DC8A8A]',
    },
    confirmed: {
      label: 'status.confirmedShort',
      badgeClass: 'bg-[#1F4E79] text-white',
      dotClass: 'border-[#1F4E79] text-[#1F4E79]',
    },
    unconfirmed: {
      label: 'status.unconfirmedShort',
      badgeClass: 'bg-[#FFD68A] text-black',
      dotClass: 'border-[#D9A441] text-[#D9A441]',
    },
  };

  get currentStatus() {
    return this.statusConfig[this.assignment.status];
  }

  get canShowDirections(): boolean {
    return !!this.assignment.locationPoint;
  }

  onCardClick(): void {
    this.cardClick.emit(this.assignment.id);
  }

  onDirectionsClick(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.assignment) return;

    this.directionsClick.emit(this.assignment);
  }
}
