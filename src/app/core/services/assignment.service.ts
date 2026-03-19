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

    return of(cards);
  }

  getTravelTimes(): Observable<number[]> {
    const assignments = this.getAllFromStorage();
    const travelTimes = assignments.map((dto) => Math.round(dto.calculatedTraveltime));
    return of(travelTimes);
  }
}
