import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '@env';

import { AuthService } from './auth';
import { SKEW_KEY, SessionStore, TOKEN_KEY, USER_KEY } from './session';

export const IDLE_TIMEOUT_MS = new InjectionToken<number>('IDLE_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => environment.idleTimeoutMinutes * 60_000,
});

/** Last user activity in any tab (ms since epoch), shared so one idle tab can't sign out a busy one. */
export const ACTIVITY_KEY = 'srt-last-activity';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
const IDLE_CHECK_MS = 30_000;
/** How often activity is written to storage at most. */
const ACTIVITY_WRITE_MS = 15_000;
/** Another tab writes a session in several steps; act once it has finished. */
const SETTLE_MS = 50;
const SESSION_KEYS: (string | null)[] = [null, TOKEN_KEY, USER_KEY, SKEW_KEY];
/** setTimeout cannot wait longer than ~24.8 days. */
const MAX_TIMEOUT_MS = 2_147_000_000;

/**
 * Ends the session when the token expires or after a period of inactivity in every tab, and
 * keeps tabs in step when someone signs in or out in another one.
 */
@Injectable({ providedIn: 'root' })
export class SessionWatcher {
  private readonly session = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly idleMs = inject(IDLE_TIMEOUT_MS);
  private lastActivity = Date.now();
  private lastWrite = 0;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private started = false;
  private cleanup?: () => void;

  constructor() {
    effect(() => {
      const expiresAt = this.session.expiresAt();
      clearTimeout(this.expiryTimer);
      if (expiresAt !== null) this.armExpiry(expiresAt);
    });
    // Signing in (here or in another tab) starts the idle clock afresh.
    effect(() => {
      if (this.session.isAuthenticated()) this.recordActivity(true);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const view = this.document.defaultView;
    const onActivity = () => this.recordActivity();
    for (const type of ACTIVITY_EVENTS) {
      this.document.addEventListener(type, onActivity, { passive: true, capture: true });
    }
    const idleCheck = setInterval(() => this.checkIdle(), IDLE_CHECK_MS);
    // Who was signed in when the other tab started changing the session.
    let before: { userId: number | null } | null = null;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onStorage = (event: StorageEvent) => {
      if (!SESSION_KEYS.includes(event.key)) return;
      before ??= { userId: this.userId() };
      clearTimeout(settle);
      settle = setTimeout(() => {
        const previous = before?.userId ?? null;
        before = null;
        void this.onSessionChangedElsewhere(previous);
      }, SETTLE_MS);
    };
    view?.addEventListener('storage', onStorage);
    this.cleanup = () => {
      for (const type of ACTIVITY_EVENTS) {
        this.document.removeEventListener(type, onActivity, { capture: true });
      }
      clearInterval(idleCheck);
      clearTimeout(settle);
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
    if (!this.session.isAuthenticated()) return;
    const last = Math.max(this.lastActivity, this.sharedActivity());
    if (now - last > this.idleMs) this.auth.logout('idle');
  }

  /**
   * Another tab signed in, signed out or switched user (`before`: who was signed in here).
   * Exposed for tests.
   */
  async onSessionChangedElsewhere(before: number | null = this.userId()): Promise<void> {
    const next = this.session.readStored()?.user.id ?? null;
    if (before !== null && next !== before) {
      // Signed out, or someone else signed in: leave this user's pages without asking (nothing
      // more can be saved for them), and keep nothing of theirs in memory.
      await this.auth.logout('manual', { elsewhere: true });
    }
    // Read only: the other tab owns what is stored.
    this.session.restore({ cleanUp: false });
    if (this.session.isAuthenticated() && this.onLoginPage()) {
      // Signed in elsewhere: this tab follows, back to where it was if that was the same user.
      const { returnUrl, uid } = this.router.parseUrl(this.router.url).queryParams;
      await this.auth.navigateAfterLogin(returnUrl, uid);
    }
  }

  private userId(): number | null {
    return this.session.user()?.id ?? null;
  }

  private onLoginPage(): boolean {
    return /^\/login(?:[/?#]|$)/.test(this.router.url);
  }

  private recordActivity(force = false): void {
    const now = Date.now();
    this.lastActivity = now;
    if (!force && now - this.lastWrite < ACTIVITY_WRITE_MS) return;
    this.lastWrite = now;
    try {
      localStorage.setItem(ACTIVITY_KEY, String(now));
    } catch {
      /* this tab's own activity still counts */
    }
  }

  private sharedActivity(): number {
    try {
      const value = Number(localStorage.getItem(ACTIVITY_KEY));
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  /** Long waits are split, so a token valid for months isn't ended after ~24.8 days. */
  private armExpiry(expiresAt: number): void {
    const wait = Math.max(expiresAt - Date.now(), 0);
    this.expiryTimer =
      wait > MAX_TIMEOUT_MS
        ? setTimeout(() => this.armExpiry(expiresAt), MAX_TIMEOUT_MS)
        : setTimeout(() => this.auth.logout('expired'), wait);
  }
}
