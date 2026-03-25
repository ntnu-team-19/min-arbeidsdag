import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { Assignment } from '../models/assignment-card.model';
import { AssignmentDetails } from '../models/assignment-details.model';
import { MOCK_ASSIGNMENTS } from '../data/mock-assignments';
import { mapAssignmentDetailsDtoToAssignmentCardModel } from '../mappers/assignment-card.mapper';
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

  private saveAllToStorage(assignments: AssignmentDetailsDto[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
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
    const cards = this.getAllFromStorage()
      .filter((item) => item.desiredDateForShowing?.startsWith(date))
      .map(mapAssignmentDetailsDtoToAssignmentCardModel);

    return of(this.sortByStatus(cards));
  }

  getTravelTimes(): Observable<number[]> {
    const assignments = this.getAllFromStorage();
    const travelTimes = assignments.map((dto) => Math.round(dto.calculatedTraveltime));
    return of(travelTimes);
  }

  getTravelTimesByDesiredDate(date: string): Observable<number[]> {
    const assignments = this.getAllFromStorage().filter((item) =>
      item.desiredDateForShowing?.startsWith(date),
    );
    const travelTimes = assignments.map((dto) => Math.round(dto.calculatedTraveltime));
    return of(travelTimes);
  }

  updateTomorrowConfirmation(
    id: string | number,
    confirmed: boolean,
  ): Observable<AssignmentDetailsDto | undefined> {
    const normalizedId = String(id);
    const assignments = this.getAllFromStorage();
    const index = assignments.findIndex((item) => String(item.id) === normalizedId);

    if (index === -1) {
      return of(undefined);
    }

    const updatedAssignment = {
      ...assignments[index],
      tomorrowConfirmed: confirmed,
    };

    assignments[index] = updatedAssignment;
    this.saveAllToStorage(assignments);

    return of(updatedAssignment);
  }

  private readonly statusOrder: Record<string, number> = {
    ongoing: 0,
    next: 1,
    upcoming: 1,
    unconfirmed: 1,
    confirmed: 2,
    completed: 3,
  };

  private sortByStatus(cards: Assignment[]): Assignment[] {
    return cards.sort(
      (a, b) => (this.statusOrder[a.status] ?? 99) - (this.statusOrder[b.status] ?? 99),
    );
  }
}
