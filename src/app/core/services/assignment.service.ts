import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { Assignment } from '../models/assignment-card.model';
import { AssignmentDetails } from '../models/assignment-details.model';
import { AssignmentTypeBreakdownItem, DailyProgressSummary } from '../models/daily-progress.model';
import { MOCK_ASSIGNMENTS } from '../data/mock-assignments';
import {
  mapAssignmentDetailsDtoToAssignmentCardModel,
  mapDtoStatusToCardStatus,
} from '../mappers/assignment-card.mapper';
import { mapAssignmentDetailsDtoToAssignmentDetails } from '../mappers/assignment-details.mapper';

const STORAGE_KEY = 'assignment-details';

@Injectable({
  providedIn: 'root',
})
export class AssignmentService {
  constructor() {
    this.seedIfEmpty();
  }

  private seedIfEmpty(): void {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ASSIGNMENTS));
    }
  }

  private getAllFromStorage(): AssignmentDetailsDto[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to re-seed below
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ASSIGNMENTS));
    return MOCK_ASSIGNMENTS;
  }

  getAllAssignmentDetails(): Observable<AssignmentDetailsDto[]> {
    return of(this.getAllFromStorage());
  }

  getAssignmentDetailsById(id: string | number): Observable<AssignmentDetailsDto | undefined> {
    const normalizedId = String(id);
    const assignment = this.getAllFromStorage().find((item) => String(item.id) === normalizedId);
    return of(assignment);
  }

  getAssignmentDetailsViewById(id: string | number): Observable<AssignmentDetails | undefined> {
    return this.getAssignmentDetailsById(id).pipe(
      map((assignment) =>
        assignment ? mapAssignmentDetailsDtoToAssignmentDetails(assignment) : undefined,
      ),
    );
  }

  getAssignmentCards(): Observable<Assignment[]> {
    const cards = this.getAllFromStorage().map(mapAssignmentDetailsDtoToAssignmentCardModel);
    return of(cards);
  }

  getAssignmentCardsByDesiredDate(date: string): Observable<Assignment[]> {
    const cards = this.getAssignmentsByDesiredDate(date).map(
      mapAssignmentDetailsDtoToAssignmentCardModel,
    );

    return of(this.sortByStatus(cards));
  }

  getTravelTimes(): Observable<number[]> {
    const assignments = this.getAllFromStorage();
    const travelTimes = assignments.map((dto) => Math.round(dto.calculatedTraveltime));
    return of(travelTimes);
  }

  getTravelTimesByDesiredDate(date: string): Observable<number[]> {
    const assignments = this.getAssignmentsByDesiredDate(date);
    const travelTimes = assignments.map((dto) => this.toTravelMinutes(dto.calculatedTraveltime));
    return of(travelTimes);
  }

  getDailyProgressByDesiredDate(date: string): Observable<DailyProgressSummary> {
    const assignments = this.getAssignmentsByDesiredDate(date);
    const completedAssignments = assignments.filter((assignment) =>
      this.isCompletedAssignment(assignment.status),
    );

    return of({
      completedAssignments: completedAssignments.length,
      totalAssignments: assignments.length,
      completedTravelMinutes: completedAssignments.reduce(
        (sum, assignment) => sum + this.toTravelMinutes(assignment.calculatedTraveltime),
        0,
      ),
      totalTravelMinutes: assignments.reduce(
        (sum, assignment) => sum + this.toTravelMinutes(assignment.calculatedTraveltime),
        0,
      ),
      typeBreakdown: this.buildTypeBreakdown(assignments),
    });
  }

  private readonly statusOrder: Record<string, number> = {
    ongoing: 0,
    next: 1,
    upcoming: 1,
    completed: 2,
  };

  private sortByStatus(cards: Assignment[]): Assignment[] {
    return cards.sort(
      (a, b) => (this.statusOrder[a.status] ?? 99) - (this.statusOrder[b.status] ?? 99),
    );
  }

  private getAssignmentsByDesiredDate(date: string): AssignmentDetailsDto[] {
    return this.getAllFromStorage().filter((item) => item.desiredDateForShowing?.startsWith(date));
  }

  private isCompletedAssignment(status: number): boolean {
    return mapDtoStatusToCardStatus(status) === 'completed';
  }

  private extractAssignmentTypes(description: string | null): string[] {
    if (!description) {
      return [];
    }

    const [firstLine = ''] = description.split('\n');
    return firstLine
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);
  }

  private buildTypeBreakdown(assignments: AssignmentDetailsDto[]): AssignmentTypeBreakdownItem[] {
    const typeCounts = new Map<string, number>();

    for (const assignment of assignments) {
      for (const type of this.extractAssignmentTypes(assignment.inquiryDescription)) {
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      }
    }

    return Array.from(typeCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'nb-NO'));
  }

  private toTravelMinutes(travelTime: number): number {
    return Math.round(travelTime);
  }
}
