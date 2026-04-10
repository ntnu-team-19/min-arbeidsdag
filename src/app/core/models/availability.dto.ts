import { AssignmentLocationPoint } from './assignment-card.model';

export interface AvailabilityDto {
  start: string;
  stop: string;
  calculatedTraveltime: number;
  available: boolean;
  allDay: boolean;
  absenceWithoutGoingHome: boolean;
  locationPoint: AssignmentLocationPoint | null;
}
