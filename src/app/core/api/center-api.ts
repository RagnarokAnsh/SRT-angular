import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ApiCenter, CenterInput } from '../models/center';
import { API_BASE_URL } from './api-base-url';
import { unwrapItem, unwrapList } from './parse';

@Injectable({ providedIn: 'root' })
export class CenterApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<ApiCenter[]> {
    return this.http
      .get<unknown>(`${this.base}/anganwadi-centers`)
      .pipe(map((body) => unwrapList<ApiCenter>(body)));
  }

  get(id: number): Observable<ApiCenter> {
    return this.http
      .get<unknown>(`${this.base}/anganwadi-centers/${id}`)
      .pipe(map((body) => unwrapItem<ApiCenter>(body)));
  }

  create(input: CenterInput): Observable<ApiCenter> {
    return this.http
      .post<unknown>(`${this.base}/anganwadi-centers`, input)
      .pipe(map((body) => unwrapItem<ApiCenter>(body)));
  }

  update(id: number, input: CenterInput): Observable<ApiCenter> {
    return this.http
      .put<unknown>(`${this.base}/anganwadi-centers/${id}`, input)
      .pipe(map((body) => unwrapItem<ApiCenter>(body)));
  }

  remove(id: number): Observable<void> {
    return this.http
      .delete<unknown>(`${this.base}/anganwadi-centers/${id}`)
      .pipe(map(() => undefined));
  }
}
