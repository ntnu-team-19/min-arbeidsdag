import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Assignment } from '../../../../core/models/assignment-card.model';

@Component({
  selector: 'app-mini-assignment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-assignment-card.html',
})
export class MiniAssignmentCard {
  @Input({ required: true }) assignment!: Assignment;

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
      label: 'Pågående oppdrag',
      badgeClass: 'bg-[#F2CD7A] text-black',
      dotClass: 'border-[#D9A441] text-[#D9A441]',
    },
    upcoming: {
      label: 'Neste oppdrag',
      badgeClass: 'bg-[#547FA9] text-white',
      dotClass: 'border-[#1F4E79] text-[#1F4E79]',
    },
    completed: {
      label: 'Fullført',
      badgeClass: 'bg-[#54DA8C] text-black',
      dotClass: 'border-[#54DA8C] text-[#54DA8C]',
    },
    cancelled: {
      label: 'Avlyst',
      badgeClass: 'bg-[#DC8A8A] text-black',
      dotClass: 'border-[#DC8A8A] text-[#DC8A8A]',
    },
    confirmed: {
      label: 'Bekreftet',
      badgeClass: 'bg-[#54DA8C] text-black',
      dotClass: 'border-[#54DA8C] text-[#54DA8C]',
    },
    unconfirmed: {
      label: 'Ikke bekreftet',
      badgeClass: 'bg-[#FFD68A] text-black',
      dotClass: 'border-[#D9A441] text-[#D9A441]',
    },
  };

  get currentStatus() {
    return this.statusConfig[this.assignment.status];
  }

  onCardClick(): void {
    this.cardClick.emit(this.assignment.id);
  }

  onDirectionsClick(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.assignment) return;

    const destination = encodeURIComponent(this.assignment.address);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      '_blank',
      'noopener,noreferrer',
    );
  }
}
