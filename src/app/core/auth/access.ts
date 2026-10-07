import { Injectable, computed, inject } from '@angular/core';
import { type Observable, forkJoin, map, of } from 'rxjs';

import { CenterApi } from '../api/center-api';
import { ChildApi } from '../api/child-api';
import type { ApiCenter } from '../models/center';
import type { Child } from '../models/child';
import type { RoleName } from '../models/role';
import type { ApiUser } from '../models/user';
import { ROLE_LOCATION_DEPTH } from './roles';
import { SessionStore } from './session';

/** The part of the location hierarchy a supervisor or official is responsible for. */
export interface Area {
  /** 1 country, 2 state, 3 district, 4 project, 5 sector (see ROLE_LOCATION_DEPTH). */
  depth: number;
  countryId: number | null;
  stateId: number | null;
  districtId: number | null;
  project: string | null;
  sector: string | null;
}

/**
 * Which centres, and so which students and results, a user may see:
 * - `all`: administrators;
 * - `center`: Anganwadi workers, only their own centre (none when their account has no centre);
 * - `area`: supervisors and officials, the centres in their sector, project, district or state.
 */
export type AccessScope =
  { kind: 'all' } | { kind: 'center'; centerId: number | null } | { kind: 'area'; area: Area };

export function scopeFor(user: ApiUser | null, role: RoleName | null): AccessScope {
  if (!user || role === null) return { kind: 'center', centerId: null };
  if (role === 'admin') return { kind: 'all' };
  if (role === 'aww') {
    return { kind: 'center', centerId: user.anganwadi_id ?? user.anganwadi?.id ?? null };
  }
  return {
    kind: 'area',
    area: {
      depth: ROLE_LOCATION_DEPTH[role],
      countryId: user.country_id ?? null,
      stateId: user.state_id ?? null,
      districtId: user.district_id ?? null,
      project: user.project ?? null,
      sector: user.sector ?? null,
    },
  };
}

const normalized = (value: string | null | undefined) =>
  (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** Same name, ignoring case and spacing; an empty name on the user's side matches nothing. */
function sameName(centerValue: string | null | undefined, areaValue: string | null): boolean {
  const wanted = normalized(areaValue);
  return wanted !== '' && normalized(centerValue) === wanted;
}

/**
 * Whether a centre lies in the area. Project names are only unique within a district, and
 * sector names within a project, so those levels also check the district (and project).
 * Missing location details on the user's side match no centre at all.
 */
export function centerInArea(center: ApiCenter, area: Area): boolean {
  const inDistrict = area.districtId !== null && center.district_id === area.districtId;
  if (area.depth >= 5) {
    return (
      inDistrict && sameName(center.project, area.project) && sameName(center.sector, area.sector)
    );
  }
  if (area.depth === 4) return inDistrict && sameName(center.project, area.project);
  if (area.depth === 3) return inDistrict;
  if (area.depth === 2) return area.stateId !== null && center.state_id === area.stateId;
  return area.countryId !== null && center.country_id === area.countryId;
}

export function centerInScope(center: ApiCenter, scope: AccessScope): boolean {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'center':
      return scope.centerId !== null && center.id === scope.centerId;
    case 'area':
      return centerInArea(center, scope.area);
  }
}

/**
 * Loads only what the signed-in user may see. The API returns every centre's students
 * (docs/SECURITY.md, S2), so they are filtered here; the server must still enforce this.
 */
@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly session = inject(SessionStore);
  private readonly centerApi = inject(CenterApi);
  private readonly childApi = inject(ChildApi);

  readonly scope = computed(() => scopeFor(this.session.user(), this.session.primaryRole()));

  /** Workers: their own centre (null when the account has no centre). Others: null. */
  readonly ownCenterId = computed(() => {
    const scope = this.scope();
    return scope.kind === 'center' ? scope.centerId : null;
  });

  /** Anganwadi workers work in one fixed centre; everyone else chooses one. */
  readonly worksInOwnCenter = computed(() => this.scope().kind === 'center');

  /** The centres the user may see and choose from. */
  visibleCenters(): Observable<ApiCenter[]> {
    const scope = this.scope();
    if (scope.kind === 'center' && scope.centerId === null) return of([]);
    return this.centerApi
      .list()
      .pipe(map((centers) => centers.filter((center) => centerInScope(center, scope))));
  }

  /** The students the user may see. */
  visibleChildren(): Observable<Child[]> {
    const scope = this.scope();
    switch (scope.kind) {
      case 'all':
        return this.childApi.list();
      case 'center':
        return scope.centerId === null ? of([]) : this.childApi.listForCenter(scope.centerId);
      case 'area':
        return forkJoin({ children: this.childApi.list(), centers: this.visibleCenters() }).pipe(
          map(({ children, centers }) => {
            const ids = new Set(centers.map((center) => center.id));
            return children.filter((c) => c.anganwadiId !== null && ids.has(c.anganwadiId));
          }),
        );
    }
  }
}
