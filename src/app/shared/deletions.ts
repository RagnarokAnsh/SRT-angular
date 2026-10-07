import { signal } from '@angular/core';
import { EMPTY, type Observable, catchError, finalize, map, of, throwError } from 'rxjs';

import { toAppError } from '@core/network/app-error';

/** `deleted`: removed now; `gone`: someone had already removed it (the server answered 404). */
export type DeleteOutcome = 'deleted' | 'gone';

export interface Deletions {
  /** True while the row with this id is being deleted. */
  isDeleting(id: number): boolean;
  /**
   * Deletes one row. Several rows can be deleted at once; a second request for a row that is
   * already being deleted is ignored (emits nothing).
   */
  delete(id: number, request: () => Observable<unknown>): Observable<DeleteOutcome>;
}

/** Tracks deletes in a list page. */
export function createDeletions(): Deletions {
  const ids = signal<ReadonlySet<number>>(new Set());
  const mark = (id: number, busy: boolean) =>
    ids.update((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  return {
    isDeleting: (id) => ids().has(id),
    delete: (id, request) => {
      if (ids().has(id)) return EMPTY;
      mark(id, true);
      return request().pipe(
        map((): DeleteOutcome => 'deleted'),
        catchError((error: unknown) =>
          toAppError(error).kind === 'notFound'
            ? of<DeleteOutcome>('gone')
            : throwError(() => error),
        ),
        finalize(() => mark(id, false)),
      );
    },
  };
}
