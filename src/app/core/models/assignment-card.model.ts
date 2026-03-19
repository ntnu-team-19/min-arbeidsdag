export type AssignmentStatus = 'ongoing' | 'upcoming' | 'completed' | 'cancelled' | 'confirmed' | 'unconfirmed';

export interface AssignmentLocationPoint {
  x: number;
  y: number;
}

export interface Assignment {
  id: string;
  title: string;
  shortDescription: string;
  time: string;
  duration?: number | null;
  address: string;
  phoneNumber: string;
  status: AssignmentStatus;
  date: string;
  locationPoint?: AssignmentLocationPoint | null;
}
