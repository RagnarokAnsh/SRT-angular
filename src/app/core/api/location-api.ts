import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { Country, District, State } from '../models/location';
import { API_BASE_URL } from './api-base-url';
import { toNameList, unwrapList } from './parse';

@Injectable({ providedIn: 'root' })
export class LocationApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  countries(): Observable<Country[]> {
    return this.http.get<unknown>(`${this.base}/countries`).pipe(map((b) => unwrapList<Country>(b)));
  }

  states(countryId: number): Observable<State[]> {
    return this.http
      .get<unknown>(`${this.base}/states/${countryId}`)
      .pipe(map((b) => unwrapList<State>(b)));
  }

  districts(stateId: number): Observable<District[]> {
    return this.http
      .get<unknown>(`${this.base}/districts/${stateId}`)
      .pipe(map((b) => unwrapList<District>(b)));
  }

  /** GET /projects/{districtId} — project names (strings, or objects with a name). */
  projects(districtId: number): Observable<string[]> {
    return this.http
      .get<unknown>(`${this.base}/projects/${districtId}`)
      .pipe(map((b) => toNameList(b, ['name', 'project'])));
  }

  /** GET /sectors/{districtId}/{project} — sector names. */
  sectors(districtId: number, project: string): Observable<string[]> {
    return this.http
      .get<unknown>(`${this.base}/sectors/${districtId}/${encodeURIComponent(project)}`)
      .pipe(map((b) => toNameList(b, ['name', 'sector'])));
  }
}
