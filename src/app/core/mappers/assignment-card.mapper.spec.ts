import { describe, expect, it } from 'vitest';
import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { mapAssignmentDetailsDtoToAssignmentCardModel } from './assignment-card.mapper';

function buildDto(editedTimeOnsite: number): AssignmentDetailsDto {
  return {
    id: 1,
    fieldTechId: 40231,
    status: 1,
    tomorrowConfirmed: false,
    organizationName: 'Test Org',
    cableShowingTimeIsLocked: false,
    cableShowingUserIsLocked: false,
    cableShowingDateIsLocked: false,
    inquiryId: 1234,
    inquiryName: 'Testoppdrag',
    inquiryDescription: 'Beskrivelse',
    showingDeadlineDate: null,
    desiredDateForShowing: null,
    streetAddress: 'Eksempelvegen 1',
    locationPoint: { x: 10.1, y: 63.1 },
    postalCode: '7010',
    showingContactName: 'Test Person',
    showingContactPhone: '12345678',
    municipalityNumber: '5001',
    municipalityName: 'Trondheim',
    deliveryDeadline: null,
    showingStartDate: '2026-04-24T09:00:00Z',
    showingEndDate: '2026-04-24T10:00:00Z',
    showingAfterCustomerWish: false,
    calculatedTimeOnsite: editedTimeOnsite,
    editedTimeOnsite,
    calculatedTraveltime: 15,
    orderedFor: [],
    commentFromShower: null,
  };
}

describe('mapAssignmentDetailsDtoToAssignmentCardModel', () => {
  it('should format duration below one hour in minutes', () => {
    const dto = buildDto(45);

    const card = mapAssignmentDetailsDtoToAssignmentCardModel(dto);

    expect(card.duration).toBe('45 min');
  });

  it('should format exact hours without minutes suffix', () => {
    const dto = buildDto(60);

    const card = mapAssignmentDetailsDtoToAssignmentCardModel(dto);

    expect(card.duration).toBe('1 t');
  });

  it('should format hour and minute combination', () => {
    const dto = buildDto(90);

    const card = mapAssignmentDetailsDtoToAssignmentCardModel(dto);

    expect(card.duration).toBe('1 t 30 min');
  });
});
