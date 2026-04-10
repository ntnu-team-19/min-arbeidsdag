import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_AVAILABILITIES } from '../data/mock-availability';
import { AvailabilityService } from './availability.service';

const STORAGE_KEY = 'availability-details';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let storage: Storage;

  beforeEach(() => {
    storage = createStorageMock();
    vi.stubGlobal('localStorage', storage);
    storage.clear();

    TestBed.configureTestingModule({
      providers: [AvailabilityService],
    });

    service = TestBed.inject(AvailabilityService);
  });

  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should seed localStorage with mock availabilities when storage is empty', () => {
    storage.clear();

    const seededService = new AvailabilityService();
    expect(seededService).toBeTruthy();

    const storedValue = storage.getItem(STORAGE_KEY);
    expect(storedValue).toBeTruthy();
    expect(JSON.parse(storedValue!)).toEqual(MOCK_AVAILABILITIES);
  });

  it('should return availabilities filtered by date', async () => {
    const stored = [
      ...MOCK_AVAILABILITIES,
      {
        ...MOCK_AVAILABILITIES[0],
        start: '2030-01-01T09:00:00',
        stop: '2030-01-01T09:30:00',
      },
    ];

    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const newService = new AvailabilityService();

    const result = await firstValueFrom(
      newService.getAvailabilitiesByDate(MOCK_AVAILABILITIES[0].start.slice(0, 10)),
    );

    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(MOCK_AVAILABILITIES[0].start);
  });

  it('should default calculatedTraveltime to 0 for legacy availability entries', async () => {
    const legacyAvailability = {
      ...MOCK_AVAILABILITIES[0],
      calculatedTraveltime: undefined,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify([legacyAvailability]));
    const newService = new AvailabilityService();

    const result = await firstValueFrom(
      newService.getAvailabilitiesByDate(MOCK_AVAILABILITIES[0].start.slice(0, 10)),
    );

    expect(result).toHaveLength(1);
    expect(result[0].calculatedTraveltime).toBe(0);
  });
});

function createStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
  };
}
