import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { AssignmentDetails, AssignmentStatus } from '../models/assignment-details.model';

function mapStatus(status: number): AssignmentStatus {
  switch (status) {
    case 1:
      return 'upcoming';
    case 2:
      return 'confirmed';
    case 3:
      return 'completed';
    default:
      return 'unconfirmed';
  }
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA'); // yyyy-mm-dd
}

function formatDurationMinutes(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '-';

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffMinutes = Math.round((end - start) / 1000 / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours} t`;
  }

  return `${hours} t ${minutes} min`;
}

function getDayLabel(dateString: string | null): 'today' | 'tomorrow' | 'other' {
  if (!dateString) return 'other';

  const target = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const targetDate = target.toDateString();
  if (targetDate === today.toDateString()) return 'today';
  if (targetDate === tomorrow.toDateString()) return 'tomorrow';
  return 'other';
}

export function mapAssignmentDetailsDtoToAssignmentDetails(
  dto: AssignmentDetailsDto
): AssignmentDetails {
  const dayLabel = getDayLabel(dto.showingStartDate);

  return {
    id: dto.id.toString(),
    title: dto.inquiryName || 'Uten tittel',
    status: mapStatus(dto.status),

    date: formatDate(dto.showingStartDate),
    dayLabel,

    startTime: formatTime(dto.showingStartDate),
    endTime: dto.showingEndDate ? formatTime(dto.showingEndDate) : null,
    estimatedDuration: formatDurationMinutes(dto.showingStartDate, dto.showingEndDate),

    address: `${dto.streetAddress}, ${dto.postalCode} ${dto.municipalityName}`,
    streetAddress: dto.streetAddress,
    postalCode: dto.postalCode,
    municipalityName: dto.municipalityName,

    description: dto.inquiryDescription ?? 'Ingen beskrivelse tilgjengelig',
    contactName: dto.showingContactName ?? 'Ingen kontaktperson',
    contactPhone: dto.showingContactPhone ?? '',
    contactEmail: null, // not present in dto yet

    comment: dto.commentFromShower ?? '',
    orderedFor: dto.orderedFor ?? [],

    canMarkContacted: dayLabel === 'tomorrow',
    contacted: false, // mock default for now
  };
}
