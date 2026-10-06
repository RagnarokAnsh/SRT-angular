import { TestBed } from '@angular/core/testing';

import { fakeJwt, testUser, validToken } from '../../../testing/auth';
import { SessionStore, TOKEN_KEY, USER_KEY } from './session';

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
    session.start(validToken(), testUser(['aww', 'supervisor'], { anganwadi_id: null, anganwadi: { id: 9 } as never }));
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
    session.start(validToken(), testUser());
    session.clear();
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});
