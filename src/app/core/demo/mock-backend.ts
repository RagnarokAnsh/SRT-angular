import {
  HttpErrorResponse,
  type HttpEvent,
  type HttpInterceptorFn,
  type HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { type Observable, mergeMap, of, throwError, timer } from 'rxjs';

import { API_BASE_URL } from '../api/api-base-url';
import { jwtExpiry } from '../auth/jwt';
import { ageOn, isValidIsoDate, toIsoDate } from '../util/dates';
import { DemoDb } from './demo-db';
import type { DbCenter, DbChild, DbUser, DemoData } from './demo-fixtures';

interface Result {
  status: number;
  body: unknown;
}

type Body = Record<string, unknown>;

interface Ctx {
  db: DemoDb;
  data: DemoData;
  body: Body;
  user: DbUser | null;
  params: string[];
}

interface Route {
  method: string;
  pattern: RegExp;
  access: 'public' | 'user' | 'admin';
  handle: (ctx: Ctx) => Result;
}

const ROLES = ['admin', 'stateofficial', 'dpo', 'cdpo', 'supervisor', 'aww'];
const LEVELS = ['Beginning', 'Progressing', 'Advancing', 'School Ready'];
const CHILD_GENDERS = ['Boy', 'Girl', 'N/A'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ok = (body: unknown, status = 200): Result => ({ status, body });
const notFound = (): Result => ({ status: 404, body: { message: 'Not found.' } });

function invalid(errors: Record<string, string>): Result {
  const fields = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]]));
  return { status: 422, body: { message: Object.values(errors)[0], errors: fields } };
}

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function demoToken(userId: number): string {
  const now = Math.floor(Date.now() / 1000);
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: userId, iat: now, exp: now + 8 * 3600 })}.demo`;
}

function tokenUserId(token: string): number | null {
  const exp = jwtExpiry(token);
  if (exp === null || exp * 1000 <= Date.now()) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const sub = (JSON.parse(atob(payload)) as { sub?: unknown }).sub;
    return typeof sub === 'number' ? sub : null;
  } catch {
    return null;
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function named(list: { id: number; name: string }[], id: number | null) {
  const item = id === null ? undefined : list.find((x) => x.id === id);
  return item ? { id: item.id, name: item.name } : null;
}

function apiUser(data: DemoData, user: DbUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified_at: null,
    created_at: '2026-06-01T05:30:00.000000Z',
    updated_at: '2026-06-01T05:30:00.000000Z',
    gender: user.gender,
    roles: [{ id: ROLES.indexOf(user.role) + 1, name: user.role, guard_name: 'web' }],
    country_id: user.country_id,
    state_id: user.state_id,
    district_id: user.district_id,
    project: user.project,
    sector: user.sector,
    anganwadi_id: user.anganwadi_id,
    country: named(data.countries, user.country_id),
    state: named(data.states, user.state_id),
    district: named(data.districts, user.district_id),
    anganwadi: data.centers.find((c) => c.id === user.anganwadi_id) ?? null,
  };
}

function apiChild(data: DemoData, child: DbChild) {
  return {
    ...child,
    age: ageOn(child.date_of_birth, toIsoDate())?.years ?? 0,
    anganwadi: data.centers.find((c) => c.id === child.anganwadi_id) ?? null,
    created_at: '2026-06-01T05:30:00.000000Z',
    updated_at: '2026-06-01T05:30:00.000000Z',
  };
}

function validateChild(data: DemoData, body: Body): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!str(body['name'])) errors['name'] = 'The name field is required.';
  if (!isValidIsoDate(body['date_of_birth']))
    errors['date_of_birth'] = 'The date of birth is not a valid date.';
  if (!CHILD_GENDERS.includes(str(body['gender'])))
    errors['gender'] = 'The selected gender is invalid.';
  if (num(body['height_cm']) === null) errors['height_cm'] = 'The height must be a number.';
  if (num(body['weight_kg']) === null) errors['weight_kg'] = 'The weight must be a number.';
  if (!data.centers.some((c) => c.id === num(body['anganwadi_id']))) {
    errors['anganwadi_id'] = 'The selected anganwadi is invalid.';
  }
  return errors;
}

function childFromBody(body: Body, existing?: DbChild): Omit<DbChild, 'id'> {
  return {
    name: str(body['name']),
    date_of_birth: str(body['date_of_birth']),
    symbol: str(body['symbol']),
    height_cm: String(num(body['height_cm'])),
    weight_kg: String(num(body['weight_kg'])),
    language: str(body['language']),
    anganwadi_id: num(body['anganwadi_id']) ?? 0,
    gender: str(body['gender']),
    aww_id: num(body['aww_id']) ?? existing?.aww_id ?? null,
  };
}

function validateUser(data: DemoData, body: Body, id?: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = str(body['email']).toLowerCase();
  if (!str(body['name'])) errors['name'] = 'The name field is required.';
  if (!EMAIL.test(email)) errors['email'] = 'The email must be a valid email address.';
  else if (data.users.some((u) => u.email.toLowerCase() === email && u.id !== id)) {
    errors['email'] = 'The email has already been taken.';
  }
  if (id === undefined && str(body['password']).length < 6) {
    errors['password'] = 'The password must be at least 6 characters.';
  }
  if (!ROLES.includes(str(body['role']))) errors['role'] = 'The selected role is invalid.';
  return errors;
}

function userFromBody(body: Body, existing?: DbUser): DbUser {
  const optionalNumber = (key: string) => num(body[key]);
  const optionalString = (key: string) => str(body[key]) || null;
  return {
    id: existing?.id ?? 0,
    name: str(body['name']),
    email: str(body['email']).toLowerCase(),
    password: str(body['password']) || existing?.password || '',
    role: str(body['role']),
    gender: str(body['gender']) || 'N/A',
    country_id: optionalNumber('country_id'),
    state_id: optionalNumber('state_id'),
    district_id: optionalNumber('district_id'),
    project: optionalString('project'),
    sector: optionalString('sector'),
    anganwadi_id: optionalNumber('anganwadi_id'),
  };
}

function validateCenter(data: DemoData, body: Body, id?: number): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of ['name', 'code', 'project', 'sector']) {
    if (!str(body[field])) errors[field] = `The ${field} field is required.`;
  }
  const code = str(body['code']).toLowerCase();
  if (code && data.centers.some((c) => c.code.toLowerCase() === code && c.id !== id)) {
    errors['code'] = 'The code has already been taken.';
  }
  for (const field of ['country_id', 'state_id', 'district_id']) {
    if (num(body[field]) === null)
      errors[field] = `The ${field.replace('_id', '')} field is required.`;
  }
  return errors;
}

function centerFromBody(body: Body, id: number): DbCenter {
  return {
    id,
    name: str(body['name']),
    code: str(body['code']),
    project: str(body['project']),
    sector: str(body['sector']),
    country_id: num(body['country_id']) ?? 0,
    state_id: num(body['state_id']) ?? 0,
    district_id: num(body['district_id']) ?? 0,
  };
}

const routes: Route[] = [
  {
    method: 'POST',
    pattern: /^\/login$/,
    access: 'public',
    handle: ({ data, body }) => {
      const email = str(body['email']).toLowerCase();
      const user = data.users.find((u) => u.email === email && u.password === body['password']);
      if (!user) return { status: 401, body: { message: 'Invalid credentials' } };
      return ok({ token: demoToken(user.id), user: apiUser(data, user), roles: [user.role] });
    },
  },
  {
    method: 'GET',
    pattern: /^\/competencies$/,
    access: 'user',
    handle: ({ data }) =>
      ok({
        status: true,
        data: data.competencies.map((c) => ({
          ...c,
          domain: data.domains.find((d) => d.id === c.domain_id),
        })),
      }),
  },
  // Children (like the real API, every centre's children are returned)
  {
    method: 'GET',
    pattern: /^\/children$/,
    access: 'user',
    handle: ({ data }) => ok(data.children.map((c) => apiChild(data, c))),
  },
  {
    method: 'GET',
    pattern: /^\/children\/(\d+)$/,
    access: 'user',
    handle: ({ data, params }) => {
      const found = data.children.find((c) => c.id === Number(params[0]));
      return found ? ok(apiChild(data, found)) : notFound();
    },
  },
  {
    method: 'POST',
    pattern: /^\/children$/,
    access: 'user',
    handle: ({ db, data, body }) => {
      const errors = validateChild(data, body);
      if (Object.keys(errors).length) return invalid(errors);
      const created: DbChild = { id: db.nextId(data.children), ...childFromBody(body) };
      data.children.push(created);
      db.save();
      return ok(apiChild(data, created), 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/children\/(\d+)$/,
    access: 'user',
    handle: ({ db, data, body, params }) => {
      const index = data.children.findIndex((c) => c.id === Number(params[0]));
      if (index < 0) return notFound();
      const errors = validateChild(data, body);
      if (Object.keys(errors).length) return invalid(errors);
      data.children[index] = {
        id: data.children[index].id,
        ...childFromBody(body, data.children[index]),
      };
      db.save();
      return ok(apiChild(data, data.children[index]));
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/children\/(\d+)$/,
    access: 'user',
    handle: ({ db, data, params }) => {
      const id = Number(params[0]);
      if (!data.children.some((c) => c.id === id)) return notFound();
      data.children = data.children.filter((c) => c.id !== id);
      data.assessments = data.assessments.filter((a) => a.child_id !== id);
      db.save();
      return ok({ message: 'Deleted' });
    },
  },
  // Assessments
  {
    method: 'GET',
    pattern: /^\/assessments\/anganwadi\/(\d+)\/competency\/(\d+)$/,
    access: 'user',
    handle: ({ data, params }) => {
      const [centerId, competencyId] = params.map(Number);
      const rows = data.children
        .filter((c) => c.anganwadi_id === centerId)
        .map((c) => {
          const row: Record<string, unknown> = { name: c.name, gender: c.gender, child_id: c.id };
          for (let n = 1; n <= 4; n++) {
            const record = data.assessments.find(
              (a) =>
                a.child_id === c.id && a.competency_id === competencyId && a.attempt_number === n,
            );
            row[`session_${n}`] = record
              ? {
                  observation: record.observation,
                  created_at: record.created_at,
                  remarks: record.remarks,
                  age: record.age,
                  height: record.height,
                  weight: record.weight,
                }
              : '-';
          }
          return row;
        });
      return ok(rows);
    },
  },
  {
    method: 'POST',
    pattern: /^\/assessments\/$/,
    access: 'user',
    handle: ({ db, data, body }) => {
      const children = Array.isArray(body['children'])
        ? (body['children'] as unknown[]).map(num)
        : [];
      const attempt = num(body['attempt_number']);
      const errors: Record<string, string> = {};
      if (!children.length || children.some((id) => !data.children.some((c) => c.id === id))) {
        errors['children'] = 'The selected children are invalid.';
      }
      if (!data.competencies.some((c) => c.id === num(body['competency_id']))) {
        errors['competency_id'] = 'The selected competency is invalid.';
      }
      if (!LEVELS.includes(str(body['observation'])))
        errors['observation'] = 'The observation is invalid.';
      if (attempt === null || attempt < 1 || attempt > 4)
        errors['attempt_number'] = 'The attempt number must be between 1 and 4.';
      if (!isValidIsoDate(body['assessment_date']))
        errors['assessment_date'] = 'The assessment date is invalid.';
      if (Object.keys(errors).length) return invalid(errors);
      for (const childId of children as number[]) {
        data.assessments = data.assessments.filter(
          (a) =>
            !(
              a.child_id === childId &&
              a.competency_id === num(body['competency_id']) &&
              a.attempt_number === attempt
            ),
        );
        data.assessments.push({
          id: db.nextId(data.assessments),
          child_id: childId,
          competency_id: num(body['competency_id']) ?? 0,
          anganwadi_id: num(body['anganwadi_id']) ?? 0,
          attempt_number: attempt as number,
          observation: str(body['observation']),
          assessment_date: str(body['assessment_date']),
          created_at: new Date().toISOString(),
          remarks: str(body['remarks']),
          age: str(body['age']),
          height: str(body['height']),
          weight: str(body['weight']),
        });
      }
      db.save();
      return ok({ success: true, message: 'Assessment saved' }, 201);
    },
  },
  // Anganwadi centres
  {
    method: 'GET',
    pattern: /^\/anganwadi-centers$/,
    access: 'user',
    handle: ({ data }) => ok(data.centers),
  },
  {
    method: 'GET',
    pattern: /^\/anganwadi-centers\/(\d+)$/,
    access: 'user',
    handle: ({ data, params }) => {
      const found = data.centers.find((c) => c.id === Number(params[0]));
      return found ? ok(found) : notFound();
    },
  },
  {
    method: 'POST',
    pattern: /^\/anganwadi-centers$/,
    access: 'admin',
    handle: ({ db, data, body }) => {
      const errors = validateCenter(data, body);
      if (Object.keys(errors).length) return invalid(errors);
      const created = centerFromBody(body, db.nextId(data.centers));
      data.centers.push(created);
      db.save();
      return ok(created, 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/anganwadi-centers\/(\d+)$/,
    access: 'admin',
    handle: ({ db, data, body, params }) => {
      const id = Number(params[0]);
      const index = data.centers.findIndex((c) => c.id === id);
      if (index < 0) return notFound();
      const errors = validateCenter(data, body, id);
      if (Object.keys(errors).length) return invalid(errors);
      data.centers[index] = centerFromBody(body, id);
      db.save();
      return ok(data.centers[index]);
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/anganwadi-centers\/(\d+)$/,
    access: 'admin',
    handle: ({ db, data, params }) => {
      const id = Number(params[0]);
      if (!data.centers.some((c) => c.id === id)) return notFound();
      data.centers = data.centers.filter((c) => c.id !== id);
      db.save();
      return ok({ message: 'Deleted' });
    },
  },
  // Locations
  {
    method: 'GET',
    pattern: /^\/countries$/,
    access: 'user',
    handle: ({ data }) => ok(data.countries),
  },
  {
    method: 'GET',
    pattern: /^\/states\/(\d+)$/,
    access: 'user',
    handle: ({ data, params }) => ok(data.states.filter((s) => s.country_id === Number(params[0]))),
  },
  {
    method: 'GET',
    pattern: /^\/districts\/(\d+)$/,
    access: 'user',
    handle: ({ data, params }) =>
      ok(data.districts.filter((d) => d.state_id === Number(params[0]))),
  },
  {
    method: 'GET',
    pattern: /^\/projects\/(\d+)$/,
    access: 'user',
    handle: ({ data, params }) => ok(data.projects[params[0]] ?? []),
  },
  {
    method: 'GET',
    pattern: /^\/sectors\/(\d+)\/(.+)$/,
    access: 'user',
    handle: ({ data, params }) =>
      ok(data.sectors[`${params[0]}|${decodeURIComponent(params[1])}`] ?? []),
  },
  // Users (admin only)
  {
    method: 'GET',
    pattern: /^\/users$/,
    access: 'admin',
    handle: ({ data }) => ok(data.users.map((u) => apiUser(data, u))),
  },
  {
    method: 'GET',
    pattern: /^\/users\/(\d+)$/,
    access: 'admin',
    handle: ({ data, params }) => {
      const found = data.users.find((u) => u.id === Number(params[0]));
      return found ? ok(apiUser(data, found)) : notFound();
    },
  },
  {
    method: 'POST',
    pattern: /^\/users$/,
    access: 'admin',
    handle: ({ db, data, body }) => {
      const errors = validateUser(data, body);
      if (Object.keys(errors).length) return invalid(errors);
      const created = { ...userFromBody(body), id: db.nextId(data.users) };
      data.users.push(created);
      db.save();
      return ok(apiUser(data, created), 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/users\/(\d+)$/,
    access: 'admin',
    handle: ({ db, data, body, params }) => {
      const id = Number(params[0]);
      const index = data.users.findIndex((u) => u.id === id);
      if (index < 0) return notFound();
      const errors = validateUser(data, body, id);
      if (Object.keys(errors).length) return invalid(errors);
      data.users[index] = userFromBody(body, data.users[index]);
      db.save();
      return ok(apiUser(data, data.users[index]));
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/users\/(\d+)$/,
    access: 'admin',
    handle: ({ db, data, params, user }) => {
      const id = Number(params[0]);
      if (user?.id === id)
        return { status: 403, body: { message: 'You cannot delete your own account.' } };
      if (!data.users.some((u) => u.id === id)) return notFound();
      data.users = data.users.filter((u) => u.id !== id);
      db.save();
      return ok({ message: 'Deleted' });
    },
  },
];

function respond(
  req: HttpRequest<unknown>,
  result: Result,
  latency: number,
): Observable<HttpEvent<unknown>> {
  return timer(latency).pipe(
    mergeMap(() =>
      result.status >= 400
        ? throwError(
            () =>
              new HttpErrorResponse({
                status: result.status,
                statusText: 'Error',
                url: req.url,
                error: result.body,
              }),
          )
        : of(new HttpResponse({ status: result.status, body: result.body, url: req.url })),
    ),
  );
}

/**
 * Answers API calls from the demo data (only bundled in `--configuration mock`).
 * Non-API requests pass through untouched.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (!req.url.startsWith(`${base}/`)) return next(req);
  const db = inject(DemoDb);
  const latency = 200 + Math.round(Math.random() * 300);

  if (db.offline()) {
    return timer(600).pipe(
      mergeMap(() =>
        throwError(
          () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error', url: req.url }),
        ),
      ),
    );
  }

  const path = req.url.slice(base.length).split('?')[0];
  const route = routes.find((r) => r.method === req.method && r.pattern.test(path));
  if (!route) return respond(req, notFound(), latency);

  let user: DbUser | null = null;
  if (route.access !== 'public') {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const userId = tokenUserId(token);
    user = db.data.users.find((u) => u.id === userId) ?? null;
    if (!user) return respond(req, { status: 401, body: { message: 'Unauthenticated.' } }, latency);
    if (route.access === 'admin' && user.role !== 'admin') {
      return respond(
        req,
        { status: 403, body: { message: 'This action is unauthorized.' } },
        latency,
      );
    }
  }

  const params = route.pattern.exec(path)?.slice(1) ?? [];
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Body;
  const result = route.handle({ db, data: db.data, body, user, params });
  return respond(req, result, latency);
};
