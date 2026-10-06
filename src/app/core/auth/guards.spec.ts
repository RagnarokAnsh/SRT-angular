import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { testUser, validToken } from '../../../testing/auth';
import { authGuard, guestGuard, roleGuard } from './guards';
import { SessionStore } from './session';

function run(guard: CanActivateFn, url = '/children'): unknown {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

describe('route guards', () => {
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  const serialize = (result: unknown) =>
    result instanceof UrlTree ? router.serializeUrl(result) : result;

  it('authGuard sends signed-out users to login, remembering the page', () => {
    expect(serialize(run(authGuard, '/children?q=a'))).toBe('/login?returnUrl=%2Fchildren%3Fq%3Da');
    session.start(validToken(), testUser());
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard sends signed-in users to their home page', () => {
    expect(run(guestGuard)).toBe(true);
    session.start(validToken(), testUser(['admin']));
    expect(serialize(run(guestGuard))).toBe('/admin');
  });

  it('roleGuard checks roles', () => {
    const adminOnly = roleGuard('admin');
    expect(serialize(run(adminOnly, '/admin'))).toBe('/login?returnUrl=%2Fadmin');
    session.start(validToken(), testUser(['aww']));
    expect(serialize(run(adminOnly, '/admin'))).toBe('/unauthorized');
    expect(run(roleGuard('aww', 'admin'))).toBe(true);
  });
});
