import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AssignmentService } from './assignment.service';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { MOCK_ASSIGNMENTS } from '../data/mock-assignments';

const STORAGE_KEY = 'assignment-details';

describe('AssignmentService', () => {
  let service: AssignmentService;

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
      desiredDateForShowing: '2026-02-21T00:00:00',
      streetAddress: 'Otto Nielsens Veg 16',
      postalCode: '7052',
      showingContactName: 'second contact',
      showingContactPhone: '132 123 45',
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      deliveryDeadline: null,
      showingStartDate: '2026-02-21T09:00:00',
      showingEndDate: '2026-02-21T09:34:36',
      showingAfterCustomerWish: false,
      calculatedTimeOnsite: 7.0,
      editedTimeOnsite: 34.6,
      calculatedTraveltime: 0.0,
      orderedFor: ['GLOBALCONNECT', 'STATKRAFT ENERGI AS'],
      commentFromShower: null,
    },
  ];

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AssignmentService],
    });

    service = TestBed.inject(AssignmentService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should seed localStorage with mock assignments when storage is empty', () => {
    localStorage.clear();

    const seededService = new AssignmentService();
    expect(seededService).toBeTruthy();

    const storedValue = localStorage.getItem(STORAGE_KEY);
    expect(storedValue).toBeTruthy();
    expect(JSON.parse(storedValue!)).toEqual(MOCK_ASSIGNMENTS);
  });

  it('should not overwrite existing localStorage data', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));

    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAllAssignmentDetails());

    expect(result).toEqual(mockStoredAssignments);
  });

  it('should return all assignment details from storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAllAssignmentDetails());

    expect(result).toEqual(mockStoredAssignments);
    expect(result.length).toBe(2);
  });

  it('should return assignment details by id', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentDetailsById(1315598));

    expect(result).toEqual(mockStoredAssignments[0]);
  });

  it('should return undefined when assignment id does not exist', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentDetailsById(999999));

    expect(result).toBeUndefined();
  });

  it('should return mapped assignment cards', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCards());

    expect(result.length).toBe(2);

    expect(result[0].id).toBe('1315598');
    expect(result[0].title).toBe('Test telenor api 10');
    expect(result[0].shortDescription).toBe('Vann/Avløp\nGraving\n2 meter');
    expect(result[0].address).toContain('Fagertunvegen 5');
    expect(result[0].phoneNumber).toBe('41414141');
  });

  it('should filter assignment cards by desired date', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCardsByDesiredDate('2026-02-20'));

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1315598');
    expect(result[0].title).toBe('Test telenor api 10');
  });

  it('should return an empty array when no assignments match desired date', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStoredAssignments));
    const newService = new AssignmentService();

    const result = await firstValueFrom(newService.getAssignmentCardsByDesiredDate('2030-01-01'));

    expect(result).toEqual([]);
  });
});
