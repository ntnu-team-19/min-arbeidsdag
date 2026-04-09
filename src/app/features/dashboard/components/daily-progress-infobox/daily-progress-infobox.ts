import { Component, HostListener, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DayOption } from '../day-selector/day-selector.types';
import {
  AssignmentTypeBreakdownItem,
  DailyProgressSummary,
  EMPTY_DAILY_PROGRESS_SUMMARY,
} from '../../../../core/models/daily-progress.model';

@Component({
  selector: 'app-daily-progress-infobox',
  standalone: true,
  templateUrl: './daily-progress-infobox.html',
  styleUrl: './daily-progress-infobox.css',
})
export class DailyProgressInfobox implements OnChanges {
  private static nextTypeSummaryId = 0;
  private readonly translate = inject(TranslateService);

  @Input() summary: Partial<DailyProgressSummary> | null = null;
  @Input({ required: true }) day!: DayOption;

  readonly typeSummaryId = `daily-progress-types-${DailyProgressInfobox.nextTypeSummaryId++}`;

  isMobileLayout = this.checkIsMobileLayout();
  areMobileTypesExpanded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['day'] || changes['summary']) {
      this.resetMobileTypes();
    }
  }

  get title(): string {
    return this.translate.instant(
      this.viewDay === 'tomorrow' ? 'dailyProgress.tomorrowTitle' : 'dailyProgress.todayTitle',
    );
  }

  get totalAssignments(): number {
    return this.safeSummary.totalAssignments;
  }

  get completedAssignments(): number {
    return Math.min(this.safeSummary.completedAssignments, this.totalAssignments);
  }

  get totalTravelMinutes(): number {
    return this.safeSummary.totalTravelMinutes;
  }

  get completedTravelMinutes(): number {
    return Math.min(this.safeSummary.completedTravelMinutes, this.totalTravelMinutes);
  }

  get typeBreakdownItems(): AssignmentTypeBreakdownItem[] {
    return this.safeSummary.typeBreakdown;
  }

  get assignmentHeadline(): string {
    return this.translate.instant('dailyProgress.assignmentHeadline', {
      assignmentCount: this.totalAssignments,
      typeCount: this.typeBreakdownItems.length,
      assignmentLabel: this.translate.instant(
        this.totalAssignments === 1
          ? 'dailyProgress.assignmentLabelSingular'
          : 'dailyProgress.assignmentLabelPlural',
      ),
      typeLabel: this.translate.instant(
        this.typeBreakdownItems.length === 1
          ? 'dailyProgress.typeLabelSingular'
          : 'dailyProgress.typeLabelPlural',
      ),
    });
  }

  get hasTypeBreakdown(): boolean {
    return this.typeBreakdownItems.length > 0;
  }

  get showTypeToggle(): boolean {
    return this.isMobileLayout && this.hasTypeBreakdown;
  }

  get areTypesVisible(): boolean {
    return !this.isMobileLayout || !this.hasTypeBreakdown || this.areMobileTypesExpanded;
  }

  get typeToggleLabel(): string {
    return this.translate.instant(
      this.areMobileTypesExpanded
        ? 'dailyProgress.hideAssignmentTypes'
        : 'dailyProgress.showAssignmentTypes',
    );
  }

  get assignmentProgressValue(): number {
    return this.viewDay === 'tomorrow' ? 0 : this.completedAssignments;
  }

  get assignmentProgressPercentage(): number {
    return this.getProgressPercentage(this.assignmentProgressValue, this.totalAssignments);
  }

  get assignmentProgressText(): string {
    return `${this.assignmentProgressValue} / ${this.totalAssignments}`;
  }

  get assignmentPieText(): string {
    return this.viewDay === 'tomorrow' ? '' : this.assignmentProgressText;
  }

  get assignmentProgressLabel(): string {
    return this.translate.instant(
      this.viewDay === 'tomorrow'
        ? 'dailyProgress.plannedAssignments'
        : 'dailyProgress.completedAssignments',
    );
  }

  get assignmentMetricText(): string {
    if (this.viewDay === 'tomorrow') {
      return '';
    }

    if (this.totalAssignments === 0) {
      return this.translate.instant('dailyProgress.noAssignmentsRegistered');
    }

    const remainingAssignments = Math.max(this.totalAssignments - this.completedAssignments, 0);

    if (remainingAssignments === 0) {
      return this.translate.instant('dailyProgress.allAssignmentsCompleted');
    }

    return this.translate.instant('dailyProgress.assignmentsRemaining', {
      count: remainingAssignments,
      assignmentLabel: this.translate.instant(
        remainingAssignments === 1
          ? 'dailyProgress.assignmentLabelSingular'
          : 'dailyProgress.assignmentLabelPlural',
      ),
    });
  }

  get assignmentPieBackground(): string {
    const completedDegrees = (this.assignmentProgressPercentage / 100) * 360;
    return `conic-gradient(var(--pie-fill) 0deg ${completedDegrees}deg, var(--pie-track) ${completedDegrees}deg 360deg)`;
  }

  get travelHeadline(): string {
    if (this.viewDay === 'tomorrow') {
      return this.translate.instant('dailyProgress.plannedTravelTime', {
        minutes: this.totalTravelMinutes,
      });
    }

    return this.translate.instant('dailyProgress.travelTime', {
      completedMinutes: this.completedTravelMinutes,
      totalMinutes: this.totalTravelMinutes,
    });
  }

  get travelFootnote(): string {
    if (this.viewDay === 'tomorrow') {
      return this.translate.instant('dailyProgress.tomorrowEstimate');
    }

    return this.translate.instant('dailyProgress.travelTimeFootnote', {
      percentage: this.travelBarPercentage,
    });
  }

  get travelProgressLabel(): string {
    return this.viewDay === 'tomorrow' ? '' : `${this.travelBarPercentage}%`;
  }

  get travelBarPercentage(): number {
    if (this.viewDay === 'tomorrow') {
      return 0;
    }

    return this.getProgressPercentage(this.completedTravelMinutes, this.totalTravelMinutes);
  }

  get typeFallbackText(): string {
    return this.translate.instant(
      this.viewDay === 'tomorrow'
        ? 'dailyProgress.noAssignmentTypesPlanned'
        : 'dailyProgress.noAssignmentTypesForDay',
    );
  }

  get isPlannedDay(): boolean {
    return this.viewDay === 'tomorrow';
  }

  get typeSummaryAriaLabel(): string {
    return this.translate.instant('dailyProgress.assignmentTypes');
  }

  get assignmentProgressAriaLabel(): string {
    return this.translate.instant(
      this.viewDay === 'tomorrow'
        ? 'dailyProgress.plannedAssignments'
        : 'dailyProgress.completedAssignments',
    );
  }

  get travelProgressAriaLabel(): string {
    return this.translate.instant(
      this.viewDay === 'tomorrow'
        ? 'dailyProgress.plannedDrivingTime'
        : 'dailyProgress.drivingTimeUsed',
    );
  }

  get viewDay(): DayOption {
    return this.day === 'tomorrow' ? 'tomorrow' : 'today';
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const isMobileLayout = this.checkIsMobileLayout();

    if (this.isMobileLayout === isMobileLayout) {
      return;
    }

    this.isMobileLayout = isMobileLayout;
    this.resetMobileTypes();
  }

  toggleTypeBreakdown(): void {
    if (!this.showTypeToggle) {
      return;
    }

    this.areMobileTypesExpanded = !this.areMobileTypesExpanded;
  }

  private get safeSummary(): DailyProgressSummary {
    const summary = this.summary;

    return {
      completedAssignments: this.normalizeMetric(summary?.completedAssignments),
      totalAssignments: this.normalizeMetric(summary?.totalAssignments),
      completedTravelMinutes: this.normalizeMetric(summary?.completedTravelMinutes),
      totalTravelMinutes: this.normalizeMetric(summary?.totalTravelMinutes),
      typeBreakdown: this.normalizeTypeBreakdown(summary?.typeBreakdown),
    };
  }

  private normalizeMetric(value: number | undefined): number {
    if (value === undefined || !Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.round(value);
  }

  private normalizeTypeBreakdown(
    items: AssignmentTypeBreakdownItem[] | undefined,
  ): AssignmentTypeBreakdownItem[] {
    const typeCounts = new Map<string, AssignmentTypeBreakdownItem>();

    for (const item of items ?? EMPTY_DAILY_PROGRESS_SUMMARY.typeBreakdown) {
      if (typeof item?.label !== 'string') {
        continue;
      }

      const label = item.label.trim();
      const count = this.normalizeMetric(item.count);
      const normalizedLabel = label.toLowerCase();

      if (!normalizedLabel || count <= 0) {
        continue;
      }

      const existing = typeCounts.get(normalizedLabel);
      typeCounts.set(normalizedLabel, {
        label: existing?.label ?? label,
        count: (existing?.count ?? 0) + count,
      });
    }

    return Array.from(typeCounts.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'nb-NO'),
    );
  }

  private getProgressPercentage(completed: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.round((completed / total) * 100);
  }

  private checkIsMobileLayout(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 479;
  }

  private resetMobileTypes(): void {
    this.areMobileTypesExpanded = false;
  }
}
