import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { TEST_API, setupHttpTesting } from '../../../testing/http';
import type { CenterInput } from '../models/center';
import type { UserInput } from '../models/user';
import { AuthApi } from './auth-api';
import { CenterApi } from './center-api';
import { LocationApi } from './location-api';
import { UserApi } from './user-api';

describe('AuthApi', () => {
  let http: HttpTestingController;

  beforeEach(() => (http = setupHttpTesting()));
  afterEach(() => http.verify());

  it('logs in with POST /login', () => {
    TestBed.inject(AuthApi).login('aww@example.org', 'secret').subscribe();
    const req = http.expectOne(`${TEST_API}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'aww@example.org', password: 'secret' });
    req.flush({ token: 't', user: {} });
  });

  it('recognises the login URL', () => {
    const api = TestBed.inject(AuthApi);
    expect(api.isLoginRequest(`${TEST_API}/login`)).toBe(true);
    expect(api.isLoginRequest(`${TEST_API}/children`)).toBe(false);
  });
});

describe('CenterApi', () => {
  let http: HttpTestingController;
  let api: CenterApi;
  const center: CenterInput = {
    name: 'AWC',
    code: 'AWC-1',
    project: 'P',
    sector: 'S',
    country_id: 1,
    state_id: 2,
    district_id: 3,
  };

  beforeEach(() => {
    http = setupHttpTesting();
    api = TestBed.inject(CenterApi);
  });
  afterEach(() => http.verify());

  it('uses /anganwadi-centers for every operation', () => {
    api.list().subscribe();
    expect(http.expectOne(`${TEST_API}/anganwadi-centers`).request.method).toBe('GET');
    api.get(4).subscribe();
    expect(http.expectOne(`${TEST_API}/anganwadi-centers/4`).request.method).toBe('GET');
    api.create(center).subscribe();
    const post = http.expectOne(`${TEST_API}/anganwadi-centers`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(center);
    api.update(4, center).subscribe();
    const put = http.expectOne(`${TEST_API}/anganwadi-centers/4`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(center);
    api.remove(4).subscribe();
    expect(http.expectOne(`${TEST_API}/anganwadi-centers/4`).request.method).toBe('DELETE');
  });
});

describe('LocationApi', () => {
  let http: HttpTestingController;
  let api: LocationApi;

  beforeEach(() => {
    http = setupHttpTesting();
    api = TestBed.inject(LocationApi);
  });
  afterEach(() => http.verify());

  it('loads the location hierarchy', () => {
    api.countries().subscribe();
    http.expectOne(`${TEST_API}/countries`).flush([]);
    api.states(1).subscribe();
    http.expectOne(`${TEST_API}/states/1`).flush([]);
    api.districts(2).subscribe();
    http.expectOne(`${TEST_API}/districts/2`).flush([]);
  });

  it('accepts projects as strings or objects and removes duplicates', async () => {
    const result = firstValueFrom(api.projects(3));
    http.expectOne(`${TEST_API}/projects/3`).flush(['Jaipur Urban', { name: 'Sanganer' }, 'Jaipur Urban']);
    expect(await result).toEqual(['Jaipur Urban', 'Sanganer']);
  });

  it('encodes the project in the sectors URL', async () => {
    const result = firstValueFrom(api.sectors(3, 'Jaipur Urban'));
    http.expectOne(`${TEST_API}/sectors/3/Jaipur%20Urban`).flush([{ sector: 'Sector 4' }]);
    expect(await result).toEqual(['Sector 4']);
  });
});

describe('UserApi', () => {
  let http: HttpTestingController;
  let api: UserApi;
  const user: UserInput = {
    name: 'Sunita Devi',
    email: 'sunita@example.org',
    password: 'Passw0rd!',
    role: 'aww',
    gender: 'female',
    country_id: 1,
    state_id: 1,
    district_id: 1,
    project: 'P',
    sector: 'S',
    anganwadi_id: 1,
  };

  beforeEach(() => {
    http = setupHttpTesting();
    api = TestBed.inject(UserApi);
  });
  afterEach(() => http.verify());

  it('uses /users for every operation', () => {
    api.list().subscribe();
    expect(http.expectOne(`${TEST_API}/users`).request.method).toBe('GET');
    api.get(8).subscribe();
    expect(http.expectOne(`${TEST_API}/users/8`).request.method).toBe('GET');
    api.create(user).subscribe();
    const post = http.expectOne(`${TEST_API}/users`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(user);
    api.update(8, user).subscribe();
    expect(http.expectOne(`${TEST_API}/users/8`).request.method).toBe('PUT');
    api.remove(8).subscribe();
    expect(http.expectOne(`${TEST_API}/users/8`).request.method).toBe('DELETE');
  });
});
