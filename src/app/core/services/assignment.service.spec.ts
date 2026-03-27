import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AssignmentService } from './assignment.service';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { MOCK_ASSIGNMENTS } from '../data/mock-assignments';

const STORAGE_KEY = 'assignment-details';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let storage: Storage;

  const mockStoredAssignments: AssignmentDetailsDto[] = [
    {
      id: 1315598,
      fieldTechId: 40231,
      status: 1,
      organizationName: 'GEOMATIKK AS',
      cableShowingTimeIsLocked: false,
      cableShowingUserIsLocked: false,
      cableShowingDateIsLocked: false,
      inquiryId: 5866375,
      inquiryName: 'Test telenor api 10',
      inquiryDescription: 'Vann/Avløp\nGraving\n2 meter',
      showingDeadlineDate: '2023-09-11T23:59:59',
      desiredDateForShowing: '2026-02-20T00:00:00',
      streetAddress: 'Fagertunvegen 5',
      locationPoint: { x: 10.39506, y: 63.43049 },
      postalCode: '7021',
      showingContactName: 'Ola Entreprenør',
      showingContactPhone: '41414141',
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      deliveryDeadline: null,
      showingStartDate: '2026-02-20T07:00:47',
      showingEndDate: '2026-02-20T07:31:47',
      showingAfterCustomerWish: false,
      calculatedTimeOnsite: 2.0,
      editedTimeOnsite: 28.1,
      calculatedTraveltime: 4.0,
      orderedFor: ['GET AS Trøndelag', 'TELENOR NORGE'],
      commentFromShower: null,
    },
    {
      id: 1316076,
      fieldTechId: 40231,
      status: 2,
      organizationName: 'GEOMATIKK AS',
      cableShowingTimeIsLocked: false,
      cableShowingUserIsLocked: false,
      cableShowingDateIsLocked: false,
      inquiryId: 5866939,
      inquiryName: 'Underordnet 5866938: Test1312',
      inquiryDescription: 'El-nett, Vann/Avløp\nGraving\n3 meter',
      showingDeadlineDate: '2024-05-30T23:59:59',
      desiredDateForShowing: '2026-02-20T00:00:00',
      streetAddress: 'Otto Nielsens Veg 16',
      locationPoint: { x: 10.43138, y: 63.42262 },
      postalCode: '7052',
      showingContactName: 'second contact',
      showingContactPhone: '132 123 45',
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      deliveryDeadline: null,
      showingStartDate: '2026-02-20T09:00:00',
      showingEndDate: '2026-02-20T09:34:36',
      showingAfterCustomerWish: false,
      calculatedTimeOnsite: 7.0,
      editedTimeOnsite: 34.6,
      calculatedTraveltime: 12.0,
      orderedFor: ['GLOBALCONNECT', 'STATKRAFT ENERGI AS'],
      commentFromShower: null,
    },
  ];

  beforeEach(() => {
    storage = createStorageMock();
    vi.stubGlobal('localStorage', storage);
    storage.clear();

    TestBed.configureTestingModule({
      providers: [AssignmentService],
    });

    service = TestBed.inject(AssignmentService);
  });

  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should seed localStorage with mock assignments when storage is empty', () => {
    storage.clear();

    const seededService = new AssignmentService();
    expect(seededService).toBeTruthy();

    const storedValue = storage.getItem(STORAGE_KEY);
    expect(storedValue).toBeTruthy();
    expect(JSON.parse(storedValue!)).toEqual(MOCK_ASSIGNMENTS);
  });

  it('should not overwrite existing localStorage data', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));

    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAllAssignmentDetails());

    expect(result).toEqual(mockStoredAssignments);
  });

  it('should return all assignment details from storage', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAllAssignmentDetails());

    expect(result).toEqual(mockStoredAssignments);
    expect(result.length).toBe(2);
  });

  it('should return assignment details by id', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentDetailsById(1315598));

    expect(result).toEqual(mockStoredAssignments[0]);
  });

  it('should return undefined when assignment id does not exist', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentDetailsById(999999));

    expect(result).toBeUndefined();
  });

  it('should return mapped assignment cards', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCards());

    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1315598');
    expect(result[0].title).toBe('Test telenor api 10');
    expect(result[0].address).toContain('Fagertunvegen 5');
    expect(result[0].phoneNumber).toBe('41414141');
  });

  it('should filter assignment cards by desired date', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCardsByDesiredDate('2026-02-20'));

    expect(result.length).toBe(2);
  });

  it('should return an empty array when no assignments match desired date', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCardsByDesiredDate('2030-01-01'));

    expect(result).toEqual([]);
  });

  it('should sort cards by status: ongoing first, then upcoming, then completed', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCardsByDesiredDate('2026-02-20'));

    const statusOrder = ['ongoing', 'next', 'upcoming', 'completed'];
    let lastIndex = -1;
    for (const card of result) {
      const currentIndex = statusOrder.indexOf(card.status);
      expect(currentIndex).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = currentIndex;
    }
  });

  it('should return travel times for all assignments', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getTravelTimes());

    expect(result.length).toBe(2);
    expect(result[0]).toBe(4);
    expect(result[1]).toBe(12);
  });

  it('should return travel times filtered by desired date', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getTravelTimesByDesiredDate('2026-02-20'));

    expect(result.length).toBe(2);
    result.forEach((time) => {
      expect(typeof time).toBe('number');
      expect(Number.isInteger(time)).toBe(true);
    });
  });

  it('should return empty travel times for date with no assignments', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getTravelTimesByDesiredDate('2030-01-01'));

    expect(result).toEqual([]);
  });

  it('should return daily progress summary with sorted type breakdown counts', async () => {
    const progressAssignments: AssignmentDetailsDto[] = [
      {
        ...mockStoredAssignments[0],
        status: 3,
        inquiryDescription: 'Fiber\nGraving',
        calculatedTraveltime: 4.4,
      },
      {
        ...mockStoredAssignments[1],
        status: 2,
        inquiryDescription: 'El-nett, Vann/Avløp\nGraving\n3 meter',
        calculatedTraveltime: 10.2,
      },
      {
        ...mockStoredAssignments[0],
        id: 1317000,
        status: 1,
        inquiryDescription: 'Fiber\nKontroll',
        calculatedTraveltime: 5.6,
      },
    ];

    storage.setItem(STORAGE_KEY, JSON.stringify(progressAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getDailyProgressByDesiredDate('2026-02-20'));

    expect(result).toEqual({
      completedAssignments: 1,
      totalAssignments: 3,
      completedTravelMinutes: 4,
      totalTravelMinutes: 20,
      typeBreakdown: [
        { label: 'Fiber', count: 2 },
        { label: 'El-nett', count: 1 },
        { label: 'Vann/Avløp', count: 1 },
      ],
    });
  });

  it('should return an empty daily progress summary when no assignments match the date', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getDailyProgressByDesiredDate('2030-01-01'));

    expect(result).toEqual({
      completedAssignments: 0,
      totalAssignments: 0,
      completedTravelMinutes: 0,
      totalTravelMinutes: 0,
      typeBreakdown: [],
    });
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
