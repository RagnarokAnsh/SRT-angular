import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, effect, inject } from '@angular/core';

import { environment } from '@env';

import { AuthService } from './auth';
import { SessionStore, TOKEN_KEY, USER_KEY } from './session';

export const IDLE_TIMEOUT_MS = new InjectionToken<number>('IDLE_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => environment.idleTimeoutMinutes * 60_000,
});

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
const IDLE_CHECK_MS = 30_000;
/** setTimeout cannot wait longer than ~24.8 days. */
const MAX_TIMEOUT_MS = 2_147_000_000;

/**
 * Ends the session when the token expires, after a period of inactivity, or when the
 * user logs out in another tab.
 */
@Injectable({ providedIn: 'root' })
export class SessionWatcher {
  private readonly session = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly idleMs = inject(IDLE_TIMEOUT_MS);
  private lastActivity = Date.now();
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private started = false;
  private cleanup?: () => void;

  constructor() {
    effect(() => {
      const expiresAt = this.session.expiresAt();
      clearTimeout(this.expiryTimer);
      if (expiresAt === null) return;
      const wait = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMEOUT_MS);
      this.expiryTimer = setTimeout(() => this.auth.logout('expired'), wait);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const view = this.document.defaultView;
    const onActivity = () => (this.lastActivity = Date.now());
    for (const type of ACTIVITY_EVENTS) {
      this.document.addEventListener(type, onActivity, { passive: true, capture: true });
    }
    const idleCheck = setInterval(() => this.checkIdle(), IDLE_CHECK_MS);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TOKEN_KEY && event.key !== USER_KEY) return;
      const wasSignedIn = this.session.isAuthenticated();
      this.session.restore();
      if (wasSignedIn && !this.session.isAuthenticated()) this.auth.logout('manual');
    };
    view?.addEventListener('storage', onStorage);
    this.cleanup = () => {
      for (const type of ACTIVITY_EVENTS) {
        this.document.removeEventListener(type, onActivity, { capture: true });
      }
      clearInterval(idleCheck);
      view?.removeEventListener('storage', onStorage);
    };
  }

  stop(): void {
    this.cleanup?.();
    this.cleanup = undefined;
    this.started = false;
  }

  /** Exposed for tests. */
  checkIdle(now = Date.now()): void {
    if (this.session.isAuthenticated() && now - this.lastActivity > this.idleMs) {
      this.auth.logout('idle');
    }
  }
}
