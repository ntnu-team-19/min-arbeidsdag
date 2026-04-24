import { AvailabilityDto } from '../models/availability.dto';

function getDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function shiftDate(isoString: string, targetDate: string): string {
  return targetDate + isoString.slice(10);
}

const TODAY = getDateString(0);

export const MOCK_AVAILABILITIES: AvailabilityDto[] = [
  {
    start: shiftDate('2026-02-18T14:15:00', TODAY),
    stop: shiftDate('2026-02-18T14:45:00', TODAY),
    title: 'Tannlegetime',
    shortDescription: 'Privat avtale.',
    address: 'Tannlegeveien 5',
    phoneNumber: '',
    calculatedTraveltime: 12,
    available: false,
    allDay: false,
    absenceWithoutGoingHome: false,
    locationPoint: { x: 10.4042, y: 63.4239 },
  },
];
