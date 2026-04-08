import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  buildRouteSegmentId,
  MapRouteCoordinate,
  MapRouteSegment,
  MapStop,
} from '../../shared/components/map/map.models';

interface OsrmStep {
  geometry?: {
    coordinates?: number[][];
  };
}

interface OsrmLeg {
  steps?: OsrmStep[];
}

interface OsrmRouteResponse {
  code?: string;
  routes?: {
    legs?: OsrmLeg[];
  }[];
}

export const OSRM_BASE_URL = new InjectionToken<string>('OSRM_BASE_URL', {
  providedIn: 'root',
  factory: () => 'https://router.project-osrm.org',
});

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  private readonly http = inject(HttpClient);
  private readonly osrmBaseUrl = inject(OSRM_BASE_URL);

  getRouteSegments(stops: MapStop[]): Observable<MapRouteSegment[]> {
    const validStops = stops.filter((stop) => this.hasValidCoordinates(stop));

    if (validStops.length < 2) {
      return of([]);
    }

    const coordinates = validStops
      .map((stop) => `${stop.location!.lon},${stop.location!.lat}`)
      .join(';');

    const params = new HttpParams({
      fromObject: {
        overview: 'full',
        geometries: 'geojson',
        steps: 'true',
      },
    });

    return this.http
      .get<OsrmRouteResponse>(
        `${this.osrmBaseUrl.replace(/\/$/, '')}/route/v1/driving/${coordinates}`,
        {
          params,
        },
      )
      .pipe(
        map((response) => this.mapResponseToSegments(response, validStops)),
        catchError(() => of([])),
      );
  }

  private mapResponseToSegments(response: OsrmRouteResponse, stops: MapStop[]): MapRouteSegment[] {
    if (response.code !== 'Ok') {
      return [];
    }

    const legs = response.routes?.[0]?.legs;
    if (!legs?.length) {
      return [];
    }

    return legs
      .slice(0, Math.max(0, stops.length - 1))
      .map((leg, index) => {
        const fromStop = stops[index];
        const toStop = stops[index + 1];
        const coordinates = this.getLegCoordinates(leg);

        if (!fromStop || !toStop || coordinates.length < 2) {
          return undefined;
        }

        return {
          id: buildRouteSegmentId(fromStop.id, toStop.id),
          fromStopId: fromStop.id,
          toStopId: toStop.id,
          coordinates,
        };
      })
      .filter((segment): segment is MapRouteSegment => segment !== undefined);
  }

  private getLegCoordinates(leg: OsrmLeg): MapRouteCoordinate[] {
    const coordinates: MapRouteCoordinate[] = [];

    for (const step of leg.steps ?? []) {
      const stepCoordinates = step.geometry?.coordinates ?? [];

      for (const coordinate of stepCoordinates) {
        const [lon, lat] = coordinate;
        if (typeof lon !== 'number' || typeof lat !== 'number') {
          continue;
        }

        const nextCoordinate: MapRouteCoordinate = [lon, lat];
        const lastCoordinate = coordinates[coordinates.length - 1];

        if (!lastCoordinate || lastCoordinate[0] !== lon || lastCoordinate[1] !== lat) {
          coordinates.push(nextCoordinate);
        }
      }
    }

    return coordinates;
  }

  private hasValidCoordinates(stop: MapStop): stop is MapStop & {
    location: { lat: number; lon: number };
  } {
    const lat = stop.location?.lat;
    const lon = stop.location?.lon;

    return (
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      typeof lon === 'number' &&
      Number.isFinite(lon) &&
      lon >= -180 &&
      lon <= 180
    );
  }
}
