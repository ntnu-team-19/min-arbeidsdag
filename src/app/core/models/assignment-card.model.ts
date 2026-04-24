export type AssignmentStatus =
  | 'ongoing'
  | 'next'
  | 'upcoming'
  | 'absence'
  | 'completed'
  | 'cancelled'
  | 'confirmed'
  | 'unconfirmed';

export interface AssignmentLocationPoint {
  x: number;
  y: number;
}

export interface Assignment {
  id: string;
  fieldTechId?: number;
  inquiryId?: number;
  title: string;
  shortDescription?: string;
  time: string;
  duration?: number | null;
  address: string;
  phoneNumber: string;
  status: AssignmentStatus;
  date: string;
  locationPoint?: AssignmentLocationPoint | null;
  hasNotesIndicator?: boolean;
  isAvailability?: boolean;
}
