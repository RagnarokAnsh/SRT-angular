import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import type { Country, District, State } from '../models/location';
import { LocationApi } from './location-api';

/**
 * Location lists rarely change, so each one is fetched once per session and shared by every
 * form and list that needs it (a failed request is retried next time).
 */
@Injectable({ providedIn: 'root' })
export class LocationCache {
  private readonly api = inject(LocationApi);
  private readonly cache = new Map<string, Observable<unknown>>();

  countries(): Observable<Country[]> {
    return this.cached('countries', () => this.api.countries());
  }

  states(countryId: number): Observable<State[]> {
    return this.cached(`states:${countryId}`, () => this.api.states(countryId));
  }

  districts(stateId: number): Observable<District[]> {
    return this.cached(`districts:${stateId}`, () => this.api.districts(stateId));
  }

  projects(districtId: number): Observable<string[]> {
    return this.cached(`projects:${districtId}`, () => this.api.projects(districtId));
  }

  sectors(districtId: number, project: string): Observable<string[]> {
    return this.cached(`sectors:${districtId}:${project}`, () =>
      this.api.sectors(districtId, project),
    );
  }

  clear(): void {
    this.cache.clear();
  }

  private cached<T>(key: string, load: () => Observable<T>): Observable<T> {
    let request = this.cache.get(key) as Observable<T> | undefined;
    if (!request) {
      request = load().pipe(
        catchError((error: unknown) => {
          this.cache.delete(key);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(key, request);
    }
    return request;
  }
}
