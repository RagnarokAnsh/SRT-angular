import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ApiUser, UserInput } from '../models/user';
import { API_BASE_URL } from './api-base-url';
import { unwrapItem, unwrapList } from './parse';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<ApiUser[]> {
    return this.http.get<unknown>(`${this.base}/users`).pipe(map((b) => unwrapList<ApiUser>(b)));
  }

  get(id: number): Observable<ApiUser> {
    return this.http
      .get<unknown>(`${this.base}/users/${id}`)
      .pipe(map((b) => unwrapItem<ApiUser>(b)));
  }

  create(input: UserInput): Observable<ApiUser> {
    return this.http
      .post<unknown>(`${this.base}/users`, input)
      .pipe(map((b) => unwrapItem<ApiUser>(b)));
  }

  update(id: number, input: UserInput): Observable<ApiUser> {
    return this.http
      .put<unknown>(`${this.base}/users/${id}`, input)
      .pipe(map((b) => unwrapItem<ApiUser>(b)));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/users/${id}`).pipe(map(() => undefined));
  }
}
