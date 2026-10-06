import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ApiChild, Child, ChildInput } from '../models/child';
import { type IsoDate, ageOn, normalizeIsoDate, toIsoDate } from '../util/dates';
import { API_BASE_URL } from './api-base-url';
import { toNumberOrNull, unwrapItem, unwrapList } from './parse';

export function toChild(api: ApiChild): Child {
  return {
    id: api.id,
    name: (api.name ?? '').trim(),
    dateOfBirth: normalizeIsoDate(api.date_of_birth),
    symbol: api.symbol ?? '',
    heightCm: toNumberOrNull(api.height_cm),
    weightKg: toNumberOrNull(api.weight_kg),
    language: api.language ?? '',
    anganwadiId: api.anganwadi_id ?? null,
    centerName: api.anganwadi?.name ?? null,
    gender: api.gender ?? '',
    awwId: api.aww_id ?? null,
  };
}

/** Request body for POST/PUT /children — same fields and formats the backend already accepts. */
export function toChildPayload(
  input: ChildInput,
  options: { id?: number; awwId?: number | null; today?: IsoDate } = {},
): Record<string, unknown> {
  const today = options.today ?? toIsoDate();
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    gender: input.gender,
    date_of_birth: input.dateOfBirth,
    symbol: input.symbol.trim(),
    height_cm: String(input.heightCm),
    weight_kg: String(input.weightKg),
    language: input.language.trim(),
    anganwadi_id: input.anganwadiId,
    age: ageOn(input.dateOfBirth, today)?.years ?? 0,
  };
  if (options.id) payload['id'] = options.id;
  if (options.awwId) payload['aww_id'] = options.awwId;
  return payload;
}

@Injectable({ providedIn: 'root' })
export class ChildApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** GET /children. Note: the API returns children from every centre. */
  list(): Observable<Child[]> {
    return this.http
      .get<unknown>(`${this.base}/children`)
      .pipe(map((body) => unwrapList<ApiChild>(body).map(toChild)));
  }

  /** The children of one centre. Filtered here because the API does not filter (see AUDIT C2). */
  listForCenter(anganwadiId: number): Observable<Child[]> {
    return this.list().pipe(
      map((children) => children.filter((c) => c.anganwadiId === anganwadiId)),
    );
  }

  get(id: number): Observable<Child> {
    return this.http
      .get<unknown>(`${this.base}/children/${id}`)
      .pipe(map((body) => toChild(unwrapItem<ApiChild>(body))));
  }

  create(input: ChildInput, awwId: number | null): Observable<Child> {
    return this.http
      .post<unknown>(`${this.base}/children`, toChildPayload(input, { awwId }))
      .pipe(map((body) => toChild(unwrapItem<ApiChild>(body))));
  }

  update(id: number, input: ChildInput, awwId: number | null): Observable<Child> {
    return this.http
      .put<unknown>(`${this.base}/children/${id}`, toChildPayload(input, { id, awwId }))
      .pipe(map((body) => toChild(unwrapItem<ApiChild>(body))));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/children/${id}`).pipe(map(() => undefined));
  }
}
