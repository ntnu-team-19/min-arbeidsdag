import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { AssignmentDetailsDto } from '../../../../core/models/assignment-details.dto';

interface AssignmentTypeSlice {
  label: string;
  count: number;
  percent: number;
  percentRounded: number;
  color: string;
}

interface TypeCountGroup {
  key: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-todays-progress-infobox',
  standalone: true,
  templateUrl: './todays-progress-infobox.html',
  styleUrl: './todays-progress-infobox.css',
})
export class TodaysProgressInfobox implements OnInit, OnChanges {
  @Input({ required: true }) selectedDate = '';
  @Input() fieldTechId?: number | null;

  totalAssignments = 0;
  completedAssignments = 0;
  totalTypeCount = 0;
  typeSlices: AssignmentTypeSlice[] = [];
  travelMinutes = 0;
  totalMinutes = 0;

  private readonly assignmentService = inject(AssignmentService);
  private readonly chartColors = ['#0B4A8B', '#4F7EA8', '#6EA6D9', '#8FB3D9', '#5A92C5', '#7FA4C7'];
  private readonly unknownTypeLabel = 'Ukjent';
  private readonly otherTypeLabel = 'Andre';
  private readonly maxNamedTypesInChart = 4;

  ngOnInit(): void {
    this.loadDataForSelectedDate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['selectedDate'] && !changes['selectedDate'].firstChange) ||
      (changes['fieldTechId'] && !changes['fieldTechId'].firstChange)
    ) {
      this.loadDataForSelectedDate();
    }
  }

  get typeDistributionGradient(): string {
    if (this.typeSlices.length === 0 || this.totalAssignments <= 0) {
      return 'conic-gradient(#9fb7cf 0% 100%)';
    }

    let cursor = 0;
    const sectors = this.typeSlices.map((slice, index) => {
      const start = cursor;
      const end =
        index === this.typeSlices.length - 1
          ? 100
          : this.clampPercent(cursor + (slice.count / this.totalAssignments) * 100);
      cursor = end;

      return `${slice.color} ${start}% ${cursor}%`;
    });

    return `conic-gradient(${sectors.join(', ')})`;
  }

  get timeProgressPercent(): number {
    if (this.totalMinutes <= 0) {
      return 0;
    }

    return this.clampPercent((this.travelMinutes / this.totalMinutes) * 100);
  }

  get timeProgressPercentRounded(): number {
    return Math.round(this.timeProgressPercent);
  }

  get displayedTravelMinutes(): number {
    return Math.round(this.travelMinutes);
  }

  get displayedTotalMinutes(): number {
    return Math.round(this.totalMinutes);
  }

  get completionPercent(): number {
    if (this.totalAssignments <= 0) {
      return 0;
    }

    return this.clampPercent((this.completedAssignments / this.totalAssignments) * 100);
  }

  get completionPercentRounded(): number {
    return Math.round(this.completionPercent);
  }

  get carPosition(): string {
    if (this.timeProgressPercent <= 0) {
      return '0%';
    }

    return `calc(${this.timeProgressPercent}% - 12px)`;
  }

  private loadDataForSelectedDate(): void {
    if (!this.selectedDate) {
      this.resetMetrics();
      return;
    }

    this.assignmentService.getAllAssignmentDetails().subscribe((assignments) => {
      const assignmentsForDay = assignments.filter((assignment) =>
        assignment.desiredDateForShowing?.startsWith(this.selectedDate),
      );

      const assignmentsForSelection = assignmentsForDay.filter((assignment) => {
        if (this.fieldTechId == null) {
          return true;
        }

        return assignment.fieldTechId === this.fieldTechId;
      });

      this.calculateMetrics(assignmentsForSelection);
    });
  }

  private calculateMetrics(assignmentsForDay: AssignmentDetailsDto[]): void {
    this.totalAssignments = assignmentsForDay.length;
    this.completedAssignments = assignmentsForDay.filter((assignment) => assignment.status === 2).length;
    const groupedTypeCounts = this.groupTypeCounts(assignmentsForDay);
    this.totalTypeCount = groupedTypeCounts.length;
    this.typeSlices = this.buildTypeSlices(groupedTypeCounts, assignmentsForDay.length);

    this.travelMinutes = assignmentsForDay.reduce((sum, assignment) => {
      return sum + this.sanitizeNumber(assignment.calculatedTraveltime);
    }, 0);

    this.totalMinutes = assignmentsForDay.reduce((sum, assignment) => {
      return sum + this.sanitizeNumber(assignment.editedTimeOnsite);
    }, 0);
  }

  private sanitizeNumber(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return 0;
    }

    return value;
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private groupTypeCounts(assignmentsForDay: AssignmentDetailsDto[]): TypeCountGroup[] {
    if (assignmentsForDay.length === 0) {
      return [];
    }

    const counts = new Map<string, TypeCountGroup>();

    assignmentsForDay.forEach((assignment) => {
      const typeLabel = this.extractTypeLabel(assignment.inquiryDescription);
      const normalizedKey = this.normalizeTypeKey(typeLabel);
      const existing = counts.get(normalizedKey);

      if (existing) {
        existing.count += 1;
        return;
      }

      counts.set(normalizedKey, { key: normalizedKey, label: typeLabel, count: 1 });
    });

    return [...counts.values()].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.label.localeCompare(b.label, 'nb-NO', { sensitivity: 'base' });
    });
  }

  private buildTypeSlices(groupedTypeCounts: TypeCountGroup[], totalAssignments: number): AssignmentTypeSlice[] {
    if (totalAssignments <= 0 || groupedTypeCounts.length === 0) {
      return [];
    }

    const topGroups = groupedTypeCounts.slice(0, this.maxNamedTypesInChart);
    const remainingGroups = groupedTypeCounts.slice(this.maxNamedTypesInChart);
    const remainingCount = remainingGroups.reduce((sum, group) => sum + group.count, 0);
    const visibleGroups =
      remainingCount > 0
        ? [...topGroups, { key: 'other', label: this.otherTypeLabel, count: remainingCount }]
        : topGroups;

    return visibleGroups.map((group, index) => {
      const percent = this.clampPercent((group.count / totalAssignments) * 100);

      return {
        label: group.label,
        count: group.count,
        percent,
        percentRounded: Math.round(percent),
        color: this.chartColors[index % this.chartColors.length],
      };
    });
  }

  private normalizeTypeKey(typeLabel: string): string {
    return typeLabel
      .toLowerCase()
      .replace(/\s*([/,])\s*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTypeLabel(description: string | null): string {
    if (!description) {
      return this.unknownTypeLabel;
    }

    const firstLine = description
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .find((line) => line.length > 0);

    return firstLine ?? this.unknownTypeLabel;
  }

  private resetMetrics(): void {
    this.totalAssignments = 0;
    this.completedAssignments = 0;
    this.totalTypeCount = 0;
    this.typeSlices = [];
    this.travelMinutes = 0;
    this.totalMinutes = 0;
  }
}
