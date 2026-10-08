import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TEST_API, setupHttpTesting } from '../../../testing/http';
import { fakeJwt, testUser, validToken } from '../../../testing/auth';
import { AuthService, InvalidLoginResponseError, userFromLogin } from './auth';
import { SessionStore, TOKEN_KEY } from './session';

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

  it('rejects a login response whose user has no usable id', async () => {
    const result = firstValueFrom(auth.login('a@b.org', 'x'));
    http
      .expectOne(`${TEST_API}/login`)
      .flush({ token: validToken(), user: { ...testUser(), id: null } });
    await expect(result).rejects.toBeInstanceOf(InvalidLoginResponseError);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('accepts ids sent as strings, like a stored user', async () => {
    const result = firstValueFrom(auth.login('a@b.org', 'x'));
    http
      .expectOne(`${TEST_API}/login`)
      .flush({ token: validToken(), user: { ...testUser(), id: '7', anganwadi_id: '3' } });
    expect((await result).id).toBe(7);
    expect(session.anganwadiId()).toBe(3);
  });

  it("signs in on a phone whose clock is hours fast, using the server's time", async () => {
    const serverSeconds = Math.floor(Date.now() / 1000) - 3 * 3600;
    const token = fakeJwt({ sub: 7, iat: serverSeconds, exp: serverSeconds + 3600 });
    const result = firstValueFrom(auth.login('a@b.org', 'x'));
    http.expectOne(`${TEST_API}/login`).flush({ token, user: testUser() });
    await result;
    expect(session.isAuthenticated()).toBe(true);
    expect((session.expiresAt() ?? 0) - Date.now()).toBeGreaterThan(3500_000);
  });

  it('uses the top-level roles list when the user has none', () => {
    const user = userFromLogin({
      token: 't',
      user: { ...testUser(), roles: [] },
      roles: ['admin', 'aww'],
    });
    expect(user?.roles).toEqual([
      { id: 1, name: 'admin' },
      { id: 2, name: 'aww' },
    ]);
    expect(userFromLogin({ token: 't', user: { name: 'x' } as never })).toBeNull();
  });

  it('chooses the home page from the highest role', () => {
    expect(auth.homeUrl()).toBe('/home');
    session.start(validToken(), testUser(['supervisor']));
    expect(auth.homeUrl()).toBe('/supervisor');
    session.start(validToken(), testUser(['aww']));
    expect(auth.homeUrl()).toBe('/home');
    session.start(validToken(), testUser(['aww', 'admin']));
    expect(auth.homeUrl()).toBe('/admin');
  });

  it('after an expiry, returns to login with the reason and the current page', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/students?q=ram');
    session.start(validToken(), testUser());
    auth.logout('expired');
    expect(session.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/students?q=ram', uid: '7' },
    });
  });

  it('after a sign-out in another tab, leaves storage to that tab', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const token = validToken();
    session.start(token, testUser());
    await auth.logout('manual', { elsewhere: true });
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: {} });
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
    expect(navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
    await auth.navigateAfterLogin('/students');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/students', { replaceUrl: true });
  });

  it('sends only the same person back to the page they were signed out of', async () => {
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    session.start(validToken(), testUser(['aww']));
    await auth.navigateAfterLogin('/students/4/edit', '7');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/students/4/edit', { replaceUrl: true });
    await auth.navigateAfterLogin('/students/4/edit', '8');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/home', { replaceUrl: true });
  });

  it('opens the page someone tapped before signing in, if their role may open it', async () => {
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    session.start(validToken(), testUser(['aww']));
    await auth.navigateAfterLogin('/competencies/find/seriation');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/competencies/find/seriation', {
      replaceUrl: true,
    });
    // A supervisor can't open competencies: their dashboard instead of "unauthorized".
    session.start(validToken(), testUser(['supervisor']));
    await auth.navigateAfterLogin('/competencies/find/seriation');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/supervisor', { replaceUrl: true });
  });
});
