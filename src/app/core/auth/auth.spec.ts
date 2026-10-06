import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TEST_API, setupHttpTesting } from '../../../testing/http';
import { testUser, validToken } from '../../../testing/auth';
import { AuthService, InvalidLoginResponseError, userFromLogin } from './auth';
import { SessionStore } from './session';

describe('AuthService', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    http = setupHttpTesting([provideRouter([])]);
    auth = TestBed.inject(AuthService);
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('signs in: posts the trimmed email and starts the session', async () => {
    const result = firstValueFrom(auth.login(' sunita@example.org ', 'secret1', false));
    const req = http.expectOne(`${TEST_API}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'sunita@example.org', password: 'secret1' });
    req.flush({ token: validToken(), user: testUser() });
    expect((await result).name).toBe('Sunita Devi');
    expect(session.isAuthenticated()).toBe(true);
    expect(sessionStorage.length).toBeGreaterThan(0);
  });

  it('rejects a login response without a usable token', async () => {
    const result = firstValueFrom(auth.login('a@b.org', 'x'));
    http.expectOne(`${TEST_API}/login`).flush({ token: 'garbage', user: testUser() });
    await expect(result).rejects.toBeInstanceOf(InvalidLoginResponseError);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('uses the top-level roles list when the user has none', () => {
    const user = userFromLogin({
      token: 't',
      user: { ...testUser(), roles: [] },
      roles: ['admin'],
    });
    expect(user.roles.map((r) => r.name)).toEqual(['admin']);
  });

  it('chooses the home page from the highest role', () => {
    expect(auth.homeUrl()).toBe('/home');
    session.start(validToken(), testUser(['aww']));
    expect(auth.homeUrl()).toBe('/competencies');
    session.start(validToken(), testUser(['aww', 'admin']));
    expect(auth.homeUrl()).toBe('/admin');
  });

  it('after an expiry, returns to login with the reason and the current page', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/children?q=ram');
    session.start(validToken(), testUser());
    auth.logout('expired');
    expect(session.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/children?q=ram' },
    });
  });

  it('a manual sign-out goes to login without extra parameters', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    session.start(validToken(), testUser());
    auth.logout('manual');
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: {} });
  });

  it('does nothing for an automatic sign-out when nobody is signed in', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.logout('idle');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores unsafe return URLs after login', async () => {
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    session.start(validToken(), testUser(['aww']));
    await auth.navigateAfterLogin('//evil.example');
    expect(navigateByUrl).toHaveBeenCalledWith('/competencies', { replaceUrl: true });
    await auth.navigateAfterLogin('/children');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/children', { replaceUrl: true });
  });
});
