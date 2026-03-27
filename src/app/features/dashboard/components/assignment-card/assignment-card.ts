import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Assignment } from '../../../../core/models/assignment-card.model';

@Component({
  selector: 'app-assignment-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './assignment-card.html',
})
export class AssignmentCard {
  @Input({ required: true }) assignment!: Assignment;
  @Output() cardClick = new EventEmitter<string>();
  @Output() confirmationToggle = new EventEmitter<boolean>();

  private readonly statusConfig: Record<
    Assignment['status'],
    {
      label: string;
      barClass: string;
      iconClass: string;
      icon: string;
    }
  > = {
    upcoming: {
      label: 'status.upcoming',
      barClass: 'bg-[#B0C4D7]',
      iconClass: 'text-[#1F4E79]',
      icon: 'pi pi-circle',
    },
    ongoing: {
      label: 'status.ongoing',
      barClass: 'bg-[#FFD68A]',
      iconClass: 'text-[#FFD68A]',
      icon: 'pi pi-circle',
    },
    next: {
      label: 'status.next',
      barClass: 'bg-[#1F4E79]',
      iconClass: 'text-[#1F4E79]',
      icon: 'pi pi-arrow-circle-right',
    },
    completed: {
      label: 'status.completed',
      barClass: 'bg-[#54DA8C]',
      iconClass: 'text-[#54DA8C]',
      icon: 'pi pi-check-circle',
    },
    cancelled: {
      label: 'status.cancelled',
      barClass: 'bg-[#DC8A8A]',
      iconClass: 'text-[#DC8A8A]',
      icon: 'pi pi-times-circle',
    },
    confirmed: {
      label: 'status.confirmed',
      barClass: 'bg-[#1F4E79]',
      iconClass: 'text-[#1F4E79]',
      icon: 'pi pi-check-circle',
    },
    unconfirmed: {
      label: 'status.unconfirmed',
      barClass: 'bg-[#FFD68A]',
      iconClass: 'text-[#D9A441]',
      icon: 'pi pi-circle',
    },
  };

  get currentStatus() {
    return this.statusConfig[this.assignment.status];
  }

  get canToggleConfirmation(): boolean {
    return this.assignment.status === 'confirmed' || this.assignment.status === 'unconfirmed';
  }

  get confirmationActionLabel(): string {
    return this.assignment.status === 'confirmed'
      ? 'assignment.markUnconfirmed'
      : 'assignment.markConfirmed';
  }

  onCardClick(): void {
    this.cardClick.emit(this.assignment.id);
  }

  onCardKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Enter') return;

    event.preventDefault();
    this.onCardClick();
  }

  onConfirmationToggle(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canToggleConfirmation) return;

    this.confirmationToggle.emit(this.assignment.status !== 'confirmed');
  }
}
