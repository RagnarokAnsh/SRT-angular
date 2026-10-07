import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { type Observable, Subject, of, throwError } from 'rxjs';

import type { LocationCache } from '@core/api/location-cache';
import type { State } from '@core/models/location';

import { LocationCascade } from './location-cascade';

function controls() {
  return {
    country_id: new FormControl<number | null>(null),
    state_id: new FormControl<number | null>(null),
    district_id: new FormControl<number | null>(null),
    project: new FormControl('', { nonNullable: true }),
    sector: new FormControl('', { nonNullable: true }),
  };
}

describe('LocationCascade', () => {
  const create = (cache: Partial<LocationCache>, c = controls()) => ({
    c,
    cascade: new LocationCascade(
      c,
      {
        countries: () => of([{ id: 1, name: 'India' }]),
        states: () => of([]),
        districts: () => of([]),
        projects: () => of([]),
        sectors: () => of([]),
        ...cache,
      } as LocationCache,
      TestBed.inject(DestroyRef),
    ),
  });

  it('takes a failure off once that list loads', () => {
    let fail = true;
    const { c, cascade } = create({
      states: (): Observable<State[]> =>
        fail
          ? throwError(() => new Error('down'))
          : of([{ id: 5, name: 'Rajasthan', country_id: 1 }]),
    });
    c.country_id.setValue(1);
    expect(cascade.error()).not.toBeNull();
    fail = false;
    c.country_id.setValue(null);
    c.country_id.setValue(1);
    expect(cascade.error()).toBeNull();
    expect(cascade.states().map((s) => s.name)).toEqual(['Rajasthan']);
  });

  it("a slow retry doesn't replace the list for a newer choice", () => {
    const answers = new Map<number, Subject<State[]>>();
    const { c, cascade } = create({
      states: (countryId) => {
        const answer = new Subject<State[]>();
        answers.set(countryId, answer);
        return answer;
      },
    });
    c.country_id.setValue(1);
    cascade.reload(); // asks for country 1's states again
    const retry = answers.get(1);
    c.country_id.setValue(2);
    answers.get(2)?.next([{ id: 9, name: 'Goa', country_id: 2 }]);
    retry?.next([{ id: 5, name: 'Rajasthan', country_id: 1 }]);
    expect(cascade.states().map((s) => s.name)).toEqual(['Goa']);
  });

  it('clears the levels below a changed choice, but not while filling in saved values', () => {
    const { c, cascade } = create({});
    cascade.fill({ country_id: 1, state_id: 5, district_id: 7, project: 'P', sector: 'S' });
    expect(c.sector.value).toBe('S');
    c.district_id.setValue(8);
    expect(c.project.value).toBe('');
    expect(c.sector.value).toBe('');
  });
});
