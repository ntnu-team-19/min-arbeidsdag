import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MOCK_AVAILABILITIES } from '../data/mock-availability';
import { AvailabilityDto } from '../models/availability.dto';

const STORAGE_KEY = 'availability-details';

@Injectable({
  providedIn: 'root',
})
export class AvailabilityService {
  constructor() {
    this.seedIfEmpty();
  }

  getAvailabilitiesByDate(date: string): Observable<AvailabilityDto[]> {
    const availabilities = this.getAllFromStorage().filter((item) => item.start.startsWith(date));
    return of(availabilities);
  }

  private seedIfEmpty(): void {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AVAILABILITIES));
    }
  }

  private getAllFromStorage(): AvailabilityDto[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => this.normalizeAvailability(item));
      }
    } catch {
      // fall through to re-seed below
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AVAILABILITIES));
    return MOCK_AVAILABILITIES;
  }

  private normalizeAvailability(item: unknown): AvailabilityDto {
    const source = (item ?? {}) as Partial<AvailabilityDto>;

    return {
      start: source.start ?? '',
      stop: source.stop ?? '',
      calculatedTraveltime:
        typeof source.calculatedTraveltime === 'number' &&
        Number.isFinite(source.calculatedTraveltime)
          ? source.calculatedTraveltime
          : 0,
      available: source.available ?? false,
      allDay: source.allDay ?? false,
      absenceWithoutGoingHome: source.absenceWithoutGoingHome ?? false,
      locationPoint: source.locationPoint ?? null,
    };
  }
}
