import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { testUser, validToken } from '../../../testing/auth';
import { AuthService } from './auth';
import { IDLE_TIMEOUT_MS, SessionWatcher } from './session-watcher';
import { SessionStore, TOKEN_KEY } from './session';

describe('SessionWatcher', () => {
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    logout = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: IDLE_TIMEOUT_MS, useValue: 60_000 },
        { provide: AuthService, useValue: { logout } },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(SessionWatcher).stop();
    vi.useRealTimers();
  });

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

  it('follows a sign-out in another tab', () => {
    const session = TestBed.inject(SessionStore);
    session.start(validToken(), testUser());
    TestBed.inject(SessionWatcher).start();
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY }));
    expect(session.isAuthenticated()).toBe(false);
    expect(logout).toHaveBeenCalledWith('manual');
  });
});
