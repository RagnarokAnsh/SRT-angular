import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { TEST_API, setupHttpTesting } from '../../../testing/http';
import type { ApiChild, ChildInput } from '../models/child';
import { ChildApi, toChild, toChildPayload } from './child-api';

const apiChild: ApiChild = {
  id: 3,
  name: '  Diya Sharma ',
  date_of_birth: '2020-11-02T00:00:00.000000Z',
  symbol: 'Moon',
  height_cm: '96.5',
  weight_kg: '14',
  language: 'Hindi',
  anganwadi_id: 1,
  gender: 'Girl',
  aww_id: 8,
  anganwadi: {
    id: 1,
    name: 'Shivaji Nagar AWC',
    code: 'AWC-001',
    project: 'P',
    sector: 'S',
    country_id: 1,
    state_id: 1,
    district_id: 1,
  },
};

const input: ChildInput = {
  name: 'आरव कुमार',
  dateOfBirth: '2021-03-14',
  gender: 'Boy',
  symbol: 'Sun ',
  language: ' हिंदी',
  heightCm: 101.5,
  weightKg: 15,
  anganwadiId: 1,
};

describe('ChildApi', () => {
  let http: HttpTestingController;
  let api: ChildApi;

  beforeEach(() => {
    http = setupHttpTesting();
    api = TestBed.inject(ChildApi);
  });

  afterEach(() => http.verify());

  it('lists children from GET /children', async () => {
    const result = firstValueFrom(api.list());
    const req = http.expectOne(`${TEST_API}/children`);
    expect(req.request.method).toBe('GET');
    req.flush([apiChild]);
    const [child] = await result;
    expect(child.name).toBe('Diya Sharma');
    expect(child.dateOfBirth).toBe('2020-11-02');
    expect(child.heightCm).toBe(96.5);
    expect(child.centerName).toBe('Shivaji Nagar AWC');
  });

  it('filters children by centre on the client', async () => {
    const result = firstValueFrom(api.listForCenter(2));
    http.expectOne(`${TEST_API}/children`).flush([apiChild, { ...apiChild, id: 4, anganwadi_id: 2 }]);
    expect((await result).map((c) => c.id)).toEqual([4]);
  });

  it('creates with POST /children and the original payload shape', () => {
    api.create(input, 8).subscribe();
    const req = http.expectOne(`${TEST_API}/children`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'आरव कुमार',
      gender: 'Boy',
      date_of_birth: '2021-03-14',
      symbol: 'Sun',
      height_cm: '101.5',
      weight_kg: '15',
      language: 'हिंदी',
      anganwadi_id: 1,
      age: expect.any(Number),
      aww_id: 8,
    });
    req.flush(apiChild);
  });

  it('updates with PUT /children/{id} and includes the id', () => {
    api.update(3, input, null).subscribe();
    const req = http.expectOne(`${TEST_API}/children/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.id).toBe(3);
    expect(req.request.body).not.toHaveProperty('aww_id');
    req.flush(apiChild);
  });

  it('deletes with DELETE /children/{id}', () => {
    api.remove(3).subscribe();
    const req = http.expectOne(`${TEST_API}/children/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('gets one child', async () => {
    const result = firstValueFrom(api.get(3));
    http.expectOne(`${TEST_API}/children/3`).flush({ data: apiChild });
    expect((await result).id).toBe(3);
  });
});

describe('child mapping', () => {
  it('never invents values for missing data', () => {
    const child = toChild({
      ...apiChild,
      date_of_birth: '',
      anganwadi_id: null,
      height_cm: null,
      weight_kg: '',
    });
    expect(child.dateOfBirth).toBeNull();
    expect(child.anganwadiId).toBeNull();
    expect(child.heightCm).toBeNull();
    expect(child.weightKg).toBeNull();
  });

  it('sends age in completed years on the given day', () => {
    expect(toChildPayload(input, { today: '2026-03-13' })['age']).toBe(4);
    expect(toChildPayload(input, { today: '2026-03-14' })['age']).toBe(5);
  });
});
