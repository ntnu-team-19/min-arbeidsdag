import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildRouteSegmentId, MapStop } from '../../shared/components/map/map.models';
import { OSRM_BASE_URL, RoutingService } from './routing.service';

describe('RoutingService', () => {
  let service: RoutingService;
  let httpTestingController: HttpTestingController;

  const mockStops: MapStop[] = [
    {
      id: 'start',
      kind: 'start',
      label: 'Start',
      location: { lat: 63.4305, lon: 10.3951 },
    },
    {
      id: 'assignment-1',
      kind: 'assignment',
      label: 'Oppdrag 1',
      assignmentId: '1',
      sequenceNumber: 1,
      location: { lat: 63.4365, lon: 10.4512 },
    },
    {
      id: 'end',
      kind: 'end',
      label: 'Slutt',
      location: { lat: 63.4305, lon: 10.3951 },
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoutingService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: OSRM_BASE_URL,
          useValue: 'https://osrm.test',
        },
      ],
    });

    service = TestBed.inject(RoutingService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should build an OSRM request in stop order and map segment geometries', async () => {
    const routePromise = firstValueFrom(service.getRouteSegments(mockStops));

    const request = httpTestingController.expectOne(
      'https://osrm.test/route/v1/driving/10.3951,63.4305;10.4512,63.4365;10.3951,63.4305?overview=full&geometries=geojson&steps=true',
    );

    request.flush({
      code: 'Ok',
      routes: [
        {
          legs: [
            {
              duration: 896,
              steps: [
                {
                  geometry: {
                    coordinates: [
                      [10.3951, 63.4305],
                      [10.421, 63.432],
                      [10.4512, 63.4365],
                    ],
                  },
                },
              ],
            },
            {
              duration: 741,
              steps: [
                {
                  geometry: {
                    coordinates: [
                      [10.4512, 63.4365],
                      [10.428, 63.433],
                      [10.3951, 63.4305],
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    await expect(routePromise).resolves.toEqual([
      {
        id: buildRouteSegmentId('start', 'assignment-1'),
        fromStopId: 'start',
        toStopId: 'assignment-1',
        durationMinutes: 15,
        coordinates: [
          [10.3951, 63.4305],
          [10.421, 63.432],
          [10.4512, 63.4365],
        ],
      },
      {
        id: buildRouteSegmentId('assignment-1', 'end'),
        fromStopId: 'assignment-1',
        toStopId: 'end',
        durationMinutes: 12,
        coordinates: [
          [10.4512, 63.4365],
          [10.428, 63.433],
          [10.3951, 63.4305],
        ],
      },
    ]);
  });

  it('should skip invalid stops before calling OSRM', async () => {
    const routePromise = firstValueFrom(
      service.getRouteSegments([
        mockStops[0],
        {
          id: 'missing-location',
          kind: 'assignment',
          label: 'Uten koordinater',
          assignmentId: '2',
          sequenceNumber: 2,
        },
        mockStops[2],
      ]),
    );

    const request = httpTestingController.expectOne(
      'https://osrm.test/route/v1/driving/10.3951,63.4305;10.3951,63.4305?overview=full&geometries=geojson&steps=true',
    );

    request.flush({
      code: 'Ok',
      routes: [
        {
          legs: [
            {
              steps: [
                {
                  geometry: {
                    coordinates: [
                      [10.3951, 63.4305],
                      [10.4, 63.431],
                      [10.3951, 63.4305],
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    await expect(routePromise).resolves.toEqual([
      {
        id: buildRouteSegmentId('start', 'end'),
        fromStopId: 'start',
        toStopId: 'end',
        coordinates: [
          [10.3951, 63.4305],
          [10.4, 63.431],
          [10.3951, 63.4305],
        ],
      },
    ]);
  });

  it('should return an empty route when OSRM returns malformed data', async () => {
    const routePromise = firstValueFrom(service.getRouteSegments(mockStops));

    const request = httpTestingController.expectOne(
      'https://osrm.test/route/v1/driving/10.3951,63.4305;10.4512,63.4365;10.3951,63.4305?overview=full&geometries=geojson&steps=true',
    );

    request.flush({
      code: 'InvalidQuery',
    });

    await expect(routePromise).resolves.toEqual([]);
  });

  it('should return an empty route when the request fails', async () => {
    const routePromise = firstValueFrom(service.getRouteSegments(mockStops));

    const request = httpTestingController.expectOne(
      'https://osrm.test/route/v1/driving/10.3951,63.4305;10.4512,63.4365;10.3951,63.4305?overview=full&geometries=geojson&steps=true',
    );

    request.error(new ProgressEvent('Network error'));

    await expect(routePromise).resolves.toEqual([]);
  });
});
