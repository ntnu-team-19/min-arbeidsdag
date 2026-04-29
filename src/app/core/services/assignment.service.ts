import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { Assignment, AssignmentStatus } from '../models/assignment-card.model';
import { AssignmentDetails } from '../models/assignment-details.model';
import { AssignmentTypeBreakdownItem, DailyProgressSummary } from '../models/daily-progress.model';
import { MOCK_ASSIGNMENTS } from '../data/mock-assignments';
import { getTechnicianDayLocations } from '../data/mock-technician-bases';
import { TechnicianLocation } from '../models/tech-location.model';
import {
  mapAssignmentDetailsDtoToAssignmentCardModel,
  mapDtoStatusToCardStatus,
} from '../mappers/assignment-card.mapper';
import { mapAssignmentDetailsDtoToAssignmentDetails } from '../mappers/assignment-details.mapper';

const STORAGE_KEY = 'assignment-details';
const PERSONAL_NOTES_STORAGE_KEY = 'assignment-personal-notes';

type PersonalNotesByAssignmentId = Record<string, string>;

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

  private getAllPersonalNotesFromStorage(): PersonalNotesByAssignmentId {
    const raw = localStorage.getItem(PERSONAL_NOTES_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).reduce<PersonalNotesByAssignmentId>((acc, [key, value]) => {
          if (typeof value === 'string') {
            acc[key] = value;
          }
          return acc;
        }, {});
      }
    } catch {
      // fall through to reset below
    }

    localStorage.setItem(PERSONAL_NOTES_STORAGE_KEY, JSON.stringify({}));
    return {};
  }

  private saveAllPersonalNotesToStorage(notes: PersonalNotesByAssignmentId): void {
    localStorage.setItem(PERSONAL_NOTES_STORAGE_KEY, JSON.stringify(notes));
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
    const personalNotes = this.getAllPersonalNotesFromStorage();
    const cards = this.getAllFromStorage().map((dto) =>
      mapAssignmentDetailsDtoToAssignmentCardModel(dto, personalNotes[String(dto.id)] ?? ''),
    );
    return of(cards);
  }

  getAssignmentCardsByDesiredDate(date: string): Observable<Assignment[]> {
    const personalNotes = this.getAllPersonalNotesFromStorage();
    const cards = this.getSortedAssignmentsByDesiredDate(date).map((dto) =>
      mapAssignmentDetailsDtoToAssignmentCardModel(dto, personalNotes[String(dto.id)] ?? ''),
    );

    return of(cards);
  }

  getTravelTimes(): Observable<number[]> {
    const assignments = this.getAllFromStorage();
    const travelTimes = assignments.map((dto) => Math.round(dto.calculatedTraveltime));
    return of(travelTimes);
  }

  getTravelTimesByDesiredDate(date: string): Observable<number[]> {
    const assignments = this.getSortedAssignmentsByDesiredDate(date);
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

  getTechnicianLocationsByDesiredDate(date: string): Observable<TechnicianLocation[]> {
    const assignments = this.getSortedAssignmentsByDesiredDate(date);
    const firstAssignment = assignments[0];

    return of(
      getTechnicianDayLocations(firstAssignment?.fieldTechId, firstAssignment?.showingStartDate),
    );
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

  getPersonalNote(id: string | number): Observable<string> {
    const normalizedId = String(id);
    const notes = this.getAllPersonalNotesFromStorage();
    return of(notes[normalizedId] ?? '');
  }

  savePersonalNote(id: string | number, note: string): Observable<string> {
    const normalizedId = String(id);
    const notes = this.getAllPersonalNotesFromStorage();
    notes[normalizedId] = note;
    this.saveAllPersonalNotesToStorage(notes);
    return of(note);
  }

  private readonly statusOrder: Record<AssignmentStatus, number> = {
    ongoing: 0,
    next: 1,
    upcoming: 1,
    absence: 1,
    unconfirmed: 1,
    confirmed: 2,
    completed: 3,
    cancelled: 4,
  };

  private getSortedAssignmentsByDesiredDate(date: string): AssignmentDetailsDto[] {
    return this.getSortedAssignments(this.getAssignmentsByDesiredDate(date), date);
  }

  private getSortedAssignments(assignments: AssignmentDetailsDto[], desiredDate?: string): AssignmentDetailsDto[] {
    const isTodayView = desiredDate ? this.isToday(desiredDate) : false;

    return [...assignments].sort((a, b) => {
      if (isTodayView) {
        const statusDiff = this.compareStatus(a, b);
        if (statusDiff !== 0) {
          return statusDiff;
        }
      }

      const startTimeDiff = this.compareStartTime(a.showingStartDate, b.showingStartDate);
      if (startTimeDiff !== 0) {
        return startTimeDiff;
      }

      return a.id - b.id;
    });
  }

  private compareStatus(a: AssignmentDetailsDto, b: AssignmentDetailsDto): number {
    const aStatus = mapAssignmentDetailsDtoToAssignmentCardModel(a).status;
    const bStatus = mapAssignmentDetailsDtoToAssignmentCardModel(b).status;

    return (this.statusOrder[aStatus] ?? 99) - (this.statusOrder[bStatus] ?? 99);
  }

  private compareStartTime(a: string | null, b: string | null): number {
    const aTime = this.toTimestamp(a);
    const bTime = this.toTimestamp(b);

    return aTime - bTime;
  }

  private toTimestamp(dateString: string | null): number {
    if (!dateString) {
      return Number.MAX_SAFE_INTEGER;
    }

    const timestamp = new Date(dateString).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
  }

  private isToday(dateString: string): boolean {
    const target = new Date(dateString);
    if (Number.isNaN(target.getTime())) return false;

    const today = new Date();
    return target.toDateString() === today.toDateString();
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
