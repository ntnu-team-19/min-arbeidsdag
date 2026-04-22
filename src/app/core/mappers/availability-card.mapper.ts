import { AvailabilityDto } from '../models/availability.dto';
import { Assignment } from '../models/assignment-card.model';

const AVAILABILITY_CARD_ID_PREFIX = 'availability';

export interface AvailabilityCardFormattingOptions {
  locale?: string;
  allDayLabel?: string;
  unknownTimeLabel?: string;
}

export function buildAvailabilityCardId(dateTime: string): string {
  return `${AVAILABILITY_CARD_ID_PREFIX}-${dateTime}`;
}

export function isAvailabilityCardId(cardId: string): boolean {
  return cardId.startsWith(`${AVAILABILITY_CARD_ID_PREFIX}-`);
}

function formatTimeRange(
  start: string,
  stop: string,
  allDay: boolean,
  options?: AvailabilityCardFormattingOptions,
): string {
  if (allDay) {
    return options?.allDayLabel ?? 'All day';
  }

  const startDate = new Date(start);
  const stopDate = new Date(stop);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(stopDate.getTime())) {
    return options?.unknownTimeLabel ?? 'Unknown time';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return `${startDate.toLocaleTimeString(options?.locale, formatOptions)}-${stopDate.toLocaleTimeString(options?.locale, formatOptions)}`;
}

export function mapAvailabilityDtoToAssignmentCardModel(
  dto: AvailabilityDto,
  options?: AvailabilityCardFormattingOptions,
): Assignment {
  const startDate = new Date(dto.start);

  return {
    id: buildAvailabilityCardId(dto.start),
    title: dto.title,
    shortDescription: dto.shortDescription,
    time: formatTimeRange(dto.start, dto.stop, dto.allDay, options),
    duration: Math.max(
      0,
      Math.round((new Date(dto.stop).getTime() - new Date(dto.start).getTime()) / (1000 * 60)),
    ),
    address: dto.address,
    phoneNumber: dto.phoneNumber ?? '',
    status: 'absence',
    date: Number.isNaN(startDate.getTime()) ? '' : startDate.toISOString().slice(0, 10),
    locationPoint: dto.locationPoint,
    isAvailability: true,
  };
}
