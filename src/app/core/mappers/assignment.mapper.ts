import { AssignmentDetailsDto } from '../models/assignment-details.dto';
import { AssignmentStatus, Assignment } from '../models/assignment-card.model';

export function mapDtoStatusToCardStatus(status: number): AssignmentStatus {
  // Temporary frontend-only mapping.
  // Replace with real enum mapping once Geomatikk provides the status text values.

  switch (status) {
    case 2:
      return 'completed';
    case 3:
      return 'cancelled';
    case 4:
      return 'confirmed';
    case 5:
      return 'unconfirmed';
    case 1:
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
    address: `${dto.streetAddress}, ${dto.postalCode} ${dto.municipalityName}`,
    phoneNumber: dto.showingContactPhone || 'Ikke oppgitt',
    status: mapDtoStatusToCardStatus(dto.status),
    date: dto.showingStartDate
      ? dto.showingStartDate.split('T')[0]
      : 'Ukjent dato',
  };
}
