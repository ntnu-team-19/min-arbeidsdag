export interface AssignmentDetailsDto {
  id: number;
  fieldTechId: number;
  status: number; // enum from backend
  tomorrowConfirmed?: boolean;
  organizationName: string;
  cableShowingTimeIsLocked: boolean;
  cableShowingUserIsLocked: boolean;
  cableShowingDateIsLocked: boolean;
  inquiryId: number;
  inquiryName: string;
  inquiryDescription: string | null;
  showingDeadlineDate: string | null;
  desiredDateForShowing: string | null;
  streetAddress: string;
  locationPoint: {
    x: number;
    y: number;
  };
  postalCode: string;
  showingContactName: string | null;
  showingContactPhone: string | null;
  municipalityNumber: string;
  municipalityName: string;
  deliveryDeadline: string | null;
  showingStartDate: string | null;
  showingEndDate: string | null;
  showingAfterCustomerWish: boolean;
  calculatedTimeOnsite: number;
  editedTimeOnsite: number;
  calculatedTraveltime: number;
  orderedFor: string[];
  commentFromShower: string | null;
}
