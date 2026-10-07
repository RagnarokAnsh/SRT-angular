import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { testUser, validToken } from '../../../testing/auth';
import { CenterApi } from '../api/center-api';
import { ChildApi } from '../api/child-api';
import type { ApiCenter } from '../models/center';
import type { Child } from '../models/child';
import { type Area, AccessService, centerInArea, centerInScope, scopeFor } from './access';
import { SessionStore } from './session';

const center = (id: number, place: Partial<ApiCenter> = {}): ApiCenter => ({
  id,
  name: `Centre ${id}`,
  code: `AWC-${id}`,
  country_id: 1,
  state_id: 1,
  district_id: 1,
  project: 'Jaipur Urban',
  sector: 'Sector 4',
  ...place,
});

const centers = [
  center(1),
  center(2, { sector: 'Sector 1' }),
  center(3, { project: 'Sanganer', sector: 'Sector 4' }),
  center(4, { district_id: 2, project: 'Jaipur Urban', sector: 'Sector 4' }),
  center(5, { state_id: 2, district_id: 9 }),
];

const area = (depth: number, place: Partial<Area> = {}): Area => ({
  depth,
  countryId: 1,
  stateId: 1,
  districtId: 1,
  project: 'Jaipur Urban',
  sector: 'Sector 4',
  ...place,
});

const ids = (list: { id: number }[]) => list.map((item) => item.id);
const inArea = (a: Area) => ids(centers.filter((c) => centerInArea(c, a)));

const student = (id: number, anganwadiId: number | null): Child => ({
  id,
  name: `Student ${id}`,
  dateOfBirth: '2021-01-01',
  symbol: '',
  heightCm: null,
  weightKg: null,
  language: '',
  anganwadiId,
  centerName: null,
  gender: 'Girl',
  awwId: null,
});

describe('access scope', () => {
  it('gives administrators everything and workers only their centre', () => {
    expect(scopeFor(testUser(['admin'], { anganwadi_id: null }), 'admin')).toEqual({ kind: 'all' });
    expect(scopeFor(testUser(['aww'], { anganwadi_id: 3 }), 'aww')).toEqual({
      kind: 'center',
      centerId: 3,
    });
    expect(scopeFor(testUser(['aww'], { anganwadi_id: null }), 'aww')).toEqual({
      kind: 'center',
      centerId: null,
    });
  });

  it('gives nothing without a user or a known role', () => {
    expect(scopeFor(null, null)).toEqual({ kind: 'center', centerId: null });
    expect(scopeFor(testUser(['guest']), null)).toEqual({ kind: 'center', centerId: null });
  });

  it('ties supervisors and officials to their area', () => {
    const supervisor = testUser(['supervisor'], {
      anganwadi_id: null,
      country_id: 1,
      state_id: 1,
      district_id: 1,
      project: 'Jaipur Urban',
      sector: 'Sector 4',
    });
    expect(scopeFor(supervisor, 'supervisor')).toEqual({ kind: 'area', area: area(5) });
    expect(scopeFor(supervisor, 'cdpo')).toMatchObject({ kind: 'area', area: { depth: 4 } });
  });

  it('matches centres at each level of the area', () => {
    expect(inArea(area(5))).toEqual([1]); // same district, project and sector
    expect(inArea(area(4))).toEqual([1, 2]); // same district and project
    expect(inArea(area(3))).toEqual([1, 2, 3]); // same district
    expect(inArea(area(2))).toEqual([1, 2, 3, 4]); // same state
  });

  it('needs the district for project and sector names, which repeat across districts', () => {
    // Centre 4 has the same project and sector names, but in another district.
    expect(inArea(area(5))).not.toContain(4);
  });

  it('ignores case and spacing in project and sector names', () => {
    expect(inArea(area(5, { project: ' jaipur  urban ', sector: 'SECTOR 4' }))).toEqual([1]);
  });

  it('matches nothing when the user has no location for their level', () => {
    expect(inArea(area(5, { sector: null }))).toEqual([]);
    expect(inArea(area(5, { sector: '  ' }))).toEqual([]);
    expect(inArea(area(4, { districtId: null }))).toEqual([]);
    expect(inArea(area(2, { stateId: null }))).toEqual([]);
  });

  it('checks a centre against any scope', () => {
    expect(centerInScope(centers[4], { kind: 'all' })).toBe(true);
    expect(centerInScope(centers[1], { kind: 'center', centerId: 2 })).toBe(true);
    expect(centerInScope(centers[0], { kind: 'center', centerId: 2 })).toBe(false);
    expect(centerInScope(centers[0], { kind: 'center', centerId: null })).toBe(false);
  });
});

describe('AccessService', () => {
  const students = [student(1, 1), student(2, 2), student(3, 3), student(4, null)];

  function setup(roles: string[], extra: Parameters<typeof testUser>[1]): AccessService {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: CenterApi, useValue: { list: () => of(centers) } },
        {
          provide: ChildApi,
          useValue: {
            list: () => of(students),
            listForCenter: (id: number) => of(students.filter((s) => s.anganwadiId === id)),
          },
        },
      ],
    });
    TestBed.inject(SessionStore).start(validToken(), testUser(roles, extra));
    return TestBed.inject(AccessService);
  }

  it('shows a worker only the students of their own centre', async () => {
    const access = setup(['aww'], { anganwadi_id: 2 });
    expect(ids(await firstValueFrom(access.visibleChildren()))).toEqual([2]);
    expect(ids(await firstValueFrom(access.visibleCenters()))).toEqual([2]);
    expect(access.ownCenterId()).toBe(2);
    expect(access.worksInOwnCenter()).toBe(true);
  });

  it('shows a worker without a centre nobody', async () => {
    const access = setup(['aww'], { anganwadi_id: null, anganwadi: null });
    expect(await firstValueFrom(access.visibleChildren())).toEqual([]);
    expect(await firstValueFrom(access.visibleCenters())).toEqual([]);
  });

  it("shows a supervisor only their sector's centres and students", async () => {
    const access = setup(['supervisor'], {
      anganwadi_id: null,
      state_id: 1,
      district_id: 1,
      project: 'Jaipur Urban',
      sector: 'Sector 1',
    });
    expect(ids(await firstValueFrom(access.visibleCenters()))).toEqual([2]);
    expect(ids(await firstValueFrom(access.visibleChildren()))).toEqual([2]);
    expect(access.worksInOwnCenter()).toBe(false);
  });

  it('shows administrators every student, even those without a centre', async () => {
    const access = setup(['admin'], { anganwadi_id: null });
    expect(ids(await firstValueFrom(access.visibleChildren()))).toEqual([1, 2, 3, 4]);
    expect(ids(await firstValueFrom(access.visibleCenters()))).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses the most senior role of a user with several', async () => {
    // A worker who is also an administrator is not limited to one centre.
    const access = setup(['aww', 'admin'], { anganwadi_id: 2 });
    expect(access.scope()).toEqual({ kind: 'all' });
  });
});
