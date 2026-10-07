import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';

import { AuthApi } from '../api/auth-api';
import { CompetencyApi } from '../api/competency-api';
import { LocationCache } from '../api/location-cache';
import { normalizeUser } from '../api/user-api';
import type { ApiUser, LoginResponse } from '../models/user';
import { clockSkewMs, isTokenUsable } from './jwt';
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

/**
 * The user from a login response (checked the same way as a stored one); falls back to the
 * top-level `roles` list when the user has none. Null when the user is unusable.
 */
export function userFromLogin(response: LoginResponse): ApiUser | null {
  const user = normalizeUser(response.user);
  if (!user || user.roles.length > 0) return user;
  const names = (Array.isArray(response.roles) ? response.roles : []).filter(
    (name): name is string => typeof name === 'string',
  );
  return { ...user, roles: names.map((name, index) => ({ id: index + 1, name })) };
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
        const token = typeof response?.token === 'string' ? response.token : null;
        // Expiry is judged by the server's clock (the token's `iat`), not the phone's.
        const skew = token ? clockSkewMs(token) : 0;
        const user = response?.user ? userFromLogin(response) : null;
        if (!token || !user || !isTokenUsable(token, Date.now(), skew)) {
          throw new InvalidLoginResponseError();
        }
        this.session.start(token, user, remember, skew);
        return user;
      }),
    );
  }

  /**
   * Clears the session and goes to the login page (SPA navigation, no page reload).
   * `elsewhere`: the session already ended in another tab, which looks after storage.
   */
  logout(reason: LogoutReason = 'manual', options: { elsewhere?: boolean } = {}): Promise<boolean> {
    const wasSignedIn = this.session.isAuthenticated();
    const previousUserId = this.session.user()?.id ?? null;
    const currentUrl = this.router.url;
    this.session.clear({ storage: !options.elsewhere });
    // Nothing fetched for the previous user stays in memory for the next one.
    this.competencies.clearCache();
    this.locations.clear();
    if (!wasSignedIn && reason !== 'manual') return Promise.resolve(false);
    const queryParams: Record<string, string> = {};
    if (reason !== 'manual') {
      queryParams['reason'] = reason;
      const returnUrl = safeReturnUrl(currentUrl);
      if (returnUrl) queryParams['returnUrl'] = returnUrl;
      // Only the same person signing in again goes back there (see navigateAfterLogin).
      if (returnUrl && previousUserId !== null) queryParams['uid'] = String(previousUserId);
    }
    return this.router.navigate(['/login'], { queryParams });
  }

  /** Home page for the signed-in user's highest role. */
  homeUrl(): string {
    const role = this.session.primaryRole();
    return role ? ROLE_HOME[role] : '/home';
  }

  /**
   * After login: the requested page if it is a safe in-app path, otherwise home. A page left
   * behind by someone else's expired session (`uid` of another user) is ignored.
   */
  navigateAfterLogin(returnUrl: unknown, uid?: unknown): Promise<boolean> {
    const sameUser =
      uid === undefined ||
      uid === null ||
      uid === '' ||
      String(uid) === String(this.session.user()?.id);
    const target = sameUser ? safeReturnUrl(returnUrl) : null;
    return this.router.navigateByUrl(target ?? this.homeUrl(), { replaceUrl: true });
  }
}
