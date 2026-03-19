import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Assignment } from '../../../../core/models/assignment-card.model';

@Component({
  selector: 'app-assignment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assignment-card.html',
})
export class AssignmentCard {
  @Input({ required: true }) assignment!: Assignment;
  @Output() cardClick = new EventEmitter<string>();

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
      label: 'Kommende oppdrag',
      barClass: 'bg-[#547FA9]',
      iconClass: 'text-[#1F4E79]',
      icon: 'pi pi-circle',
    },
    ongoing: {
      label: 'Pågående oppdrag',
      barClass: 'bg-[#FFD68A]',
      iconClass: 'text-[#FFD68A]',
      icon: 'pi pi-circle',
    },
    completed: {
      label: 'Fullført oppdrag',
      barClass: 'bg-[#54DA8C]',
      iconClass: 'text-[#54DA8C]',
      icon: 'pi pi-check-circle',
    },
    cancelled: {
      label: 'Avlyst oppdrag',
      barClass: 'bg-[#DC8A8A]',
      iconClass: 'text-[#DC8A8A]',
      icon: 'pi pi-times-circle',
    },
    confirmed: {
      label: 'Bekreftet for i morgen',
      barClass: 'bg-[#54DA8C]',
      iconClass: 'text-[#54DA8C]',
      icon: 'pi pi-check-circle',
    },
    unconfirmed: {
      label: 'Ikke bekreftet for i morgen',
      barClass: 'bg-[#FFD68A]',
      iconClass: 'text-[#D9A441]',
      icon: 'pi pi-circle',
    }
  };

  get currentStatus() {
    return this.statusConfig[this.assignment.status];
  }

  onCardClick(): void {
    this.cardClick.emit(this.assignment.id);
  }
}
