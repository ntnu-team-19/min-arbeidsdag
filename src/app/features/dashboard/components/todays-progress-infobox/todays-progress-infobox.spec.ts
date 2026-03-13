import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TodaysProgressInfobox } from './todays-progress-infobox';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { AssignmentDetailsDto } from '../../../../core/models/assignment-details.dto';

function buildAssignment(overrides: Partial<AssignmentDetailsDto>): AssignmentDetailsDto {
  return {
    id: 1,
    fieldTechId: 40231,
    status: 1,
    organizationName: 'GEOMATIKK AS',
    cableShowingTimeIsLocked: false,
    cableShowingUserIsLocked: false,
    cableShowingDateIsLocked: false,
    inquiryId: 1,
    inquiryName: 'Test assignment',
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
    orderedFor: ['GET AS Trøndelag'],
    commentFromShower: null,
    ...overrides,
  };
}

describe('TodaysProgressInfobox', () => {
  let component: TodaysProgressInfobox;
  let fixture: ComponentFixture<TodaysProgressInfobox>;
  let mockAssignmentDetails: AssignmentDetailsDto[] = [];

  beforeEach(async () => {
    mockAssignmentDetails = [
      buildAssignment({
        id: 1315598,
        inquiryId: 5866375,
        inquiryDescription: 'Vann/Avløp\nGraving\n2 meter',
        desiredDateForShowing: '2026-02-20T00:00:00',
        calculatedTraveltime: 4.0,
        editedTimeOnsite: 28.1,
      }),
      buildAssignment({
        id: 1316076,
        inquiryId: 5866939,
        status: 2,
        inquiryDescription: 'El-nett, Vann/Avløp\nGraving\n3 meter',
        desiredDateForShowing: '2026-02-20T00:00:00',
        calculatedTraveltime: 0.0,
        editedTimeOnsite: 34.6,
      }),
      buildAssignment({
        id: 1315118,
        inquiryId: 5865713,
        status: 3,
        fieldTechId: 392841,
        inquiryDescription: null,
        desiredDateForShowing: '2026-02-20T00:00:00',
        calculatedTraveltime: 42.0,
        editedTimeOnsite: 82.1,
      }),
      buildAssignment({
        id: 9999999,
        inquiryId: 9999999,
        status: 2,
        inquiryDescription: null,
        desiredDateForShowing: '2026-02-21T00:00:00',
        calculatedTraveltime: 8,
        editedTimeOnsite: 20,
      }),
    ];

    await TestBed.configureTestingModule({
      imports: [TodaysProgressInfobox],
      providers: [
        {
          provide: AssignmentService,
          useValue: {
            getAllAssignmentDetails: () => of(mockAssignmentDetails),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodaysProgressInfobox);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('selectedDate', '2026-02-20');
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should compute assignment type sectors and time progress for selected date', () => {
    fixture.componentRef.setInput('selectedDate', '2026-02-20');
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(3);
    expect(component.completedAssignments).toBe(1);
    expect(component.completionPercentRounded).toBe(33);
    expect(component.totalTypeCount).toBe(3);
    expect(component.typeSlices).toHaveLength(3);
    expect(component.typeSlices.map((slice) => slice.label)).toEqual([
      'El-nett, Vann/Avløp',
      'Ukjent',
      'Vann/Avløp',
    ]);
    expect(component.displayedTravelMinutes).toBe(46);
    expect(component.displayedTotalMinutes).toBe(145);
    expect(component.timeProgressPercentRounded).toBe(32);
  });

  it('should extract assignment type from first non-empty line of inquiryDescription', () => {
    mockAssignmentDetails = [
      buildAssignment({
        id: 1,
        inquiryDescription: '\n  Vann/Avløp \nGraving\n2 meter',
        desiredDateForShowing: '2026-02-22T00:00:00',
      }),
    ];

    fixture.componentRef.setInput('selectedDate', '2026-02-22');
    fixture.detectChanges();

    expect(component.typeSlices).toHaveLength(1);
    expect(component.typeSlices[0].label).toBe('Vann/Avløp');
  });

  it('should normalize type labels for grouping', () => {
    mockAssignmentDetails = [
      buildAssignment({
        id: 1,
        inquiryDescription: 'Vann/Avløp\nx',
        desiredDateForShowing: '2026-02-23T00:00:00',
      }),
      buildAssignment({
        id: 2,
        inquiryDescription: '  vann/avløp\nx',
        desiredDateForShowing: '2026-02-23T00:00:00',
      }),
      buildAssignment({
        id: 3,
        inquiryDescription: 'Vann / Avløp\nx',
        desiredDateForShowing: '2026-02-23T00:00:00',
      }),
    ];

    fixture.componentRef.setInput('selectedDate', '2026-02-23');
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(3);
    expect(component.totalTypeCount).toBe(1);
    expect(component.typeSlices).toHaveLength(1);
    expect(component.typeSlices[0].label).toBe('Vann/Avløp');
    expect(component.typeSlices[0].count).toBe(3);
    expect(component.completedAssignments).toBe(0);
    expect(component.completionPercentRounded).toBe(0);
  });

  it('should aggregate to top 4 types plus Andre when there are many types', () => {
    mockAssignmentDetails = [
      buildAssignment({
        id: 1,
        inquiryDescription: 'Type A',
        desiredDateForShowing: '2026-02-24T00:00:00',
      }),
      buildAssignment({
        id: 2,
        inquiryDescription: 'Type B',
        desiredDateForShowing: '2026-02-24T00:00:00',
      }),
      buildAssignment({
        id: 3,
        inquiryDescription: 'Type C',
        desiredDateForShowing: '2026-02-24T00:00:00',
      }),
      buildAssignment({
        id: 4,
        inquiryDescription: 'Type D',
        desiredDateForShowing: '2026-02-24T00:00:00',
      }),
      buildAssignment({
        id: 5,
        inquiryDescription: 'Type E',
        desiredDateForShowing: '2026-02-24T00:00:00',
      }),
      buildAssignment({
        id: 6,
        inquiryDescription: 'Type F',
        desiredDateForShowing: '2026-02-24T00:00:00',
      }),
    ];

    fixture.componentRef.setInput('selectedDate', '2026-02-24');
    fixture.detectChanges();

    expect(component.totalTypeCount).toBe(6);
    expect(component.typeSlices).toHaveLength(5);
    expect(component.typeSlices.map((slice) => `${slice.label}:${slice.count}`)).toEqual([
      'Type A:1',
      'Type B:1',
      'Type C:1',
      'Type D:1',
      'Andre:2',
    ]);
  });

  it('should sort tied type groups alphabetically for deterministic order', () => {
    mockAssignmentDetails = [
      buildAssignment({
        id: 1,
        inquiryDescription: 'Beta',
        desiredDateForShowing: '2026-02-25T00:00:00',
      }),
      buildAssignment({
        id: 2,
        inquiryDescription: 'Alpha',
        desiredDateForShowing: '2026-02-25T00:00:00',
      }),
      buildAssignment({
        id: 3,
        inquiryDescription: 'Delta',
        desiredDateForShowing: '2026-02-25T00:00:00',
      }),
      buildAssignment({
        id: 4,
        inquiryDescription: 'Charlie',
        desiredDateForShowing: '2026-02-25T00:00:00',
      }),
    ];

    fixture.componentRef.setInput('selectedDate', '2026-02-25');
    fixture.detectChanges();

    expect(component.typeSlices.map((slice) => slice.label)).toEqual([
      'Alpha',
      'Beta',
      'Charlie',
      'Delta',
    ]);
  });

  it('should keep sector percentages summing to a full donut', () => {
    mockAssignmentDetails = [
      buildAssignment({ id: 1, inquiryDescription: 'A', desiredDateForShowing: '2026-02-26T00:00:00' }),
      buildAssignment({ id: 2, inquiryDescription: 'B', desiredDateForShowing: '2026-02-26T00:00:00' }),
      buildAssignment({ id: 3, inquiryDescription: 'C', desiredDateForShowing: '2026-02-26T00:00:00' }),
      buildAssignment({ id: 4, inquiryDescription: 'D', desiredDateForShowing: '2026-02-26T00:00:00' }),
      buildAssignment({ id: 5, inquiryDescription: 'E', desiredDateForShowing: '2026-02-26T00:00:00' }),
      buildAssignment({ id: 6, inquiryDescription: 'F', desiredDateForShowing: '2026-02-26T00:00:00' }),
    ];

    fixture.componentRef.setInput('selectedDate', '2026-02-26');
    fixture.detectChanges();

    const percentSum = component.typeSlices.reduce((sum, slice) => sum + slice.percent, 0);
    expect(percentSum).toBeCloseTo(100, 8);
  });

  it('should handle partial or invalid data without crashing', () => {
    mockAssignmentDetails = [
      buildAssignment({
        id: 1,
        desiredDateForShowing: '2026-02-22T00:00:00',
        inquiryDescription: '',
        calculatedTraveltime: Number.NaN,
        editedTimeOnsite: -20,
      }),
    ];

    expect(() => {
      fixture.componentRef.setInput('selectedDate', '2026-02-22');
      fixture.detectChanges();
    }).not.toThrow();

    expect(component.totalAssignments).toBe(1);
    expect(component.completedAssignments).toBe(0);
    expect(component.totalTypeCount).toBe(1);
    expect(component.typeSlices).toHaveLength(1);
    expect(component.typeSlices[0].label).toBe('Ukjent');
    expect(component.displayedTravelMinutes).toBe(0);
    expect(component.displayedTotalMinutes).toBe(0);
    expect(component.timeProgressPercentRounded).toBe(0);
  });

  it('should update metrics when selectedDate changes', () => {
    fixture.componentRef.setInput('selectedDate', '2026-02-20');
    fixture.detectChanges();
    expect(component.totalAssignments).toBe(3);

    fixture.componentRef.setInput('selectedDate', '2026-02-21');
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(1);
    expect(component.completedAssignments).toBe(1);
    expect(component.completionPercentRounded).toBe(100);
    expect(component.totalTypeCount).toBe(1);
    expect(component.typeSlices).toHaveLength(1);
    expect(component.typeSlices[0].label).toBe('Ukjent');
    expect(component.displayedTravelMinutes).toBe(8);
    expect(component.displayedTotalMinutes).toBe(20);
  });

  it('should show zero state when no data matches selected date', () => {
    fixture.componentRef.setInput('selectedDate', '2030-01-01');
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(0);
    expect(component.completedAssignments).toBe(0);
    expect(component.completionPercentRounded).toBe(0);
    expect(component.totalTypeCount).toBe(0);
    expect(component.typeSlices).toEqual([]);
    expect(component.displayedTravelMinutes).toBe(0);
    expect(component.displayedTotalMinutes).toBe(0);
    expect(component.typeDistributionGradient).toBe('conic-gradient(#9fb7cf 0% 100%)');
    expect(component.timeProgressPercentRounded).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Ingen oppdragstyper for valgt dag');
    expect(fixture.nativeElement.textContent).toContain('Fullført: 0 / 0');
  });

  it('should filter assignments by fieldTechId when provided', () => {
    fixture.componentRef.setInput('selectedDate', '2026-02-20');
    fixture.componentRef.setInput('fieldTechId', 40231);
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(2);
    expect(component.completedAssignments).toBe(1);
    expect(component.completionPercentRounded).toBe(50);
    expect(component.totalTypeCount).toBe(2);
  });

  it('should include all field technicians when fieldTechId is not set', () => {
    fixture.componentRef.setInput('selectedDate', '2026-02-20');
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(3);
    expect(component.completedAssignments).toBe(1);
  });

  it('should update metrics when fieldTechId changes', () => {
    fixture.componentRef.setInput('selectedDate', '2026-02-20');
    fixture.componentRef.setInput('fieldTechId', 40231);
    fixture.detectChanges();
    expect(component.totalAssignments).toBe(2);
    expect(component.completedAssignments).toBe(1);

    fixture.componentRef.setInput('fieldTechId', 392841);
    fixture.detectChanges();

    expect(component.totalAssignments).toBe(1);
    expect(component.completedAssignments).toBe(0);
    expect(component.completionPercentRounded).toBe(0);
  });
});
