import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { Country, District, State } from '../models/location';
import { API_BASE_URL } from './api-base-url';
import { text, toId, toNameList, unwrapList } from './parse';

/**
 * Countries, states or districts with ids as numbers and names trimmed; entries without an id
 * are dropped. `parentKey` fills in the parent id when the API leaves it out.
 */
function toPlaces<T extends { id: number; name: string }>(
  body: unknown,
  parentKey?: 'country_id' | 'state_id',
  parentId?: number,
): T[] {
  return unwrapList<unknown>(body).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    const id = toId(raw['id']);
    if (id === null) return [];
    const place: Record<string, unknown> = { ...raw, id, name: text(raw['name']) };
    if (parentKey) place[parentKey] = toId(raw[parentKey]) ?? parentId;
    return [place as T];
  });
}

@Injectable({ providedIn: 'root' })
export class LocationApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  countries(): Observable<Country[]> {
    return this.http.get<unknown>(`${this.base}/countries`).pipe(map((b) => toPlaces(b)));
  }

  states(countryId: number): Observable<State[]> {
    return this.http
      .get<unknown>(`${this.base}/states/${countryId}`)
      .pipe(map((b) => toPlaces(b, 'country_id', countryId)));
  }

  districts(stateId: number): Observable<District[]> {
    return this.http
      .get<unknown>(`${this.base}/districts/${stateId}`)
      .pipe(map((b) => toPlaces(b, 'state_id', stateId)));
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
