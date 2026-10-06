import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';

import { AuthApi } from '../api/auth-api';
import { CompetencyApi } from '../api/competency-api';
import { LocationCache } from '../api/location-cache';
import type { ApiUser, LoginResponse } from '../models/user';
import { isTokenUsable } from './jwt';
import { safeReturnUrl } from './return-url';
import { ROLE_HOME } from './roles';
import { SessionStore } from './session';

export type LogoutReason = 'manual' | 'expired' | 'idle';

/** Thrown when /login answers 2xx but without a usable token or user. */
export class InvalidLoginResponseError extends Error {
  constructor() {
    super('The server returned an incomplete login response.');
    this.name = 'InvalidLoginResponseError';
  }
}

/** The user from a login response; falls back to the top-level `roles` list if needed. */
export function userFromLogin(response: LoginResponse): ApiUser {
  const user = response.user;
  if (Array.isArray(user.roles) && user.roles.length > 0) return user;
  const names = Array.isArray(response.roles) ? response.roles : [];
  return { ...user, roles: names.map((name, index) => ({ id: index, name })) };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly competencies = inject(CompetencyApi);
  private readonly locations = inject(LocationCache);

  login(email: string, password: string, remember = true): Observable<ApiUser> {
    return this.api.login(email.trim(), password).pipe(
      map((response) => {
        if (!response?.token || !response.user || !isTokenUsable(response.token)) {
          throw new InvalidLoginResponseError();
        }
        const user = userFromLogin(response);
        this.session.start(response.token, user, remember);
        return user;
      }),
    );
  }

  /** Clears the session and goes to the login page (SPA navigation, no page reload). */
  logout(reason: LogoutReason = 'manual'): void {
    const wasSignedIn = this.session.isAuthenticated();
    const currentUrl = this.router.url;
    this.session.clear();
    // Nothing fetched for the previous user stays in memory for the next one.
    this.competencies.clearCache();
    this.locations.clear();
    if (!wasSignedIn && reason !== 'manual') return;
    const queryParams: Record<string, string> = {};
    if (reason !== 'manual') {
      queryParams['reason'] = reason;
      const returnUrl = safeReturnUrl(currentUrl);
      if (returnUrl) queryParams['returnUrl'] = returnUrl;
    }
    void this.router.navigate(['/login'], { queryParams });
  }

  /** Home page for the signed-in user's highest role. */
  homeUrl(): string {
    const role = this.session.primaryRole();
    return role ? ROLE_HOME[role] : '/home';
  }

  /** After login: the requested page if it is a safe in-app path, otherwise home. */
  navigateAfterLogin(returnUrl: unknown): Promise<boolean> {
    return this.router.navigateByUrl(safeReturnUrl(returnUrl) ?? this.homeUrl(), { replaceUrl: true });
  }
}
