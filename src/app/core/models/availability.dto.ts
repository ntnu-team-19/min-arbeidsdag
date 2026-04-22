import { AssignmentLocationPoint } from './assignment-card.model';

export interface AvailabilityDto {
  title: string;
  shortDescription: string;
  address: string;
  phoneNumber: string;
  start: string;
  stop: string;
  calculatedTraveltime: number;
  available: boolean;
  allDay: boolean;
  absenceWithoutGoingHome: boolean;
  locationPoint: AssignmentLocationPoint | null;
}
