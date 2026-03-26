import { Component, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
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
    return this.viewDay === 'tomorrow' ? 'Morgendagens oversikt' : 'Dagens fremdrift';
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
    return `${this.totalAssignments} oppdrag fordelt på ${this.typeBreakdownItems.length} typer`;
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
    return this.areMobileTypesExpanded ? 'Skjul oppdragstyper' : 'Vis oppdragstyper';
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
    return this.viewDay === 'tomorrow' ? 'Planlagte oppdrag' : 'Fullførte oppdrag';
  }

  get assignmentMetricText(): string {
    if (this.viewDay === 'tomorrow') {
      return '';
    }

    if (this.totalAssignments === 0) {
      return 'Ingen oppdrag registrert';
    }

    const remainingAssignments = Math.max(this.totalAssignments - this.completedAssignments, 0);

    if (remainingAssignments === 0) {
      return 'Alle oppdrag er fullført';
    }

    return `${remainingAssignments} oppdrag gjenstår`;
  }

  get assignmentPieBackground(): string {
    const completedDegrees = (this.assignmentProgressPercentage / 100) * 360;
    return `conic-gradient(#90aecb 0deg ${completedDegrees}deg, #d7e4f1 ${completedDegrees}deg 360deg)`;
  }

  get travelHeadline(): string {
    if (this.viewDay === 'tomorrow') {
      return `Planlagt kjøretid: ${this.totalTravelMinutes} min`;
    }

    return `Kjøretid: ${this.completedTravelMinutes} min av ${this.totalTravelMinutes} min`;
  }

  get travelFootnote(): string {
    if (this.viewDay === 'tomorrow') {
      return 'Estimert for morgendagens oppdrag';
    }

    return `${this.travelBarPercentage}% av dagens tid brukt på kjøring`;
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
    return this.viewDay === 'tomorrow'
      ? 'Ingen oppdragstyper planlagt'
      : 'Ingen oppdragstyper for valgt dag';
  }

  get isPlannedDay(): boolean {
    return this.viewDay === 'tomorrow';
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
