import { MapLocation } from '../../shared/components/map/map.models';

export const DEFAULT_TECHNICIAN_BASE: MapLocation = {
  lat: 63.4305,
  lon: 10.3951,
};

const TECHNICIAN_BASES: Record<number, MapLocation> = {
  40231: {
    lat: 63.4305,
    lon: 10.3951,
  },
  392841: {
    lat: 63.35514,
    lon: 10.35346,
  },
};

export function getTechnicianBase(fieldTechId: number | undefined): MapLocation {
  if (fieldTechId == null) {
    return DEFAULT_TECHNICIAN_BASE;
  }

  return TECHNICIAN_BASES[fieldTechId] ?? DEFAULT_TECHNICIAN_BASE;
}
