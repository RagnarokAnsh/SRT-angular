import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { LoginResponse } from '../models/user';
import { API_BASE_URL } from './api-base-url';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** POST /login with `{ email, password }`. */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, { email, password });
  }

  /** Path used to recognise the login call (its 401 means bad credentials, not expiry). */
  isLoginRequest(url: string): boolean {
    return url === `${this.base}/login`;
  }
}
