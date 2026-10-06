import { Injectable, computed, signal } from '@angular/core';

import { type RoleName, toRoleName } from '../models/role';
import type { ApiUser } from '../models/user';
import { isTokenUsable, jwtExpiry } from './jwt';
import { ROLE_PRIORITY } from './roles';

/** Same keys as the previous version, so signed-in users stay signed in after an update. */
export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';
/** The old app also mirrored the session here; it is cleaned up on start. */
const LEGACY_STATE_KEY = 'appState';

function storages(): Storage[] {
  const result: Storage[] = [];
  try {
    result.push(localStorage);
  } catch {
    /* storage unavailable (private mode, blocked cookies) */
  }
  try {
    result.push(sessionStorage);
  } catch {
    /* storage unavailable */
  }
  return result;
}

function isUser(value: unknown): value is ApiUser {
  const user = value as ApiUser | null;
  return !!user && typeof user.id === 'number' && Array.isArray(user.roles);
}

/** The signed-in user and token, as signals. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<ApiUser | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(
    () => this.tokenSignal() !== null && this.userSignal() !== null,
  );

  readonly roles = computed<RoleName[]>(() =>
    (this.userSignal()?.roles ?? [])
      .map((role) => toRoleName(role.name))
      .filter((role): role is RoleName => role !== null),
  );

  readonly primaryRole = computed<RoleName | null>(
    () => ROLE_PRIORITY.find((role) => this.roles().includes(role)) ?? null,
  );

  /** The worker's centre (`anganwadi_id`, or the embedded centre's id). */
  readonly anganwadiId = computed<number | null>(() => {
    const user = this.userSignal();
    return user?.anganwadi_id ?? user?.anganwadi?.id ?? null;
  });

  /** When the token expires, in ms since epoch. */
  readonly expiresAt = computed<number | null>(() => {
    const token = this.tokenSignal();
    const exp = token ? jwtExpiry(token) : null;
    return exp === null ? null : exp * 1000;
  });

  constructor() {
    this.restore();
  }

  hasAnyRole(...roles: RoleName[]): boolean {
    return this.roles().some((role) => roles.includes(role));
  }

  /** Stores a new session; `remember` keeps it after the browser closes. */
  start(token: string, user: ApiUser, remember = true): void {
    this.clearStorage();
    const target = storages()[remember ? 0 : 1] ?? storages()[0];
    try {
      target?.setItem(TOKEN_KEY, token);
      target?.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* the session still works for this page view */
    }
    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  clear(): void {
    this.clearStorage();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  /** Re-reads storage, e.g. after another tab logged in or out. */
  restore(): void {
    let token: string | null = null;
    let user: ApiUser | null = null;
    for (const storage of storages()) {
      try {
        storage.removeItem(LEGACY_STATE_KEY);
        const storedToken = storage.getItem(TOKEN_KEY);
        const storedUser = storage.getItem(USER_KEY);
        if (!storedToken || !storedUser) continue;
        const parsed: unknown = JSON.parse(storedUser);
        if (isTokenUsable(storedToken) && isUser(parsed)) {
          token = storedToken;
          user = parsed;
          break;
        }
      } catch {
        /* unreadable entry: ignore */
      }
    }
    if (!token || !user) this.clearStorage();
    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  private clearStorage(): void {
    for (const storage of storages()) {
      try {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
      } catch {
        /* ignore */
      }
    }
  }
}
