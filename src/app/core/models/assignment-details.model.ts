export type AssignmentStatus =
  | 'upcoming'
  | 'ongoing'
  | 'next'
  | 'completed'
  | 'cancelled'
  | 'confirmed'
  | 'unconfirmed';

export interface AssignmentDetails {
  id: string;
  title: string;
  status: AssignmentStatus;

  date: string;
  dayLabel: 'today' | 'tomorrow' | 'other';

  startTime: string;
  endTime: string | null;
  estimatedDuration: string;

  address: string;
  streetAddress: string;
  postalCode: string;
  municipalityName: string;

  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;

  comment: string;
  orderedFor: string[];

  canMarkContacted: boolean;
  contacted: boolean;
}
