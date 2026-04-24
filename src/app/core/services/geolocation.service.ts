import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GeolocationPositionUpdate {
  kind: 'position' | 'error' | 'unsupported';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  errorCode?: GeolocationPositionError['code'];
}

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  watchPosition(options?: PositionOptions): Observable<GeolocationPositionUpdate> {
    return new Observable((observer) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        observer.next({ kind: 'unsupported' });
        observer.complete();
        return undefined;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          observer.next({
            kind: 'position',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          observer.next({
            kind: 'error',
            errorCode: error.code,
          });
        },
        options,
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    });
  }
}
