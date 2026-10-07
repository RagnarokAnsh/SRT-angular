import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ApiCenter, CenterInput } from '../models/center';
import { API_BASE_URL } from './api-base-url';
import {
  UnexpectedResponseError,
  expectSuccess,
  text,
  toId,
  unwrapItem,
  unwrapList,
} from './parse';

/** A centre from the API with ids as numbers and text trimmed; null without a usable id. */
export function toCenter(value: unknown): ApiCenter | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = toId(raw['id']);
  if (id === null) return null;
  return {
    ...(raw as unknown as ApiCenter),
    id,
    name: text(raw['name']),
    code: text(raw['code']),
    project: text(raw['project']),
    sector: text(raw['sector']),
    country_id: toId(raw['country_id']) as number,
    state_id: toId(raw['state_id']) as number,
    district_id: toId(raw['district_id']) as number,
  };
}

@Injectable({ providedIn: 'root' })
export class CenterApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<ApiCenter[]> {
    return this.http.get<unknown>(`${this.base}/anganwadi-centers`).pipe(
      map((body) =>
        unwrapList<unknown>(body)
          .map(toCenter)
          .filter((center): center is ApiCenter => center !== null),
      ),
    );
  }

  get(id: number): Observable<ApiCenter> {
    return this.http.get<unknown>(`${this.base}/anganwadi-centers/${id}`).pipe(
      map((body) => {
        const center = toCenter(unwrapItem<unknown>(body));
        if (!center) throw new UnexpectedResponseError();
        return center;
      }),
    );
  }

  create(input: CenterInput): Observable<void> {
    return this.http
      .post<unknown>(`${this.base}/anganwadi-centers`, input)
      .pipe(map(expectSuccess));
  }

  update(id: number, input: CenterInput): Observable<void> {
    return this.http
      .put<unknown>(`${this.base}/anganwadi-centers/${id}`, input)
      .pipe(map(expectSuccess));
  }

  remove(id: number): Observable<void> {
    return this.http
      .delete<unknown>(`${this.base}/anganwadi-centers/${id}`)
      .pipe(map(expectSuccess));
  }
}
