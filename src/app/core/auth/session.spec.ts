import { TestBed } from '@angular/core/testing';

import { fakeJwt, testUser, validToken } from '../../../testing/auth';
import { normalizeUser } from '../api/user-api';
import { SKEW_KEY, SessionStore, TOKEN_KEY, USER_KEY } from './session';

describe('SessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const create = () => TestBed.inject(SessionStore);

  it('starts signed out', () => {
    const session = create();
    expect(session.isAuthenticated()).toBe(false);
    expect(session.primaryRole()).toBeNull();
  });

  it('keeps a remembered session in localStorage', () => {
    const session = create();
    const token = validToken();
    session.start(token, testUser(), true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(session.isAuthenticated()).toBe(true);
  });

  it('keeps a non-remembered session in sessionStorage only', () => {
    const session = create();
    session.start(validToken(), testUser(), false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).not.toBeNull();
  });

  it('restores a stored session (same keys as the previous version)', () => {
    localStorage.setItem(TOKEN_KEY, validToken());
    localStorage.setItem(USER_KEY, JSON.stringify(testUser(['AWW'])));
    localStorage.setItem('appState', '{"old":true}');
    const session = create();
    expect(session.isAuthenticated()).toBe(true);
    expect(session.roles()).toEqual(['aww']);
    expect(localStorage.getItem('appState')).toBeNull();
  });

  it('discards an expired or unreadable stored session', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt({ exp: 1 }));
    localStorage.setItem(USER_KEY, JSON.stringify(testUser()));
    expect(create().isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem(TOKEN_KEY, validToken());
    localStorage.setItem(USER_KEY, '{not json');
    expect(create().isAuthenticated()).toBe(false);
  });

  it('picks the highest role as primary and finds the centre id', () => {
    const session = create();
    session.start(
      validToken(),
      testUser(['aww', 'supervisor'], { anganwadi_id: null, anganwadi: { id: 9 } as never }),
    );
    expect(session.primaryRole()).toBe('supervisor');
    expect(session.hasAnyRole('aww')).toBe(true);
    expect(session.anganwadiId()).toBe(9);
  });

  it('ignores role names it does not know', () => {
    const session = create();
    session.start(validToken(), testUser(['superuser']));
    expect(session.roles()).toEqual([]);
    expect(session.primaryRole()).toBeNull();
  });

  it('clears everything on sign-out', () => {
    const session = create();
    session.start(validToken(), testUser(), true, 5_000);
    session.clear();
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(localStorage.getItem(SKEW_KEY)).toBeNull();
  });

  it('never clears a newer session another tab has stored since', () => {
    const session = create();
    session.start(validToken(), testUser());
    const other = validToken(7200);
    localStorage.setItem(TOKEN_KEY, other);
    localStorage.setItem(USER_KEY, JSON.stringify(testUser(['aww'], { id: 8 })));
    session.clear();
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(other);
    expect(localStorage.getItem(USER_KEY)).not.toBeNull();
  });

  it('can end the session in memory only', () => {
    const session = create();
    const token = validToken();
    session.start(token, testUser());
    session.clear({ storage: false });
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
  });

  it('re-reading for another tab changes nothing in storage, even a half-written session', () => {
    const session = create();
    localStorage.setItem(USER_KEY, JSON.stringify(testUser()));
    session.restore({ cleanUp: false });
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(USER_KEY)).not.toBeNull();
  });

  it("uses the server's clock: a phone running fast keeps its session", () => {
    const serverNow = Date.now() - 3 * 3600_000;
    // Issued 3 hours ago by the phone's clock, valid for 1 hour by the server's.
    const token = fakeJwt({
      iat: Math.floor(serverNow / 1000),
      exp: Math.floor(serverNow / 1000) + 3600,
    });
    const skew = serverNow - Date.now();
    create().start(token, testUser(), true, skew);
    expect(localStorage.getItem(SKEW_KEY)).toBe(String(Math.round(skew)));

    TestBed.resetTestingModule();
    const restored = create();
    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.clockSkew()).toBe(Math.round(skew));
    // Expiry by this phone's clock: about an hour from now.
    const left = (restored.expiresAt() ?? 0) - Date.now();
    expect(left).toBeGreaterThan(3500_000);
    expect(left).toBeLessThanOrEqual(3601_000);
  });

  it('restores a user stored with ids as strings and roles as names', () => {
    localStorage.setItem(TOKEN_KEY, validToken());
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ id: '7', name: 'Sunita', roles: ['AWW'], anganwadi_id: '3' }),
    );
    const session = create();
    expect(session.user()?.id).toBe(7);
    expect(session.anganwadiId()).toBe(3);
    expect(session.roles()).toEqual(['aww']);
  });
});

describe('normalizeUser', () => {
  it('makes ids numbers and roles objects', () => {
    const user = normalizeUser({
      id: '12',
      name: 'Asha',
      email: 'asha@example.org',
      roles: ['Supervisor', { id: 5, name: 'AWW' }, { id: 6 }, null],
      state_id: '2',
      district_id: 4,
      anganwadi: { id: '9', name: 'Shivaji Nagar' },
    });
    expect(user).toMatchObject({
      id: 12,
      roles: [
        { id: 1, name: 'Supervisor' },
        { id: 5, name: 'AWW' },
      ],
      state_id: 2,
      district_id: 4,
      anganwadi_id: 9,
    });
  });

  it('rejects anything without a usable id', () => {
    expect(normalizeUser(null)).toBeNull();
    expect(normalizeUser('user')).toBeNull();
    expect(normalizeUser({ name: 'No id' })).toBeNull();
    expect(normalizeUser({ id: 0 })).toBeNull();
    expect(normalizeUser({ id: 'abc' })).toBeNull();
    expect(normalizeUser({ id: 1.5 })).toBeNull();
  });

  it('fills in missing text and roles', () => {
    expect(normalizeUser({ id: 3 })).toMatchObject({ id: 3, name: '', email: '', roles: [] });
  });
});
