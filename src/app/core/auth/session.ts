import { Injectable, computed, signal } from '@angular/core';

import { toNumberOrNull } from '../api/parse';
import type { ApiCenter } from '../models/center';
import { type RoleName, toRoleName } from '../models/role';
import type { ApiRole, ApiUser } from '../models/user';
import { isTokenUsable, jwtExpiry } from './jwt';
import { ROLE_PRIORITY } from './roles';

/** Same keys as the previous version, so signed-in users stay signed in after an update. */
export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';
/** Server clock minus device clock (ms), measured at login. */
export const SKEW_KEY = 'srt-clock-skew';
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

export interface StoredSession {
  token: string;
  user: ApiUser;
  skew: number;
}

/** The session kept in this storage, or null when there is none or it can't be used. */
function readFrom(storage: Storage): StoredSession | null {
  const token = storage.getItem(TOKEN_KEY);
  const userJson = storage.getItem(USER_KEY);
  if (!token || !userJson) return null;
  const storedSkew = Number(storage.getItem(SKEW_KEY) ?? 0);
  const skew = Number.isFinite(storedSkew) ? storedSkew : 0;
  let user: ApiUser | null;
  try {
    user = normalizeUser(JSON.parse(userJson));
  } catch {
    return null;
  }
  return user && isTokenUsable(token, Date.now(), skew) ? { token, user, skew } : null;
}

function removeSession(storage: Storage): void {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(SKEW_KEY);
}

/**
 * A user from the API or from storage, made safe to use: ids as numbers (some PHP setups send
 * them as strings), roles as `{ id, name }` (some send plain names), and the centre id taken
 * from the embedded centre when `anganwadi_id` is missing. Null when there is no usable id.
 */
export function normalizeUser(value: unknown): ApiUser | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = toNumberOrNull(raw['id']);
  if (id === null || !Number.isInteger(id) || id <= 0) return null;
  const roles = (Array.isArray(raw['roles']) ? (raw['roles'] as unknown[]) : [])
    .map((role, index): ApiRole | null => {
      if (typeof role === 'string') return { id: index + 1, name: role };
      const name = (role as { name?: unknown } | null)?.name;
      return typeof name === 'string' ? { ...(role as ApiRole), name } : null;
    })
    .filter((role): role is ApiRole => role !== null);
  const anganwadi =
    raw['anganwadi'] && typeof raw['anganwadi'] === 'object'
      ? (raw['anganwadi'] as ApiCenter)
      : null;
  return {
    ...(raw as unknown as ApiUser),
    id,
    name: typeof raw['name'] === 'string' ? raw['name'] : '',
    email: typeof raw['email'] === 'string' ? raw['email'] : '',
    roles,
    country_id: toNumberOrNull(raw['country_id']),
    state_id: toNumberOrNull(raw['state_id']),
    district_id: toNumberOrNull(raw['district_id']),
    anganwadi_id: toNumberOrNull(raw['anganwadi_id']) ?? toNumberOrNull(anganwadi?.id),
    anganwadi,
  };
}

/** The signed-in user and token, as signals. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<ApiUser | null>(null);
  private readonly skewSignal = signal(0);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  /** Server clock minus device clock (ms). */
  readonly clockSkew = this.skewSignal.asReadonly();
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
    return toNumberOrNull(user?.anganwadi_id) ?? toNumberOrNull(user?.anganwadi?.id);
  });

  /** When the token expires, in ms since epoch by this device's clock. */
  readonly expiresAt = computed<number | null>(() => {
    const token = this.tokenSignal();
    const exp = token ? jwtExpiry(token) : null;
    return exp === null ? null : exp * 1000 - this.skewSignal();
  });

  constructor() {
    this.restore();
  }

  hasAnyRole(...roles: RoleName[]): boolean {
    return this.roles().some((role) => roles.includes(role));
  }

  /** Stores a new session; `remember` keeps it after the browser closes. */
  start(token: string, user: ApiUser, remember = true, skewMs = 0): void {
    for (const storage of storages()) {
      try {
        removeSession(storage);
      } catch {
        /* ignore */
      }
    }
    const target = storages()[remember ? 0 : 1] ?? storages()[0];
    try {
      // The token last: another tab that sees it finds the user already there.
      target?.setItem(USER_KEY, JSON.stringify(user));
      target?.setItem(SKEW_KEY, String(Math.round(skewMs)));
      target?.setItem(TOKEN_KEY, token);
    } catch {
      /* the session still works for this page view */
    }
    this.skewSignal.set(skewMs);
    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  /**
   * Ends the session in this tab. Storage is cleared only while it still holds this tab's
   * token: another tab may have signed in since. `storage: false` leaves storage alone (the
   * session already ended in another tab).
   */
  clear(options: { storage?: boolean } = {}): void {
    const token = this.tokenSignal();
    if ((options.storage ?? true) && token) {
      for (const storage of storages()) {
        try {
          if (storage.getItem(TOKEN_KEY) === token) removeSession(storage);
        } catch {
          /* ignore */
        }
      }
    }
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.skewSignal.set(0);
  }

  /** The usable session in storage, if any, without changing anything. */
  readStored(): StoredSession | null {
    for (const storage of storages()) {
      try {
        const found = readFrom(storage);
        if (found) return found;
      } catch {
        /* unreadable storage: ignore */
      }
    }
    return null;
  }

  /**
   * Re-reads storage (on start, or after another tab signed in or out). Only the start-up read
   * cleans up expired or broken leftovers: reacting to another tab must never delete that
   * tab's new session, which can be half-written at that moment.
   */
  restore(options: { cleanUp?: boolean } = {}): void {
    if (options.cleanUp ?? true) {
      for (const storage of storages()) {
        try {
          storage.removeItem(LEGACY_STATE_KEY);
          if (!readFrom(storage)) removeSession(storage);
        } catch {
          /* ignore */
        }
      }
    }
    const found = this.readStored();
    this.skewSignal.set(found?.skew ?? 0);
    this.tokenSignal.set(found?.token ?? null);
    this.userSignal.set(found?.user ?? null);
  }
}
