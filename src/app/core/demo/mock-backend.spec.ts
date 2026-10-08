import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { type Observable, firstValueFrom } from 'rxjs';

import { TEST_API } from '../../../testing/http';
import { API_BASE_URL } from '../api/api-base-url';
import { DemoDb } from './demo-db';
import { DEMO_PASSWORD } from './demo-fixtures';
import { mockBackendInterceptor } from './mock-backend';

interface LoginBody {
  token: string;
  user: { id: number; roles: { name: string }[] };
}

describe('demo backend', () => {
  let http: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: TEST_API },
      ],
    });
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => vi.useRealTimers());

  /** Resolves a request after the simulated network delay. */
  async function call<T>(request: Observable<T>): Promise<T> {
    const result = firstValueFrom(request);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1000);
    return result;
  }

  async function status(request: Observable<unknown>): Promise<number> {
    try {
      await call(request);
      return 200;
    } catch (error) {
      return (error as HttpErrorResponse).status;
    }
  }

  async function login(
    email: string,
  ): Promise<{ headers: Record<string, string>; body: LoginBody }> {
    const body = await call(
      http.post<LoginBody>(`${TEST_API}/login`, { email, password: DEMO_PASSWORD }),
    );
    return { headers: { Authorization: `Bearer ${body.token}` }, body };
  }

  it('signs in with the demo accounts and rejects a wrong password', async () => {
    const { body } = await login('aww@demo.in');
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.user.roles[0].name).toBe('aww');
    expect(
      await status(http.post(`${TEST_API}/login`, { email: 'aww@demo.in', password: 'nope' })),
    ).toBe(401);
  });

  it('requires a token, and the admin role for admin endpoints', async () => {
    expect(await status(http.get(`${TEST_API}/children`))).toBe(401);
    const worker = await login('aww@demo.in');
    expect(await status(http.get(`${TEST_API}/users`, { headers: worker.headers }))).toBe(403);
    const admin = await login('admin@demo.in');
    expect(await status(http.get(`${TEST_API}/users`, { headers: admin.headers }))).toBe(200);
  });

  it('validates and stores children like the API', async () => {
    const { headers } = await login('aww@demo.in');
    const invalid = await call(http.post(`${TEST_API}/children`, { name: '' }, { headers })).catch(
      (e: HttpErrorResponse) => e,
    );
    expect((invalid as HttpErrorResponse).status).toBe(422);
    expect((invalid as HttpErrorResponse).error.errors).toHaveProperty('name');

    const created = await call(
      http.post<{ id: number; name: string }>(
        `${TEST_API}/children`,
        {
          name: 'प्रिया',
          gender: 'Girl',
          date_of_birth: '2022-05-10',
          symbol: 'Mango',
          height_cm: '95',
          weight_kg: '13',
          language: 'Hindi',
          anganwadi_id: 1,
        },
        { headers },
      ),
    );
    const list = await call(http.get<{ id: number }[]>(`${TEST_API}/children`, { headers }));
    expect(list.some((c) => c.id === created.id)).toBe(true);
  });

  it('records assessments per child and session', async () => {
    const { headers } = await login('aww@demo.in');
    const url = `${TEST_API}/assessments/anganwadi/1/competency/4`;
    const before = await call(http.get<Record<string, unknown>[]>(url, { headers }));
    const row = before.find((r) => r['child_id'] === 1);
    expect(row?.['session_1']).toBe('-');

    expect(
      await status(
        http.post(
          `${TEST_API}/assessments/`,
          {
            children: [1],
            competency_id: 4,
            observation: 'Advancing',
            assessment_date: '2026-10-06',
            remarks: '',
            anganwadi_id: 1,
            attempt_number: 1,
            age: '5y 6m',
            height: '',
            weight: '',
          },
          { headers },
        ),
      ),
    ).toBe(200);
    const after = await call(http.get<Record<string, unknown>[]>(url, { headers }));
    const saved = after.find((r) => r['child_id'] === 1)?.['session_1'] as { observation: string };
    expect(saved.observation).toBe('Advancing');

    expect(
      await status(
        http.post(
          `${TEST_API}/assessments/`,
          {
            children: [1],
            competency_id: 4,
            observation: 'Great',
            assessment_date: '2026-10-06',
            attempt_number: 2,
          },
          { headers },
        ),
      ),
    ).toBe(422);
  });

  it('can pretend the server is unreachable', async () => {
    const { headers } = await login('aww@demo.in');
    TestBed.inject(DemoDb).setOffline(true);
    expect(await status(http.get(`${TEST_API}/children`, { headers }))).toBe(0);
    TestBed.inject(DemoDb).setOffline(false);
  });

  it('leaves other requests alone', () => {
    http.get('https://cdn.example/file.json').subscribe();
    TestBed.inject(HttpTestingController).expectOne('https://cdn.example/file.json').flush({});
  });
});
