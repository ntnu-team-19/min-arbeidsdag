import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { AssignmentStatus, Assignment } from '../models/assignment-card.model';

export function mapDtoStatusToCardStatus(status: number): AssignmentStatus {
  // Based on your current domain note:
  // 1: ordered
  // 2: ongoing
  // 3: completed
  // 4: approved
  // 5: completed with change
  // 12: delivered (temporary technician-completed state)

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

export function formatTimeFromIso(dateString: string | null): string {
  if (!dateString) return 'Ukjent tidspunkt';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Ukjent tidspunkt';
  }

  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function mapAssignmentDetailsDtoToAssignmentCardModel(
  dto: AssignmentDetailsDto,
): Assignment {
  return {
    id: String(dto.id),
    title: dto.inquiryName || 'Oppdrag uten tittel',
    shortDescription: dto.inquiryDescription || 'Ingen beskrivelse tilgjengelig.',
    time: formatTimeFromIso(dto.showingStartDate),
    duration: dto.editedTimeOnsite,
    address: `${dto.streetAddress}, ${dto.postalCode} ${dto.municipalityName}`,
    phoneNumber: dto.showingContactPhone || 'Ikke oppgitt',
    status: mapDtoStatusToCardStatus(dto.status),
    date: dto.showingStartDate ? dto.showingStartDate.split('T')[0] : 'Ukjent dato',
    locationPoint: dto.locationPoint ?? null,
  };
}
