import { type DestroyRef, type WritableSignal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormControl } from '@angular/forms';
import { type Observable, catchError, distinctUntilChanged, finalize, of, switchMap, tap } from 'rxjs';

import type { LocationCache } from '@core/api/location-cache';
import type { Country, District, State } from '@core/models/location';
import { type AppError, toAppError } from '@core/network/app-error';

export interface LocationControls {
  country_id: FormControl<number | null>;
  state_id: FormControl<number | null>;
  district_id: FormControl<number | null>;
  project: FormControl<string>;
  sector: FormControl<string>;
}

export interface LocationValues {
  country_id: number | null;
  state_id: number | null;
  district_id: number | null;
  project: string;
  sector: string;
}

/**
 * Country → state → district → project → sector selects: choosing a level loads the next
 * one and clears everything below it. Lists come from the shared LocationCache.
 */
export class LocationCascade {
  readonly countries = signal<Country[]>([]);
  readonly states = signal<State[]>([]);
  readonly districts = signal<District[]>([]);
  readonly projects = signal<string[]>([]);
  readonly sectors = signal<string[]>([]);
  readonly error = signal<AppError | null>(null);
  /** Lists being fetched right now, so the fields can say "Loading…". */
  readonly loading = signal<ReadonlySet<WritableSignal<unknown[]>>>(new Set());
  /** True while existing values are being filled in (nothing is cleared). */
  private filling = false;

  constructor(
    private readonly controls: LocationControls,
    private readonly cache: LocationCache,
    destroyRef: DestroyRef,
  ) {
    const c = controls;
    this.fetch(cache.countries(), this.countries).pipe(takeUntilDestroyed(destroyRef)).subscribe();
    this.follow(c.country_id, (id) => (id ? cache.states(id) : of([])), this.states, () => {
      c.state_id.reset(null);
      c.district_id.reset(null);
      c.project.reset('');
      c.sector.reset('');
    }).pipe(takeUntilDestroyed(destroyRef)).subscribe();
    this.follow(c.state_id, (id) => (id ? cache.districts(id) : of([])), this.districts, () => {
      c.district_id.reset(null);
      c.project.reset('');
      c.sector.reset('');
    }).pipe(takeUntilDestroyed(destroyRef)).subscribe();
    this.follow(c.district_id, (id) => (id ? cache.projects(id) : of([])), this.projects, () => {
      c.project.reset('');
      c.sector.reset('');
    }).pipe(takeUntilDestroyed(destroyRef)).subscribe();
    this.follow(
      c.project,
      (project) => {
        const district = c.district_id.value;
        return district && project ? cache.sectors(district, project) : of([]);
      },
      this.sectors,
      () => c.sector.reset(''),
    ).pipe(takeUntilDestroyed(destroyRef)).subscribe();
  }

  /** Shows saved values (when editing) and loads the lists that go with them. */
  fill(values: Partial<LocationValues>): void {
    this.filling = true;
    try {
      const c = this.controls;
      c.country_id.setValue(values.country_id ?? null);
      c.state_id.setValue(values.state_id ?? null);
      c.district_id.setValue(values.district_id ?? null);
      c.project.setValue(values.project ?? '');
      c.sector.setValue(values.sector ?? '');
    } finally {
      this.filling = false;
    }
  }

  /** Tries the lists again after a failure. */
  reload(): void {
    this.error.set(null);
    const c = this.controls;
    this.fetch(this.cache.countries(), this.countries).subscribe();
    if (c.country_id.value) this.fetch(this.cache.states(c.country_id.value), this.states).subscribe();
    if (c.state_id.value) this.fetch(this.cache.districts(c.state_id.value), this.districts).subscribe();
    if (c.district_id.value) {
      this.fetch(this.cache.projects(c.district_id.value), this.projects).subscribe();
      if (c.project.value) {
        this.fetch(this.cache.sectors(c.district_id.value, c.project.value), this.sectors).subscribe();
      }
    }
  }

  /** Display names for the chosen country, state and district. */
  names(): { country: string; state: string; district: string } {
    const c = this.controls;
    const name = (list: { id: number; name: string }[], id: number | null) =>
      list.find((item) => item.id === id)?.name ?? '';
    return {
      country: name(this.countries(), c.country_id.value),
      state: name(this.states(), c.state_id.value),
      district: name(this.districts(), c.district_id.value),
    };
  }

  private follow<V, T>(
    control: FormControl<V>,
    load: (value: V) => Observable<T[]>,
    target: WritableSignal<T[]>,
    clearBelow: () => void,
  ): Observable<T[]> {
    return control.valueChanges.pipe(
      distinctUntilChanged(),
      tap(() => {
        if (!this.filling) clearBelow();
      }),
      switchMap((value) => this.fetch(load(value), target)),
    );
  }

  /** True while the list behind a field is loading. */
  isLoading(list: 'countries' | 'states' | 'districts' | 'projects' | 'sectors'): boolean {
    return this.loading().has(this[list] as WritableSignal<unknown[]>);
  }

  private fetch<T>(source: Observable<T[]>, target: WritableSignal<T[]>): Observable<T[]> {
    const key = target as WritableSignal<unknown[]>;
    this.loading.update((set) => new Set(set).add(key));
    return source.pipe(
      tap((list) => target.set(list)),
      catchError((error: unknown) => {
        this.error.set(toAppError(error));
        target.set([]);
        return of([] as T[]);
      }),
      finalize(() =>
        this.loading.update((set) => {
          const next = new Set(set);
          next.delete(key);
          return next;
        }),
      ),
    );
  }
}
