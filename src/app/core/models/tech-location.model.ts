import { MapLocation } from '../../shared/components/map/map.models';

export type TechnicianLocationRole = 'start' | 'end';

export interface TechnicianLocation {
  fieldTechId: number;
  role: TechnicianLocationRole;
  label: string;
  location: MapLocation;
  startTime: string | null;
  stopTime: string | null;
  isAllDay: boolean;
  isTemporary: boolean;
}
