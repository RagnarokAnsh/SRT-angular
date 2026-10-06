import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TimeoutError, firstValueFrom } from 'rxjs';

import { testUser, validToken } from '../../../testing/auth';
import { TEST_API } from '../../../testing/http';
import { API_BASE_URL } from '../api/api-base-url';
import { AuthService } from '../auth/auth';
import { SessionStore } from '../auth/session';
import {
  REQUEST_TIMEOUT_MS,
  apiRequestInterceptor,
  loadingInterceptor,
  unauthorizedInterceptor,
} from './interceptors';
import { LoadingTracker } from './loading-tracker';

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    logout = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([apiRequestInterceptor, loadingInterceptor, unauthorizedInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: TEST_API },
        { provide: REQUEST_TIMEOUT_MS, useValue: 1_000 },
        { provide: AuthService, useValue: { logout } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('adds the token and JSON Accept header to API calls only', () => {
    const token = validToken();
    TestBed.inject(SessionStore).start(token, testUser());
    http.get(`${TEST_API}/children`).subscribe();
    http.get('https://cdn.example/file.json').subscribe();
    const api = backend.expectOne(`${TEST_API}/children`);
    expect(api.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(api.request.headers.get('Accept')).toBe('application/json');
    const other = backend.expectOne('https://cdn.example/file.json');
    expect(other.request.headers.has('Authorization')).toBe(false);
    api.flush([]);
    other.flush({});
  });

  it('does not treat look-alike hosts as the API', () => {
    TestBed.inject(SessionStore).start(validToken(), testUser());
    http.get(`${TEST_API}.evil.example/x`).subscribe();
    const req = backend.expectOne(`${TEST_API}.evil.example/x`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('tracks requests in flight', () => {
    const tracker = TestBed.inject(LoadingTracker);
    http.get(`${TEST_API}/a`).subscribe();
    http.get(`${TEST_API}/b`).subscribe({ error: () => undefined });
    expect(tracker.active()).toBe(true);
    backend.expectOne(`${TEST_API}/a`).flush({});
    expect(tracker.active()).toBe(true);
    backend.expectOne(`${TEST_API}/b`).error(new ProgressEvent('error'));
    expect(tracker.active()).toBe(false);
  });

  it('signs out on a 401 from the API, but not from the login call', async () => {
    TestBed.inject(SessionStore).start(validToken(), testUser());
    const login = firstValueFrom(http.post(`${TEST_API}/login`, {}));
    backend.expectOne(`${TEST_API}/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(login).rejects.toBeTruthy();
    expect(logout).not.toHaveBeenCalled();

    const children = firstValueFrom(http.get(`${TEST_API}/children`));
    backend
      .expectOne(`${TEST_API}/children`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(children).rejects.toBeTruthy();
    expect(logout).toHaveBeenCalledWith('expired');
  });

  it('gives up on a request that takes too long', async () => {
    vi.useFakeTimers();
    const result = firstValueFrom(http.get(`${TEST_API}/slow`));
    const req = backend.expectOne(`${TEST_API}/slow`);
    vi.advanceTimersByTime(1_001);
    await expect(result).rejects.toBeInstanceOf(TimeoutError);
    expect(req.cancelled).toBe(true);
  });
});
