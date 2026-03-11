import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { Assignment } from '../models/assignment-card.model';
import { MOCK_ASSIGNMENTS } from '../data/mock-assignments';
import { mapAssignmentDetailsDtoToAssignmentCardModel } from '../mappers/assignment.mapper';

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
    return raw ? JSON.parse(raw) : [];
  }

  getAllAssignmentDetails(): Observable<AssignmentDetailsDto[]> {
    return of(this.getAllFromStorage());
  }

  getAssignmentDetailsById(id: number): Observable<AssignmentDetailsDto | undefined> {
    const assignment = this.getAllFromStorage().find((item) => item.id === id);
    return of(assignment);
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
}
