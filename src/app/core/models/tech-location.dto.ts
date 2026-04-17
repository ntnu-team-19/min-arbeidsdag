export interface TechLocationPointDto {
  x: number;
  y: number;
  srid: number;
}

export interface TechLocationDto {
  locationPoint: TechLocationPointDto;
  startTime: string | null;
  stopTime: string | null;
  isAllDay: boolean;
  isTemporary: boolean;
}
