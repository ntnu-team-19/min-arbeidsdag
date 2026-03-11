export type AssignmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'confirmed' | 'unconfirmed';

export interface Assignment {
  id: string;
  title: string;
  shortDescription: string;
  time: string;
  address: string;
  phoneNumber: string;
  status: AssignmentStatus;
  date: string; // e.g. '2026-02-19'
}
