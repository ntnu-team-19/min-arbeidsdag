import { TechLocationDto } from '../models/tech-location.dto';
import { MapLocation } from '../../shared/components/map/map.models';
import { TechnicianLocation, TechnicianLocationRole } from '../models/tech-location.model';

export const DEFAULT_TECHNICIAN_BASE: MapLocation = {
  lat: 63.4305,
  lon: 10.3951,
};

interface MockTechnicianLocation extends TechLocationDto {
  fieldTechId: number;
  role: TechnicianLocationRole;
  label: string;
}

export const MOCK_TECHNICIAN_LOCATIONS: MockTechnicianLocation[] = [
  {
    fieldTechId: 392841,
    role: 'start',
    label: 'Hjem',
    locationPoint: {
      x: 10.35346,
      y: 63.35514,
      srid: 0,
    },
    startTime: '2026-03-20T00:00:00',
    stopTime: '2026-03-20T11:30:00',
    isAllDay: false,
    isTemporary: false,
  },
  {
    fieldTechId: 392841,
    role: 'start',
    label: 'Midlertidig adresse',
    locationPoint: {
      x: 10.36011,
      y: 63.36789,
      srid: 0,
    },
    startTime: '2026-03-20T11:30:00',
    stopTime: '2026-03-20T18:00:00',
    isAllDay: false,
    isTemporary: true,
  },
  {
    fieldTechId: 40231,
    role: 'start',
    label: 'Hjem',
    locationPoint: {
      x: 10.3951,
      y: 63.4305,
      srid: 0,
    },
    startTime: '2026-03-20T00:00:00',
    stopTime: null,
    isAllDay: true,
    isTemporary: false,
  },
];

function toTimestamp(dateString: string | null | undefined): number {
  if (!dateString) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function toMapLocation(point: TechLocationDto['locationPoint']): MapLocation {
  return {
    lat: point.y,
    lon: point.x,
  };
}

function isLocationActive(location: MockTechnicianLocation, referenceTimestamp: number): boolean {
  if (location.isAllDay) {
    return true;
  }

  const startTimestamp = toTimestamp(location.startTime);
  const stopTimestamp = location.stopTime ? toTimestamp(location.stopTime) : Number.POSITIVE_INFINITY;

  return referenceTimestamp >= startTimestamp && referenceTimestamp < stopTimestamp;
}

function selectLocation(
  locations: MockTechnicianLocation[],
  referenceTimestamp: number,
  role: TechnicianLocationRole,
): MockTechnicianLocation | undefined {
  const roleLocations = locations.filter((location) => location.role === role);
  if (roleLocations.length === 0) {
    return undefined;
  }

  const activeLocations = roleLocations.filter((location) => isLocationActive(location, referenceTimestamp));
  if (activeLocations.length > 0) {
    return activeLocations.sort((a, b) => {
      if (a.isTemporary !== b.isTemporary) {
        return a.isTemporary ? -1 : 1;
      }

      return toTimestamp(b.startTime) - toTimestamp(a.startTime);
    })[0];
  }

  return roleLocations[0];
}

function toTechnicianLocation(location: MockTechnicianLocation): TechnicianLocation {
  return {
    fieldTechId: location.fieldTechId,
    role: location.role,
    label: location.label,
    location: toMapLocation(location.locationPoint),
    startTime: location.startTime,
    stopTime: location.stopTime,
    isAllDay: location.isAllDay,
    isTemporary: location.isTemporary,
  };
}

export function getTechnicianDayLocations(
  fieldTechId: number | undefined,
  referenceDateTime: string | null | undefined,
): TechnicianLocation[] {
  if (fieldTechId == null) {
    return [
      {
        fieldTechId: 0,
        role: 'start',
        label: 'Hjem',
        location: DEFAULT_TECHNICIAN_BASE,
        startTime: null,
        stopTime: null,
        isAllDay: true,
        isTemporary: false,
      },
    ];
  }

  const technicianLocations = MOCK_TECHNICIAN_LOCATIONS.filter(
    (location) => location.fieldTechId === fieldTechId,
  );

  if (technicianLocations.length === 0) {
    return [
      {
        fieldTechId,
        role: 'start',
        label: 'Hjem',
        location: DEFAULT_TECHNICIAN_BASE,
        startTime: null,
        stopTime: null,
        isAllDay: true,
        isTemporary: false,
      },
    ];
  }

  const referenceTimestamp = toTimestamp(referenceDateTime);
  const startLocation = selectLocation(technicianLocations, referenceTimestamp, 'start');
  const endLocation = selectLocation(technicianLocations, referenceTimestamp, 'end');

  const resolvedLocations = [startLocation, endLocation].filter(Boolean).map((location) =>
    toTechnicianLocation(location!),
  );

  if (resolvedLocations.length > 0) {
    return resolvedLocations;
  }

  return [
    {
      fieldTechId,
      role: 'start',
      label: 'Hjem',
      location: DEFAULT_TECHNICIAN_BASE,
      startTime: null,
      stopTime: null,
      isAllDay: true,
      isTemporary: false,
    },
  ];
}

export function getTechnicianBase(fieldTechId: number | undefined): MapLocation {
  return getTechnicianDayLocations(fieldTechId, null)[0]?.location ?? DEFAULT_TECHNICIAN_BASE;
}
