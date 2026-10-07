import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ApiRole, ApiUser, UserInput } from '../models/user';
import { API_BASE_URL } from './api-base-url';
import { toCenter } from './center-api';
import {
  UnexpectedResponseError,
  expectSuccess,
  text,
  toId,
  unwrapItem,
  unwrapList,
} from './parse';

/**
 * A user from the API or from storage, made safe to use: ids as numbers (some PHP setups send
 * them as strings), roles as `{ id, name }` (some send plain names), and the centre id taken
 * from the embedded centre when `anganwadi_id` is missing. Null when there is no usable id.
 */
export function normalizeUser(value: unknown): ApiUser | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = toId(raw['id']);
  if (id === null) return null;
  const roles = (Array.isArray(raw['roles']) ? (raw['roles'] as unknown[]) : [])
    .map((role, index): ApiRole | null => {
      if (typeof role === 'string') return { id: index + 1, name: role };
      const name = (role as { name?: unknown } | null)?.name;
      return typeof name === 'string' ? { ...(role as ApiRole), name } : null;
    })
    .filter((role): role is ApiRole => role !== null);
  const anganwadi = toCenter(raw['anganwadi']);
  return {
    ...(raw as unknown as ApiUser),
    id,
    name: text(raw['name']),
    email: text(raw['email']),
    roles,
    country_id: toId(raw['country_id']),
    state_id: toId(raw['state_id']),
    district_id: toId(raw['district_id']),
    project: text(raw['project']) || null,
    sector: text(raw['sector']) || null,
    anganwadi_id: toId(raw['anganwadi_id']) ?? anganwadi?.id ?? null,
    anganwadi,
  };
}

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<ApiUser[]> {
    return this.http.get<unknown>(`${this.base}/users`).pipe(
      map((body) =>
        unwrapList<unknown>(body)
          .map(normalizeUser)
          .filter((user): user is ApiUser => user !== null),
      ),
    );
  }

  get(id: number): Observable<ApiUser> {
    return this.http.get<unknown>(`${this.base}/users/${id}`).pipe(
      map((body) => {
        const user = normalizeUser(unwrapItem<unknown>(body));
        if (!user) throw new UnexpectedResponseError();
        return user;
      }),
    );
  }

  create(input: UserInput): Observable<void> {
    return this.http.post<unknown>(`${this.base}/users`, input).pipe(map(expectSuccess));
  }

  update(id: number, input: UserInput): Observable<void> {
    return this.http.put<unknown>(`${this.base}/users/${id}`, input).pipe(map(expectSuccess));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/users/${id}`).pipe(map(expectSuccess));
  }
}
