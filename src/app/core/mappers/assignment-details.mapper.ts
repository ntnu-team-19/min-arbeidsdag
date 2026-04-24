import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { AssignmentDetails, AssignmentStatus } from '../models/assignment-details.model';

function mapStatus(status: number): AssignmentStatus {
  switch (status) {
    case 2:
      return 'ongoing';
    case 3:
    case 4:
    case 5:
    case 12:
      return 'completed';
    case 6:
      return 'next';
    case 1:
      return 'upcoming';
    default:
      return 'upcoming';
  }
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDurationFromMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (remaining === 0) {
    return `${hours} t`;
  }

  return `${hours} t ${remaining} min`;
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
  dto: AssignmentDetailsDto,
): AssignmentDetails {
  const dayLabel = getDayLabel(dto.showingStartDate);
  const tomorrowConfirmed = dto.tomorrowConfirmed ?? false;
  const status =
    dayLabel === 'tomorrow'
      ? tomorrowConfirmed
        ? 'confirmed'
        : 'unconfirmed'
      : mapStatus(dto.status);

  return {
    id: dto.id.toString(),
    title: dto.inquiryName || 'Uten tittel',
    inquiryId: dto.inquiryId,
    status,

    date: formatDate(dto.showingStartDate),
    dayLabel,

    startTime: formatTime(dto.showingStartDate),
    endTime: dto.showingEndDate ? formatTime(dto.showingEndDate) : null,
    estimatedDuration: formatDurationFromMinutes(dto.editedTimeOnsite),
    address: `${dto.streetAddress}, ${dto.postalCode} ${dto.municipalityName}`,
    streetAddress: dto.streetAddress,
    postalCode: dto.postalCode,
    municipalityName: dto.municipalityName,
    locationPoint: dto.locationPoint ?? null,
    description: dto.inquiryDescription ?? 'Ingen beskrivelse tilgjengelig',
    contactName: dto.showingContactName ?? 'Ingen kontaktperson',
    contactPhone: dto.showingContactPhone ?? '',
    contactEmail: null, // not present in dto yet

    coordinatorMessage: dto.commentFromShower ?? '',
    orderedFor: dto.orderedFor ?? [],

    canMarkContacted: dayLabel === 'tomorrow',
    contacted: tomorrowConfirmed,
  };
}
