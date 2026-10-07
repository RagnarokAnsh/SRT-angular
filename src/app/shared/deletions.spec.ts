import { HttpErrorResponse } from '@angular/common/http';
import { Subject, firstValueFrom, throwError } from 'rxjs';

import { createDeletions } from './deletions';

describe('createDeletions', () => {
  it('tracks several rows at once and ignores a second delete of the same row', async () => {
    const deletions = createDeletions();
    const first = new Subject<void>();
    const second = new Subject<void>();
    const outcomes: string[] = [];
    deletions.delete(1, () => first).subscribe((o) => outcomes.push(`1:${o}`));
    deletions.delete(2, () => second).subscribe((o) => outcomes.push(`2:${o}`));
    expect(deletions.isDeleting(1)).toBe(true);
    expect(deletions.isDeleting(2)).toBe(true);

    let called = false;
    deletions
      .delete(1, () => {
        called = true;
        return first;
      })
      .subscribe();
    expect(called).toBe(false);

    second.next();
    second.complete();
    expect(deletions.isDeleting(2)).toBe(false);
    expect(deletions.isDeleting(1)).toBe(true);
    first.next();
    first.complete();
    expect(outcomes).toEqual(['2:deleted', '1:deleted']);
    expect(deletions.isDeleting(1)).toBe(false);
  });

  it('treats a row the server no longer has as gone, and passes other errors on', async () => {
    const deletions = createDeletions();
    const notFound = new HttpErrorResponse({ status: 404 });
    await expect(
      firstValueFrom(deletions.delete(1, () => throwError(() => notFound))),
    ).resolves.toBe('gone');
    const failure = new HttpErrorResponse({ status: 500 });
    await expect(firstValueFrom(deletions.delete(2, () => throwError(() => failure)))).rejects.toBe(
      failure,
    );
    expect(deletions.isDeleting(2)).toBe(false);
  });
});
