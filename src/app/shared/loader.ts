import { DestroyRef, type Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable, Subscription } from 'rxjs';

import { type AppError, toAppError } from '@core/network/app-error';

export interface Loader<T> {
  readonly data: Signal<T | undefined>;
  readonly error: Signal<AppError | null>;
  readonly loading: Signal<boolean>;
  /** Fetches again (cancels a request still in flight). */
  reload(): void;
  /** Replaces the data locally, e.g. after a save. */
  set(value: T): void;
}

/**
 * Loading/error/data signals for one request, created in an injection context
 * (component field initialiser). Starts immediately unless `lazy` is set.
 */
export function createLoader<T>(
  fetch: () => Observable<T>,
  options: { lazy?: boolean } = {},
): Loader<T> {
  const destroyRef = inject(DestroyRef);
  const data = signal<T | undefined>(undefined);
  const error = signal<AppError | null>(null);
  const loading = signal(false);
  let subscription: Subscription | undefined;

  const reload = () => {
    subscription?.unsubscribe();
    loading.set(true);
    error.set(null);
    subscription = fetch()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (value) => {
          data.set(value);
          loading.set(false);
        },
        error: (err: unknown) => {
          error.set(toAppError(err));
          loading.set(false);
        },
      });
  };

  if (!options.lazy) reload();

  return {
    data: data.asReadonly(),
    error: error.asReadonly(),
    loading: loading.asReadonly(),
    reload,
    set: (value: T) => data.set(value),
  };
}
