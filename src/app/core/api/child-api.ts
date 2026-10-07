import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ApiChild, Child, ChildInput } from '../models/child';
import { type IsoDate, ageOn, normalizeIsoDate, toIsoDate } from '../util/dates';
import { API_BASE_URL } from './api-base-url';
import {
  UnexpectedResponseError,
  expectSuccess,
  text,
  toId,
  toMeasure,
  unwrapItem,
  unwrapList,
} from './parse';

/**
 * A child from the API, with ids as numbers (some PHP setups send strings) and text trimmed.
 * Null without a usable id: such a record can't be opened or matched to its results.
 */
export function toChild(value: unknown): Child | null {
  if (!value || typeof value !== 'object') return null;
  const api = value as Partial<Record<keyof ApiChild, unknown>>;
  const id = toId(api.id);
  if (id === null) return null;
  const center =
    api.anganwadi && typeof api.anganwadi === 'object'
      ? (api.anganwadi as Record<string, unknown>)
      : null;
  return {
    id,
    name: text(api.name),
    dateOfBirth: normalizeIsoDate(api.date_of_birth),
    symbol: text(api.symbol),
    heightCm: toMeasure(api.height_cm),
    weightKg: toMeasure(api.weight_kg),
    language: text(api.language),
    anganwadiId: toId(api.anganwadi_id) ?? toId(center?.['id']),
    centerName: text(center?.['name']) || null,
    gender: text(api.gender),
    awwId: toId(api.aww_id),
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
    return this.http.get<unknown>(`${this.base}/children`).pipe(
      map((body) =>
        unwrapList<unknown>(body)
          .map(toChild)
          .filter((child): child is Child => child !== null),
      ),
    );
  }

  /** The children of one centre. Filtered here because the API does not filter (see AUDIT C2). */
  listForCenter(anganwadiId: number): Observable<Child[]> {
    return this.list().pipe(
      map((children) => children.filter((c) => c.anganwadiId === anganwadiId)),
    );
  }

  get(id: number): Observable<Child> {
    return this.http.get<unknown>(`${this.base}/children/${id}`).pipe(
      map((body) => {
        const child = toChild(unwrapItem<unknown>(body));
        if (!child) throw new UnexpectedResponseError();
        return child;
      }),
    );
  }

  /** The answer is not used: an empty one (as some backends send) must not look like a failure. */
  create(input: ChildInput, awwId: number | null): Observable<void> {
    return this.http
      .post<unknown>(`${this.base}/children`, toChildPayload(input, { awwId }))
      .pipe(map(expectSuccess));
  }

  update(id: number, input: ChildInput, awwId: number | null): Observable<void> {
    return this.http
      .put<unknown>(`${this.base}/children/${id}`, toChildPayload(input, { id, awwId }))
      .pipe(map(expectSuccess));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/children/${id}`).pipe(map(expectSuccess));
  }
}
