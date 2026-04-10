import { AvailabilityDto } from '../models/availability.dto';
import { Assignment } from '../models/assignment-card.model';

const AVAILABILITY_CARD_ID_PREFIX = 'availability';

export function buildAvailabilityCardId(dateTime: string): string {
  return `${AVAILABILITY_CARD_ID_PREFIX}-${dateTime}`;
}

export function isAvailabilityCardId(cardId: string): boolean {
  return cardId.startsWith(`${AVAILABILITY_CARD_ID_PREFIX}-`);
}

function formatTimeRange(start: string, stop: string, allDay: boolean): string {
  if (allDay) {
    return 'Hele dagen';
  }

  const startDate = new Date(start);
  const stopDate = new Date(stop);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(stopDate.getTime())) {
    return 'Ukjent tidspunkt';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return `${startDate.toLocaleTimeString('nb-NO', formatOptions)}-${stopDate.toLocaleTimeString('nb-NO', formatOptions)}`;
}

export function mapAvailabilityDtoToAssignmentCardModel(dto: AvailabilityDto): Assignment {
  const startDate = new Date(dto.start);

  return {
    id: buildAvailabilityCardId(dto.start),
    title: 'Tannlegetime',
    shortDescription: dto.absenceWithoutGoingHome ? 'Fravaer uten hjemreise.' : 'Privat avtale.',
    time: formatTimeRange(dto.start, dto.stop, dto.allDay),
    duration: Math.max(
      0,
      Math.round((new Date(dto.stop).getTime() - new Date(dto.start).getTime()) / (1000 * 60)),
    ),
    address: 'Tannlege',
    phoneNumber: 'Ikke oppgitt',
    status: 'absence',
    date: Number.isNaN(startDate.getTime()) ? '' : startDate.toISOString().slice(0, 10),
    locationPoint: dto.locationPoint,
    isAvailability: true,
  };
}
