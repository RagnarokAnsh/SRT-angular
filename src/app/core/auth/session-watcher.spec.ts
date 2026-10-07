import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { testUser, validToken } from '../../../testing/auth';
import { AuthService } from './auth';
import { ACTIVITY_KEY, IDLE_TIMEOUT_MS, SessionWatcher } from './session-watcher';
import { SessionStore, TOKEN_KEY, USER_KEY } from './session';

describe('SessionWatcher', () => {
  let logout: ReturnType<typeof vi.fn>;
  let navigateAfterLogin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    logout = vi.fn().mockResolvedValue(true);
    navigateAfterLogin = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: IDLE_TIMEOUT_MS, useValue: 60_000 },
        { provide: AuthService, useValue: { logout, navigateAfterLogin } },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(SessionWatcher).stop();
    vi.useRealTimers();
  });

  /** Another tab's session, written straight to storage. */
  const storeOtherTab = (userId: number, token = validToken(7200)) => {
    localStorage.setItem(USER_KEY, JSON.stringify(testUser(['aww'], { id: userId })));
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  };

  it('signs out after the idle timeout, but not before', () => {
    const session = TestBed.inject(SessionStore);
    session.start(validToken(), testUser());
    const watcher = TestBed.inject(SessionWatcher);
    watcher.start();
    const now = Date.now();
    watcher.checkIdle(now + 30_000);
    expect(logout).not.toHaveBeenCalled();
    watcher.checkIdle(now + 61_000);
    expect(logout).toHaveBeenCalledWith('idle');
  });

  it('counts user activity', () => {
    TestBed.inject(SessionStore).start(validToken(), testUser());
    const watcher = TestBed.inject(SessionWatcher);
    watcher.start();
    vi.useFakeTimers({ now: Date.now() + 50_000, toFake: ['Date'] });
    document.dispatchEvent(new Event('keydown'));
    watcher.checkIdle(Date.now() + 30_000);
    expect(logout).not.toHaveBeenCalled();
  });

  it("counts activity in other tabs, so an idle tab doesn't sign out a busy one", () => {
    TestBed.inject(SessionStore).start(validToken(), testUser());
    const watcher = TestBed.inject(SessionWatcher);
    watcher.start();
    const later = Date.now() + 120_000;
    localStorage.setItem(ACTIVITY_KEY, String(later - 10_000));
    watcher.checkIdle(later);
    expect(logout).not.toHaveBeenCalled();
    watcher.checkIdle(later + 61_000);
    expect(logout).toHaveBeenCalledWith('idle');
  });

  it('starts the idle clock afresh when someone signs in', () => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now() - 3_600_000));
    const watcher = TestBed.inject(SessionWatcher);
    TestBed.inject(SessionStore).start(validToken(), testUser());
    TestBed.tick();
    expect(Number(localStorage.getItem(ACTIVITY_KEY))).toBeGreaterThan(Date.now() - 1_000);
    watcher.checkIdle(Date.now() + 30_000);
    expect(logout).not.toHaveBeenCalled();
  });

  it('signs out when the token expires', () => {
    vi.useFakeTimers();
    TestBed.inject(SessionStore).start(validToken(5), testUser());
    TestBed.inject(SessionWatcher);
    TestBed.tick();
    vi.advanceTimersByTime(4_000);
    expect(logout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(logout).toHaveBeenCalledWith('expired');
  });

  it('waits for a token valid for longer than a timer can wait', () => {
    vi.useFakeTimers();
    const day = 24 * 3600_000;
    TestBed.inject(SessionStore).start(validToken(30 * 24 * 3600), testUser());
    TestBed.inject(SessionWatcher);
    TestBed.tick();
    vi.advanceTimersByTime(29 * day);
    expect(logout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(day + 1_000);
    expect(logout).toHaveBeenCalledWith('expired');
  });

  it('follows a sign-out in another tab once its changes settle, without touching storage', async () => {
    vi.useFakeTimers();
    const session = TestBed.inject(SessionStore);
    session.start(validToken(), testUser());
    TestBed.inject(SessionWatcher).start();
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY }));
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: USER_KEY }));
    expect(logout).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith('manual', { elsewhere: true });
    expect(session.isAuthenticated()).toBe(false);
  });

  it('when someone else signs in elsewhere, leaves the page and continues as them', async () => {
    const session = TestBed.inject(SessionStore);
    session.start(validToken(), testUser());
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login?returnUrl=%2Fstudents&uid=7');
    const token = storeOtherTab(8);
    await TestBed.inject(SessionWatcher).onSessionChangedElsewhere(7);
    expect(logout).toHaveBeenCalledWith('manual', { elsewhere: true });
    expect(session.user()?.id).toBe(8);
    expect(session.token()).toBe(token);
    // The page belonged to user 7: navigateAfterLogin sends user 8 home instead.
    expect(navigateAfterLogin).toHaveBeenCalledWith('/students', '7');
  });

  it('when someone signs in elsewhere, the login page follows', async () => {
    const session = TestBed.inject(SessionStore);
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/login');
    storeOtherTab(7);
    await TestBed.inject(SessionWatcher).onSessionChangedElsewhere(null);
    expect(logout).not.toHaveBeenCalled();
    expect(session.isAuthenticated()).toBe(true);
    expect(navigateAfterLogin).toHaveBeenCalledWith(undefined, undefined);
  });

  it('picks up a new token for the same user quietly', async () => {
    const session = TestBed.inject(SessionStore);
    session.start(validToken(), testUser());
    const token = storeOtherTab(7);
    await TestBed.inject(SessionWatcher).onSessionChangedElsewhere(7);
    expect(logout).not.toHaveBeenCalled();
    expect(navigateAfterLogin).not.toHaveBeenCalled();
    expect(session.token()).toBe(token);
  });

  it("never deletes another tab's half-written session", async () => {
    const session = TestBed.inject(SessionStore);
    session.start(validToken(), testUser());
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(USER_KEY, JSON.stringify(testUser(['aww'], { id: 8 })));
    await TestBed.inject(SessionWatcher).onSessionChangedElsewhere(7);
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(USER_KEY)).not.toBeNull();
  });
});
